import { SuiClient, SuiEventFilter } from '@mysten/sui/client';
import { WebsocketClient } from '@mysten/sui/dist/cjs/client/rpc-websocket-client';
import { Pool, Dex } from '../dex';
import { TokenSecurity } from './tokenSecurity';
import { MEVProtection } from './mevProtection';
import chalk from 'chalk';
import { WebSocketWrapper, EnhancedWebsocketClient } from './websocket/WebSocketWrapper';

export interface DirectPoolScannerConfig {
    scanIntervalMs: number;
    batchSize: number;
    tokenSecurity: TokenSecurity;
    mevProtection: MEVProtection;
    maxCacheSize?: number;
    maxValidationAttempts: number;
    poolMonitoringTimeMs: number;
    wsEndpoint?: string;
    minLiquidityThreshold?: number;
}

interface PoolCache {
    [key: string]: {
        pool: Pool;
        timestamp: number;
        validationAttempts: number;
        lastLiquidityCheck: number;
        liquidityHistory: number[];
        riskScore: number;
    };
}

export class DirectPoolScanner {
    private client: SuiClient;
    private config: DirectPoolScannerConfig;
    private dexes: Record<string, Dex>;
    private isScanning: boolean = false;
    private poolCache: PoolCache = {};
    private processingQueue: Set<string> = new Set();
    private lastScanTime: number = 0;
    private readonly SCAN_DELAY = 1000; // 1 second minimum delay between scans
    private readonly MIN_LIQUIDITY_THRESHOLD = 1000; // Minimum liquidity in SUI
    private ws: WebSocketWrapper | null = null;

    constructor(client: SuiClient, dexes: Record<string, Dex>, config: DirectPoolScannerConfig) {
        this.client = client;
        this.dexes = dexes;
        this.config = {
            scanIntervalMs: Math.max(config.scanIntervalMs || 1000, this.SCAN_DELAY),
            batchSize: Math.min(config.batchSize || 50, 100), // Limit batch size to prevent overload
            tokenSecurity: config.tokenSecurity,
            mevProtection: config.mevProtection,
            maxCacheSize: config.maxCacheSize || 1000,
            maxValidationAttempts: config.maxValidationAttempts,
            poolMonitoringTimeMs: config.poolMonitoringTimeMs,
            wsEndpoint: config.wsEndpoint,
            minLiquidityThreshold: config.minLiquidityThreshold || this.MIN_LIQUIDITY_THRESHOLD
        };
    }

    async startScanning(onPoolFound: (pool: Pool) => Promise<void>) {
        if (this.isScanning) {
            console.log('Scanner is already running');
            return;
        }

        console.log('Starting pool scanner...');
        this.isScanning = true;
        this.lastScanTime = Date.now();

        // Initialize WebSocket if endpoint provided
        if (this.config.wsEndpoint) {
            this.initializeWebSocket(onPoolFound);
        }

        while (this.isScanning) {
            try {
                const now = Date.now();
                const timeSinceLastScan = now - this.lastScanTime;

                if (timeSinceLastScan < this.SCAN_DELAY) {
                    await new Promise(resolve => setTimeout(resolve, this.SCAN_DELAY - timeSinceLastScan));
                    continue;
                }

                this.lastScanTime = now;
                await this.scanAllDexes(onPoolFound);
                await new Promise(resolve => setTimeout(resolve, this.config.scanIntervalMs));
            } catch (error) {
                console.error('Error during pool scanning:', error);
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5s on error
            }
        }
    }

    private async scanAllDexes(onPoolFound: (pool: Pool) => Promise<void>) {
        console.debug('Starting new scan cycle...');
        const scanPromises = Object.values(this.dexes).map(dex => this.scanDex(dex, onPoolFound));
        await Promise.all(scanPromises);
        this.cleanupCache();
    }

    private async scanDex(dex: Dex, onPoolFound: (pool: Pool) => Promise<void>) {
        try {
            console.debug(`Scanning ${dex.Name}...`);
            const pools = await dex.GetPools();
            console.debug(`Found ${pools.length} pools from ${dex.Name}`);

            if (pools.length === 0) return;

            // Process pools in batches with rate limiting
            for (let i = 0; i < pools.length; i += this.config.batchSize) {
                const batch = pools.slice(i, i + this.config.batchSize);
                await Promise.all(batch.map(pool => this.processPool(pool, dex, onPoolFound)));
                
                if (i + this.config.batchSize < pools.length) {
                    await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay between batches
                }
            }
        } catch (error) {
            console.error(`Error scanning ${dex.Name}:`, error);
        }
    }

