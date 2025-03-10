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

export interface ValidationResult {
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

            const riskFactors = {
                creatorReputation: await this.checkCreatorReputation(tokenData),
                contractSafety: await this.analyzeContractCode(tokenData),
                liquidityDepth: await this.checkLiquidityDepth(tokenData),
                holderDistribution: await this.checkHolderDistribution(tokenData)
            };
            
            const riskScore = Object.values(riskFactors).reduce((acc, score) => acc + score, 0) * 2.5; // Scale to 0-10

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
            const fields = moveObject?.fields as Record<string, any>;
            const creator = fields?.creator as string;
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
            const fields = moveObject?.fields as Record<string, any>;
            const code = fields?.bytecode as string;
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
        try {
            const moveObject = tokenData.data?.content as SuiMoveObject;
            const fields = moveObject?.fields as Record<string, any>;
            const tokenType = tokenData.data?.type as string;
            
            if (!tokenType) {
                return 0;
            }

            // Query pools that contain this token
            // We'll look for both Cetus and BluemoveSwap pools
            const cetusPoolEvents = await this.client.queryEvents({
                query: {
                    MoveEventType: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::pool::AddLiquidityEvent'
                },
                limit: 50
            });

            const bluemovePoolEvents = await this.client.queryEvents({
                query: {
                    MoveEventType: '0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Add_Liquidity_Pool'
                },
                limit: 50
            });

            // Process pool events to find liquidity for this token
            let totalLiquidity = 0;
            
            // Process Cetus pools
            for (const event of cetusPoolEvents.data) {
                const parsedJson = event.parsedJson as Record<string, any>;
                const coinA = parsedJson.coin_a_type;
                const coinB = parsedJson.coin_b_type;
                
                if (coinA === tokenType || coinB === tokenType) {
                    // Found a pool with our token
                    const poolId = parsedJson.pool_id;
                    
                    // Get pool details
                    const poolData = await this.client.getObject({
                        id: poolId,
                        options: {
                            showContent: true
                        }
                    });
                    
                    const poolObject = poolData.data?.content as SuiMoveObject;
                    const poolFields = poolObject?.fields as Record<string, any>;
                    
                    // Extract liquidity value
                    const liquidity = poolFields?.liquidity ? 
                        parseFloat(poolFields.liquidity) : 
                        (poolFields?.lp_supply ? parseFloat(poolFields.lp_supply) : 0);
                    
                    totalLiquidity += liquidity;
                }
            }
            
            // Process BluemoveSwap pools
            for (const event of bluemovePoolEvents.data) {
                const parsedJson = event.parsedJson as Record<string, any>;
                const coinA = parsedJson.coin_a_type || parsedJson.coinTypeA;
                const coinB = parsedJson.coin_b_type || parsedJson.coinTypeB;
                
                if (coinA === tokenType || coinB === tokenType) {
                    // Found a pool with our token
                    const poolId = parsedJson.pool_id || parsedJson.poolId;
                    
                    // Get pool details
                    const poolData = await this.client.getObject({
                        id: poolId,
                        options: {
                            showContent: true
                        }
                    });
                    
                    const poolObject = poolData.data?.content as SuiMoveObject;
                    const poolFields = poolObject?.fields as Record<string, any>;
                    
                    // Extract liquidity value
                    const liquidity = poolFields?.liquidity ? 
                        parseFloat(poolFields.liquidity) : 
                        (poolFields?.lp_supply ? parseFloat(poolFields.lp_supply) : 0);
                    
                    totalLiquidity += liquidity;
                }
            }
            
            return Math.max(totalLiquidity, 0);
        } catch (error) {
            console.error('Error getting liquidity info:', error);
            return 0; // Return 0 liquidity on error
        }
    }

    private async getHoldersInfo(tokenData: SuiObjectResponse): Promise<{ count: number; maxOwnershipPercent: number }> {
        try {
            const moveObject = tokenData.data?.content as SuiMoveObject;
            const fields = moveObject?.fields as Record<string, any>;
            const tokenType = tokenData.data?.type as string;
            
            if (!tokenType) {
                return { count: 0, maxOwnershipPercent: 100 };
            }

            // Query token holders
            // In a production environment, this would use an indexer or specialized API
            // to get all token holders. For now, we'll query recent transfers to estimate holders.
            const transferEvents = await this.client.queryEvents({
                query: {
                    MoveEventType: `${tokenType}::transfer::TransferEvent`
                },
                limit: 100
            });

            // Extract unique addresses from transfer events
            const holderAddresses = new Set<string>();
            const balances = new Map<string, bigint>();
            let totalSupply = BigInt(0);

            // Process transfer events to build a simplified holder list
            for (const event of transferEvents.data) {
                const parsedJson = event.parsedJson as Record<string, any>;
                const from = parsedJson.from;
                const to = parsedJson.to;
                const amount = BigInt(parsedJson.amount || '0');

                if (from) holderAddresses.add(from);
                if (to) holderAddresses.add(to);

                // Update balances (simplified estimation)
                if (from) {
                    const currentBalance = balances.get(from) || BigInt(0);
                    balances.set(from, currentBalance - amount);
                }

                if (to) {
                    const currentBalance = balances.get(to) || BigInt(0);
                    balances.set(to, currentBalance + amount);
                }

                // Add to total supply (this is a simplification)
                totalSupply += amount;
            }

            // If we couldn't find any transfer events, try to get total supply from token data
            if (totalSupply === BigInt(0)) {
                totalSupply = BigInt(fields?.total_supply || fields?.supply || '0');
            }

            // Calculate max ownership percentage
            let maxOwnership = 0;
            if (totalSupply > BigInt(0)) {
                for (const [_, balance] of balances) {
                    if (balance <= BigInt(0)) continue;
                    const percentage = Number((balance * BigInt(100)) / totalSupply);
                    maxOwnership = Math.max(maxOwnership, percentage);
                }
            } else {
                maxOwnership = 100; // Default to 100% if we can't determine supply
            }

            // Filter out addresses with zero or negative balance
            const validHolders = Array.from(balances.entries())
                .filter(([_, balance]) => balance > BigInt(0));

            return {
                count: Math.max(validHolders.length, 1), // At least 1 holder
                maxOwnershipPercent: maxOwnership
            };
        } catch (error) {
            console.error('Error getting holders info:', error);
            // Return conservative defaults on error
            return { count: 1, maxOwnershipPercent: 100 };
        }
    }

    clearCache() {
        this.validationCache = {};
    }
}