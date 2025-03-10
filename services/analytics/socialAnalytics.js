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
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialAnalytics = void 0;
var socialApiClient_1 = require("./socialApiClient");
var vader_sentiment_1 = require("vader-sentiment");
var puppeteer_1 = require("puppeteer"); // Replaced scrape-twitter with puppeteer for scraping
var Sentry = require("@sentry/node");
var rate_limiter_flexible_1 = require("rate-limiter-flexible");
// Initialize Sentry for error monitoring
Sentry.init({ dsn: process.env.SENTRY_DSN });
// Rate limiter to prevent API abuse
var rateLimiter = new rate_limiter_flexible_1.RateLimiterMemory({ points: 10, duration: 1 });
// Enhanced error handling function
function handleError(error, context) {
    Sentry.captureException(error);
    console.error("Error in ".concat(context, ":"), error);
}
// Function to calculate Social Score
function calculateSocialScore(sentiment, mentions, followers) {
    var sentimentWeight = 0.4;
    var mentionWeight = 0.3;
    var followerWeight = 0.3;
    var normalizedSentiment = (sentiment + 1) / 2;
    var normalizedMentions = Math.log10(mentions + 1) / 5;
    var normalizedFollowers = Math.log10(followers + 1) / 6;
    var score = (normalizedSentiment * sentimentWeight) + (normalizedMentions * mentionWeight) + (normalizedFollowers * followerWeight);
    return Math.min(100, Math.max(0, Math.round(score * 100)));
}
// Scraping Twitter data with puppeteer
function fetchTwitterData(query) {
    return __awaiter(this, void 0, void 0, function () {
        var browser, page, searchUrl, tweets, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 6, , 7]);
                    return [4 /*yield*/, puppeteer_1.default.launch()];
                case 1:
                    browser = _a.sent();
                    return [4 /*yield*/, browser.newPage()];
                case 2:
                    page = _a.sent();
                    searchUrl = "https://twitter.com/search?q=".concat(encodeURIComponent(query), "&src=typed_query&f=live");
                    return [4 /*yield*/, page.goto(searchUrl, { waitUntil: 'networkidle2' })];
                case 3:
                    _a.sent();
                    return [4 /*yield*/, page.evaluate(function () {
                            return Array.from(document.querySelectorAll('article')).map(function (tweet) { return tweet.innerText; });
                        })];
                case 4:
                    tweets = _a.sent();
                    return [4 /*yield*/, browser.close()];
                case 5:
                    _a.sent();
                    return [2 /*return*/, tweets];
                case 6:
                    error_1 = _a.sent();
                    handleError(error_1, 'fetchTwitterData');
                    return [2 /*return*/, []];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// SocialAnalytics class with all methods restored
var SocialAnalytics = /** @class */ (function () {
    function SocialAnalytics(client, apiConfig) {
        this.cache = {};
        this.CACHE_DURATION = 30 * 60 * 1000;
        this.client = client;
        this.apiClient = new socialApiClient_1.SocialApiClient(apiConfig);
    }
    SocialAnalytics.prototype.getCommunityEngagement = function (coin_a) {
        throw new Error('Method not implemented.');
    };
    SocialAnalytics.prototype.getFieldsFromData = function (data) {
        if ((data === null || data === void 0 ? void 0 : data.data) && 'content' in data.data && data.data.content && 'fields' in data.data.content) {
            return data.data.content.fields;
        }
        return null;
    };
    SocialAnalytics.prototype.getSentimentAnalysis = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            var sentimentData, error_2;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (((_a = this.cache[tokenId]) === null || _a === void 0 ? void 0 : _a.sentimentData) && Date.now() - this.cache[tokenId].timestamp < this.CACHE_DURATION) {
                            return [2 /*return*/, this.cache[tokenId].sentimentData];
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, this.fetchSentimentData(tokenId)];
                    case 2:
                        sentimentData = _b.sent();
                        this.cache[tokenId] = __assign(__assign({}, this.cache[tokenId]), { sentimentData: sentimentData, timestamp: Date.now() });
                        return [2 /*return*/, sentimentData];
                    case 3:
                        error_2 = _b.sent();
                        handleError(error_2, 'getSentimentAnalysis');
                        throw new Error('Failed to analyze social sentiment.');
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SocialAnalytics.prototype.fetchSentimentData = function (tokenId) {
        return __awaiter(this, void 0, void 0, function () {
            var tokenData, fields, searchQuery, tweets_1, sentiments_1, overallSentiment, sentimentTrend, socialScore, error_3;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        return [4 /*yield*/, this.client.getObject({
                                id: tokenId,
                                options: { showContent: true, showDisplay: true },
                            })];
                    case 1:
                        tokenData = _a.sent();
                        fields = this.getFieldsFromData(tokenData);
                        searchQuery = (fields === null || fields === void 0 ? void 0 : fields.name) || (fields === null || fields === void 0 ? void 0 : fields.symbol) || tokenId;
                        return [4 /*yield*/, fetchTwitterData(searchQuery)];
                    case 2:
                        tweets_1 = _a.sent();
                        sentiments_1 = tweets_1.map(function (text) { return vader_sentiment_1.default.SentimentIntensityAnalyzer.polarity_scores(text).compound; });
                        overallSentiment = sentiments_1.reduce(function (acc, val) { return acc + val; }, 0) / sentiments_1.length;
                        sentimentTrend = tweets_1.map(function (tweet, index) { return ({
                            timestamp: Date.now() - (tweets_1.length - 1 - index) * 60000,
                            sentiment: sentiments_1[index],
                            source: 'twitter',
                        }); });
                        socialScore = calculateSocialScore(overallSentiment, tweets_1.length, 10000);
                        console.log("Social Score: ".concat(socialScore, "/100"));
                        return [2 /*return*/, {
                                tokenId: tokenId,
                                overallSentiment: overallSentiment,
                                sentimentTrend: sentimentTrend,
                                mentionsCount: tweets_1.length,
                                mentionsTrend: sentimentTrend.map(function (s) { return ({ timestamp: s.timestamp, count: 1, source: s.source }); }),
                                lastUpdated: Date.now(),
                            }];
                    case 3:
                        error_3 = _a.sent();
                        handleError(error_3, 'fetchSentimentData');
                        throw error_3;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return SocialAnalytics;
}());
exports.SocialAnalytics = SocialAnalytics;