    private async processPool(pool: Pool, dex: Dex, onPoolFound: (pool: Pool) => Promise<void>) {
        if (this.processingQueue.has(pool.id)) {
            console.log(chalk.gray(`Pool ${pool.id} is already being processed`));
            return;
        }

        try {
            this.processingQueue.add(pool.id);
            console.log(chalk.cyan(`Processing pool ${pool.id} from ${dex.Name}`));
            const now = Date.now();

            // Validate pool existence
            try {
                const poolObject = await this.client.getObject({
                    id: pool.id,
                    options: { showContent: true }
                });

                if (!poolObject?.data?.content) {
                    console.error(chalk.red(`Pool ${pool.id} not found or invalid`));
                    return;
                }
            } catch (error) {
                console.error(chalk.red(`Error validating pool ${pool.id}:`), error);
                return;
            }

            // Check cache and handle stale data
            const cachedPool = this.poolCache[pool.id];
            if (cachedPool) {
                if (now - cachedPool.timestamp > 3600000) { // 1 hour
                    delete this.poolCache[pool.id];
                } else {
                    if (now - cachedPool.lastLiquidityCheck > 60000) { // 1 minute
                        try {
                            const liquidity = await Promise.race([
                                dex.getLiquidity(pool.id),
                                new Promise<string>((_, reject) => 
                                    setTimeout(() => reject(new Error('Liquidity fetch timeout')), 5000)
                                )
                            ]);
                            cachedPool.pool.liquidity = liquidity;
                            cachedPool.lastLiquidityCheck = now;
                            console.log(chalk.blue(`Updated liquidity for pool ${pool.id}: ${liquidity}`));
                        } catch (error) {
                            console.error(chalk.red(`Error updating liquidity for pool ${pool.id}:`), error);
                        }
                    }
                    return;
                }
            }

            // Skip old pools
            const AGE_THRESHOLD = 30000; // 30 seconds
            if (pool.poolCreated && (now - pool.poolCreated > AGE_THRESHOLD)) {
                this.poolCache[pool.id] = {
                    pool,
                    timestamp: now,
                    validationAttempts: 0,
                    lastLiquidityCheck: now,
                    liquidityHistory: [Number(pool.liquidity)],
                    riskScore: 0
                };
                console.log(chalk.gray(`Skipping old pool ${pool.id} (age: ${(now - pool.poolCreated) / 1000}s)`));
                return;
            }

            // Get initial liquidity
            try {
                const liquidityResult = await Promise.race([
                    dex.getLiquidity(pool.id),
                    new Promise<string>((_, reject) => 
                        setTimeout(() => reject(new Error('Initial liquidity fetch timeout')), 5000)
                    )
                ]);
                pool.liquidity = liquidityResult;
                console.log(chalk.blue(`Initial liquidity for pool ${pool.id}: ${pool.liquidity}`));
            } catch (error) {
                console.error(chalk.red(`Failed to fetch initial liquidity for pool ${pool.id}:`), error);
                return;
            }

            // Validate tokens
            let validationAttempts = 0;
            let validationA, validationB;
            while (validationAttempts < this.config.maxValidationAttempts) {
                [validationA, validationB] = await Promise.all([
                    this.config.tokenSecurity.validateToken(pool.coin_a),
                    this.config.tokenSecurity.validateToken(pool.coin_b)
                ]);

                if (validationA.isValid && validationB.isValid) {
                    break;
                }

                validationAttempts++;
                if (validationAttempts < this.config.maxValidationAttempts) {
                    await new Promise(resolve => setTimeout(resolve, this.config.poolMonitoringTimeMs));
                }
            }

            if (validationA.isValid && validationB.isValid) {
                console.log(chalk.green(`Pool ${pool.id} passed security validation`));
                this.addToCache(pool);
                await onPoolFound(pool);
            } else {
                console.warn(chalk.yellow(`Pool ${pool.id} failed validation after ${validationAttempts} attempts:`),
                    !validationA.isValid ? validationA.reason : validationB.reason);
            }
        } catch (error) {
            console.error(chalk.red(`Error processing pool ${pool.id}:`), error);
        } finally {
            this.processingQueue.delete(pool.id);
        }
    }

    private addToCache(pool: Pool) {
        const now = Date.now();
        this.poolCache[pool.id] = {
            pool,
            timestamp: now,
            validationAttempts: 0,
            lastLiquidityCheck: now,
            liquidityHistory: [Number(pool.liquidity || 0)], // Handle case where liquidity might be undefined
            riskScore: 0 // Initialize with default risk score
        };
        this.cleanupCache();
    }

    private cleanupCache() {
        const cacheSize = Object.keys(this.poolCache).length;
        if (cacheSize > this.config.maxCacheSize!) {
            console.debug(`Cache cleanup: removing ${Math.floor(cacheSize * 0.2)} oldest entries`);
            const oldestPools = Object.entries(this.poolCache)
                .sort(([, a], [, b]) => a.timestamp - b.timestamp)
                .slice(0, Math.floor(cacheSize * 0.2));

            for (const [key] of oldestPools) {
                delete this.poolCache[key];
            }
        }
    }

    private async initializeWebSocket(onPoolFound: (pool: Pool) => Promise<void>) {
        if (!this.config.wsEndpoint || this.ws) return;

        try {
            this.ws = new WebSocketWrapper(this.config.wsEndpoint);

            this.ws.onopen = () => {
                console.log(chalk.green('WebSocket connected'));
                if (this.ws) {
                    this.ws.send(JSON.stringify({
                        jsonrpc: '2.0',
                        id: 1,
                        method: 'sui_subscribeBlock',
                        params: []
                    }));
                }
            };

            this.ws.onmessage = async (data) => {
                try {
                    const parsedData = JSON.parse(data.toString());
                    if (parsedData.method === 'sui_subscribeBlock') {
                        await this.scanAllDexes(onPoolFound);
                    }
                } catch (error) {
                    console.error(chalk.red('Error processing WebSocket message:'), error);
                }
            };

            this.ws.onerror = (error) => {
                console.error(chalk.red('WebSocket error:'), error);
                this.handleWebSocketReconnect(onPoolFound);
            };

            this.ws.onclose = (code, reason) => {
                console.log(chalk.yellow(`WebSocket disconnected (${code}): ${reason}`));
                this.handleWebSocketReconnect(onPoolFound);
            };
        } catch (error) {
            console.error(chalk.red('Error setting up WebSocket:'), error);
            this.handleWebSocketReconnect(onPoolFound);
        }
    }

    private handleWebSocketReconnect(onPoolFound: (pool: Pool) => Promise<void>) {
        if (!this.isScanning) return;
        console.log(chalk.yellow('Attempting to reconnect WebSocket...'));
        setTimeout(() => this.initializeWebSocket(onPoolFound), 5000);
    }

    stopScanning() {
        console.log('Stopping pool scanner...');
        this.isScanning = false;
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}