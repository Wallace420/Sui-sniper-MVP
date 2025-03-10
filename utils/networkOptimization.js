"use strict";
/**
 * Network Optimization Utilities
 *
 * This module implements network optimization strategies for the Sui Liquidity Sniper
 * as part of Phase 5 of the improvement plan.
 */
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
exports.NetworkOptimization = void 0;
var WebSocketWrapper_1 = require("../services/websocket/WebSocketWrapper");
var cacheUtils_1 = require("./cacheUtils");
var zlib = require("zlib");
// Cache configuration for network requests
var NETWORK_CACHE_CONFIG = {
    ttl: 30 * 1000, // 30 seconds TTL for network requests
    maxSize: 200 // Maximum 200 cached requests
};
/**
 * Network Optimization Service
 * Implements request batching, WebSocket optimization, and data compression
 */
var NetworkOptimization = /** @class */ (function () {
    function NetworkOptimization() {
    }
    /**
     * Initialize the network optimization service
     */
    NetworkOptimization.initialize = function () {
        if (this.isInitialized)
            return;
        // Initialize request cache
        this.requestCache = cacheUtils_1.CacheUtils.getStore('network-requests', NETWORK_CACHE_CONFIG);
        this.isInitialized = true;
        console.log('Network optimization service initialized');
    };
    /**
     * Create an optimized WebSocket connection with improved reconnection logic and compression
     * @param endpoint WebSocket endpoint URL
     * @param options WebSocket configuration options
     */
    NetworkOptimization.createOptimizedWebSocket = function (endpoint, options) {
        if (!this.isInitialized)
            this.initialize();
        var enhancedOptions = __assign(__assign({}, options), { 
            // Improved reconnection settings
            reconnectAttempts: 10, reconnectDelay: 2000, 
            // Enable permessage-deflate compression if supported
            perMessageDeflate: true });
        return new WebSocketWrapper_1.WebSocketWrapper(endpoint, enhancedOptions);
    };
    /**
     * Batch multiple requests of the same type into a single network call
     * @param batchKey Identifier for the batch group
     * @param requestData Data for this specific request
     * @param batchExecutor Function that executes the batched request
     * @param maxBatchSize Maximum number of requests to batch together
     * @param maxWaitMs Maximum time to wait before executing the batch
     */
    NetworkOptimization.batchRequest = function (batchKey_1, requestData_1, batchExecutor_1) {
        return __awaiter(this, arguments, void 0, function (batchKey, requestData, batchExecutor, maxBatchSize, maxWaitMs) {
            var batch, requestIndex;
            var _this = this;
            if (maxBatchSize === void 0) { maxBatchSize = 10; }
            if (maxWaitMs === void 0) { maxWaitMs = 50; }
            return __generator(this, function (_a) {
                if (!this.isInitialized)
                    this.initialize();
                // Initialize batch if it doesn't exist
                if (!this.batchedRequests.has(batchKey)) {
                    this.batchedRequests.set(batchKey, []);
                }
                batch = this.batchedRequests.get(batchKey);
                requestIndex = batch.length;
                batch.push(requestData);
                // Create a promise that will be resolved when the batch is executed
                return [2 /*return*/, new Promise(function (resolve, reject) {
                        // Execute immediately if we've reached max batch size
                        if (batch.length >= maxBatchSize) {
                            _this.executeBatch(batchKey, batchExecutor).then(function (results) { return resolve(results[requestIndex]); }, function (error) { return reject(error); });
                            return;
                        }
                        // Set a timer to execute the batch after maxWaitMs
                        if (!_this.batchTimers.has(batchKey)) {
                            var timerId = setTimeout(function () {
                                _this.executeBatch(batchKey, batchExecutor).then(function (results) {
                                    // Resolve all pending promises in the batch
                                    var currentBatch = _this.batchedRequests.get(batchKey) || [];
                                    currentBatch.forEach(function (_, index) {
                                        var pendingKey = "".concat(batchKey, ":").concat(index);
                                        var pendingPromise = _this.pendingRequests.get(pendingKey);
                                        if (pendingPromise && pendingPromise instanceof Promise) {
                                            pendingPromise.resolve(results[index]);
                                            _this.pendingRequests.delete(pendingKey);
                                        }
                                    });
                                }, function (error) {
                                    // Reject all pending promises in the batch
                                    var currentBatch = _this.batchedRequests.get(batchKey) || [];
                                    currentBatch.forEach(function (_, index) {
                                        var pendingKey = "".concat(batchKey, ":").concat(index);
                                        var pendingPromise = _this.pendingRequests.get(pendingKey);
                                        if (pendingPromise && pendingPromise instanceof Promise) {
                                            pendingPromise.reject(error);
                                            _this.pendingRequests.delete(pendingKey);
                                        }
                                    });
                                });
                            }, maxWaitMs);
                            _this.batchTimers.set(batchKey, timerId);
                        }
                        // Store the promise resolver/rejector
                        var pendingKey = "".concat(batchKey, ":").concat(requestIndex);
                        _this.pendingRequests.set(pendingKey, new Promise(function (res, rej) {
                            resolve = res;
                            reject = rej;
                        }));
                    })];
            });
        });
    };
    /**
     * Execute a batch of requests
     * @param batchKey Identifier for the batch group
     * @param batchExecutor Function that executes the batched request
     */
    NetworkOptimization.executeBatch = function (batchKey, batchExecutor) {
        return __awaiter(this, void 0, void 0, function () {
            var batch, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        // Clear the timer if it exists
                        if (this.batchTimers.has(batchKey)) {
                            clearTimeout(this.batchTimers.get(batchKey));
                            this.batchTimers.delete(batchKey);
                        }
                        batch = this.batchedRequests.get(batchKey) || [];
                        this.batchedRequests.set(batchKey, []);
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, batchExecutor(batch)];
                    case 2: return [2 /*return*/, _a.sent()];
                    case 3:
                        error_1 = _a.sent();
                        console.error("Error executing batch ".concat(batchKey, ":"), error_1);
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Compress data using zlib deflate
     * @param data Data to compress
     */
    NetworkOptimization.compressData = function (data) {
        return new Promise(function (resolve, reject) {
            zlib.deflate(data, function (err, buffer) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(buffer);
                }
            });
        });
    };
    /**
     * Decompress data using zlib inflate
     * @param data Compressed data to decompress
     */
    NetworkOptimization.decompressData = function (data) {
        return new Promise(function (resolve, reject) {
            zlib.inflate(data, function (err, buffer) {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(buffer.toString());
                }
            });
        });
    };
    /**
     * Cache a network request with automatic expiration
     * @param cacheKey Unique key for the request
     * @param requestFn Function that executes the actual network request
     * @param ttl Optional custom TTL for this request
     */
    NetworkOptimization.cachedRequest = function (cacheKey, requestFn, ttl) {
        return __awaiter(this, void 0, void 0, function () {
            var cachedResult, result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!this.isInitialized)
                            this.initialize();
                        cachedResult = this.requestCache.get(cacheKey);
                        if (cachedResult !== undefined) {
                            return [2 /*return*/, cachedResult];
                        }
                        return [4 /*yield*/, requestFn()];
                    case 1:
                        result = _a.sent();
                        this.requestCache.set(cacheKey, result, ttl);
                        return [2 /*return*/, result];
                }
            });
        });
    };
    /**
     * Clear the request cache or a specific cached request
     * @param cacheKey Optional specific request key to clear
     */
    NetworkOptimization.clearRequestCache = function (cacheKey) {
        if (cacheKey) {
            this.requestCache.delete(cacheKey);
        }
        else {
            this.requestCache.clear();
        }
    };
    /**
     * Clean up resources when shutting down
     */
    NetworkOptimization.cleanup = function () {
        // Clear all batch timers
        for (var _i = 0, _a = this.batchTimers.values(); _i < _a.length; _i++) {
            var timerId = _a[_i];
            clearTimeout(timerId);
        }
        this.batchTimers.clear();
        this.batchedRequests.clear();
        this.pendingRequests.clear();
        this.isInitialized = false;
    };
    NetworkOptimization.pendingRequests = new Map();
    NetworkOptimization.batchedRequests = new Map();
    NetworkOptimization.batchTimers = new Map();
    NetworkOptimization.isInitialized = false;
    return NetworkOptimization;
}());
exports.NetworkOptimization = NetworkOptimization;
