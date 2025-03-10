"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LiquidityAnalytics = void 0;
var LiquidityAnalytics = /** @class */ (function () {
    function LiquidityAnalytics(client) {
        this.cache = {};
        this.CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
        this.client = client;
    }
    /**
     * Analyzes liquidity depth and price impact for a specific pool
     * @param pool The pool to analyze
     * @returns LiquidityDepthAnalysis with depth and price impact metrics
     */
    LiquidityAnalytics.prototype.analyzeLiquidityDepth = function (pool) {
        return __awaiter(this, void 0, void 0, function () {
            var poolData, depthLevels, priceImpact, concentrationScore, analysis, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Check cache first
                        if (this.cache[pool.poolId] &&
                            Date.now() - this.cache[pool.poolId].timestamp < this.CACHE_DURATION) {
                            return [2 /*return*/, this.cache[pool.poolId].analysis];
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 5, , 6]);
                        return [4 /*yield*/, this.client.getObject({
                                id: pool.poolId,
                                options: {
                                    showContent: true,
                                    showDisplay: true,
                                },
                            })];
                    case 2:
                        poolData = _a.sent();
                        return [4 /*yield*/, this.calculateLiquidityDepth(pool)];
                    case 3:
                        depthLevels = _a.sent();
                        return [4 /*yield*/, this.calculatePriceImpact(pool)];
                    case 4:
                        priceImpact = _a.sent();
                        concentrationScore = this.calculateConcentrationScore(depthLevels);
                        analysis = {
                            poolId: pool.poolId,
                            tokenAId: pool.coin_a,
                            tokenBId: pool.coin_b,
                            totalLiquidity: parseFloat(pool.liquidity || '0'),
                            depth: depthLevels,
                            priceImpact: priceImpact,
                            concentrationScore: concentrationScore,
                            lastUpdated: Date.now(),
                        };
                        // Update cache
                        this.cache[pool.poolId] = {
                            analysis: analysis,
                            timestamp: Date.now(),
                        };
                        return [2 /*return*/, analysis];
                    case 5:
                        error_1 = _a.sent();
                        console.error("Error analyzing liquidity depth for pool ".concat(pool.poolId, ":"), error_1);
                        throw new Error("Failed to analyze liquidity depth: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error'));
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Calculates the price impact of a trade for a given pool
     * @param pool The pool to analyze
     * @param tradeAmount The amount to trade
     * @param isBuy Whether the trade is a buy or sell
     * @returns The price impact as a percentage
     */
    LiquidityAnalytics.prototype.calculateTradeImpact = function (pool, tradeAmount, isBuy) {
        return __awaiter(this, void 0, void 0, function () {
            var liquidity, impactFactor, impact;
            return __generator(this, function (_a) {
                try {
                    liquidity = parseFloat(pool.liquidity || '0');
                    if (liquidity === 0)
                        return [2 /*return*/, 100]; // Maximum impact if no liquidity
                    impactFactor = isBuy ? 2 : 1.8;
                    impact = (tradeAmount / liquidity) * 100 * impactFactor;
                    // Cap at 100%
                    return [2 /*return*/, Math.min(impact, 100)];
                }
                catch (error) {
                    console.error("Error calculating trade impact for pool ".concat(pool.poolId, ":"), error);
                    throw new Error("Failed to calculate trade impact: ".concat(error instanceof Error ? error.message : 'Unknown error'));
                }
                return [2 /*return*/];
            });
        });
    };
    /**
     * Calculates liquidity depth at different price levels
     * Note: This is a placeholder implementation.
     */
    LiquidityAnalytics.prototype.calculateLiquidityDepth = function (pool) {
        return __awaiter(this, void 0, void 0, function () {
            var totalLiquidity, currentPrice, depthLevels, pricePoints, _i, pricePoints_1, pctChange, priceLevel, liquidityPct;
            return __generator(this, function (_a) {
                totalLiquidity = parseFloat(pool.liquidity || '0');
                currentPrice = parseFloat(pool.price || '0');
                if (totalLiquidity === 0 || currentPrice === 0) {
                    return [2 /*return*/, []];
                }
                depthLevels = [];
                pricePoints = [-5, -2, -1, -0.5, 0, 0.5, 1, 2, 5];
                for (_i = 0, pricePoints_1 = pricePoints; _i < pricePoints_1.length; _i++) {
                    pctChange = pricePoints_1[_i];
                    priceLevel = currentPrice * (1 + pctChange / 100);
                    liquidityPct = void 0;
                    if (pctChange === 0) {
                        liquidityPct = 0.25; // 25% at current price
                    }
                    else if (Math.abs(pctChange) <= 1) {
                        liquidityPct = 0.15; // 15% near current price
                    }
                    else if (Math.abs(pctChange) <= 2) {
                        liquidityPct = 0.1; // 10% a bit further
                    }
                    else {
                        liquidityPct = 0.05; // 5% at extreme price levels
                    }
                    depthLevels.push({
                        priceLevel: priceLevel,
                        liquidityAmount: totalLiquidity * liquidityPct,
                        percentOfTotal: liquidityPct * 100,
                    });
                }
                return [2 /*return*/, depthLevels];
            });
        });
    };
    /**
     * Calculates price impact for different trade sizes
     * Note: This is a placeholder implementation.
     */
    LiquidityAnalytics.prototype.calculatePriceImpact = function (pool) {
        return __awaiter(this, void 0, void 0, function () {
            var totalLiquidity, tradeSizes, buyImpact, sellImpact, _i, tradeSizes_1, size, buyPct, sellPct, largestTradeImpact, slippageRisk;
            return __generator(this, function (_a) {
                totalLiquidity = parseFloat(pool.liquidity || '0');
                if (totalLiquidity === 0) {
                    return [2 /*return*/, {
                            buyImpact: [],
                            sellImpact: [],
                            slippageRisk: 10, // Maximum risk
                        }];
                }
                tradeSizes = [0.001, 0.005, 0.01, 0.05, 0.1].map(function (pct) { return totalLiquidity * pct; });
                buyImpact = [];
                sellImpact = [];
                for (_i = 0, tradeSizes_1 = tradeSizes; _i < tradeSizes_1.length; _i++) {
                    size = tradeSizes_1[_i];
                    buyPct = (size / totalLiquidity) * 100 * 2;
                    sellPct = (size / totalLiquidity) * 100 * 1.8;
                    buyImpact.push({
                        tradeSize: size,
                        priceImpact: Math.min(buyPct, 100),
                    });
                    sellImpact.push({
                        tradeSize: size,
                        priceImpact: Math.min(sellPct, 100),
                    });
                }
                largestTradeImpact = buyImpact[buyImpact.length - 1].priceImpact;
                slippageRisk = Math.min(largestTradeImpact / 10, 10);
                return [2 /*return*/, {
                        buyImpact: buyImpact,
                        sellImpact: sellImpact,
                        slippageRisk: slippageRisk,
                    }];
            });
        });
    };
    /**
     * Calculates a concentration score based on how evenly distributed the liquidity is
     * Higher score means more concentrated (less evenly distributed)
     */
    LiquidityAnalytics.prototype.calculateConcentrationScore = function (depthLevels) {
        if (depthLevels.length <= 1)
            return 100; // Maximum concentration if only one level
        // Calculate standard deviation of percentages
        var percentages = depthLevels.map(function (level) { return level.percentOfTotal; });
        var mean = percentages.reduce(function (sum, pct) { return sum + pct; }, 0) / percentages.length;
        var variance = percentages.reduce(function (sum, pct) { return sum + Math.pow(pct - mean, 2); }, 0) / percentages.length;
        var stdDev = Math.sqrt(variance);
        // Convert to a 0-100 scale where higher means more concentrated
        // A perfectly even distribution would have stdDev = 0
        // We'll scale it so that a stdDev of 30 or more is considered maximum concentration
        return Math.min(stdDev * (100 / 30), 100);
    };
    return LiquidityAnalytics;
}());
exports.LiquidityAnalytics = LiquidityAnalytics;
