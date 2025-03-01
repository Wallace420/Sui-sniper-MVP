/**
 * Utility class for caching frequently accessed data
 */
export class CacheUtils {
    private static caches: Record<string, CacheStore<any>> = {};

    /**
     * Get or create a cache store with the specified name and options
     * @param name The name of the cache store
     * @param options Cache configuration options
     * @returns The cache store instance
     */
    static getStore<T>(name: string, options?: CacheOptions): CacheStore<T> {
        if (!this.caches[name]) {
            this.caches[name] = new CacheStore<T>(options);
        }
        return this.caches[name] as CacheStore<T>;
    }

    /**
     * Clear all cache stores or a specific named cache
     * @param name Optional name of the specific cache to clear
     */
    static clearCache(name?: string): void {
        if (name && this.caches[name]) {
            this.caches[name].clear();
        } else if (!name) {
            Object.values(this.caches).forEach(cache => cache.clear());
        }
    }
}

/**
 * Configuration options for a cache store
 */
export interface CacheOptions {
    /** Maximum time in milliseconds to keep items in cache (default: 5 minutes) */
    ttl?: number;
    /** Maximum number of items to store in the cache (default: 1000) */
    maxSize?: number;
}

/**
 * A generic cache store for any type of data
 */
export class CacheStore<T> {
    private cache: Map<string, CacheEntry<T>> = new Map();
    private ttl: number;
    private maxSize: number;

    constructor(options?: CacheOptions) {
        this.ttl = options?.ttl || 5 * 60 * 1000; // Default: 5 minutes
        this.maxSize = options?.maxSize || 1000; // Default: 1000 items
    }

    /**
     * Get a value from the cache
     * @param key The cache key
     * @returns The cached value or undefined if not found or expired
     */
    get(key: string): T | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;

        // Check if the entry has expired
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return undefined;
        }

        return entry.value;
    }

    /**
     * Store a value in the cache
     * @param key The cache key
     * @param value The value to cache
     * @param customTtl Optional custom TTL for this specific entry
     */
    set(key: string, value: T, customTtl?: number): void {
        // Enforce max size by removing oldest entry if needed
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            if (oldestKey) this.cache.delete(oldestKey);
        }

        const ttl = customTtl || this.ttl;
        this.cache.set(key, {
            value,
            expiry: Date.now() + ttl
        });
    }

    /**
     * Check if a key exists in the cache and is not expired
     * @param key The cache key
     * @returns True if the key exists and is not expired
     */
    has(key: string): boolean {
        const entry = this.cache.get(key);
        if (!entry) return false;
        
        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return false;
        }
        
        return true;
    }

    /**
     * Remove a specific key from the cache
     * @param key The cache key to remove
     */
    delete(key: string): void {
        this.cache.delete(key);
    }

    /**
     * Clear all entries from the cache
     */
    clear(): void {
        this.cache.clear();
    }

    /**
     * Get the number of items in the cache
     */
    get size(): number {
        return this.cache.size;
    }

    /**
     * Get or compute a value if not in cache
     * @param key The cache key
     * @param factory Function to produce the value if not cached
     * @param customTtl Optional custom TTL for this specific entry
     * @returns The cached or computed value
     */
    async getOrCompute(key: string, factory: () => Promise<T>, customTtl?: number): Promise<T> {
        const cachedValue = this.get(key);
        if (cachedValue !== undefined) {
            return cachedValue;
        }

        const value = await factory();
        this.set(key, value, customTtl);
        return value;
    }
}

/**
 * Internal interface for cache entries
 */
interface CacheEntry<T> {
    value: T;
    expiry: number;
}