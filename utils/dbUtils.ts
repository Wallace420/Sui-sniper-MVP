import { Pool } from '../dex';
import { PrismaClient } from '@prisma/client';

export class DatabaseUtils {
    private static prisma: PrismaClient;

    static initialize(): void {
        if (!DatabaseUtils.prisma) {
            DatabaseUtils.prisma = new PrismaClient();
        }
    }

    static async upsertPool(pool: Pool): Promise<void> {
        try {
            DatabaseUtils.initialize();
            await DatabaseUtils.prisma.pool.upsert({
                where: { poolId: pool.poolId },
                update: {
                    lastSeen: new Date(),
                    liquidity: pool.liquidity,
                    liquidityHistory: await DatabaseUtils.updateLiquidityHistory(pool)
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
        } catch (error) {
            console.error('Error in upsertPool:', error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }

    private static async updateLiquidityHistory(pool: Pool): Promise<string> {
        try {
            const existingPool = await DatabaseUtils.prisma.pool.findUnique({
                where: { poolId: pool.poolId }
            });

            if (!existingPool?.liquidityHistory) {
                return JSON.stringify([Number(pool.liquidity)]);
            }

            const history = JSON.parse(existingPool.liquidityHistory as string);
            history.push(Number(pool.liquidity));

            // Keep only last 100 entries for performance
            if (history.length > 100) {
                history.shift();
            }

            return JSON.stringify(history);
        } catch (error) {
            console.error('Error updating liquidity history:', error instanceof Error ? error.message : 'Unknown error');
            throw error;
        }
    }

    static async getPoolByID(poolId: string): Promise<Pool | null> {
        try {
            DatabaseUtils.initialize();
            const pool = await DatabaseUtils.prisma.pool.findUnique({
                where: { poolId }
            });
            return pool as unknown as Pool;
        } catch (error) {
            console.error('Error in getPoolByID:', error instanceof Error ? error.message : 'Unknown error');
            return null;
        }
    }

    static async cleanup(): Promise<void> {
        if (DatabaseUtils.prisma) {
            await DatabaseUtils.prisma.$disconnect();
        }
    }
}