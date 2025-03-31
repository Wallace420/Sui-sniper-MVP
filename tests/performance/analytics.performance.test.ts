import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { performance } from 'perf_hooks';
import { createAnalytics } from '../../services/analytics';
import { Pool } from '../../dex';
import { mockSuiClient, createMockPoolResponse } from '../test-utils';

describe('Analytics Performance Tests', () => {
  // Use the centralized mockSuiClient from test-utils
  const mockClient = mockSuiClient;
  
  // Setup mock responses for performance tests
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup getObject mock
(mockSuiClient.getObject as jest.Mock).mockImplementation(() => Promise.resolve(createMockPoolResponse()));
    
    // Setup queryEvents mock with 100 events for volume testing
(mockSuiClient.queryEvents as jest.Mock).mockResolvedValue,
      'data'; Array(100).fill(0).map((_, i) => ({

        bcsEncoding: "base58",
        id: { txDigest: `tx${i}`, eventSeq: i },
        timestampMs: String(Date.now() - (i * 3600000)),
        packageId: '0x3',
        transactionModule: 'mock_module',
        type: 'mock_event_type',
        parsedJson: {
          amount: (1000 + i * 100).toString(),
          eventType: 'Transfer'
        },
        sender: `0xsender${i}`,
        bcs: '0x'
      })),
      hasNextPage: false as boolean,
      nextCursor: null
    } satisfies SuiPaginatedEvents);
    
    // Setup getCoins mock
    (mockClient.getCoins as jest.Mock).mockResolvedValue({
      data: Array(100).fill(0).map((_, i) => ({
        coinType: 'mockCoinType',
        coinObjectId: `coin${i}`,
        balance: (1000 + i * 100).toString(),
        digest: `digest${i}`,
        version: '1',
        previousTransaction: `tx${i}`
      })),
      hasNextPage: false,
      nextCursor: null
    } satisfies import('@mysten/sui/client').PaginatedCoins);
    
    // Setup other mocks
    (mockClient.getDynamicFields as jest.Mock).mockResolvedValue({
      data: Array(0),
      hasNextPage: false,
      nextCursor: null
    } satisfies import('@mysten/sui/client').PaginatedObjectsResponse);
    
    (mockClient.getTransactionBlock as jest.Mock).mockResolvedValue({
      digest: 'mockTxDigest',
      transaction: {
        txSignatures: [],
        data: { 
          sender: '0xsender',
          gasData: {
            payment: [],
            owner: '0xsender',
            price: '1000',
            budget: '1000'
          },
          messageVersion: 'v1',
          transaction: {
            kind: 'ProgrammableTransaction',
            inputs: [],
            transactions: []
          }
        } 
      },
      effects: {
        executedEpoch: '1',
        gasObject: {
          owner: { AddressOwner: '0xsender' },
          reference: {
            objectId: '0x123',
            version: '1',
            digest: '0xabc'
          }
        },
        messageVersion: 'v1',
        transactionDigest: '0xtxdigest',
        status: { status: 'success' }, 
        gasUsed: { 
          computationCost: '1000',
          nonRefundableStorageFee: '0',
          storageCost: '1000',
          storageRebate: '0'
        } 
      },
      events: [],
      objectChanges: [],
      balanceChanges: []
    } satisfies import('@mysten/sui/client').SuiTransactionBlockResponse);
  });

  // Sample pool for testing
  const samplePool: Pool = {
    id: 'pool1',
    poolId: 'pool1',
    coin_a: 'tokenA::module::type',
    coin_b: 'tokenB::module::type',
    dex: 'TestDex',
    poolCreated: Date.now(),
    price: '1.5',
    liquidity: '20000'
  };

  // Create analytics instance
  const analytics = createAnalytics(mockClient);

  // Performance thresholds
  const maxExecutionTime = 1000; // 1 second

  describe('TokenAnalytics Performance', () => {
    test('should analyze token holders within acceptable time', async () => {
      // Measure execution time
      const startTime = performance.now();
      
      // Execute the function to test
      await analytics.tokenAnalytics.analyzeTokenHolders('tokenA::module::type');
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Assert performance expectations
      expect(executionTime).toBeLessThan(maxExecutionTime);
    });

    test('should analyze token volume within acceptable time', async () => {
      // Measure execution time
      const startTime = performance.now();
      
      // Execute the function to test
      await analytics.tokenAnalytics.analyzeTokenVolume('tokenA::module::type');
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Assert performance expectations
      expect(executionTime).toBeLessThan(maxExecutionTime);
    });

    test('should use cache effectively for repeated calls', async () => {
      // First call - should hit the API
      await analytics.tokenAnalytics.analyzeTokenHolders('tokenA::module::type');
      
      // Measure execution time for cached call
      const startTime = performance.now();
      
      // Second call - should use cache
      await analytics.tokenAnalytics.analyzeTokenHolders('tokenA::module::type');
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Cached calls should be very fast
      expect(executionTime).toBeLessThan(50); // 50ms is very generous for a cache hit
    });
  });

  describe('LiquidityAnalytics Performance', () => {
    test('should analyze liquidity depth within acceptable time', async () => {
      // Measure execution time
      const startTime = performance.now();
      
      // Execute the function to test
      await analytics.liquidityAnalytics.analyzeLiquidityDepth(samplePool);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Assert performance expectations
      expect(executionTime).toBeLessThan(maxExecutionTime);
    });

    test('should calculate price impact efficiently', async () => {
      // Measure execution time
      const startTime = performance.now();
      
      // Execute the function to test
      const result = await analytics.liquidityAnalytics.analyzeLiquidityDepth(samplePool);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Assert performance expectations
      expect(executionTime).toBeLessThan(maxExecutionTime);
      expect(result.priceImpact).toBeDefined();
      expect(result.priceImpact.buyImpact.length).toBeGreaterThan(0);
      expect(result.priceImpact.sellImpact.length).toBeGreaterThan(0);
    });
  });

  describe('SocialAnalytics Performance', () => {
    beforeEach(() => {
      // Mock the SocialApiClient methods
      jest.spyOn(analytics.socialAnalytics as any, 'fetchSocialData').mockResolvedValue({
        mentions: Array(50).fill(0).map((_, i) => ({
          platform: i % 3 === 0 ? 'twitter' : i % 3 === 1 ? 'telegram' : 'discord',
          count: 100 + i * 10,
          timestamp: Date.now() - (i * 3600000)
        })),
        sentiment: Array(50).fill(0).map((_, i) => ({
          platform: i % 3 === 0 ? 'twitter' : i % 3 === 1 ? 'telegram' : 'discord',
          score: 0.5 + (i % 10) / 10,
          timestamp: Date.now() - (i * 3600000)
        })),
        engagement: {
          twitter: { followers: 10000, likes: 5000, retweets: 2000 },
          telegram: { members: 20000, messages: 3000 },
          discord: { members: 15000, messages: 2500 }
        }
      });
    });

    test('should analyze social sentiment within acceptable time', async () => {
      // Measure execution time
      const startTime = performance.now();
      
      // Execute the function to test
      await analytics.socialAnalytics.analyzeSocialSentiment('tokenA::module::type');
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Assert performance expectations
      expect(executionTime).toBeLessThan(maxExecutionTime);
    });

    test('should analyze community engagement within acceptable time', async () => {
      // Measure execution time
      const startTime = performance.now();
      
      // Execute the function to test
      await analytics.socialAnalytics.analyzeCommunityEngagement('tokenA::module::type');
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Assert performance expectations
      expect(executionTime).toBeLessThan(maxExecutionTime);
    });
  });

  describe('Combined Analytics Performance', () => {
    test('should perform complete analytics flow efficiently', async () => {
      // Measure execution time
      const startTime = performance.now();
      
      // Execute multiple analytics functions in sequence
      const holderAnalysis = await analytics.tokenAnalytics.analyzeTokenHolders('tokenA::module::type');
      const volumeAnalysis = await analytics.tokenAnalytics.analyzeTokenVolume('tokenA::module::type');
      const liquidityAnalysis = await analytics.liquidityAnalytics.analyzeLiquidityDepth(samplePool);
      const sentimentAnalysis = await analytics.socialAnalytics.analyzeSocialSentiment('tokenA::module::type');
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Assert performance expectations for the complete flow
      // Allow more time for the combined operations
      expect(executionTime).toBeLessThan(maxExecutionTime * 4);
      
      // Verify all results are defined
      expect(holderAnalysis).toBeDefined();
      expect(volumeAnalysis).toBeDefined();
      expect(liquidityAnalysis).toBeDefined();
      expect(sentimentAnalysis).toBeDefined();
    });

    test('should perform parallel analytics efficiently', async () => {
      // Measure execution time
      const startTime = performance.now();
      
      // Execute multiple analytics functions in parallel
      const results = await Promise.all([
        analytics.tokenAnalytics.analyzeTokenHolders('tokenA::module::type'),
        analytics.tokenAnalytics.analyzeTokenVolume('tokenA::module::type'),
        analytics.liquidityAnalytics.analyzeLiquidityDepth(samplePool),
        analytics.socialAnalytics.analyzeSocialSentiment('tokenA::module::type')
      ]);
      
      const endTime = performance.now();
      const executionTime = endTime - startTime;
      
      // Assert performance expectations for parallel execution
      // Should be faster than sequential execution but allow some overhead
      expect(executionTime).toBeLessThan(maxExecutionTime * 2);
      
      // Verify all results are defined
      results.forEach(result => expect(result).toBeDefined());
    });
  });
});
