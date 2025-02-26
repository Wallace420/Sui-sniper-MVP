import { SuiClient, SuiObjectResponse, SuiMoveObject } from '@mysten/sui/client';

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
            const riskScore = await this.calculateRiskFactors(tokenData);

            const result: ValidationResult = {
                isValid: typeof riskScore === 'number' && riskScore > this.config.riskScoreThreshold!,
                riskScore: typeof riskScore === 'number' ? riskScore : 0,
                reason: typeof riskScore === 'number' && riskScore <= this.config.riskScoreThreshold! ?
                    `Risk score too low: ${riskScore}/10` : undefined
            };

            // Update cache
            this.validationCache[tokenId] = {
                result,
                timestamp: Date.now()
            };

            return result;
        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return { 
                isValid: false, 
                riskScore: 0,
                reason: `Failed to validate token: ${errorMessage}`
            };
        }
    }

    private async checkCreatorReputation(tokenData: SuiObjectResponse): Promise<number> {
        try {
            const moveObject = tokenData.data?.content as SuiMoveObject;
            const creator = (moveObject?.fields as { creator?: string })?.creator;
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

    private async analyzeContractCode(tokenData: SuiObjectResponse): Promise<number> {
        try {
            const moveObject = tokenData.data?.content as SuiMoveObject;
            const code = (moveObject?.fields as { bytecode?: string })?.bytecode || '';
            if (!code) return 0.5;

            let score = 1;
            const riskPatterns = [
                'DenyCap',
                'blacklist',
                'maxTransaction',
                'ownerOnly'
            ];

            for (const pattern of riskPatterns) {
                if (code.includes(pattern)) {
                    score -= 0.2;
                }
            }

            return Math.max(0.2, score);
        } catch {
            return 0.5;
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