import { SuiClient, SuiEventFilter } from '@mysten/sui/client';
import { SuiClient as WebsocketClient } from '@mysten/sui/client';
import { Pool, Dex } from '../dex';
import { TokenSecurity } from './tokenSecurity';
import { MEVProtection } from './mevProtection';

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
}

interface PoolCache {
    [key: string]: {
        pool: Pool;
        timestamp: number;
        validationAttempts: number;
    };
}

export class PoolScanner {
    private client: SuiClient;
    private wsClient: WebsocketClient | null = null;
    private config: PoolScannerConfig;
    private dexes: Record<string, Dex>;
    private lastScannedBlock: string | null = null;
    private isScanning: boolean = false;
    private poolCache: PoolCache = {};
    private processingQueue: Set<string> = new Set();
    private reconnectAttempts: number = 0;
    private readonly MAX_RECONNECT_ATTEMPTS = 5;

    constructor(client: SuiClient, dexes: Record<string, Dex>, config: PoolScannerConfig) {
        this.client = client;
        this.dexes = dexes;
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
            poolMonitoringTimeMs: config.poolMonitoringTimeMs
        };
    }

    async startScanning(onPoolFound: (pool: Pool) => Promise<void>) {
        if (this.isScanning) return;
        this.isScanning = true;

        if (this.config.wsEndpoint) {
            await this.setupWebSocketConnection(onPoolFound);
        }

        while (this.isScanning) {
            try {
                await this.scanNewPools(onPoolFound);
                await new Promise(resolve => setTimeout(resolve, this.config.scanIntervalMs));
            } catch (error) {
                console.error('Error during pool scanning:', error);
                await this.handleScanningError(error);
            }
        }
    }

    private async scanNewPools(onPoolFound: (pool: Pool) => Promise<void>) {
        const scanPromises = Object.values(this.dexes).map(async dex => {
            try {
                const filter: SuiEventFilter = {
                    MoveEventType: dex.MoveEventType
                };
                
                if (this.lastScannedBlock) {
                    Object.assign(filter, {
                        cursor: this.lastScannedBlock
                    });
                }

                const events = await this.client.queryEvents({
                    query: filter
                });

                const poolPromises = events.data.map(event => 
                    this.processPoolEvent(event, dex, onPoolFound)
                );

                await Promise.all(poolPromises.slice(0, this.config.concurrentScans));

                if (events.hasNextPage && events.nextCursor) {
                    this.lastScannedBlock = events.nextCursor.toString();
                }
            } catch (error) {
                console.error(`Error scanning ${dex.Name}:`, error);
            }
        });

        await Promise.all(scanPromises);
    }

    private async processPoolEvent(event: any, dex: Dex, onPoolFound: (pool: Pool) => Promise<void>): Promise<void> {
        if (!event?.parsedJson?.pool_id) {
            console.error('Invalid event format:', event);
            return;
        }

        const poolId = event.parsedJson.pool_id;

        if (this.processingQueue.has(poolId)) {
            console.debug(`Pool ${poolId} is already being processed`);
            return;
        }

        try {
            this.processingQueue.add(poolId);
            console.debug(`Processing pool ${poolId} from ${dex.Name}`);

            const cachedPool = this.poolCache[poolId];
            const validationAttempts = cachedPool ? cachedPool.validationAttempts || 0 : 0;

            if (cachedPool && Date.now() - cachedPool.timestamp < 60000) { // 1 minute cache
                console.debug(`Using cached pool data for ${poolId}`);
                await onPoolFound(cachedPool.pool);
                return;
            }

            if (!event.parsedJson.coin_a || !event.parsedJson.coin_b) {
                console.error(`Missing coin information for pool ${poolId}`);
                return;
            }

            const pool: Pool = {
                id: poolId,
                poolId: poolId,
                coin_a: event.parsedJson.coin_a,
                coin_b: event.parsedJson.coin_b,
                dex: dex.Name,
                poolCreated: Date.now(),
                liquidity: '0' // Initialize with 0
            };

            try {
                pool.liquidity = await Promise.race([
                    dex.getLiquidity(poolId),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Liquidity fetch timeout')), 5000)
                    )
                ]);
            } catch (error) {
                console.error(`Failed to fetch liquidity for pool ${poolId}:`, error);
                return;
            }

            const [validationA, validationB] = await Promise.all([
                this.config.tokenSecurity.validateToken(pool.coin_a),
                this.config.tokenSecurity.validateToken(pool.coin_b)
            ]);

            if (validationA.isValid && validationB.isValid) {
                console.debug(`Pool ${poolId} passed security validation`);
                this.updateCache(poolId, pool);
                await onPoolFound(pool);
            } else if (validationAttempts < this.config.maxValidationAttempts!) {
                // Monitor pool for potential changes
                console.debug(`Pool ${poolId} failed validation, monitoring for changes...`);
                setTimeout(async () => {
                    await this.processPoolEvent(event, dex, onPoolFound);
                }, this.config.poolMonitoringTimeMs);
                this.updateCache(poolId, pool, validationAttempts + 1);
            } else {
                console.warn(`Pool ${poolId} failed security validation after ${validationAttempts} attempts:`,
                    !validationA.isValid ? validationA.reason : validationB.reason);
            }
        } catch (error) {
            console.error(`Error processing pool ${poolId}:`, error);
        } finally {
            this.processingQueue.delete(poolId);
        }
    }

    private updateCache(poolId: string, pool: Pool, validationAttempts: number = 0) {
        this.poolCache[poolId] = {
            pool,
            timestamp: Date.now(),
            validationAttempts
        };

        const cacheSize = Object.keys(this.poolCache).length;
        if (cacheSize > this.config.maxCacheSize!) {
            const oldestPools = Object.entries(this.poolCache)
                .sort(([, a], [, b]) => a.timestamp - b.timestamp)
                .slice(0, Math.floor(cacheSize * 0.2)); // Remove oldest 20%

            for (const [key] of oldestPools) {
                delete this.poolCache[key];
            }
        }
    }

    stopScanning() {
        this.isScanning = false;
        if (this.wsClient) {
            this.wsClient = null;
        }
    }
}
