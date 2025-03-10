/**
 * Network Optimization Utilities
 * 
 * This module implements network optimization strategies for the Sui Liquidity Sniper
 * as part of Phase 5 of the improvement plan.
 */

import { WebSocketWrapper } from '../services/websocket/WebSocketWrapper';
import { CacheStore, CacheUtils } from './cacheUtils';
import * as zlib from 'zlib';

// Cache configuration for network requests
const NETWORK_CACHE_CONFIG = {
  ttl: 30 * 1000, // 30 seconds TTL for network requests
  maxSize: 200    // Maximum 200 cached requests
};

/**
 * Network Optimization Service
 * Implements request batching, WebSocket optimization, and data compression
 */
export class NetworkOptimization {
  private static requestCache: CacheStore<any>;
  private static pendingRequests: Map<string, Promise<any>> = new Map();
  private static batchedRequests: Map<string, any[]> = new Map();
  private static batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private static isInitialized = false;

  /**
   * Initialize the network optimization service
   */
  static initialize(): void {
    if (this.isInitialized) return;
    
    // Initialize request cache
    this.requestCache = CacheUtils.getStore<any>('network-requests', NETWORK_CACHE_CONFIG);
    
    this.isInitialized = true;
    console.log('Network optimization service initialized');
  }

  /**
   * Create an optimized WebSocket connection with improved reconnection logic and compression
   * @param endpoint WebSocket endpoint URL
   * @param options WebSocket configuration options
   */
  static createOptimizedWebSocket(endpoint: string, options?: any): WebSocketWrapper {
    if (!this.isInitialized) this.initialize();
    
    const enhancedOptions = {
      ...options,
      // Improved reconnection settings
      reconnectAttempts: 10,
      reconnectDelay: 2000,
      // Enable permessage-deflate compression if supported
      perMessageDeflate: true
    };
    
    return new WebSocketWrapper(endpoint, enhancedOptions);
  }

  /**
   * Batch multiple requests of the same type into a single network call
   * @param batchKey Identifier for the batch group
   * @param requestData Data for this specific request
   * @param batchExecutor Function that executes the batched request
   * @param maxBatchSize Maximum number of requests to batch together
   * @param maxWaitMs Maximum time to wait before executing the batch
   */
  static async batchRequest<T, R>(
    batchKey: string,
    requestData: T,
    batchExecutor: (items: T[]) => Promise<R[]>,
    maxBatchSize: number = 10,
    maxWaitMs: number = 50
  ): Promise<R> {
    if (!this.isInitialized) this.initialize();
    
    // Initialize batch if it doesn't exist
    if (!this.batchedRequests.has(batchKey)) {
      this.batchedRequests.set(batchKey, []);
    }
    
    const batch = this.batchedRequests.get(batchKey)!;
    const requestIndex = batch.length;
    batch.push(requestData);
    
    // Create a promise that will be resolved when the batch is executed
    return new Promise<R>((resolve, reject) => {
      // Execute immediately if we've reached max batch size
      if (batch.length >= maxBatchSize) {
        this.executeBatch(batchKey, batchExecutor).then(
          results => resolve(results[requestIndex]),
          error => reject(error)
        );
        return;
      }
      
      // Set a timer to execute the batch after maxWaitMs
      if (!this.batchTimers.has(batchKey)) {
        const timerId = setTimeout(() => {
          this.executeBatch(batchKey, batchExecutor).then(
            results => {
              // Resolve all pending promises in the batch
              const currentBatch = this.batchedRequests.get(batchKey) || [];
              currentBatch.forEach((_, index) => {
                const pendingKey = `${batchKey}:${index}`;
                const pendingPromise = this.pendingRequests.get(pendingKey);
                if (pendingPromise && pendingPromise instanceof Promise) {
                  (pendingPromise as any).resolve(results[index]);
                  this.pendingRequests.delete(pendingKey);
                }
              });
            },
            error => {
              // Reject all pending promises in the batch
              const currentBatch = this.batchedRequests.get(batchKey) || [];
              currentBatch.forEach((_, index) => {
                const pendingKey = `${batchKey}:${index}`;
                const pendingPromise = this.pendingRequests.get(pendingKey);
                if (pendingPromise && pendingPromise instanceof Promise) {
                  (pendingPromise as any).reject(error);
                  this.pendingRequests.delete(pendingKey);
                }
              });
            }
          );
        }, maxWaitMs);
        
        this.batchTimers.set(batchKey, timerId);
      }
      
      // Store the promise resolver/rejector
      const pendingKey = `${batchKey}:${requestIndex}`;
      this.pendingRequests.set(pendingKey, new Promise((res, rej) => {
        resolve = res;
        reject = rej;
      }));
    });
  }

  /**
   * Execute a batch of requests
   * @param batchKey Identifier for the batch group
   * @param batchExecutor Function that executes the batched request
   */
  private static async executeBatch<T, R>(
    batchKey: string,
    batchExecutor: (items: T[]) => Promise<R[]>
  ): Promise<R[]> {
    // Clear the timer if it exists
    if (this.batchTimers.has(batchKey)) {
      clearTimeout(this.batchTimers.get(batchKey)!);
      this.batchTimers.delete(batchKey);
    }
    
    // Get the current batch and clear it
    const batch = this.batchedRequests.get(batchKey) || [];
    this.batchedRequests.set(batchKey, []);
    
    // Execute the batch
    try {
      return await batchExecutor(batch as T[]);
    } catch (error) {
      console.error(`Error executing batch ${batchKey}:`, error);
      throw error;
    }
  }

  /**
   * Compress data using zlib deflate
   * @param data Data to compress
   */
  static compressData(data: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.deflate(data, (err, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer);
        }
      });
    });
  }

  /**
   * Decompress data using zlib inflate
   * @param data Compressed data to decompress
   */
  static decompressData(data: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      zlib.inflate(data, (err, buffer) => {
        if (err) {
          reject(err);
        } else {
          resolve(buffer.toString());
        }
      });
    });
  }

  /**
   * Cache a network request with automatic expiration
   * @param cacheKey Unique key for the request
   * @param requestFn Function that executes the actual network request
   * @param ttl Optional custom TTL for this request
   */
  static async cachedRequest<T>(cacheKey: string, requestFn: () => Promise<T>, ttl?: number): Promise<T> {
    if (!this.isInitialized) this.initialize();
    
    // Check cache first
    const cachedResult = this.requestCache.get(cacheKey);
    if (cachedResult !== undefined) {
      return cachedResult;
    }
    
    // Execute request and cache result
    const result = await requestFn();
    this.requestCache.set(cacheKey, result, ttl);
    
    return result;
  }

  /**
   * Clear the request cache or a specific cached request
   * @param cacheKey Optional specific request key to clear
   */
  static clearRequestCache(cacheKey?: string): void {
    if (cacheKey) {
      this.requestCache.delete(cacheKey);
    } else {
      this.requestCache.clear();
    }
  }

  /**
   * Clean up resources when shutting down
   */
  static cleanup(): void {
    // Clear all batch timers
    for (const timerId of this.batchTimers.values()) {
      clearTimeout(timerId);
    }
    
    this.batchTimers.clear();
    this.batchedRequests.clear();
    this.pendingRequests.clear();
    this.isInitialized = false;
  }
}