import { SuiClient, SuiObjectResponse, PoolData } from '../../types/sui-sdk';
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
  private client: SuiClient;
  private cache: LiquidityAnalyticsCache = {};
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
 
  constructor(client: SuiClient) {
    this.client = client;
  }

  /**
   * Analyzes liquidity depth and price impact for a specific pool
   * @param pool The pool to analyze
   */
  async analyzeLiquidityDepth(pool: Pool): Promise<LiquidityDepthAnalysis> {
    const poolId = pool.poolId;
    
    // Check cache first
    if (this.cache[poolId] && Date.now() - this.cache[poolId].timestamp < this.CACHE_DURATION) {
      return this.cache[poolId].analysis;
    }
    
    try {
      // Fetch pool data
      const poolData = await this.client.getObject({
        id: poolId,
        options: { showContent: true }
      });
      
      if (!poolData.data || !poolData.data.content) {
        throw new Error(`Pool data not found for ${poolId}`);
      }
      
      // Extract pool fields
      const fields = this.getFieldsFromData(poolData as SuiObjectResponse);
      if (!fields) {
        throw new Error(`Could not extract fields from pool ${poolId}`);
      }
      
      // Extract reserves
      const reserveA = BigInt(fields.reserve_a || '0');
      const reserveB = BigInt(fields.reserve_b || '0');
      
      if (reserveA === BigInt(0) || reserveB === BigInt(0)) {
        throw new Error(`Pool ${poolId} has zero reserves`);
      }
      
      // Calculate current price
      const currentPrice = Number(reserveB) / Number(reserveA);
      
      // Generate depth levels
      const depthLevels = this.generateDepthLevels(currentPrice, Number(reserveA), Number(reserveB));
      
      // Calculate price impact for different trade sizes
      const priceImpact = this.calculatePriceImpact(Number(reserveA), Number(reserveB), currentPrice);
      
      // Calculate concentration score
      const concentrationScore = this.calculateConcentrationScore(depthLevels);
      
      // Create analysis result
      const analysis: LiquidityDepthAnalysis = {
        poolId,
        tokenAId: pool.coin_a,
        tokenBId: pool.coin_b,
        totalLiquidity: Number(reserveA) * currentPrice + Number(reserveB),
        depth: depthLevels,
        priceImpact,
        concentrationScore,
        lastUpdated: Date.now()
      };
      
      // Cache the result
      this.cache[poolId] = {
        analysis,
        timestamp: Date.now()
      };
      
      return analysis;
    } catch (error) {
      console.error(`Error analyzing liquidity depth for pool ${poolId}:`, error);
      throw new Error(`Failed to analyze liquidity depth: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  private getFieldsFromData(data: SuiObjectResponse) {
    if (data?.data?.content && 'fields' in data.data.content) {
      return (data.data.content as any).fields;
    }
    return null;
  }
  
  private generateDepthLevels(currentPrice: number, reserveA: number, reserveB: number): LiquidityDepthLevel[] {
    const levels: LiquidityDepthLevel[] = [];
    const totalLiquidity = reserveA * currentPrice + reserveB;
    
    // Generate 10 price levels (5 above, 5 below current price)
    for (let i = -5; i <= 5; i++) {
      if (i === 0) continue; // Skip current price level
      
      const priceLevel = currentPrice * (1 + i * 0.05); // 5% increments
      const liquidityAtLevel = this.calculateLiquidityAtPrice(priceLevel, reserveA, reserveB, currentPrice);
      
      levels.push({
        priceLevel,
        liquidityAmount: liquidityAtLevel,
        percentOfTotal: (liquidityAtLevel / totalLiquidity) * 100
      });
    }
    
    return levels;
  }
  
  private calculateLiquidityAtPrice(price: number, reserveA: number, reserveB: number, currentPrice: number): number {
    // Simplified constant product formula: x * y = k
    const k = reserveA * reserveB;
    
    // Calculate new reserves at the given price
    const newReserveA = Math.sqrt(k / price);
    const newReserveB = price * newReserveA;
    
    return newReserveA * price + newReserveB;
  }
  
  private calculatePriceImpact(reserveA: number, reserveB: number, currentPrice: number): PriceImpactData {
    const buyImpact: PriceImpactLevel[] = [];
    const sellImpact: PriceImpactLevel[] = [];
    
    // Calculate impact for different trade sizes (0.1%, 0.5%, 1%, 2%, 5%, 10% of pool)
    const tradeSizes = [0.001, 0.005, 0.01, 0.02, 0.05, 0.1];
    const totalLiquidity = reserveA * currentPrice + reserveB;
    
    for (const sizePercent of tradeSizes) {
      const tradeSize = totalLiquidity * sizePercent;
      
      // Buy impact (buying token B with token A)
      const tokenAAmount = tradeSize / currentPrice;
      const newReserveA = reserveA + tokenAAmount;
      const newReserveB = (reserveA * reserveB) / newReserveA;
      const tokenBReceived = reserveB - newReserveB;
      const effectiveBuyPrice = tokenAAmount / tokenBReceived;
      const buyPriceImpact = ((effectiveBuyPrice / currentPrice) - 1) * 100;
      
      buyImpact.push({
        tradeSize,
        priceImpact: buyPriceImpact
      });
      
      // Sell impact (selling token B for token A)
      const tokenBAmount = tradeSize;
      const newReserveB2 = reserveB + tokenBAmount;
      const newReserveA2 = (reserveA * reserveB) / newReserveB2;
      const tokenAReceived = reserveA - newReserveA2;
      const effectiveSellPrice = tokenAReceived / tokenBAmount;
      const sellPriceImpact = (1 - (effectiveSellPrice / currentPrice)) * 100;
      
      sellImpact.push({
        tradeSize,
        priceImpact: sellPriceImpact
      });
    }
    
    // Calculate slippage risk (0-10 scale)
    const largestBuyImpact = buyImpact[buyImpact.length - 1].priceImpact;
    const largestSellImpact = sellImpact[sellImpact.length - 1].priceImpact;
    const slippageRisk = Math.min(10, (largestBuyImpact + largestSellImpact) / 4);
    
    return {
      buyImpact,
      sellImpact,
      slippageRisk
    };
  }
  
  private calculateConcentrationScore(depthLevels: LiquidityDepthLevel[]): number {
    // Calculate Gini coefficient-like measure for liquidity concentration
    const sortedLevels = [...depthLevels].sort((a, b) => a.liquidityAmount - b.liquidityAmount);
    let sumOfDifferences = 0;
    let sumOfValues = 0;
    
    for (let i = 0; i < sortedLevels.length; i++) {
      for (let j = 0; j < sortedLevels.length; j++) {
        sumOfDifferences += Math.abs(sortedLevels[i].liquidityAmount - sortedLevels[j].liquidityAmount);
      }
      sumOfValues += sortedLevels[i].liquidityAmount;
    }
    
    // Normalize to 0-100 scale
    const gini = sumOfDifferences / (2 * sortedLevels.length * sumOfValues);
    return gini * 100;
  }
}