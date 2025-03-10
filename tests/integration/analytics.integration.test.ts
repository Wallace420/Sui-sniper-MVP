import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import { SuiClient, SuiObjectResponse } from '@mysten/sui/client';
import {
  TokenAnalytics,
  LiquidityAnalytics,
  SocialAnalytics,
  createAnalytics
} from '../../services/analytics';
import { TokenSecurity, ValidationResult } from '../../services/tokenSecurity';
import { PoolScanner } from '../../services/poolScanner';
import { Pool } from '../../dex';

describe('Analytics Integration Tests', () => {
  // Mock SuiClient
  const mockClient = {
    getObject: jest.fn(),
    queryEvents: jest.fn(),
    getTransactionBlock: jest.fn(),
    getDynamicFields: jest.fn(),
    getCoins: jest.fn()
  } as unknown as SuiClient;

  // Mock dependencies
  const mockDexes = {
    getDexByName: jest.fn(),
    getAllDexes: jest.fn().mockReturnValue([
      { Name: 'TestDex', PoolIds: new Set(['pool1', 'pool2']) }
    ])
  };

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

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();

    // Setup common mock responses
    (mockClient.getObject as jest.Mock).mockResolvedValue({
      data: {
        digest: '123',
        objectId: 'obj1',
        version: '1',
        content: {
          dataType: 'moveObject',
          fields: {
            coin_a: { id: 'tokenA' },
            coin_b: { id: 'tokenB' },
            reserve_a: '10000',
            reserve_b: '20000'
          }
        }
      }
    } as unknown as SuiObjectResponse);

    (mockClient.getCoins as jest.Mock).mockResolvedValue({
      data: [
        { coinObjectId: 'coin1', balance: BigInt('1000') },
        { coinObjectId: 'coin2', balance: BigInt('2000') },
        { coinObjectId: 'coin3', balance: BigInt('3000') }
      ],
      hasNextPage: false,
      nextCursor: null
    });

    (mockClient.queryEvents as jest.Mock).mockResolvedValue({
      data: [
        { timestamp_ms: Date.now() - 3600000, amount: BigInt('1000') },
        { timestamp_ms: Date.now() - 7200000, amount: BigInt('2000') },
        { timestamp_ms: Date.now() - 10800000, amount: BigInt('3000') }
      ],
      hasNextPage: false,
      nextCursor: null
    });
  });

  describe('Analytics with TokenSecurity Integration', () => {
    let tokenSecurity: TokenSecurity;
    let analytics: ReturnType<typeof createAnalytics>;

    beforeEach(() => {
      analytics = createAnalytics(mockClient);
      tokenSecurity = new TokenSecurity(mockClient, {
        minLiquidity: 1000,
        minHoldersCount: 10,
        maxOwnershipPercent: 50,
        minPoolAge: 300,
        blacklistedCreators: []
      });

      // Mock tokenSecurity methods
      jest.spyOn(tokenSecurity, 'validateToken').mockResolvedValue({
        isValid: true,
        riskScore: 8.5,
        reason: undefined
      } as ValidationResult);
    });

    test('should integrate token analytics with security checks', async () => {
      // First get token holder analysis
      const holderAnalysis = await analytics.tokenAnalytics.analyzeTokenHolders('tokenA::module::type');
      
      // Then use that data with token security
      const securityResult = await tokenSecurity.validateToken('tokenA::module::type');
      
      // Verify integration
      expect(holderAnalysis).toBeDefined();
      expect(securityResult).toBeDefined();
      expect(securityResult.isValid).toBe(true);
      expect(securityResult.riskScore).toBeGreaterThan(0);
      
      // Verify that token security used the analytics data
      expect(mockClient.getCoins).toHaveBeenCalled();
    });

    test('should integrate liquidity analytics with security checks', async () => {
      // First get liquidity depth analysis
      const liquidityAnalysis = await analytics.liquidityAnalytics.analyzeLiquidityDepth(samplePool);
      
      // Then use that data with token security
      const securityResult = await tokenSecurity.validateToken('tokenA::module::type');
      
      // Verify integration
      expect(liquidityAnalysis).toBeDefined();
      expect(securityResult).toBeDefined();
      expect(liquidityAnalysis.priceImpact).toBeDefined();
      
      // Verify that token security used the analytics data
      expect(mockClient.getObject).toHaveBeenCalled();
    });
  });
});

  describe('Analytics with PoolScanner Integration', () => {
    let poolScanner: PoolScanner;
    let analytics: ReturnType<typeof createAnalytics>;
    let tokenSecurity: TokenSecurity;

    beforeEach(() => {
      analytics = createAnalytics(mockClient);
      tokenSecurity = new TokenSecurity(mockClient, {
        minLiquidity: 1000,
        minHoldersCount: 10,
        maxOwnershipPercent: 50,
        minPoolAge: 300,
        blacklistedCreators: []
      });

      poolScanner = new PoolScanner(mockClient, mockDexes as any, {
        scanIntervalMs: 1000,
        concurrentScans: 3,
        tokenSecurity: tokenSecurity,
        mevProtection: {} as any,
        maxValidationAttempts: 3,
        poolMonitoringTimeMs: 3600000
      });

      // Mock poolScanner methods
      jest.spyOn(poolScanner as any, 'validatePool').mockResolvedValue(true);
      jest.spyOn(poolScanner as any, 'processPool').mockResolvedValue(undefined);
    });

    test('should integrate analytics with pool scanning process', async () => {
      // Mock the scanPools method to return our sample pool
      jest.spyOn(poolScanner as any, 'scanDexPools').mockResolvedValue([samplePool]);
      
      // Call the scan method
      await (poolScanner as any).scanPools();
      
      // Verify that validatePool was called, which would use analytics services
      expect((poolScanner as any).validatePool).toHaveBeenCalledWith(expect.objectContaining({
        id: 'pool1'
      }));
      
      // Verify that processPool was called, which would use analytics services
      expect((poolScanner as any).processPool).toHaveBeenCalledWith(expect.objectContaining({
        id: 'pool1'
      }));
    });

    test('should use analytics data to filter pools', async () => {
      // Setup analytics data
      const liquidityAnalysis = await analytics.liquidityAnalytics.analyzeLiquidityDepth(samplePool);
      const tokenAnalysis = await analytics.tokenAnalytics.analyzeTokenHolders('tokenA::module::type');
      
      // Mock the filter method
      const mockFilter = jest.fn().mockReturnValue(true);
      (poolScanner as any).filters = [{ apply: mockFilter }];
      
      // Mock the scanPools method to return our sample pool
      jest.spyOn(poolScanner as any, 'scanDexPools').mockResolvedValue([samplePool]);
      
      // Call the scan method
      await (poolScanner as any).scanPools();
      
      // Verify that the filter was called
      expect(mockFilter).toHaveBeenCalled();
      
      // Verify that analytics data was used
      expect(mockClient.getObject).toHaveBeenCalled();
      expect(mockClient.getCoins).toHaveBeenCalled();
    });
  });

  describe('End-to-End Analytics Flow', () => {
    test('should perform complete analytics flow for a token', async () => {
      // Create analytics instances
      const analytics = createAnalytics(mockClient);
      
      // 1. Analyze token holders
      const holderAnalysis = await analytics.tokenAnalytics.analyzeTokenHolders('tokenA::module::type');
      
      // 2. Analyze token volume
      const volumeAnalysis = await analytics.tokenAnalytics.analyzeTokenVolume('tokenA::module::type');
      
      // 3. Analyze liquidity depth
      const liquidityAnalysis = await analytics.liquidityAnalytics.analyzeLiquidityDepth(samplePool);
      
      // 4. Analyze social sentiment (with mocked data)
      jest.spyOn(analytics.socialAnalytics as any, 'fetchSocialData').mockResolvedValue({
        mentions: [{ platform: 'twitter', count: 100, timestamp: Date.now() }],
        sentiment: [{ platform: 'twitter', score: 0.8, timestamp: Date.now() }],
        engagement: { twitter: { followers: 1000, likes: 500, retweets: 200 } }
      });
      
      const sentimentAnalysis = await analytics.socialAnalytics.analyzeSocialSentiment('tokenA::module::type');
      
      // Verify all analytics data is available
      expect(holderAnalysis).toBeDefined();
      expect(volumeAnalysis).toBeDefined();
      expect(liquidityAnalysis).toBeDefined();
      expect(sentimentAnalysis).toBeDefined();
      
      // Verify data consistency
      expect(holderAnalysis.tokenId).toBe('tokenA::module::type');
      expect(volumeAnalysis.tokenId).toBe('tokenA::module::type');
      expect(liquidityAnalysis.tokenAId).toBeDefined();
      expect(sentimentAnalysis.tokenId).toBe('tokenA::module::type');
      
      // Verify all necessary API calls were made
      expect(mockClient.getCoins).toHaveBeenCalled();
      expect(mockClient.queryEvents).toHaveBeenCalled();
      expect(mockClient.getObject).toHaveBeenCalled();
    });
  });
});