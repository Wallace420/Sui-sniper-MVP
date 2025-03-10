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
exports.CacheStore = exports.CacheUtils = void 0;
/**
 * Utility class for caching frequently accessed data
 */
var CacheUtils = /** @class */ (function () {
    function CacheUtils() {
    }
    /**
     * Get or create a cache store with the specified name and options
     * @param name The name of the cache store
     * @param options Cache configuration options
     * @returns The cache store instance
     */
    CacheUtils.getStore = function (name, options) {
        if (!this.caches[name]) {
            this.caches[name] = new CacheStore(options);
        }
        return this.caches[name];
    };
    /**
     * Clear all cache stores or a specific named cache
     * @param name Optional name of the specific cache to clear
     */
    CacheUtils.clearCache = function (name) {
        if (name && this.caches[name]) {
            this.caches[name].clear();
        }
        else if (!name) {
            Object.values(this.caches).forEach(function (cache) { return cache.clear(); });
        }
    };
    CacheUtils.caches = {};
    return CacheUtils;
}());
exports.CacheUtils = CacheUtils;
/**
 * A generic cache store for any type of data
 */
var CacheStore = /** @class */ (function () {
    function CacheStore(options) {
        this.cache = new Map();
        this.ttl = (options === null || options === void 0 ? void 0 : options.ttl) || 5 * 60 * 1000; // Default: 5 minutes
        this.maxSize = (options === null || options === void 0 ? void 0 : options.maxSize) || 1000; // Default: 1000 items
    }
    /**
     * Get a value from the cache
     * @param key The cache key
     * @returns The cached value or undefined if not found or expired
     */
    CacheStore.prototype.get = function (key) {
        var entry = this.cache.get(key);
        if (!entry)
            return undefined;
        // Check if the entry has expired
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return undefined;
        }
        return entry.value;
    };
    /**
     * Store a value in the cache
     * @param key The cache key
     * @param value The value to cache
     * @param customTtl Optional custom TTL for this specific entry
     */
    CacheStore.prototype.set = function (key, value, customTtl) {
        // Enforce max size by removing oldest entry if needed
        if (this.cache.size >= this.maxSize) {
            var oldestKey = this.cache.keys().next().value;
            if (oldestKey)
                this.cache.delete(oldestKey);
        }
        var ttl = customTtl || this.ttl;
        this.cache.set(key, {
            value: value,
            expiry: Date.now() + ttl
        });
    };
    /**
     * Check if a key exists in the cache and is not expired
     * @param key The cache key
     * @returns True if the key exists and is not expired
     */
    CacheStore.prototype.has = function (key) {
        var entry = this.cache.get(key);
        if (!entry)
            return false;
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return false;
        }
        return true;
    };
    /**
     * Remove a specific key from the cache
     * @param key The cache key to remove
     */
    CacheStore.prototype.delete = function (key) {
        this.cache.delete(key);
    };
    /**
     * Clear all entries from the cache
     */
    CacheStore.prototype.clear = function () {
        this.cache.clear();
    };
    Object.defineProperty(CacheStore.prototype, "size", {
        /**
         * Get the number of items in the cache
         */
        get: function () {
            return this.cache.size;
        },
        enumerable: false,
        configurable: true
    });
    /**
     * Get or compute a value if not in cache
     * @param key The cache key
     * @param factory Function to produce the value if not cached
     * @param customTtl Optional custom TTL for this specific entry
     * @returns The cached or computed value
     */
    CacheStore.prototype.getOrCompute = function (key, factory, customTtl) {
        return __awaiter(this, void 0, void 0, function () {
            var cachedValue, value;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        cachedValue = this.get(key);
                        if (cachedValue !== undefined) {
                            return [2 /*return*/, cachedValue];
                        }
                        return [4 /*yield*/, factory()];
                    case 1:
                        value = _a.sent();
                        this.set(key, value, customTtl);
                        return [2 /*return*/, value];
                }
            });
        });
    };
    return CacheStore;
}());
exports.CacheStore = CacheStore;
