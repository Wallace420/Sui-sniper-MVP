import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { SuiClient, SuiObjectResponse, GetObjectParams } from '@mysten/sui/client';
import { Trade, TradeStatus } from '../../trade';
import LiquidityFilter from '../../filters/00_liquidity';
import DenyListFilter from '../../filters/01_deny_list';
import AnalyticsFilter from '../../filters/02_analytics_filter';
import { TradeFilterRule } from '../../filters';

describe('Filter Components', () => {
  // Mock SuiClient
  const mockClient = {
    getObject: jest.fn(),
    queryEvents: jest.fn()
  } as unknown as SuiClient;

  // Sample trades for testing
  const sampleTrades: Trade[] = [
    {
      id: 'trade1',
      poolId: 'pool1',
      coin_a: 'coin_a_address::module::type',
      coin_b: 'coin_b_address::module::type',
      dex: 'TestDex',
      poolCreated: Date.now(),
      price: 1.5,
      liquidity: '1000',
      status: TradeStatus.New,
      created: Date.now(),
      opened: 0,
      cost: 0,
      closedValue: 0,
      baseCoin: 'sui::sui::SUI',
      openAttempts: 0,
      closeAttempts: 0,
      balance: 0,
      manualClose: false
    },
    {
      id: 'trade2',
      poolId: 'pool2',
      coin_a: 'coin_c_address::module::type',
      coin_b: 'coin_d_address::module::type',
      dex: 'TestDex',
      poolCreated: Date.now(),
      price: 0.5,
      liquidity: '200',
      status: TradeStatus.New,
      created: Date.now(),
      opened: 0,
      cost: 0,
      closedValue: 0,
      baseCoin: 'sui::sui::SUI',
      openAttempts: 0,
      closeAttempts: 0,
      balance: 0,
      manualClose: false
    }
  ];

  describe('Liquidity Filter', () => {
    beforeEach(() => {
      // Reset the filter before each test
      LiquidityFilter.Client = mockClient;
      LiquidityFilter.TradeFilterRule = {
        Plugin: 'LiquidityFilter',
        RuleName: 'Liquidity',
        Params: {
          minLiquidity: 500
        }
      } as TradeFilterRule;
    });

    test('should filter out trades with insufficient liquidity', async () => {
      // Act
      const result = await LiquidityFilter.CheckTrades([...sampleTrades]);

      // Assert
      expect(result).toBe(true);
      // First trade should remain valid (liquidity = 1000 > 500)
      expect(sampleTrades[0].status).toBe(TradeStatus.New);
      // Second trade should be marked as invalid (liquidity = 200 < 500)
      expect(sampleTrades[1].status).toBe(TradeStatus.Invalid);
      expect(sampleTrades[1].note).toContain('Liquidity too low');
    });

    test('should not filter when disabled', async () => {
      // Arrange
      LiquidityFilter.TradeFilterRule = {
        Plugin: 'LiquidityFilter',
        RuleName: 'Liquidity',
        Params: {
          disabled: true,
          minLiquidity: 5000 // Very high threshold that would filter all trades
        }
      } as TradeFilterRule;

      const testTrades = [...sampleTrades];

      // Act
      const result = await LiquidityFilter.CheckTrades(testTrades);

      // Assert
      expect(result).toBe(true);
      // All trades should remain valid since filter is disabled
      expect(testTrades[0].status).toBe(TradeStatus.New);
      expect(testTrades[1].status).toBe(TradeStatus.New);
    });
  });

  describe('DenyList Filter', () => {
    beforeEach(() => {
      // Reset the filter before each test
      DenyListFilter.Client = mockClient;
      DenyListFilter.TradeFilterRule = {
        Plugin: 'DenyListFilter',
        RuleName: 'DenyList',
        Params: {}
      } as TradeFilterRule;

      // Mock the getObject response for deny list check
      (mockClient.getObject as jest.Mock).mockImplementation((params: unknown) => {
        if ((params as GetObjectParams).id === 'coin_a_address') {
          return Promise.resolve({
            data: {
              objectId: 'coin_a_address',
              version: '1',
              digest: 'mockDigest',
              type: 'mockType',
              content: {
                dataType: 'moveObject',
                disassembled: {
                  function1: 'some bytecode',
                  function2: 'some bytecode with DenyCap in it'
                }
              }
            }
          });
        } else {
          return Promise.resolve({
            data: {
              objectId: (params as GetObjectParams).id,
              version: '1',
              digest: 'mockDigest',
              type: 'mockType',
              content: {
                dataType: 'moveObject',
                disassembled: {
                  function1: 'clean bytecode',
                  function2: 'more clean bytecode'
                }
              }
            }
          });
        }
      });
    });

    test('should filter out trades with deny list', async () => {
      // Act
      const testTrades = [...sampleTrades];
      const result = await DenyListFilter.CheckTrades(testTrades);

      // Assert
      expect(result).toBe(true);
      // First trade should be marked as invalid (has DenyCap)
      expect(testTrades[0].status).toBe(TradeStatus.Invalid);
      expect(testTrades[0].note).toBe('Coin has deny list');
      // Second trade should remain valid
      expect(testTrades[1].status).toBe(TradeStatus.New);
    });

    test('should not filter when disabled', async () => {
      // Arrange
      DenyListFilter.TradeFilterRule = {
        Plugin: 'DenyListFilter',
        RuleName: 'DenyList',
        Params: {
          disabled: true
        }
      } as TradeFilterRule;

      const testTrades = [...sampleTrades];

      // Act
      const result = await DenyListFilter.CheckTrades(testTrades);

      // Assert
      expect(result).toBe(true);
      // All trades should remain valid since filter is disabled
      expect(testTrades[0].status).toBe(TradeStatus.New);
      expect(testTrades[1].status).toBe(TradeStatus.New);
    });

    test('should handle errors gracefully', async () => {
      // Arrange
(mockClient.getObject as jest.Mock).mockImplementation(() => Promise.reject('Network error'));
      const testTrades = [...sampleTrades];

      // Act
      const result = await DenyListFilter.CheckTrades(testTrades);

      // Assert
      expect(result).toBe(true); // Should still return true despite errors
      // Trades should remain in their original state
      expect(testTrades[0].status).toBe(TradeStatus.New);
      expect(testTrades[1].status).toBe(TradeStatus.New);
    });
  });

  describe('Analytics Filter', () => {
    // Mock analytics services
    const mockLiquidityAnalytics = {
      analyzeLiquidityDepth: jest.fn()
    };
    
    const mockSocialAnalytics = {
      getCommunityEngagement: jest.fn()
    };

    beforeEach(() => {
      // Reset the filter before each test
      AnalyticsFilter.Client = mockClient;
      AnalyticsFilter.TradeFilterRule = {
        Plugin: 'AnalyticsFilter',
        RuleName: 'Analytics',
        Params: {
          minLiquidity: 1000,
          maxConcentrationRatio: 80,
          minHolderCount: 50,
          maxSlippageRisk: 7,
          minSocialSentiment: -0.3,
          minCommunityHealth: 40
        }
      } as TradeFilterRule;

      // Mock the createAnalytics function
      jest.mock('../../services/analytics', () => ({
        createAnalytics: () => ({
          liquidityAnalytics: mockLiquidityAnalytics,
          socialAnalytics: mockSocialAnalytics
        })
      }));

      // Set up mock responses
      mockLiquidityAnalytics.analyzeLiquidityDepth.mockReturnValue(Promise.resolve({
        totalLiquidity: 2000,
        priceImpact: { slippageRisk: 5 }
      }));

      mockSocialAnalytics.getCommunityEngagement.mockReturnValue(Promise.resolve({
        communityHealth: 75,
        sentiment: 0.2
      }));
    });

    // Note: These tests are more complex due to the dependencies on analytics services
    // In a real implementation, we would need to properly mock the createAnalytics function
    // For now, we'll add placeholder tests that can be expanded later

    test('should be properly defined', () => {
      expect(AnalyticsFilter).toBeDefined();
      expect(AnalyticsFilter.Name).toBe('Analytics Filter');
      expect(AnalyticsFilter.CheckTrades).toBeInstanceOf(Function);
    });
  });
});