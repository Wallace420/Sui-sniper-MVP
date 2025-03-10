import { describe, expect, test, jest, beforeEach, afterEach } from '@jest/globals';
import { CacheUtils, CacheStore, CacheOptions } from '../../utils/cacheUtils';

describe('Cache Utilities', () => {
  // Clear all caches after each test to prevent test interference
  afterEach(() => {
    CacheUtils.clearCache();
  });

  describe('CacheStore', () => {
    test('should store and retrieve values correctly', () => {
      // Arrange
      const store = new CacheStore<string>();
      const key = 'testKey';
      const value = 'testValue';

      // Act
      store.set(key, value);
      const retrievedValue = store.get(key);

      // Assert
      expect(retrievedValue).toBe(value);
    });

    test('should respect TTL for cached items', () => {
      // Arrange - create store with short TTL
      const ttl = 100; // 100ms
      const store = new CacheStore<string>({ ttl });
      const key = 'expiringKey';
      const value = 'expiringValue';

      // Act
      store.set(key, value);
      const immediateValue = store.get(key);

      // Assert immediate value
      expect(immediateValue).toBe(value);

      // Wait for TTL to expire and check again
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const expiredValue = store.get(key);
          expect(expiredValue).toBeUndefined();
          resolve();
        }, ttl + 50); // Add buffer to ensure expiration
      });
    });

    test('should respect custom TTL for specific entries', () => {
      // Arrange - create store with long default TTL
      const defaultTtl = 5000; // 5 seconds
      const customTtl = 100; // 100ms
      const store = new CacheStore<string>({ ttl: defaultTtl });
      
      // Act - set two keys with different TTLs
      store.set('normalKey', 'normalValue');
      store.set('customKey', 'customValue', customTtl);
      
      // Assert both values exist initially
      expect(store.get('normalKey')).toBe('normalValue');
      expect(store.get('customKey')).toBe('customValue');

      // Wait for custom TTL to expire and check again
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          // Custom TTL key should be expired
          expect(store.get('customKey')).toBeUndefined();
          // Normal key should still exist
          expect(store.get('normalKey')).toBe('normalValue');
          resolve();
        }, customTtl + 50);
      });
    });

    test('should enforce max size by removing oldest entries', () => {
      // Arrange - create store with max size of 2
      const store = new CacheStore<string>({ maxSize: 2 });
      
      // Act - add three entries
      store.set('key1', 'value1');
      store.set('key2', 'value2');
      store.set('key3', 'value3');
      
      // Assert - oldest entry should be removed
      expect(store.get('key1')).toBeUndefined(); // Should be evicted
      expect(store.get('key2')).toBe('value2');
      expect(store.get('key3')).toBe('value3');
    });

    test('should clear all entries', () => {
      // Arrange
      const store = new CacheStore<string>();
      store.set('key1', 'value1');
      store.set('key2', 'value2');
      
      // Act
      store.clear();
      
      // Assert
      expect(store.get('key1')).toBeUndefined();
      expect(store.get('key2')).toBeUndefined();
      expect(store.size).toBe(0);
    });

    test('should correctly report has() status', () => {
      // Arrange
      const store = new CacheStore<string>();
      store.set('existingKey', 'value');
      
      // Act & Assert
      expect(store.has('existingKey')).toBe(true);
      expect(store.has('nonExistingKey')).toBe(false);
    });
  });

  describe('CacheUtils', () => {
    test('should create and retrieve named cache stores', () => {
      // Arrange & Act
      const store1 = CacheUtils.getStore<string>('store1');
      const store2 = CacheUtils.getStore<number>('store2');
      
      // Assert - stores should be different instances
      expect(store1).not.toBe(store2);
      
      // Store some values
      store1.set('key', 'value');
      store2.set('key', 123);
      
      // Retrieve the same stores again
      const retrievedStore1 = CacheUtils.getStore<string>('store1');
      const retrievedStore2 = CacheUtils.getStore<number>('store2');
      
      // Assert - should get the same instances with their values
      expect(retrievedStore1.get('key')).toBe('value');
      expect(retrievedStore2.get('key')).toBe(123);
    });

    test('should clear specific named cache', () => {
      // Arrange
      const store1 = CacheUtils.getStore<string>('store1');
      const store2 = CacheUtils.getStore<string>('store2');
      
      store1.set('key', 'value1');
      store2.set('key', 'value2');
      
      // Act - clear only store1
      CacheUtils.clearCache('store1');
      
      // Assert
      expect(store1.get('key')).toBeUndefined(); // Should be cleared
      expect(store2.get('key')).toBe('value2');   // Should still have value
    });

    test('should clear all caches when no name specified', () => {
      // Arrange
      const store1 = CacheUtils.getStore<string>('store1');
      const store2 = CacheUtils.getStore<string>('store2');
      
      store1.set('key', 'value1');
      store2.set('key', 'value2');
      
      // Act - clear all caches
      CacheUtils.clearCache();
      
      // Assert
      expect(store1.get('key')).toBeUndefined();
      expect(store2.get('key')).toBeUndefined();
    });
  });
});