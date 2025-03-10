import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { mockSuiClient } from '../test-utils'; 
import { TokenAnalytics, LiquidityAnalytics, SocialAnalytics, createAnalytics } from '../../services/analytics';

describe('Analytics Services', () => {
  // Use the centralized mockSuiClient from test-utils

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('TokenAnalytics', () => {
    let tokenAnalytics: TokenAnalytics;

    beforeEach(() => {
      tokenAnalytics = new TokenAnalytics(mockSuiClient, ); // Cast to SuiClient type
    });

    test('should be properly defined', () => {
      expect(tokenAnalytics).toBeDefined();
    });

    test('should analyze token holders', async () => {
      // Mock the client responses
      (mockSuiClient.getCoins as jest.Mock<any>).mockResolvedValue(Promise.resolve({
        data: [{
          data: {
            objectId: '0x1',
            version: '1',
            digest: 'mockDigest1',
            content: {
              dataType: 'moveObject',
              type: '0x2::coin::Coin',
              hasPublicTransfer: true,
              fields: {
                balance: '1000',
                id: 'coin1'
              }
            }
          },
          },
          {
          data: {
            objectId: '0x2',
            version: '1',
            digest: 'mockDigest2',
            content: {
              dataType: 'moveObject',
              type: '0x2::coin::Coin',
              hasPublicTransfer: true,
              fields: {
                balance: '2000',
                id: 'coin2'
              }
            }
          }
          },
          {
            data: {
              objectId: '0x3',
              version: '1',
              digest: 'mockDigest3',
              content: {
                dataType: 'moveObject',
                type: '0x2::coin::Coin',
                hasPublicTransfer: true,
                fields: {
                  balance: '3000',
                  id: 'coin3'
                }
              }
            }
          }
        ],
        hasNextPage: false,
        nextCursor: null
      }));

      // Call the method
      const result = await tokenAnalytics.analyzeTokenHolders('testToken');

      // Assertions
      expect(result).toBeDefined();
      expect(result.tokenId).toBe('testToken');
      expect(result.totalHolders).toBe(3);
      expect(result.topHolders.length).toBe(3);
      expect(result.concentrationRatio).toBeGreaterThan(0);
      expect(result.giniCoefficient).toBeDefined();
      expect(mockSuiClient.getCoins).toHaveBeenCalled();
    });

    test('should analyze token volume', async () => {
      // Mock the client responses
      (mockSuiClient.queryEvents as jest.Mock<any>).mockResolvedValue({
        data: [
          {
            timestampMs: String(Date.now() - 3600000),
            id: { txDigest: 'tx1', eventSeq: '1' },
            type: '0x3::token::TransferEvent',
            parsedJson: { amount: '1000' },
            packageId: '0x3',
            transactionModule: 'token',
            sender: '0xsender1',
            bcs: '0x'
          }
        ],
        hasNextPage: false,
        nextCursor: null
      } as any); // PaginatedEvents // removed PaginatedEvents import

      // Call the method
      const result = await tokenAnalytics.analyzeTokenVolume('testToken');

      // Assertions
      expect(result).toBeDefined();
      expect(result.tokenId).toBe('testToken');
      expect(result.volume24h).toBeGreaterThanOrEqual(0);
      expect(result.volume7d).toBeGreaterThanOrEqual(0);
      expect(result.transactions24h).toBeGreaterThanOrEqual(0);
      expect(result.priceChange24h).toBeDefined();
      expect(result.volumeChange24h).toBeDefined();
      expect(result.volumeTrend).toBeInstanceOf(Array);
      expect(result.lastUpdated).toBeDefined();
      expect(mockSuiClient.queryEvents).toHaveBeenCalled();
    });

    test('should use cached data when available and not expired', async () => {
      // Mock the client responses for first call
      (mockSuiClient.getCoins as jest.Mock<any>).mockResolvedValue(Promise.resolve({
        data: [
          {
            data: {
              digest: 'mockDigest1',
              objectId: 'coin1',
              version: '1',
              content: {
                dataType: 'moveObject',
                fields: {
                  balance: '1000',
                  id: 'coin1'
                },
                type: '0x2::coin::Coin'
              }
            }
          },
          {
            data: {
              digest: 'mockDigest2',
              objectId: 'coin2',
              version: '1',
              content: {
                dataType: 'moveObject',
                fields: {
                  balance: '2000',
                  id: 'coin2'
                },
                type: '0x2::coin::Coin'
              }
            }
          },
          {
            data: {
              digest: 'mockDigest3',
              objectId: 'coin3',
              version: '1',
              content: {
                dataType: 'moveObject',
                fields: {
                  balance: '3000',
                  id: 'coin3'
                },
                type: '0x2::coin::Coin'
              }
            }
          }
        ],
        hasNextPage: false
      } as any); // PaginatedObjectsResponse // removed PaginatedObjectsResponse import)

      // First call should hit the API
      await tokenAnalytics.analyzeTokenHolders('testToken');
      expect(mockSuiClient.getCoins).toHaveBeenCalledTimes(1);

      // Reset mock to verify it's not called again
      jest.clearAllMocks();

      // Second call should use cache
      await tokenAnalytics.analyzeTokenHolders('testToken');
      expect(mockSuiClient.getCoins).not.toHaveBeenCalled();
    });
  });

  describe('LiquidityAnalytics', () => {
    let liquidityAnalytics: LiquidityAnalytics;

    beforeEach(() => {
      liquidityAnalytics = new LiquidityAnalytics(mockSuiClient); // Removed 'as any'
    });

    test('should be properly defined', () => {
      expect(liquidityAnalytics).toBeDefined();
    });

    test('should analyze liquidity depth', async () => {
      // Mock the client responses with properly structured SuiObjectResponse
      (mockSuiClient.getObject as jest.Mock<any>).mockResolvedValue(Promise.resolve({
        data: {
          digest: 'mockDigest',
          objectId: 'pool1',
          version: '1',
          content: {
            dataType: 'moveObject' as const,
            type: '0x2::amm::Pool',
            hasPublicTransfer: true,
            fields: {
              coin_a: { id: 'tokenA' },
              coin_b: { id: 'tokenB' },
              reserve_a: '10000',
              reserve_b: '20000'
            }
          }
        }
      } as any)); // SuiObjectResponse // removed SuiObjectResponse import

      // Sample pool for testing
      const samplePool = {
        id: 'pool1',
        poolId: 'pool1',
        coin_a: 'tokenA::module::type',
        coin_b: 'tokenB::module::type',
        dex: 'TestDex',
        poolCreated: Date.now(),
        price: '2.0',
        liquidity: '20000'
      };

      // Call the method
      const result = await liquidityAnalytics.analyzeLiquidityDepth(samplePool);

      // Assertions
      expect(result).toBeDefined();
      expect(result.poolId).toBe('pool1');
      expect(result.depth.length).toBeGreaterThan(0);
      expect(result.priceImpact).toBeDefined();
      expect(mockSuiClient.getObject).toHaveBeenCalled();
    });

    test('should calculate price impact correctly', async () => {
      // Mock the client responses with properly structured SuiObjectResponse
      (mockSuiClient.getObject as jest.Mock<any>).mockResolvedValue(Promise.resolve({
        data: {
          digest: 'mockDigest',
          objectId: 'pool1',
          version: '1',
          content: {
            dataType: 'moveObject' as const,
            type: '0x2::amm::Pool',
            hasPublicTransfer: true,
            fields: {
              coin_a: { id: 'tokenA' },
              coin_b: { id: 'tokenB' },
              reserve_a: '100000',
              reserve_b: '100000'
            }
          }
        }
      } as any)); // SuiObjectResponse // removed SuiObjectResponse import

      // Sample pool for testing
      const samplePool = {
        id: 'pool1',
        poolId: 'pool1',
        coin_a: 'tokenA::module::type',
        coin_b: 'tokenB::module::type',
        dex: 'TestDex',
        poolCreated: Date.now(),
        price: '1.0',
        liquidity: '100000'
      };

      // Call the method
      const result = await liquidityAnalytics.analyzeLiquidityDepth(samplePool);

      // Assertions
      expect(result).toBeDefined();
      expect(result.priceImpact.buyImpact.length).toBeGreaterThan(0);
      expect(result.priceImpact.sellImpact.length).toBeGreaterThan(0);

      // Larger trades should have higher price impact
      const smallTrade = result.priceImpact.buyImpact[0];
      const largeTrade = result.priceImpact.buyImpact[result.priceImpact.buyImpact.length - 1];
      expect(largeTrade.priceImpact).toBeGreaterThan(smallTrade.priceImpact);
    });
  });

  describe('SocialAnalytics', () => {
    let socialAnalytics: SocialAnalytics;

    beforeEach(() => {
      socialAnalytics = new SocialAnalytics(mockSuiClient, { // Removed 'as any'
        apiEndpoint: 'https://api.example.com',
        apiKey: 'test-api-key',
        baseUrl: 'https://api.example.com',
        rateLimit: 100
      });
    });

    test('should be properly defined', () => {
      expect(socialAnalytics).toBeDefined();
    });

    test('should analyze social sentiment', async () => {
      // Mock the SocialApiClient methods
      jest.spyOn(socialAnalytics as any, 'fetchSocialData').mockResolvedValue({
        mentions: [
          { platform: 'twitter', count: 100, timestamp: Date.now() - 3600000 },
          { platform: 'telegram', count: 50, timestamp: Date.now() - 7200000 },
          { platform: 'discord', count: 75, timestamp: Date.now() - 10800000 }
        ],
        sentiment: [
          { platform: 'twitter', score: 0.8, timestamp: Date.now() - 3600000 },
          { platform: 'telegram', score: 0.6, timestamp: Date.now() - 7200000 },
          { platform: 'discord', score: 0.7, timestamp: Date.now() - 10800000 }
        ],
        engagement: {
          twitter: { followers: 1000, likes: 500, retweets: 200 },
          telegram: { members: 2000, messages: 300 },
          discord: { members: 1500, messages: 250 }
        }
      });

      // Call the method
      const result = await socialAnalytics.analyzeSocialSentiment('testToken');

      // Assertions
      expect(result).toBeDefined();
      expect(result.tokenId).toBe('testToken');
      expect(result.overallSentiment).toBeGreaterThan(0);
      expect(result.sentimentByPlatform.length).toBeGreaterThan(0);
      expect(result.mentionsByPlatform.length).toBeGreaterThan(0);
    });

    test('should analyze community engagement', async () => {
      // Call the method
      const result = await socialAnalytics.analyzeCommunityEngagement('testToken');

      // Assertions
      expect(result).toBeDefined();
      expect(result.tokenId).toBe('testToken');
      expect(result.totalEngagement).toBeGreaterThan(0);
      expect(result.platformEngagement.length).toBeGreaterThan(0);
    });

    test('should analyze developer activity', async () => {
      // Mock the client responses
      jest.spyOn(socialAnalytics as any, 'fetchDeveloperActivity').mockResolvedValue({
        commits: [
          { count: 10, timestamp: Date.now() - 86400000 },
          { count: 15, timestamp: Date.now() - 172800000 },
          { count: 20, timestamp: Date.now() - 259200000 }
        ],
        issues: [
          { count: 5, timestamp: Date.now() - 86400000 },
          { count: 8, timestamp: Date.now() - 172800000 },
          { count: 12, timestamp: Date.now() - 259200000 }
        ],
        contributors: 5
      });

      // Call the method
      const result = await socialAnalytics.analyzeDeveloperActivity('testToken');

      // Assertions
      expect(result).toBeDefined();
      expect(result.tokenId).toBe('testToken');
      expect(result.activityScore).toBeGreaterThan(0);
      expect(result.commitActivity.length).toBeGreaterThan(0);
      expect(result.issueActivity.length).toBeGreaterThan(0);
    });
  });

  describe('createAnalytics Factory', () => {
    test('should create all analytics instances', () => {
      const analytics = createAnalytics(mockSuiClient, {
        apiKey: 'test-api-key',
        apiEndpoint: 'https://api.example.com',
        baseUrl: 'https://api.example.com',
        rateLimit: 100
      });

      expect(analytics.tokenAnalytics).toBeInstanceOf(TokenAnalytics);
      expect(analytics.liquidityAnalytics).toBeInstanceOf(LiquidityAnalytics);
      expect(analytics.socialAnalytics).toBeInstanceOf(SocialAnalytics);
    });

    test('should create analytics with default social config when not provided', () => {
      const analytics = createAnalytics(mockSuiClient);
      expect(analytics.socialAnalytics).toBeInstanceOf(SocialAnalytics);
    });
  });
});