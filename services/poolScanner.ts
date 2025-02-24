import { SuiClient, SuiEventFilter } from '@mysten/sui/client';
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
}

export class PoolScanner {
    private client: SuiClient;
    private config: PoolScannerConfig;
    private dexes: Record<string, Dex>;
    private lastScannedBlock: string | null = null;
    private isScanning: boolean = false;

    constructor(client: SuiClient, dexes: Record<string, Dex>, config: PoolScannerConfig) {
        this.client = client;
        this.dexes = dexes;
        this.config = {
            scanIntervalMs: config.scanIntervalMs || 1000,
            concurrentScans: config.concurrentScans || 3,
            wsEndpoint: config.wsEndpoint,
            rpcEndpoint: config.rpcEndpoint,
            tokenSecurity: config.tokenSecurity,
            mevProtection: config.mevProtection
        };
    }

    async startScanning(onPoolFound: (pool: Pool) => Promise<void>) {
        if (this.isScanning) return;
        this.isScanning = true;

        // Start WebSocket connection if endpoint provided
        if (this.config.wsEndpoint) {
            this.startWebSocketListener(onPoolFound);
        }

        while (this.isScanning) {
            try {
                await this.scanNewPools(onPoolFound);
                await new Promise(resolve => setTimeout(resolve, this.config.scanIntervalMs));
            } catch (error) {
                console.error('Error during pool scanning:', error);
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
                    filter.StartingSequenceNumber = this.lastScannedBlock;
                }

                const events = await this.client.queryEvents({
                    query: filter
                });

                for (const event of events.data) {
                    const pool = await this.processPoolEvent(event, dex);
                    if (pool) {
                        const validation = await this.config.tokenSecurity.validateToken(pool.coin_a);
                        if (validation.isValid) {
                            await onPoolFound(pool);
                        }
                    }
                }

                if (events.hasNextPage && events.nextCursor) {
                    this.lastScannedBlock = events.nextCursor.toString();
                }
            } catch (error) {
                console.error(`Error scanning ${dex.Name}:`, error);
            }
        });

        await Promise.all(scanPromises.slice(0, this.config.concurrentScans));
    }

    private async processPoolEvent(event: any, dex: Dex): Promise<Pool | null> {
        try {
            const poolData = event.parsedJson;
            const pool: Pool = {
                poolId: poolData.pool_id,
                coin_a: poolData.coin_a,
                coin_b: poolData.coin_b,
                dex: dex.Name,
                poolCreated: Date.now(),
                liquidity: await dex.getLiquidity(poolData.pool_id)
            };
            return pool;
        } catch (error) {
            console.error('Error processing pool event:', error);
            return null;
        }
    }

    private async startWebSocketListener(onPoolFound: (pool: Pool) => Promise<void>) {
        // Implement WebSocket connection for real-time pool creation events
        // This will vary based on the WebSocket API being used
        console.log('WebSocket listener not implemented yet');
    }

    stopScanning() {
        this.isScanning = false;
    }
}
