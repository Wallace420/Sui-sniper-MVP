import { PrismaClient } from '@prisma/client';
import { Pool } from '../../dex';

export class PoolDatabase {
    private prisma: PrismaClient;

    constructor() {
        this.prisma = new PrismaClient();
    }

    async savePool(pool: Pool): Promise<void> {
        try {
            await this.prisma.pool.upsert({
                where: { poolId: pool.poolId },
                update: {
                    lastSeen: new Date(),
                    liquidity: pool.liquidity,
                    liquidityHistory: this.updateLiquidityHistory(pool)
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
            console.error('Error saving pool:', error);
            throw error;
        }
    }

    private async updateLiquidityHistory(pool: Pool): Promise<string> {
        try {
            const existingPool = await this.prisma.pool.findUnique({
                where: { poolId: pool.poolId }
            });

            if (!existingPool?.liquidityHistory) {
                return JSON.stringify([Number(pool.liquidity)]);
            }

            const history = JSON.parse(existingPool.liquidityHistory as string);
            history.push(Number(pool.liquidity));

            // Keep only last 100 entries
            if (history.length > 100) {
                history.shift();
            }

            return JSON.stringify(history);
        } catch (error) {
            console.error('Error updating liquidity history:', error);
            return JSON.stringify([Number(pool.liquidity)]);
        }
    }

    async updatePoolValidation(poolId: string, isValid: boolean): Promise<void> {
        try {
            await this.prisma.pool.update({
                where: { poolId },
                data: {
                    isValid,
                    validations: { increment: 1 }
                }
            });
        } catch (error) {
            console.error('Error updating pool validation:', error);
            throw error;
        }
    }

    async getPool(poolId: string): Promise<Pool | null> {
        try {
            const dbPool = await this.prisma.pool.findUnique({
                where: { poolId }
            });

            if (!dbPool) return null;

            return {
                id: dbPool.id,
                poolId: dbPool.poolId,
                dex: dbPool.dex,
                coin_a: dbPool.coinA,
                coin_b: dbPool.coinB,
                liquidity: dbPool.liquidity,
                poolCreated: dbPool.poolCreated.getTime(),
                formattedDate: dbPool.poolCreated.toISOString(),
                price: '0' // Adding default price as required by Pool interface
            };
        } catch (error) {
            console.error('Error getting pool:', error);
            return null;
        }
    }

    async updateScanCursor(lastBlock: string): Promise<void> {
        try {
            await this.prisma.poolScanCursor.upsert({
                where: { id: 'last_cursor' },
                update: {
                    lastBlock,
                    lastScanTime: new Date()
                },
                create: {
                    lastBlock,
                    lastScanTime: new Date()
                }
            });
        } catch (error) {
            console.error('Error updating scan cursor:', error);
            throw error;
        }
    }

    async getLastScannedBlock(): Promise<string | null> {
        try {
            const cursor = await this.prisma.poolScanCursor.findUnique({
                where: { id: 'last_cursor' }
            });
            return cursor?.lastBlock || null;
        } catch (error) {
            console.error('Error getting last scanned block:', error);
            return null;
        }
    }
}