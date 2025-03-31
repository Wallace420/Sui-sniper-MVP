import { SuiClient, SuiEventFilter } from '@mysten/sui/client';
import { Pool, Dex } from '../dex';
import { formatPoolDate } from '../utils';
import { TokenSecurity } from './tokenSecurity';
import { MEVProtection } from './mevProtection';
import { PoolDatabase } from './db/poolDb';
import { WebSocketWrapper } from './websocket/WebSocketWrapper';
import { Logger } from './utils/logger';
import chalk from 'chalk';

export interface PoolScannerConfig {
    scanIntervalMs: number;
    concurrentScans: number;
    wsEndpoint?: string;
    rpcEndpoint?: string;
    tokenSecurity: TokenSecurity;
    mevProtection: MEVProtection;
    maxCacheSize?: number;
    wsReconnectDelay?: number;
    maxValidationAttempts: number;
    poolMonitoringTimeMs: number;
    batchSize?: number;
}

interface PoolCache {
    [key: string]: {
        pool: Pool;
        timestamp: number;
        validationAttempts: number;
        lastLiquidityCheck?: number;
        liquidityHistory?: number[];
    };
}


export class PoolScanner {
    private client: SuiClient;
    private wsClient: WebSocketWrapper | null = null;
    private config: PoolScannerConfig;
    private dexes: Record<string, Dex>;
    private lastScannedBlock: string | null = null;
    private isScanning: boolean = false;
    private poolCache: PoolCache = {};
    private processingQueue: Set<string> = new Set();
    private reconnectAttempts: number = 0;
    private readonly MAX_RECONNECT_ATTEMPTS = 5;
    private readonly BATCH_SIZE: number;
    private db: PoolDatabase;

    constructor(client: SuiClient, dexes: Record<string, Dex>, config: PoolScannerConfig) {
        this.client = client;
        this.dexes = dexes;
        this.BATCH_SIZE = config.batchSize || 10;
        this.config = {
            scanIntervalMs: config.scanIntervalMs || 1000,
            concurrentScans: config.concurrentScans || 3,
            wsEndpoint: config.wsEndpoint,
            rpcEndpoint: config.rpcEndpoint,
            tokenSecurity: config.tokenSecurity,
            mevProtection: config.mevProtection,
            maxCacheSize: config.maxCacheSize || 1000,
            wsReconnectDelay: config.wsReconnectDelay || 5000,
            maxValidationAttempts: config.maxValidationAttempts,
            poolMonitoringTimeMs: config.poolMonitoringTimeMs,
            batchSize: this.BATCH_SIZE
        };
        this.db = new PoolDatabase();
    }

    async startScanning(onPoolFound: (pool: Pool) => Promise<void>) {
        if (this.isScanning) {
            Logger.warning('Scanner is already running');
            return;
        }
        
        this.isScanning = true;
        Logger.success('Starting pool scanner');

        if (this.config.wsEndpoint) {
            await this.setupWebSocketConnection(onPoolFound);
        }

        while (this.isScanning) {
            try {
                await this.scanNewPools(onPoolFound);
                await new Promise(resolve => setTimeout(resolve, this.config.scanIntervalMs));
            } catch (error) {
                Logger.error('Error during pool scanning', error);
                await this.handleScanningError(error);
            }
        }
    }
    private async setupWebSocketConnection(onPoolFound: (pool: Pool) => Promise<void>) {
        if (!this.config.wsEndpoint) return;
    
        try {
            this.wsClient = new WebSocketWrapper(this.config.wsEndpoint);
    
            this.wsClient.onopen = () => {
                Logger.websocketStatus('connected');
                this.reconnectAttempts = 0;
                this.wsClient?.send(JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'sui_subscribeBlock',
                    params: []
                }));
            };
    
            this.wsClient.onmessage = async (event) => {
                try {
                    const data = JSON.parse(event.toString());
                    if (data.method === 'sui_subscribeBlock') {
                        await this.scanNewPools(onPoolFound);
                    }
                } catch (error) {
                    Logger.error('Error processing WebSocket message', error);
                }
            };
    
            this.wsClient.onerror = (error) => {
                Logger.error('WebSocket error', error);
                this.handleWebSocketError();
            };
    
