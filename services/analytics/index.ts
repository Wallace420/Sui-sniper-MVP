import { TokenAnalytics, TokenHolderAnalysis, TokenHolder, TokenVolumeData } from './tokenAnalytics';
import { LiquidityAnalytics, LiquidityDepthAnalysis, LiquidityDepthLevel, PriceImpactData, PriceImpactLevel } from './liquidityAnalytics';
import { SocialAnalytics, SocialSentimentAnalysis, SentimentDataPoint, MentionDataPoint, CommunityEngagementMetrics, PlatformEngagement, DeveloperActivityMetrics, ActivityDataPoint } from './socialAnalytics';
import { SocialApiConfig } from './socialApiClient';
import { SuiClient } from '../../types/sui-sdk';

export {
  // Token analytics exports
  TokenAnalytics,
  TokenHolderAnalysis,
  TokenHolder,
  TokenVolumeData,
  
  // Liquidity analytics exports
  LiquidityAnalytics,
  LiquidityDepthAnalysis,
  LiquidityDepthLevel,
  PriceImpactData,
  PriceImpactLevel,
  // Social analytics exports
  SocialAnalytics,
  SocialSentimentAnalysis,
  SentimentDataPoint,
  MentionDataPoint,
  CommunityEngagementMetrics,
  PlatformEngagement,
  DeveloperActivityMetrics,
  ActivityDataPoint
};

// Factory function to create analytics instances
export const createAnalytics = (client: SuiClient, socialApiConfig?: SocialApiConfig) => {
  return {
    tokenAnalytics: new TokenAnalytics(client),
    liquidityAnalytics: new LiquidityAnalytics(client),
    socialAnalytics: new SocialAnalytics(client, socialApiConfig || {})
  };
};

export { SocialApiConfig };