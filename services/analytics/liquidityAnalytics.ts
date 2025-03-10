import { MockSuiClientMethods } from '../../tests/test-utils';
import { Pool } from '../../dex';

export interface LiquidityDepthAnalysis {
  poolId: string;
  tokenAId: string;
  tokenBId: string;
  totalLiquidity: number;
  depth: LiquidityDepthLevel[];
  priceImpact: PriceImpactData;
  concentrationScore: number; // 0-100, higher means more concentrated
  lastUpdated: number;
}

export interface LiquidityDepthLevel {
  priceLevel: number;
  liquidityAmount: number;
  percentOfTotal: number;
}

export interface PriceImpactData {
  buyImpact: PriceImpactLevel[];
  sellImpact: PriceImpactLevel[];
  slippageRisk: number; // 0-10 scale, higher means more risk
}

export interface PriceImpactLevel {
  tradeSize: number;
  priceImpact: number; // Percentage
}

interface LiquidityAnalyticsCache {
  [poolId: string]: {
    analysis: LiquidityDepthAnalysis;
    timestamp: number;
  };
}

export class LiquidityAnalytics {
  private client: MockSuiClientMethods;
  private cache: LiquidityAnalyticsCache = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
 
  constructor(client: MockSuiClientMethods) {
    this.client = client;
  }

