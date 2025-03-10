import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import { DatabaseUtils } from '../../utils/dbUtils';
import { Pool } from '../../dex';

// Mock PrismaClient
jest.mock('@prisma/client', () => {
  const mockPrismaClient = {
    pool: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn()
    },
    $disconnect: jest.fn()
  };
  return { PrismaClient: jest.fn(() => mockPrismaClient) };
});

describe('Database Utilities', () => {
  // Sample pool for testing
  const samplePool: Pool = {
    id: 'pool1',
    poolId: 'pool1',
    coin_a: 'coin_a_address::module::type',
    coin_b: 'coin_b_address::module::type',
    dex: 'TestDex',
    poolCreated: Date.now(),
    price: '1.5',
    liquidity: '1000'
  };

  // Get the mocked PrismaClient
  let mockPrisma: any;

  beforeEach(() => {
    // Reset the DatabaseUtils before each test
    jest.resetModules();
    // Import the module again to reset the static prisma instance
    jest.isolateModules(() => {
      const { DatabaseUtils: ResetDatabaseUtils } = require('../../utils/dbUtils');
      // @ts-ignore - Accessing private static property for testing
      ResetDatabaseUtils.prisma = undefined;
    });
    
    // Get the mock instance
    mockPrisma = require('@prisma/client').PrismaClient();
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    // Clean up after each test
    DatabaseUtils.cleanup();
  });

  describe('initialize', () => {
    test('should create PrismaClient instance if not exists', () => {
      // Act
      DatabaseUtils.initialize();
      
      // Assert
      const prismaClientConstructor = require('@prisma/client').PrismaClient;
      expect(prismaClientConstructor).toHaveBeenCalledTimes(1);
    });

    test('should not create new PrismaClient if already initialized', () => {
      // Arrange
      DatabaseUtils.initialize(); // First initialization
      const prismaClientConstructor = require('@prisma/client').PrismaClient;
      prismaClientConstructor.mockClear();
      
      // Act
      DatabaseUtils.initialize(); // Second initialization
      
      // Assert
      expect(prismaClientConstructor).not.toHaveBeenCalled();
    });
  });

  describe('upsertPool', () => {
    test('should create new pool record if not exists', async () => {
      // Arrange
      mockPrisma.pool.findUnique.mockResolvedValue(null);
      mockPrisma.pool.upsert.mockResolvedValue(samplePool);
      
      // Act
      await DatabaseUtils.upsertPool(samplePool);
      
      // Assert
      expect(mockPrisma.pool.upsert).toHaveBeenCalledWith({
        where: { poolId: samplePool.poolId },
        update: expect.any(Object),
        create: expect.objectContaining({
          id: samplePool.id,
          poolId: samplePool.poolId,
          dex: samplePool.dex,
          coinA: samplePool.coin_a,
          coinB: samplePool.coin_b,
          liquidity: samplePool.liquidity
        })
      });
    });

    test('should update existing pool record', async () => {
      // Arrange
      const existingPool = {
        ...samplePool,
        liquidityHistory: JSON.stringify([500])
      };
      mockPrisma.pool.findUnique.mockResolvedValue(existingPool);
      mockPrisma.pool.upsert.mockResolvedValue(existingPool);
      
      // Act
      await DatabaseUtils.upsertPool(samplePool);
      
      // Assert
      expect(mockPrisma.pool.upsert).toHaveBeenCalledWith({
        where: { poolId: samplePool.poolId },
        update: expect.objectContaining({
          lastSeen: expect.any(Date),
          liquidity: samplePool.liquidity
        }),
        create: expect.any(Object)
      });
    });

    test('should handle errors gracefully', async () => {
      // Arrange
      const error = new Error('Database error');
      mockPrisma.pool.upsert.mockRejectedValue(error);
      
      // Act & Assert
      await expect(DatabaseUtils.upsertPool(samplePool)).rejects.toThrow();
    });
  });

  describe('updateLiquidityHistory', () => {
    test('should create new history array if pool does not exist', async () => {
      // Arrange
      mockPrisma.pool.findUnique.mockResolvedValue(null);
      
      // Act
      // @ts-ignore - Accessing private static method for testing
      const result = await DatabaseUtils.updateLiquidityHistory(samplePool);
      
      // Assert
      expect(result).toBe(JSON.stringify([Number(samplePool.liquidity)]));
    });

    test('should append to existing history array', async () => {
      // Arrange
      const existingHistory = [500, 600, 700];
      mockPrisma.pool.findUnique.mockResolvedValue({
        liquidityHistory: JSON.stringify(existingHistory)
      });
      
      // Act
      // @ts-ignore - Accessing private static method for testing
      const result = await DatabaseUtils.updateLiquidityHistory(samplePool);
      const parsedResult = JSON.parse(result);
      
      // Assert
      expect(parsedResult.length).toBe(existingHistory.length + 1);
      expect(parsedResult[parsedResult.length - 1]).toBe(Number(samplePool.liquidity));
    });

    test('should limit history to 100 entries', async () => {
      // Arrange
      const existingHistory = Array(100).fill(0).map((_, i) => i + 100);
      mockPrisma.pool.findUnique.mockResolvedValue({
        liquidityHistory: JSON.stringify(existingHistory)
      });
      
      // Act
      // @ts-ignore - Accessing private static method for testing
      const result = await DatabaseUtils.updateLiquidityHistory(samplePool);
      const parsedResult = JSON.parse(result);
      
      // Assert
      expect(parsedResult.length).toBe(100); // Should still be 100 (not 101)
      expect(parsedResult[0]).toBe(101); // First element should be the second element from original array
      expect(parsedResult[parsedResult.length - 1]).toBe(Number(samplePool.liquidity));
    });
  });

  describe('getPoolByID', () => {
    test('should return pool if found', async () => {
      // Arrange
      mockPrisma.pool.findUnique.mockResolvedValue(samplePool);
      
      // Act
      const result = await DatabaseUtils.getPoolByID(samplePool.poolId);
      
      // Assert
      expect(result).toEqual(samplePool);
      expect(mockPrisma.pool.findUnique).toHaveBeenCalledWith({
        where: { poolId: samplePool.poolId }
      });
    });

    test('should return null if pool not found', async () => {
      // Arrange
      mockPrisma.pool.findUnique.mockResolvedValue(null);
      
      // Act
      const result = await DatabaseUtils.getPoolByID('nonexistent-pool');
      
      // Assert
      expect(result).toBeNull();
    });

    test('should handle errors gracefully', async () => {
      // Arrange
      mockPrisma.pool.findUnique.mockRejectedValue(new Error('Database error'));
      
      // Act
      const result = await DatabaseUtils.getPoolByID(samplePool.poolId);
      
      // Assert
      expect(result).toBeNull();
    });
  });

  describe('cleanup', () => {
    test('should disconnect from database if connected', async () => {
      // Arrange
      DatabaseUtils.initialize(); // Ensure connection is established
      
      // Act
      await DatabaseUtils.cleanup();
      
      // Assert
      expect(mockPrisma.$disconnect).toHaveBeenCalled();
    });

    test('should not attempt to disconnect if not connected', async () => {
      // Arrange - ensure no connection
      jest.isolateModules(() => {
        const { DatabaseUtils: ResetDatabaseUtils } = require('../../utils/dbUtils');
        // @ts-ignore - Accessing private static property for testing
        ResetDatabaseUtils.prisma = undefined;
      });
      
      // Act
      await DatabaseUtils.cleanup();
      
      // Assert
      expect(mockPrisma.$disconnect).not.toHaveBeenCalled();
    });
  });
});