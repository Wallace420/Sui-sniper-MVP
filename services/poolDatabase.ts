import { Pool } from '../dex';
import { PrismaClient } from '@prisma/client';

export interface PoolDatabaseConfig {
    prismaClient: PrismaClient;
    syncIntervalMs?: number;
    maxCacheSize?: number;
}

interface CachedPool {
    id: string;
    dex: string;
    token0: string;
    token1: string;
    lastChecked: number;
    validationAttempts: number;
    isValid: boolean;
    metadata?: any;
}

export class PoolDatabase {
    private prisma: PrismaClient;
    private cache: Map<string, CachedPool> = new Map();
    private config: Required<PoolDatabaseConfig>;

    constructor(config: PoolDatabaseConfig) {
        this.prisma = config.prismaClient;
        this.config = {
            prismaClient: config.prismaClient,
            syncIntervalMs: config.syncIntervalMs || 5000,
            maxCacheSize: config.maxCacheSize || 1000
        };
    }

    async initialize(): Promise<void> {
        // No initialization needed for Prisma in this class
    }

    async addPool(pool: Pool, isValid: boolean = false): Promise<void> {
        const cachedPool: CachedPool = {
            id: pool.id,
            dex: pool.dex,
            token0: pool.coin_a,
            token1: pool.coin_b,
            lastChecked: Date.now(),
            validationAttempts: 0,
            isValid,
            metadata: pool.metadata
        };

        this.cache.set(pool.id, cachedPool);

        // Maintain cache size
        if (this.cache.size > this.config.maxCacheSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }
    }

    async updatePoolValidation(poolId: string, isValid: boolean): Promise<void> {
        const pool = this.cache.get(poolId);
        if (pool) {
            pool.isValid = isValid;
            pool.validationAttempts++;
            pool.lastChecked = Date.now();
            this.cache.set(poolId, pool);
        }
    }

    async getPool(poolId: string): Promise<CachedPool | null> {
        // Check cache first
        const cachedPool = this.cache.get(poolId);
        if (cachedPool) return cachedPool;

        // If not in cache, check database
        const dbPool = await this.prisma.pool.findUnique({
            where: { poolId: poolId }
        });

        if (dbPool) {
            const pool: CachedPool = {
                id: dbPool.id,
                dex: dbPool.dex,
                token0: dbPool.coinA,
                token1: dbPool.coinB,
                lastChecked: dbPool.lastChecked.getTime(),
                validationAttempts: dbPool.validationAttempts,
                isValid: dbPool.isValid,
                metadata: JSON.parse(dbPool.metadata as string) // Assuming metadata is stored as JSON string
            };
            this.cache.set(poolId, pool);
            return pool;
        }

        return null;
    }

    private async syncCache(): Promise<void> {
        // Sync cache to database (using Prisma)
        for (const [_, pool] of this.cache) {
            await this.prisma.pool.upsert({
                where: { poolId: pool.id },
                update: {
                    dex: pool.dex,
                    coinA: pool.token0,
                    coinB: pool.token1,
                    lastChecked: new Date(pool.lastChecked),
                    validationAttempts: pool.validationAttempts,
                    isValid: pool.isValid,
                    metadata: JSON.stringify(pool.metadata)
                },
                create: {
                    id: pool.id,
                    poolId: pool.id, // Using pool.id as poolId
                    dex: pool.dex,
                    coinA: pool.token0,
                    coinB: pool.token1,
                    created: new Date(),
                    lastChecked: new Date(pool.lastChecked),
                    validationAttempts: pool.validationAttempts,
                    isValid: pool.isValid,
                    metadata: JSON.stringify(pool.metadata)
                }
            });
        }
    }

    async close(): Promise<void> {
        await this.syncCache();
        await this.prisma.$disconnect();
    }
}