  /**
   * Analyzes liquidity depth and price impact for a specific pool
   * @param pool The pool to analyze
   * @returns LiquidityDepthAnalysis with depth and price impact metrics
   */
  async analyzeLiquidityDepth(pool: Pool): Promise<LiquidityDepthAnalysis> {
    // Check cache first
    if (
      this.cache[pool.poolId] &&
      Date.now() - this.cache[pool.poolId].timestamp < this.CACHE_DURATION
    ) {
      return this.cache[pool.poolId].analysis;
    }

    try {
      // Get detailed pool data
      const poolData = await this.client.getObject({
        id: pool.poolId,
        options: {
          showContent: true,
          showDisplay: true,
        },
      });

      // Calculate liquidity depth levels
      const depthLevels = await this.calculateLiquidityDepth(pool);
      
      // Calculate price impact for different trade sizes
      const priceImpact = await this.calculatePriceImpact(pool);
      
      // Calculate concentration score
      const concentrationScore = this.calculateConcentrationScore(depthLevels);

      const analysis: LiquidityDepthAnalysis = {
        poolId: pool.poolId,
        tokenAId: pool.coin_a,
        tokenBId: pool.coin_b,
        totalLiquidity: parseFloat(pool.liquidity || '0'),
        depth: depthLevels,
        priceImpact,
        concentrationScore,
        lastUpdated: Date.now(),
      };

      // Update cache
      this.cache[pool.poolId] = {
        analysis,
        timestamp: Date.now(),
      };

      return analysis;
    } catch (error) {
      console.error(`Error analyzing liquidity depth for pool ${pool.poolId}:`, error);
      throw new Error(`Failed to analyze liquidity depth: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculates the price impact of a trade for a given pool
   * @param pool The pool to analyze
   * @param tradeAmount The amount to trade
   * @param isBuy Whether the trade is a buy or sell
   * @returns The price impact as a percentage
   */
  async calculateTradeImpact(pool: Pool, tradeAmount: number, isBuy: boolean): Promise<number> {
    try {
      // In a real implementation, this would use the pool's math to calculate price impact
      // For now, we'll use a simplified model
      
      const liquidity = parseFloat(pool.liquidity || '0');
      if (liquidity === 0) return 100; // Maximum impact if no liquidity
      
      // Simple model: impact = (tradeAmount / liquidity) * constant
      // The constant can be adjusted based on the pool type and other factors
      const impactFactor = isBuy ? 2 : 1.8; // Buys often have slightly higher impact
      const impact = (tradeAmount / liquidity) * 100 * impactFactor;
      
      // Cap at 100%
      return Math.min(impact, 100);
    } catch (error) {
      console.error(`Error calculating trade impact for pool ${pool.poolId}:`, error);
      throw new Error(`Failed to calculate trade impact: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculates liquidity depth at different price levels
   * Note: This is a placeholder implementation.
   */
  private async calculateLiquidityDepth(pool: Pool): Promise<LiquidityDepthLevel[]> {
    // In a real implementation, this would analyze the pool's reserves at different price levels
    // For now, return mock data representing liquidity at different price points
    
    const totalLiquidity = parseFloat(pool.liquidity || '0');
    const currentPrice = parseFloat(pool.price || '0');
    
    if (totalLiquidity === 0 || currentPrice === 0) {
      return [];
    }
    
    // Create mock depth levels at different price points
    const depthLevels: LiquidityDepthLevel[] = [];
    const pricePoints = [-5, -2, -1, -0.5, 0, 0.5, 1, 2, 5]; // Percentage change from current price
    
    for (const pctChange of pricePoints) {
      const priceLevel = currentPrice * (1 + pctChange / 100);
      
      // Liquidity tends to be concentrated near the current price
      let liquidityPct: number;
      if (pctChange === 0) {
        liquidityPct = 0.25; // 25% at current price
      } else if (Math.abs(pctChange) <= 1) {
        liquidityPct = 0.15; // 15% near current price
      } else if (Math.abs(pctChange) <= 2) {
        liquidityPct = 0.1; // 10% a bit further
      } else {
        liquidityPct = 0.05; // 5% at extreme price levels
      }
      
      depthLevels.push({
        priceLevel,
        liquidityAmount: totalLiquidity * liquidityPct,
        percentOfTotal: liquidityPct * 100,
      });
    }
    
    return depthLevels;
  }

  /**
   * Calculates price impact for different trade sizes
   * Note: This is a placeholder implementation.
   */
  private async calculatePriceImpact(pool: Pool): Promise<PriceImpactData> {
    const totalLiquidity = parseFloat(pool.liquidity || '0');
    
    if (totalLiquidity === 0) {
      return {
        buyImpact: [],
        sellImpact: [],
        slippageRisk: 10, // Maximum risk
      };
    }
    
    // Calculate impact for different trade sizes
    const tradeSizes = [0.001, 0.005, 0.01, 0.05, 0.1].map(pct => totalLiquidity * pct);
    
    const buyImpact: PriceImpactLevel[] = [];
    const sellImpact: PriceImpactLevel[] = [];
    
    for (const size of tradeSizes) {
      // Buy impact is typically slightly higher than sell impact
      const buyPct = (size / totalLiquidity) * 100 * 2;
      const sellPct = (size / totalLiquidity) * 100 * 1.8;
      
      buyImpact.push({
        tradeSize: size,
        priceImpact: Math.min(buyPct, 100),
      });
      
      sellImpact.push({
        tradeSize: size,
        priceImpact: Math.min(sellPct, 100),
      });
    }
    
    // Calculate slippage risk based on liquidity and impact
    const largestTradeImpact = buyImpact[buyImpact.length - 1].priceImpact;
    const slippageRisk = Math.min(largestTradeImpact / 10, 10);
    
    return {
      buyImpact,
      sellImpact,
      slippageRisk,
    };
  }

  /**
   * Calculates a concentration score based on how evenly distributed the liquidity is
   * Higher score means more concentrated (less evenly distributed)
   */
  private calculateConcentrationScore(depthLevels: LiquidityDepthLevel[]): number {
    if (depthLevels.length <= 1) return 100; // Maximum concentration if only one level
    
    // Calculate standard deviation of percentages
    const percentages = depthLevels.map(level => level.percentOfTotal);
    const mean = percentages.reduce((sum, pct) => sum + pct, 0) / percentages.length;
    
    const variance = percentages.reduce((sum, pct) => sum + Math.pow(pct - mean, 2), 0) / percentages.length;
    const stdDev = Math.sqrt(variance);
    
    // Convert to a 0-100 scale where higher means more concentrated
    // A perfectly even distribution would have stdDev = 0
    // We'll scale it so that a stdDev of 30 or more is considered maximum concentration
    return Math.min(stdDev * (100 / 30), 100);
  }
}