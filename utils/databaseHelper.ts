/**
 * Unified database helper utility for pool operations
 * This module standardizes database operations across the application
 * and eliminates duplicate code between different implementations
 */

import { Pool } from '../dex';
import { PrismaClient } from '@prisma/client';
import { CacheUtils, CacheStore } from './cacheUtils';

// Configuration interface for database operations
export interface DatabaseConfig {
  /** Maximum number of liquidity history entries to keep */
  maxHistoryEntries?: number;
  /** Cache TTL in milliseconds */
  cacheTtl?: number;
  /** Whether to use caching for database operations */
  useCache?: boolean;
}

/**
 * Unified database helper for pool operations
 * Provides standardized methods for database interactions with built-in caching
 */
export class DatabaseHelper {
  private static prisma: PrismaClient;
  private static poolCache: CacheStore<Pool>;
  private static config: Required<DatabaseConfig> = {
    maxHistoryEntries: 100,
    cacheTtl: 5 * 60 * 1000, // 5 minutes default
    useCache: true
  };

  /**
   * Initialize the database helper with configuration
   * @param config Configuration options
   */
  static initialize(config?: DatabaseConfig): void {
    // Merge provided config with defaults
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Initialize Prisma if not already initialized
    if (!DatabaseHelper.prisma) {
      DatabaseHelper.prisma = new PrismaClient();
    }

    // Initialize cache if enabled
    if (this.config.useCache && !DatabaseHelper.poolCache) {
      DatabaseHelper.poolCache = CacheUtils.getStore<Pool>('pools', {
        ttl: this.config.cacheTtl,
        maxSize: 1000
      });
    }
  }

  /**
   * Save or update a pool in the database with caching
   * @param pool The pool to save
   * @returns Promise resolving when the operation is complete
   */
  static async upsertPool(pool: Pool): Promise<void> {
    try {
      // Ensure initialization
      if (!DatabaseHelper.prisma) {
        DatabaseHelper.initialize();
      }

      // Update database
      await DatabaseHelper.prisma.pool.upsert({
        where: { poolId: pool.poolId },
        update: {
          lastSeen: new Date(),
          liquidity: pool.liquidity,
          liquidityHistory: await DatabaseHelper.updateLiquidityHistory(pool)
        },
        create: {
          id: pool.id,
          poolId: pool.poolId,
          dex: pool.dex,
          coinA: pool.coin_a,
          coinB: pool.coin_b,
          liquidity: pool.liquidity,
          poolCreated: new Date(pool.poolCreated),
          liquidityHistory: JSON.stringify([Number(pool.liquidity)])
        }
      });

      // Update cache if enabled
      if (this.config.useCache) {
        DatabaseHelper.poolCache.set(pool.poolId, pool);
      }
    } catch (error) {
      console.error('Error in upsertPool:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Update the liquidity history for a pool
   * @param pool The pool with updated liquidity
   * @returns JSON string of the updated history
   */
  private static async updateLiquidityHistory(pool: Pool): Promise<string> {
    try {
      const existingPool = await DatabaseHelper.prisma.pool.findUnique({
        where: { poolId: pool.poolId }
      });

      if (!existingPool?.liquidityHistory) {
        return JSON.stringify([Number(pool.liquidity)]);
      }

      const history = JSON.parse(existingPool.liquidityHistory as string);
      history.push(Number(pool.liquidity));

      // Keep only the configured number of entries for performance
      if (history.length > this.config.maxHistoryEntries) {
        history.shift();
      }

      return JSON.stringify(history);
    } catch (error) {
      console.error('Error updating liquidity history:', error instanceof Error ? error.message : 'Unknown error');
      return JSON.stringify([Number(pool.liquidity)]);
    }
  }

  /**
   * Update pool validation status
   * @param poolId The ID of the pool to update
   * @param isValid Whether the pool is valid
   */
  static async updatePoolValidation(poolId: string, isValid: boolean): Promise<void> {
    try {
      if (!DatabaseHelper.prisma) {
        DatabaseHelper.initialize();
      }

      await DatabaseHelper.prisma.pool.update({
        where: { poolId },
        data: {
          isValid,
          validations: { increment: 1 }
        }
      });

      // Update cache if enabled and the pool is in cache
      if (this.config.useCache && DatabaseHelper.poolCache.has(poolId)) {
        const cachedPool = DatabaseHelper.poolCache.get(poolId);
        if (cachedPool) {
          // Create a new object to avoid reference issues
          const updatedPool = { ...cachedPool, isValid };
          DatabaseHelper.poolCache.set(poolId, updatedPool);
        }
      }
    } catch (error) {
      console.error('Error updating pool validation:', error instanceof Error ? error.message : 'Unknown error');
      throw error;
    }
  }

  /**
   * Get a pool by its ID with caching
   * @param poolId The ID of the pool to retrieve
   * @returns The pool or null if not found
   */
  static async getPoolByID(poolId: string): Promise<Pool | null> {
    try {
      // Check cache first if enabled
      if (this.config.useCache) {
        const cachedPool = DatabaseHelper.poolCache.get(poolId);
        if (cachedPool) return cachedPool;
      }

      // If not in cache or caching disabled, query database
      if (!DatabaseHelper.prisma) {
        DatabaseHelper.initialize();
      }

      const dbPool = await DatabaseHelper.prisma.pool.findUnique({
        where: { poolId }
      });

      if (!dbPool) return null;

      // Convert database record to Pool object
      const pool: Pool = {
        id: dbPool.id,
        poolId: dbPool.poolId,
        dex: dbPool.dex,
        coin_a: dbPool.coinA,
        coin_b: dbPool.coinB,
        liquidity: dbPool.liquidity,
        poolCreated: dbPool.poolCreated.getTime(),
        formattedDate: dbPool.poolCreated.toISOString()
      };

      // Update cache if enabled
      if (this.config.useCache) {
        DatabaseHelper.poolCache.set(poolId, pool);
      }

      return pool;
    } catch (error) {
      console.error('Error in getPoolByID:', error instanceof Error ? error.message : 'Unknown error');
      return null;
    }
  }

  /**
   * Clean up database connections
   */
  static async cleanup(): Promise<void> {
    if (DatabaseHelper.prisma) {
      await DatabaseHelper.prisma.$disconnect();
    }

    // Clear cache if enabled
    if (this.config.useCache) {
      CacheUtils.clearCache('pools');
    }
  }
}