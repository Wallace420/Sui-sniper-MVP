import { SuiClient, SuiObjectResponse } from '@mysten/sui/client';

export interface TokenHolderAnalysis {
  tokenId: string;
  totalHolders: number;
  topHolders: TokenHolder[];
  concentrationRatio: number;
  giniCoefficient?: number;
  lastUpdated: number;
}

export interface TokenHolder {
  address: string;
  balance: bigint;
  percentage: number;
}

export interface TokenVolumeData {
  tokenId: string;
  volume24h: number;
  volume7d: number;
  transactions24h: number;
  priceChange24h: number;
  volumeChange24h: number;
  volumeTrend: number[];
  lastUpdated: number;
}

interface TokenAnalyticsCache {
  [tokenId: string]: {
    holderData?: TokenHolderAnalysis;
    volumeData?: TokenVolumeData;
    timestamp: number;
  };
}

export class TokenAnalytics {
  private client: SuiClient;
  private cache: TokenAnalyticsCache = {};
  private readonly CACHE_DURATION = 15 * 60 * 1000;

  constructor(client: SuiClient) {
    this.client = client;
  }

  // Neue Methode zum Auslesen der Felder ohne getObjectFields
  private getFieldsFromData(data: any) {
    return data?.content?.dataType === 'moveObject' ? data?.content?.fields : null;
  }

  async getTokenHolderAnalysis(tokenId: string): Promise<TokenHolderAnalysis> {
    if (
      this.cache[tokenId]?.holderData &&
      Date.now() - this.cache[tokenId].timestamp < this.CACHE_DURATION
    ) {
      return this.cache[tokenId].holderData!;
    }

    try {
      const tokenData = await this.client.getObject({
        id: tokenId,
        options: {
          showContent: true,
          showDisplay: true,
        },
      });

      const fields = this.getFieldsFromData(tokenData);

      const holders = await this.fetchTokenHolders(tokenId);
      const totalSupply = this.calculateTotalSupply(holders);
      const topHolders = this.getTopHolders(holders, 10);
      const concentrationRatio = this.calculateConcentrationRatio(topHolders, totalSupply);
      const giniCoefficient = this.calculateGiniCoefficient(holders, totalSupply);

      const analysis: TokenHolderAnalysis = {
        tokenId,
        totalHolders: holders.length,
        topHolders,
        concentrationRatio,
        giniCoefficient,
        lastUpdated: Date.now(),
      };

      this.cache[tokenId] = {
        ...this.cache[tokenId],
        holderData: analysis,
        timestamp: Date.now(),
      };

      return analysis;
    } catch (error) {
      console.error(`Error analyzing token holders for ${tokenId}:`, error);
      throw new Error(`Failed to analyze token holders: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTokenVolumeAnalysis(tokenId: string): Promise<TokenVolumeData> {
    if (
      this.cache[tokenId]?.volumeData &&
      Date.now() - this.cache[tokenId].timestamp < this.CACHE_DURATION
    ) {
      return this.cache[tokenId].volumeData!;
    }

    try {
      const volumeData = await this.fetchVolumeData(tokenId);

      this.cache[tokenId] = {
        ...this.cache[tokenId],
        volumeData,
        timestamp: Date.now(),
      };

      return volumeData;
    } catch (error) {
      console.error(`Error analyzing volume for ${tokenId}:`, error);
      throw new Error(`Failed to analyze token volume: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async fetchTokenHolders(tokenId: string): Promise<TokenHolder[]> {
    return [
      { address: '0x1', balance: BigInt(1000000), percentage: 40 },
      { address: '0x2', balance: BigInt(500000), percentage: 20 },
      { address: '0x3', balance: BigInt(300000), percentage: 12 },
      { address: '0x4', balance: BigInt(200000), percentage: 8 },
      { address: '0x5', balance: BigInt(100000), percentage: 4 },
      { address: '0x6', balance: BigInt(50000), percentage: 2 },
    ];
  }

  private async fetchVolumeData(tokenId: string): Promise<TokenVolumeData> {
    return {
      tokenId,
      volume24h: 250000,
      volume7d: 1750000,
      transactions24h: 120,
      priceChange24h: 5.2,
      volumeChange24h: 12.5,
      volumeTrend: Array(24).fill(0).map(() => 8000 + Math.random() * 4000),
      lastUpdated: Date.now(),
    };
  }

  private calculateTotalSupply(holders: TokenHolder[]): bigint {
    return holders.reduce((sum, holder) => sum + holder.balance, BigInt(0));
  }

  private getTopHolders(holders: TokenHolder[], count: number): TokenHolder[] {
    return [...holders]
      .sort((a, b) => (b.balance > a.balance ? 1 : -1))
      .slice(0, count);
  }

  private calculateConcentrationRatio(topHolders: TokenHolder[], totalSupply: bigint): number {
    const topHoldingsSum = topHolders.reduce((sum, holder) => sum + holder.balance, BigInt(0));
    return Number((topHoldingsSum * BigInt(100)) / totalSupply);
  }

  private calculateGiniCoefficient(holders: TokenHolder[], totalSupply: bigint): number {
    if (holders.length <= 1) return 0;

    const sortedHolders = [...holders].sort((a, b) => 
      a.balance > b.balance ? 1 : -1
    );

    let sumNumerator = BigInt(0);
    for (let i = 0; i < sortedHolders.length; i++) {
      sumNumerator += sortedHolders[i].balance * BigInt(2 * i - sortedHolders.length + 1);
    }

    const gini = Number(sumNumerator) / (Number(totalSupply) * sortedHolders.length);
    return Math.abs(gini);
  }
}
