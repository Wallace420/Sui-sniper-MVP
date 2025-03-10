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
var globals_1 = require("@jest/globals");
var test_utils_1 = require("../test-utils"); // Import SuiClientMock and mockSuiClient
var analytics_1 = require("../../services/analytics");
(0, globals_1.describe)('Analytics Services', function () {
    // Use the centralized mockSuiClient from test-utils
    // Reset mocks before each test
    (0, globals_1.beforeEach)(function () {
        globals_1.jest.clearAllMocks();
    });
    (0, globals_1.describe)('TokenAnalytics', function () {
        var tokenAnalytics;
        (0, globals_1.beforeEach)(function () {
            tokenAnalytics = new analytics_1.TokenAnalytics(test_utils_1.mockSuiClient); // Removed 'as any'
        });
        (0, globals_1.test)('should be properly defined', function () {
            (0, globals_1.expect)(tokenAnalytics).toBeDefined();
        });
        (0, globals_1.test)('should analyze token holders', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Mock the client responses
                        test_utils_1.mockSuiClient.getCoins.mockResolvedValue(Promise.resolve({
                            data: [{
                                    data: {
                                        objectId: '0x1',
                                        version: '1',
                                        digest: 'mockDigest1',
                                        content: {
                                            dataType: 'moveObject',
                                            type: '0x2::coin::Coin',
                                            hasPublicTransfer: true,
                                            fields: {
                                                balance: '1000',
                                                id: 'coin1'
                                            }
                                        }
                                    },
                                },
                                {
                                    data: {
                                        objectId: '0x2',
                                        version: '1',
                                        digest: 'mockDigest2',
                                        content: {
                                            dataType: 'moveObject',
                                            type: '0x2::coin::Coin',
                                            hasPublicTransfer: true,
                                            fields: {
                                                balance: '2000',
                                                id: 'coin2'
                                            }
                                        }
                                    }
                                },
                                {
                                    data: {
                                        objectId: '0x3',
                                        version: '1',
                                        digest: 'mockDigest3',
                                        content: {
                                            dataType: 'moveObject',
                                            type: '0x2::coin::Coin',
                                            hasPublicTransfer: true,
                                            fields: {
                                                balance: '3000',
                                                id: 'coin3'
                                            }
                                        }
                                    }
                                }
                            ],
                            hasNextPage: false,
                            nextCursor: null
                        }));
                        return [4 /*yield*/, tokenAnalytics.analyzeTokenHolders('testToken')];
                    case 1:
                        result = _a.sent();
                        // Assertions
                        (0, globals_1.expect)(result).toBeDefined();
                        (0, globals_1.expect)(result.tokenId).toBe('testToken');
                        (0, globals_1.expect)(result.totalHolders).toBe(3);
                        (0, globals_1.expect)(result.topHolders.length).toBe(3);
                        (0, globals_1.expect)(result.concentrationRatio).toBeGreaterThan(0);
                        (0, globals_1.expect)(result.giniCoefficient).toBeDefined();
                        (0, globals_1.expect)(test_utils_1.mockSuiClient.getCoins).toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.test)('should analyze token volume', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Mock the client responses
                        test_utils_1.mockSuiClient.queryEvents.mockResolvedValue({
                            data: [
                                {
                                    timestampMs: String(Date.now() - 3600000),
                                    id: { txDigest: 'tx1', eventSeq: '1' },
                                    type: '0x3::token::TransferEvent',
                                    parsedJson: { amount: '1000' },
                                    packageId: '0x3',
                                    transactionModule: 'token',
                                    sender: '0xsender1',
                                    bcs: '0x'
                                }
                            ],
                            hasNextPage: false,
                            nextCursor: null
                        }); // PaginatedEvents // removed PaginatedEvents import
                        return [4 /*yield*/, tokenAnalytics.analyzeTokenVolume('testToken')];
                    case 1:
                        result = _a.sent();
                        // Assertions
                        (0, globals_1.expect)(result).toBeDefined();
                        (0, globals_1.expect)(result.tokenId).toBe('testToken');
                        (0, globals_1.expect)(result.volume24h).toBeGreaterThanOrEqual(0);
                        (0, globals_1.expect)(result.volume7d).toBeGreaterThanOrEqual(0);
                        (0, globals_1.expect)(result.transactions24h).toBeGreaterThanOrEqual(0);
                        (0, globals_1.expect)(result.priceChange24h).toBeDefined();
                        (0, globals_1.expect)(result.volumeChange24h).toBeDefined();
                        (0, globals_1.expect)(result.volumeTrend).toBeInstanceOf(Array);
                        (0, globals_1.expect)(result.lastUpdated).toBeDefined();
                        (0, globals_1.expect)(test_utils_1.mockSuiClient.queryEvents).toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.test)('should use cached data when available and not expired', function () { return __awaiter(void 0, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Mock the client responses for first call
                        test_utils_1.mockSuiClient.getCoins.mockResolvedValue(Promise.resolve({
                            data: [
                                {
                                    data: {
                                        digest: 'mockDigest1',
                                        objectId: 'coin1',
                                        version: '1',
                                        content: {
                                            dataType: 'moveObject',
                                            fields: {
                                                balance: '1000',
                                                id: 'coin1'
                                            },
                                            type: '0x2::coin::Coin'
                                        }
                                    }
                                },
                                {
                                    data: {
                                        digest: 'mockDigest2',
                                        objectId: 'coin2',
                                        version: '1',
                                        content: {
                                            dataType: 'moveObject',
                                            fields: {
                                                balance: '2000',
                                                id: 'coin2'
                                            },
                                            type: '0x2::coin::Coin'
                                        }
                                    }
                                },
                                {
                                    data: {
                                        digest: 'mockDigest3',
                                        objectId: 'coin3',
                                        version: '1',
                                        content: {
                                            dataType: 'moveObject',
                                            fields: {
                                                balance: '3000',
                                                id: 'coin3'
                                            },
                                            type: '0x2::coin::Coin'
                                        }
                                    }
                                }
                            ],
                            hasNextPage: false
                        })); // PaginatedObjectsResponse // removed PaginatedObjectsResponse import)
                        // First call should hit the API
                        return [4 /*yield*/, tokenAnalytics.analyzeTokenHolders('testToken')];
                    case 1:
                        // First call should hit the API
                        _a.sent();
                        (0, globals_1.expect)(test_utils_1.mockSuiClient.getCoins).toHaveBeenCalledTimes(1);
                        // Reset mock to verify it's not called again
                        globals_1.jest.clearAllMocks();
                        // Second call should use cache
                        return [4 /*yield*/, tokenAnalytics.analyzeTokenHolders('testToken')];
                    case 2:
                        // Second call should use cache
                        _a.sent();
                        (0, globals_1.expect)(test_utils_1.mockSuiClient.getCoins).not.toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, globals_1.describe)('LiquidityAnalytics', function () {
        var liquidityAnalytics;
        (0, globals_1.beforeEach)(function () {
            liquidityAnalytics = new analytics_1.LiquidityAnalytics(test_utils_1.mockSuiClient); // Removed 'as any'
        });
        (0, globals_1.test)('should be properly defined', function () {
            (0, globals_1.expect)(liquidityAnalytics).toBeDefined();
        });
        (0, globals_1.test)('should analyze liquidity depth', function () { return __awaiter(void 0, void 0, void 0, function () {
            var samplePool, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Mock the client responses with properly structured SuiObjectResponse
                        test_utils_1.mockSuiClient.getObject.mockResolvedValue(Promise.resolve({
                            data: {
                                digest: 'mockDigest',
                                objectId: 'pool1',
                                version: '1',
                                content: {
                                    dataType: 'moveObject',
                                    type: '0x2::amm::Pool',
                                    hasPublicTransfer: true,
                                    fields: {
                                        coin_a: { id: 'tokenA' },
                                        coin_b: { id: 'tokenB' },
                                        reserve_a: '10000',
                                        reserve_b: '20000'
                                    }
                                }
                            }
                        })); // SuiObjectResponse // removed SuiObjectResponse import
                        samplePool = {
                            id: 'pool1',
                            poolId: 'pool1',
                            coin_a: 'tokenA::module::type',
                            coin_b: 'tokenB::module::type',
                            dex: 'TestDex',
                            poolCreated: Date.now(),
                            price: '2.0',
                            liquidity: '20000'
                        };
                        return [4 /*yield*/, liquidityAnalytics.analyzeLiquidityDepth(samplePool)];
                    case 1:
                        result = _a.sent();
                        // Assertions
                        (0, globals_1.expect)(result).toBeDefined();
                        (0, globals_1.expect)(result.poolId).toBe('pool1');
                        (0, globals_1.expect)(result.depth.length).toBeGreaterThan(0);
                        (0, globals_1.expect)(result.priceImpact).toBeDefined();
                        (0, globals_1.expect)(test_utils_1.mockSuiClient.getObject).toHaveBeenCalled();
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.test)('should calculate price impact correctly', function () { return __awaiter(void 0, void 0, void 0, function () {
            var samplePool, result, smallTrade, largeTrade;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Mock the client responses with properly structured SuiObjectResponse
                        test_utils_1.mockSuiClient.getObject.mockResolvedValue(Promise.resolve({
                            data: {
                                digest: 'mockDigest',
                                objectId: 'pool1',
                                version: '1',
                                content: {
                                    dataType: 'moveObject',
                                    type: '0x2::amm::Pool',
                                    hasPublicTransfer: true,
                                    fields: {
                                        coin_a: { id: 'tokenA' },
                                        coin_b: { id: 'tokenB' },
                                        reserve_a: '100000',
                                        reserve_b: '100000'
                                    }
                                }
                            }
                        })); // SuiObjectResponse // removed SuiObjectResponse import
                        samplePool = {
                            id: 'pool1',
                            poolId: 'pool1',
                            coin_a: 'tokenA::module::type',
                            coin_b: 'tokenB::module::type',
                            dex: 'TestDex',
                            poolCreated: Date.now(),
                            price: '1.0',
                            liquidity: '100000'
                        };
                        return [4 /*yield*/, liquidityAnalytics.analyzeLiquidityDepth(samplePool)];
                    case 1:
                        result = _a.sent();
                        // Assertions
                        (0, globals_1.expect)(result.priceImpact.buyImpact.length).toBeGreaterThan(0);
                        (0, globals_1.expect)(result.priceImpact.sellImpact.length).toBeGreaterThan(0);
                        smallTrade = result.priceImpact.buyImpact[0];
                        largeTrade = result.priceImpact.buyImpact[result.priceImpact.buyImpact.length - 1];
                        (0, globals_1.expect)(largeTrade.priceImpact).toBeGreaterThan(smallTrade.priceImpact);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, globals_1.describe)('SocialAnalytics', function () {
        var socialAnalytics;
        (0, globals_1.beforeEach)(function () {
            socialAnalytics = new analytics_1.SocialAnalytics(test_utils_1.mockSuiClient, {
                apiEndpoint: 'https://api.example.com',
                apiKey: 'test-api-key',
                baseUrl: 'https://api.example.com',
                rateLimit: 100
            });
        });
        (0, globals_1.test)('should be properly defined', function () {
            (0, globals_1.expect)(socialAnalytics).toBeDefined();
        });
        (0, globals_1.test)('should analyze social sentiment', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Mock the SocialApiClient methods
                        globals_1.jest.spyOn(socialAnalytics, 'fetchSocialData').mockResolvedValue({
                            mentions: [
                                { platform: 'twitter', count: 100, timestamp: Date.now() - 3600000 },
                                { platform: 'telegram', count: 50, timestamp: Date.now() - 7200000 },
                                { platform: 'discord', count: 75, timestamp: Date.now() - 10800000 }
                            ],
                            sentiment: [
                                { platform: 'twitter', score: 0.8, timestamp: Date.now() - 3600000 },
                                { platform: 'telegram', score: 0.6, timestamp: Date.now() - 7200000 },
                                { platform: 'discord', score: 0.7, timestamp: Date.now() - 10800000 }
                            ],
                            engagement: {
                                twitter: { followers: 1000, likes: 500, retweets: 200 },
                                telegram: { members: 2000, messages: 300 },
                                discord: { members: 1500, messages: 250 }
                            }
                        });
                        return [4 /*yield*/, socialAnalytics.analyzeSocialSentiment('testToken')];
                    case 1:
                        result = _a.sent();
                        // Assertions
                        (0, globals_1.expect)(result).toBeDefined();
                        (0, globals_1.expect)(result.tokenId).toBe('testToken');
                        (0, globals_1.expect)(result.overallSentiment).toBeGreaterThan(0);
                        (0, globals_1.expect)(result.sentimentByPlatform.length).toBeGreaterThan(0);
                        (0, globals_1.expect)(result.mentionsByPlatform.length).toBeGreaterThan(0);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.test)('should analyze community engagement', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, socialAnalytics.analyzeCommunityEngagement('testToken')];
                    case 1:
                        result = _a.sent();
                        // Assertions
                        (0, globals_1.expect)(result).toBeDefined();
                        (0, globals_1.expect)(result.tokenId).toBe('testToken');
                        (0, globals_1.expect)(result.totalEngagement).toBeGreaterThan(0);
                        (0, globals_1.expect)(result.platformEngagement.length).toBeGreaterThan(0);
                        return [2 /*return*/];
                }
            });
        }); });
        (0, globals_1.test)('should analyze developer activity', function () { return __awaiter(void 0, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Mock the client responses
                        globals_1.jest.spyOn(socialAnalytics, 'fetchDeveloperActivity').mockResolvedValue({
                            commits: [
                                { count: 10, timestamp: Date.now() - 86400000 },
                                { count: 15, timestamp: Date.now() - 172800000 },
                                { count: 20, timestamp: Date.now() - 259200000 }
                            ],
                            issues: [
                                { count: 5, timestamp: Date.now() - 86400000 },
                                { count: 8, timestamp: Date.now() - 172800000 },
                                { count: 12, timestamp: Date.now() - 259200000 }
                            ],
                            contributors: 5
                        });
                        return [4 /*yield*/, socialAnalytics.analyzeDeveloperActivity('testToken')];
                    case 1:
                        result = _a.sent();
                        // Assertions
                        (0, globals_1.expect)(result).toBeDefined();
                        (0, globals_1.expect)(result.tokenId).toBe('testToken');
                        (0, globals_1.expect)(result.activityScore).toBeGreaterThan(0);
                        (0, globals_1.expect)(result.commitActivity.length).toBeGreaterThan(0);
                        (0, globals_1.expect)(result.issueActivity.length).toBeGreaterThan(0);
                        return [2 /*return*/];
                }
            });
        }); });
    });
    (0, globals_1.describe)('createAnalytics Factory', function () {
        (0, globals_1.test)('should create all analytics instances', function () {
            var analytics = (0, analytics_1.createAnalytics)(test_utils_1.mockSuiClient, {
                apiKey: 'test-api-key',
                apiEndpoint: 'https://api.example.com',
                baseUrl: 'https://api.example.com',
                rateLimit: 100
            });
            (0, globals_1.expect)(analytics.tokenAnalytics).toBeInstanceOf(analytics_1.TokenAnalytics);
            (0, globals_1.expect)(analytics.liquidityAnalytics).toBeInstanceOf(analytics_1.LiquidityAnalytics);
            (0, globals_1.expect)(analytics.socialAnalytics).toBeInstanceOf(analytics_1.SocialAnalytics);
        });
        (0, globals_1.test)('should create analytics with default social config when not provided', function () {
            var analytics = (0, analytics_1.createAnalytics)(test_utils_1.mockSuiClient);
            (0, globals_1.expect)(analytics.socialAnalytics).toBeInstanceOf(analytics_1.SocialAnalytics);
        });
    });
});