            this.wsClient.onclose = () => {
                Logger.websocketStatus('disconnected');
                this.handleWebSocketReconnect(onPoolFound);
            };
        } catch (error) {
            Logger.error('Error setting up WebSocket', error);
            this.handleWebSocketError();
        }
    }
    handleWebSocketReconnect(_onPoolFound: (pool: Pool) => Promise<void>) {
        throw new Error('Method not implemented.');
    }
    private async handleScanningError(error: unknown) {
        Logger.error('Scanning error', error);
        if (this.isScanning) {
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    private handleWebSocketError() {
        if (this.reconnectAttempts < this.MAX_RECONNECT_ATTEMPTS) {
            this.reconnectAttempts++;
            Logger.info(`Reconnection attempt ${this.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS}`);
            setTimeout(() => {
                if (this.isScanning) {
                    this.setupWebSocketConnection(async (pool) => {
                        await this.processPoolEvent(pool, this.dexes[pool.dex], () => Promise.resolve());
                    });
                }
            }, this.config.wsReconnectDelay);
        } else {
            Logger.error('Max reconnection attempts reached. Falling back to polling.');
            this.wsClient = null;
        }
    }
    private async scanNewPools(onPoolFound: (pool: Pool) => Promise<void>) {
        const dexEntries = Object.entries(this.dexes);
        const batchCount = Math.ceil(dexEntries.length / this.BATCH_SIZE);
    
        for (let i = 0; i < batchCount; i++) {
            const batch = dexEntries.slice(i * this.BATCH_SIZE, (i + 1) * this.BATCH_SIZE);
            const scanPromises = batch.map(async ([dexName, dex]) => {
                try {
                    const filter: SuiEventFilter = {
                        MoveEventType: dex.MoveEventType
                    };
                    
                    if (this.lastScannedBlock) {
                        Object.assign(filter, { cursor: this.lastScannedBlock });
                    }
    
                    Logger.poolHeader(dexName);
                    const events = await this.client.queryEvents({
                        query: filter,
                        order: "descending",
                        limit: 50
                    });
    
                    if (!events?.data || events.data.length === 0) {
                        Logger.scanningStatus(dexName, 0);
                        return;
                    }
    
                    if (events.hasNextPage && events.nextCursor) {
                        this.lastScannedBlock = events.nextCursor.toString();
                    }
    
                    const timestamp = Date.now();
                    const validEvents = events.data.filter(event => {
                        const eventTimestamp = event.timestampMs ? Number(event.timestampMs) : timestamp;
                        return eventTimestamp <= timestamp + 5000;
                    });
    
                    await Promise.all(
                        validEvents.map(event => 
                            this.processPoolEvent(event, dex, onPoolFound)
                        )
                    );
                } catch (error) {
                    Logger.error(`Error scanning pools for ${dexName}`, error);
                }
            });
        
            await Promise.all(scanPromises);
            
            // Add a small delay between batches to prevent rate limiting
            if (i < batchCount - 1) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
    }

    private async processPoolEvent(event: any, dex: Dex, onPoolFound: (pool: Pool) => Promise<void>): Promise<void> {
        if (!event?.parsedJson?.pool_id) {
            Logger.error('Invalid event format', event);
            return;
        }

        const poolId = event.parsedJson.pool_id;

        if (this.processingQueue.has(poolId)) {
            Logger.info(`Pool ${poolId} is already being processed`);
            return;
        }

        try {
            this.processingQueue.add(poolId);
            Logger.poolProcessing(poolId, dex.Name);

            const cachedPool = this.poolCache[poolId];
            const validationAttempts = cachedPool ? cachedPool.validationAttempts || 0 : 0;

            if (cachedPool && Date.now() - cachedPool.timestamp < 300000) {
                if (!cachedPool.pool.formattedDate) {
                    cachedPool.pool.formattedDate = formatPoolDate(cachedPool.pool.poolCreated);
                }
                await onPoolFound(cachedPool.pool);
                return;
            }

            if (!event.parsedJson.coin_a || !event.parsedJson.coin_b) {
                Logger.error(`Missing coin information for pool ${poolId}`);
                return;
            }

            const pool: Pool = {
                id: poolId,
                poolId: poolId,
                coin_a: event.parsedJson.coin_a,
                coin_b: event.parsedJson.coin_b,
                dex: dex.Name,
                poolCreated: event.timestamp || Date.now(),
                formattedDate: formatPoolDate(event.timestamp || Date.now()),
                liquidity: '0',
                price: ''
            };

            try {
                const liquidityResult = await Promise.race([
                    dex.getLiquidity(poolId),
                    new Promise<string>((_, reject) => 
                        setTimeout(() => reject(new Error('Liquidity fetch timeout')), 5000)
                    )
                ]);
                pool.liquidity = liquidityResult;
            } catch (error) {
                Logger.error(`Failed to fetch liquidity for pool ${poolId}`, error);
                return;
            }

            const [validationA, validationB] = await Promise.all([
                this.config.tokenSecurity.validateToken(pool.coin_a),
                this.config.tokenSecurity.validateToken(pool.coin_b)
            ]);

            if (validationA.isValid && validationB.isValid) {
                Logger.poolValidated(poolId);
                this.updateCache(poolId, pool);
                await onPoolFound(pool);
            } else if (validationAttempts < this.config.maxValidationAttempts!) {
                Logger.poolValidationFailed(poolId, validationAttempts + 1, this.config.maxValidationAttempts!);
                setTimeout(async () => {
                    await this.processPoolEvent(event, dex, onPoolFound);
                }, this.config.poolMonitoringTimeMs);
                this.updateCache(poolId, pool, validationAttempts + 1);
            } else {
                Logger.poolValidationFailed(poolId, validationAttempts, this.config.maxValidationAttempts!, 
                    !validationA.isValid ? validationA.reason : validationB.reason);
            }
        } catch (error) {
            Logger.error(`Error processing pool ${poolId}`, error);
        } finally {
            this.processingQueue.delete(poolId);
        }
    }

    private async updateCache(poolId: string, pool: Pool, validationAttempts: number = 0) {
        this.poolCache[poolId] = {
            pool,
            timestamp: Date.now(),
            validationAttempts,
            liquidityHistory: [Number(pool.liquidity)]
        };

        // Save to database
        await this.db.savePool(pool);

        const cacheSize = Object.keys(this.poolCache).length;
        if (cacheSize > this.config.maxCacheSize!) {
            const oldestPools = Object.entries(this.poolCache)
                .sort(([, a], [, b]) => a.timestamp - b.timestamp)
                .slice(0, Math.floor(cacheSize * 0.2));
    
            for (const [key] of oldestPools) {
                delete this.poolCache[key];
            }
        }
    }

    stopScanning() {
        console.log(chalk.yellow('Stopping pool scanner...'));
        this.isScanning = false;
        if (this.wsClient) {
            this.wsClient = null;
        }
    }

    /**
     * Scans all pools across all configured DEXes
     * @returns Promise<Pool[]> Array of discovered pools
     */
    async scanAllPools(): Promise<Pool[]> {
        const pools: Pool[] = [];
        const dexEntries = Object.entries(this.dexes);
        
        for (const [dexName, dex] of dexEntries) {
            try {
                Logger.poolHeader(dexName);
                const filter: SuiEventFilter = {
                    MoveEventType: dex.MoveEventType
                };
                
                const events = await this.client.queryEvents({
                    query: filter,
                    order: "descending",
                    limit: 50
                });
                
                if (!events?.data || events.data.length === 0) {
                    Logger.scanningStatus(dexName, 0);
                    continue;
                }
                
                for (const event of events.data) {
                    const pool = await this.extractPoolFromEvent(event, dex);
                    if (pool) {
                        pools.push(pool);
                    }
                }
                
                Logger.scanningStatus(dexName, pools.length);
            } catch (error) {
                Logger.error(`Error scanning pools for ${dexName}`, error);
            }
        }
        
        return pools;
    }
    
    /**
     * Extracts pool information from an event
     * @param event The event containing pool data
     * @param dex The DEX associated with the event
     * @returns Promise<Pool | null> The extracted pool or null if extraction failed
     */
    private async extractPoolFromEvent(event: any, dex: Dex): Promise<Pool | null> {
        try {
            const parsedJson = event.parsedJson as Record<string, any>;
            const poolId = parsedJson.pool_id || parsedJson.poolId;
            
            if (!poolId) return null;
            
            // Check if pool is already in cache
            const cacheKey = `${dex.Name}-${poolId}`;
            if (this.poolCache[cacheKey]) {
                return this.poolCache[cacheKey].pool;
            }
            
            const poolData = await dex.GetPools(this.client, poolId);
            if (!poolData) return null;
            
            const pool: Pool = {
                id: cacheKey,
                poolId,
                coin_a: poolData.coin_a,
                coin_b: poolData.coin_b,
                dex: dex.Name,
                price: poolData.price || '0',
                liquidity: poolData.liquidity || '0',
                poolCreated: Number(event.timestampMs) || Date.now()
            };
            
            // Add to cache
            this.poolCache[cacheKey] = {
                pool,
                timestamp: Date.now(),
                validationAttempts: 0
            };
            
            return pool;
        } catch (error) {
            Logger.error('Error extracting pool from event', error);
            return null;
        }
    }
}
