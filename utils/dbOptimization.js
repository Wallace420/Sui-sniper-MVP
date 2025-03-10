"use strict";
/**
 * Database Optimization Utilities
 *
 * This module implements database optimization strategies for the Sui Liquidity Sniper
 * as part of Phase 5 of the improvement plan.
 */
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
exports.DatabaseOptimization = void 0;
var client_1 = require("@prisma/client");
var cacheUtils_1 = require("./cacheUtils");
// Cache configuration for database queries
var DB_QUERY_CACHE_CONFIG = {
    ttl: 60 * 1000, // 1 minute TTL for query results
    maxSize: 500 // Maximum 500 cached queries
};
/**
 * Database Optimization Service
 * Implements query optimization, indexing strategies, and caching mechanisms
 */
var DatabaseOptimization = /** @class */ (function () {
    function DatabaseOptimization() {
    }
    /**
     * Initialize the database optimization service
     */
    DatabaseOptimization.initialize = function () {
        if (this.isInitialized)
            return;
        this.prisma = new client_1.PrismaClient({
            log: ['warn', 'error']
        });
        // Initialize query cache
        this.queryCache = cacheUtils_1.CacheUtils.getStore('db-queries', DB_QUERY_CACHE_CONFIG);
        // Add performance middleware for query monitoring
        this.addPerformanceMiddleware();
        this.isInitialized = true;
        console.log('Database optimization service initialized');
    };
    /**
     * Add middleware to monitor query performance
     */
    DatabaseOptimization.addPerformanceMiddleware = function () {
        var _this = this;
        this.prisma.$use(function (params, next) { return __awaiter(_this, void 0, void 0, function () {
            var start, result, duration;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        start = Date.now();
                        return [4 /*yield*/, next(params)];
                    case 1:
                        result = _a.sent();
                        duration = Date.now() - start;
                        // Log slow queries (over 100ms)
                        if (duration > 100) {
                            console.warn("Slow query detected: ".concat(params.model, ".").concat(params.action, " took ").concat(duration, "ms"));
                        }
                        return [2 /*return*/, result];
                }
            });
        }); });
    };
    /**
     * Execute a cached database query
     * @param queryKey Unique key for the query
     * @param queryFn Function that executes the actual database query
     * @param ttl Optional custom TTL for this query
     */
    DatabaseOptimization.cachedQuery = function (queryKey, queryFn, ttl) {
        return __awaiter(this, void 0, void 0, function () {
            var cachedResult, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isInitialized)
                            this.initialize();
                        cachedResult = this.queryCache.get(queryKey);
                        if (cachedResult !== undefined) {
                            return [2 /*return*/, cachedResult];
                        }
                        return [4 /*yield*/, queryFn()];
                    case 1:
                        result = _a.sent();
                        this.queryCache.set(queryKey, result, ttl);
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Optimize a database query by applying best practices
     * @param model The Prisma model name
     * @param action The query action (findMany, findUnique, etc.)
     * @param args Query arguments
     */
    DatabaseOptimization.optimizedQuery = function (model, action, args) {
        return __awaiter(this, void 0, void 0, function () {
            var cacheKey;
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.isInitialized)
                    this.initialize();
                cacheKey = "".concat(model, ":").concat(action, ":").concat(JSON.stringify(args));
                return [2 /*return*/, this.cachedQuery(cacheKey, function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            // Execute the query with the prisma client
                            return [2 /*return*/, this.prisma[model][action](args)];
                        });
                    }); })];
            });
        });
    };
    /**
     * Batch multiple database operations into a single transaction
     * @param operations Array of database operations to execute
     */
    DatabaseOptimization.batchOperations = function (operations) {
        return __awaiter(this, void 0, void 0, function () {
            var _this = this;
            return __generator(this, function (_a) {
                if (!this.isInitialized)
                    this.initialize();
                return [2 /*return*/, this.prisma.$transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                        var results, _i, operations_1, operation, _a, _b;
                        return __generator(this, function (_c) {
                            switch (_c.label) {
                                case 0:
                                    results = [];
                                    _i = 0, operations_1 = operations;
                                    _c.label = 1;
                                case 1:
                                    if (!(_i < operations_1.length)) return [3 /*break*/, 4];
                                    operation = operations_1[_i];
                                    _b = (_a = results).push;
                                    return [4 /*yield*/, operation()];
                                case 2:
                                    _b.apply(_a, [_c.sent()]);
                                    _c.label = 3;
                                case 3:
                                    _i++;
                                    return [3 /*break*/, 1];
                                case 4: return [2 /*return*/, results];
                            }
                        });
                    }); })];
            });
        });
    };
    /**
     * Clear the query cache or a specific cached query
     * @param queryKey Optional specific query key to clear
     */
    DatabaseOptimization.clearQueryCache = function (queryKey) {
        if (queryKey) {
            this.queryCache.delete(queryKey);
        }
        else {
            this.queryCache.clear();
        }
    };
    /**
     * Analyze database performance and suggest optimizations
     */
    DatabaseOptimization.analyzePerformance = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                if (!this.isInitialized)
                    this.initialize();
                // This would typically connect to database metrics
                // For now, we'll return some generic suggestions
                return [2 /*return*/, {
                        suggestions: [
                            'Add index on Pool.dex for faster filtering',
                            'Add composite index on Pool.coinA, Pool.coinB',
                            'Consider partitioning large tables by date'
                        ],
                        slowQueries: []
                    }];
            });
        });
    };
    /**
     * Clean up resources when shutting down
     */
    DatabaseOptimization.cleanup = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.prisma) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.prisma.$disconnect()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        this.isInitialized = false;
                        return [2 /*return*/];
                }
            });
        });
    };
    DatabaseOptimization.isInitialized = false;
    return DatabaseOptimization;
}());
exports.DatabaseOptimization = DatabaseOptimization;
