import { Pool } from '../dex';
import Datastore from 'nedb-promises';
export interface PoolDatabaseConfig {
    dbPath: string;
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
    private db: SQLiteDB | null = null;
    private cache: Map<string, CachedPool> = new Map();
    private config: Required<PoolDatabaseConfig>;

    constructor(config: PoolDatabaseConfig) {
        this.config = {
            dbPath: config.dbPath,
            syncIntervalMs: config.syncIntervalMs || 5000,
            maxCacheSize: config.maxCacheSize || 1000
        };
    }

    async initialize(): Promise<void> {
        this.db = await open({
            filename: this.config.dbPath,
            driver: Database
        });

        await this.db.exec(`
            CREATE TABLE IF NOT EXISTS pools (
                id TEXT PRIMARY KEY,
                dex TEXT NOT NULL,
                token0 TEXT NOT NULL,
                token1 TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                last_checked INTEGER NOT NULL,
                validation_attempts INTEGER DEFAULT 0,
                is_valid BOOLEAN DEFAULT 0,
                metadata TEXT
            )
        `);

        // Start periodic sync
        setInterval(() => this.syncCache(), this.config.syncIntervalMs);
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
            this.cache.delete(oldestKey);
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
        if (this.db) {
            const row = await this.db.get(
                'SELECT * FROM pools WHERE id = ?',
                [poolId]
            );

            if (row) {
                const pool: CachedPool = {
                    id: row.id,
                    dex: row.dex,
                    token0: row.token0,
                    token1: row.token1,
                    lastChecked: row.last_checked,
                    validationAttempts: row.validation_attempts,
                    isValid: Boolean(row.is_valid),
                    ...JSON.parse(row.metadata)
                };
                this.cache.set(poolId, pool);
                return pool;
            }
        }

        return null;
    }

    private async syncCache(): Promise<void> {
        if (!this.db) return;

        const stmt = await this.db.prepare(`
            INSERT OR REPLACE INTO pools (
                id, dex, token0, token1, created_at, last_checked,
                validation_attempts, is_valid, metadata
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const [_, pool] of this.cache) {
            const { id, dex, token0, token1, lastChecked, validationAttempts, isValid, ...metadata } = pool;
            await stmt.run(
                id,
                dex,
                token0,
                token1,
                Date.now(),
                lastChecked,
                validationAttempts,
                isValid ? 1 : 0,
                JSON.stringify(metadata)
            );
        }

        await stmt.finalize();
    }

    async close(): Promise<void> {
        await this.syncCache();
        if (this.db) await this.db.close();
    }
}
