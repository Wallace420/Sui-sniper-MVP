"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenAnalytics = void 0;
var TokenAnalytics = /** @class */ (function () {
    function TokenAnalytics(client) {
        this.cache = {};
        this.CACHE_DURATION = 15 * 60 * 1000;
        this.client = client;
    }
    // Neue Methode zum Auslesen der Felder ohne getObjectFields
    TokenAnalytics.prototype.getFieldsFromData = function (data) {
        var _a, _b;
        return ((_a = data === null || data === void 0 ? void 0 : data.content) === null || _a === void 0 ? void 0 : _a.dataType) === 'moveObject' ? (_b = data === null || data === void 0 ? void 0 : data.content) === null || _b === void 0 ? void 0 : _b.fields : null;
    };
    TokenAnalytics.prototype.getTokenHolderAnalysis = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenData, fields, holders, totalSupply, topHolders, concentrationRatio, giniCoefficient, analysis, error_1;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (((_a = this.cache[tokenId]) === null || _a === void 0 ? void 0 : _a.holderData) &&
                            Date.now() - this.cache[tokenId].timestamp < this.CACHE_DURATION) {
                            return [2 /*return*/, this.cache[tokenId].holderData];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 4, , 5]);
                        return [4 /*yield*/, this.client.getObject({
                                id: tokenId,
                                options: {
                                    showContent: true,
                                    showDisplay: true,
                                },
                            })];
                    case 2:
                        tokenData = _b.sent();
                        fields = this.getFieldsFromData(tokenData);
                        return [4 /*yield*/, this.fetchTokenHolders(tokenId)];
                    case 3:
                        holders = _b.sent();
                        totalSupply = this.calculateTotalSupply(holders);
                        topHolders = this.getTopHolders(holders, 10);
                        concentrationRatio = this.calculateConcentrationRatio(topHolders, totalSupply);
                        giniCoefficient = this.calculateGiniCoefficient(holders, totalSupply);
                        analysis = {
                            tokenId: tokenId,
                            totalHolders: holders.length,
                            topHolders: topHolders,
                            concentrationRatio: concentrationRatio,
                            giniCoefficient: giniCoefficient,
                            lastUpdated: Date.now(),
                        };
                        this.cache[tokenId] = __assign(__assign({}, this.cache[tokenId]), { holderData: analysis, timestamp: Date.now() });
                        return [2 /*return*/, analysis];
                    case 4:
                        error_1 = _b.sent();
                        console.error("Error analyzing token holders for ".concat(tokenId, ":"), error_1);
                        throw new Error("Failed to analyze token holders: ".concat(error_1 instanceof Error ? error_1.message : 'Unknown error'));
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    TokenAnalytics.prototype.getTokenVolumeAnalysis = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            var volumeData, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (((_a = this.cache[tokenId]) === null || _a === void 0 ? void 0 : _a.volumeData) &&
                            Date.now() - this.cache[tokenId].timestamp < this.CACHE_DURATION) {
                            return [2 /*return*/, this.cache[tokenId].volumeData];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.fetchVolumeData(tokenId)];
                    case 2:
                        volumeData = _b.sent();
                        this.cache[tokenId] = __assign(__assign({}, this.cache[tokenId]), { volumeData: volumeData, timestamp: Date.now() });
                        return [2 /*return*/, volumeData];
                    case 3:
                        error_2 = _b.sent();
                        console.error("Error analyzing volume for ".concat(tokenId, ":"), error_2);
                        throw new Error("Failed to analyze token volume: ".concat(error_2 instanceof Error ? error_2.message : 'Unknown error'));
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    TokenAnalytics.prototype.fetchTokenHolders = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, [
                        { address: '0x1', balance: BigInt(1000000), percentage: 40 },
                        { address: '0x2', balance: BigInt(500000), percentage: 20 },
                        { address: '0x3', balance: BigInt(300000), percentage: 12 },
                        { address: '0x4', balance: BigInt(200000), percentage: 8 },
                        { address: '0x5', balance: BigInt(100000), percentage: 4 },
                        { address: '0x6', balance: BigInt(50000), percentage: 2 },
                    ]];
            });
        });
    };
    TokenAnalytics.prototype.fetchVolumeData = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                return [2 /*return*/, {
                        tokenId: tokenId,
                        volume24h: 250000,
                        volume7d: 1750000,
                        transactions24h: 120,
                        priceChange24h: 5.2,
                        volumeChange24h: 12.5,
                        volumeTrend: Array(24).fill(0).map(function () { return 8000 + Math.random() * 4000; }),
                        lastUpdated: Date.now(),
                    }];
            });
        });
    };
    TokenAnalytics.prototype.calculateTotalSupply = function (holders) {
        return holders.reduce(function (sum, holder) { return sum + holder.balance; }, BigInt(0));
    };
    TokenAnalytics.prototype.getTopHolders = function (holders, count) {
        return __spreadArray([], holders, true).sort(function (a, b) { return (b.balance > a.balance ? 1 : -1); })
            .slice(0, count);
    };
    TokenAnalytics.prototype.calculateConcentrationRatio = function (topHolders, totalSupply) {
        var topHoldingsSum = topHolders.reduce(function (sum, holder) { return sum + holder.balance; }, BigInt(0));
        return Number((topHoldingsSum * BigInt(100)) / totalSupply);
    };
    TokenAnalytics.prototype.calculateGiniCoefficient = function (holders, totalSupply) {
        if (holders.length <= 1)
            return 0;
        var sortedHolders = __spreadArray([], holders, true).sort(function (a, b) {
            return a.balance > b.balance ? 1 : -1;
        });
        var sumNumerator = BigInt(0);
        for (var i = 0; i < sortedHolders.length; i++) {
            sumNumerator += sortedHolders[i].balance * BigInt(2 * i - sortedHolders.length + 1);
        }
        var gini = Number(sumNumerator) / (Number(totalSupply) * sortedHolders.length);
        return Math.abs(gini);
    };
    return TokenAnalytics;
}());
exports.TokenAnalytics = TokenAnalytics;
