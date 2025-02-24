import { SuiClient, SuiObjectResponse } from '@mysten/sui/client';

export interface TokenSecurityConfig {
    minLiquidity: number;
    minHoldersCount: number;
    maxOwnershipPercent: number;
    minPoolAge: number;
    blacklistedCreators: string[];
    riskScoreThreshold?: number;
    cacheTimeMs?: number;
}

interface TokenValidationCache {
    [tokenId: string]: {
        result: ValidationResult;
        timestamp: number;
    };
}

interface ValidationResult {
    isValid: boolean;
    riskScore: number;
    reason?: string;
}

export class TokenSecurity {
    private client: SuiClient;
    private config: TokenSecurityConfig;
    private validationCache: TokenValidationCache = {};
    private readonly DEFAULT_CACHE_TIME = 300000; // 5 minutes

    constructor(client: SuiClient, config: TokenSecurityConfig) {
        this.client = client;
        this.config = {
            minLiquidity: config.minLiquidity || 1000,
            minHoldersCount: config.minHoldersCount || 10,
            maxOwnershipPercent: config.maxOwnershipPercent || 50,
            minPoolAge: config.minPoolAge || 300,
            blacklistedCreators: config.blacklistedCreators || [],
            riskScoreThreshold: config.riskScoreThreshold || 7,
            cacheTimeMs: config.cacheTimeMs || this.DEFAULT_CACHE_TIME
        };
    }

    async validateToken(tokenId: string): Promise<ValidationResult> {
        try {
            // Check cache first
            const cachedResult = this.validationCache[tokenId];
            if (cachedResult && Date.now() - cachedResult.timestamp < this.config.cacheTimeMs!) {
                return cachedResult.result;
            }

            const tokenData = await this.client.getObject({ 
                id: tokenId, 
                options: { 
                    showContent: true,
                    showDisplay: true,
                    showType: true
                } 
            });

            const riskFactors = await this.calculateRiskFactors(tokenData);
            const riskScore = this.calculateRiskScore(riskFactors);

            const result: ValidationResult = {
                isValid: riskScore > this.config.riskScoreThreshold!,
                riskScore,
                reason: riskScore <= this.config.riskScoreThreshold! ? 
                    `Risk score too low: ${riskScore}/10` : undefined
            };

            // Update cache
            this.validationCache[tokenId] = {
                result,
                timestamp: Date.now()
            };

            return result;
        } catch (error) {
            return { 
                isValid: false, 
                riskScore: 0,
                reason: `Failed to validate token: ${error.message}`
            };
        }
    }

    private async calculateRiskFactors(tokenData: SuiObjectResponse): Promise<Map<string, number>> {
        const riskFactors = new Map<string, number>();
        const promises = [
            this.checkCreatorReputation(tokenData),
            this.checkLiquidityDepth(tokenData),
            this.checkHolderDistribution(tokenData),
            this.analyzeContractCode(tokenData)
        ];

        const [creatorScore, liquidityScore, distributionScore, codeQualityScore] = await Promise.all(promises);

        riskFactors.set('creatorScore', creatorScore);
        riskFactors.set('liquidityScore', liquidityScore);
        riskFactors.set('distributionScore', distributionScore);
        riskFactors.set('codeQualityScore', codeQualityScore);

        return riskFactors;
    }

    private calculateRiskScore(riskFactors: Map<string, number>): number {
        let totalScore = 0;
        let weightedSum = 0;

        const weights = {
            creatorScore: 0.3,
            liquidityScore: 0.3,
            distributionScore: 0.2,
            codeQualityScore: 0.2
        };

        for (const [factor, score] of riskFactors) {
            weightedSum += score * weights[factor];
            totalScore += weights[factor];
        }

        return (weightedSum / totalScore) * 10;
    }

    private async checkCreatorReputation(tokenData: SuiObjectResponse): Promise<number> {
        try {
            const creator = tokenData.data?.content?.creator;
            if (!creator) return 0;

            if (this.config.blacklistedCreators.includes(creator)) {
                return 0;
            }

            // Check creator's history
            const creatorHistory = await this.client.queryEvents({
                query: { Sender: creator }
            });

            // Analyze creator's transaction history
            const activityScore = Math.min(creatorHistory.data.length / 100, 1); // Normalize to 0-1
            return 0.8 * activityScore;
        } catch {
            return 0.5; // Default score if check fails
        }
    }

    private async checkLiquidityDepth(tokenData: SuiObjectResponse): Promise<number> {
        try {
            const liquidity = await this.getLiquidityInfo(tokenData);
            if (liquidity < this.config.minLiquidity) {
                return 0.3;
            }
            return Math.min(liquidity / (this.config.minLiquidity * 10), 1);
        } catch {
            return 0.5;
        }
    }

    private async checkHolderDistribution(tokenData: SuiObjectResponse): Promise<number> {
        try {
            const holders = await this.getHoldersInfo(tokenData);
            if (holders.count < this.config.minHoldersCount) {
                return 0.3;
            }

            const distributionScore = 1 - (holders.maxOwnershipPercent / 100);
            return Math.max(0.2, distributionScore);
        } catch {
            return 0.5;
        }
    }

    private async analyzeContractCode(tokenData: SuiObjectResponse): Promise<number> {
        try {
            const code = tokenData.data?.content?.disassembled;
            if (!code) return 0.5;

            let score = 1;
            const riskPatterns = [
                'DenyCap',
                'blacklist',
                'maxTransaction',
                'ownerOnly'
            ];

            for (const pattern of riskPatterns) {
                if (JSON.stringify(code).includes(pattern)) {
                    score -= 0.2;
                }
            }

            return Math.max(0.2, score);
        } catch {
            return 0.5;
        }
    }

    private async getLiquidityInfo(tokenData: SuiObjectResponse): Promise<number> {
        // Implement liquidity check logic
        return 1000; // Placeholder
    }

    private async getHoldersInfo(tokenData: SuiObjectResponse): Promise<{ count: number; maxOwnershipPercent: number }> {
        // Implement holders analysis logic
        return { count: 20, maxOwnershipPercent: 30 }; // Placeholder
    }

    clearCache() {
        this.validationCache = {};
    }
}