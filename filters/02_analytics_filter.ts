import { SuiClient } from '@mysten/sui/client';
import { Pool } from '../dex';
import { Trade } from '../trade';
import { TradeFilterPlugin, TradeFilterRule } from '.';
import { createAnalytics } from '../services/analytics';
import { CommunityEngagementMetrics } from '../services/analytics/socialAnalytics'; // Import CommunityEngagementMetrics

interface AnalyticsFilterParams {
  minLiquidity?: number;
  maxConcentrationRatio?: number;
  minHolderCount?: number;
  maxSlippageRisk?: number;
  minSocialSentiment?: number;
  minCommunityHealth?: number;
}

const DEFAULT_PARAMS: AnalyticsFilterParams = {
  minLiquidity: 1000,
  maxConcentrationRatio: 80,
  minHolderCount: 50,
  maxSlippageRisk: 7,
  minSocialSentiment: -0.3,
  minCommunityHealth: 40,
};

const AnalyticsFilter: TradeFilterPlugin = {
  Name: 'Analytics Filter',
  Client: {} as SuiClient,
  TradeFilterRule: undefined,

  CheckTrades: async function (tradeList: Trade[]): Promise<boolean> {
    if (!this.TradeFilterRule) {
      console.log('Analytics Filter: No rule configured, using defaults');
      return true;
    }

    const params: AnalyticsFilterParams = {
      ...DEFAULT_PARAMS,
      ...this.TradeFilterRule.Params as AnalyticsFilterParams
    };

    console.log(`Analytics Filter: Checking ${tradeList.length} trades with params:`, params);

    const analytics = createAnalytics(this.Client);
    if (!analytics?.socialAnalytics) {
      console.log('Analytics Filter: No social analytics available.');
      return false;
    }

    for (const trade of tradeList) {
      try {
        const pool = trade as unknown as Pool;
        const liquidityAnalysis = await analytics.liquidityAnalytics.analyzeLiquidityDepth(pool);
        if (liquidityAnalysis.totalLiquidity < params.minLiquidity!) {
          return false;
        }
        if (liquidityAnalysis.priceImpact.slippageRisk > params.maxSlippageRisk!) {
          return false;
        }

        const tokenACommunity = await analytics.socialAnalytics.getCommunityEngagement(pool.coin_a) as unknown as CommunityEngagementMetrics;
        if (tokenACommunity?.communityHealth < params.minCommunityHealth!) {
          return false;
        }

        const tokenBCommunity = await analytics.socialAnalytics.getCommunityEngagement(pool.coin_b) as unknown as CommunityEngagementMetrics;
        if (tokenBCommunity?.communityHealth < params.minCommunityHealth!) {
          return false;
        }

        console.log(`Analytics Filter: Trade ${trade.poolId} passed all analytics checks`);
      } catch (error) {
        console.error(`Analytics Filter: Error analyzing trade ${trade.poolId}:`, error);
        return false;
      }
    }

    return true;
  }
};

export default AnalyticsFilter;
