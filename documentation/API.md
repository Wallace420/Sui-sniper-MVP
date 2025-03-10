# Sui Liquidity Sniper API Documentation

This document provides comprehensive documentation for the Sui Liquidity Sniper API.

## Core Services

### Pool Scanner

```typescript
import { poolScanner } from '../services/poolScanner';
```

#### Methods

##### `scanPools(options?: ScanOptions): Promise<Pool[]>`

Scans for new liquidity pools on the Sui network.

**Parameters:**
- `options` (optional): Configuration options for the scan
  - `timeout`: Maximum time in ms for the scan (default: 30000)
  - `maxResults`: Maximum number of pools to return (default: 100)
  - `filters`: Array of filter functions to apply

**Returns:**
A promise that resolves to an array of Pool objects.

**Example:**
```typescript
const newPools = await poolScanner.scanPools({
  timeout: 15000,
  maxResults: 50
});
```

### Direct Pool Scanner

```typescript
import { directPoolScanner } from '../services/directPoolScanner';
```

#### Methods

##### `processPoolData(poolAddress: string): Promise<PoolData>`

Retrieves and processes detailed data for a specific pool.

**Parameters:**
- `poolAddress`: The address of the pool to scan

**Returns:**
A promise that resolves to a PoolData object with detailed information.

**Example:**
```typescript
const poolData = await directPoolScanner.processPoolData('0x1234...');
```

### Token Security

```typescript
import { tokenSecurity } from '../services/tokenSecurity';
```

#### Methods

##### `analyzeToken(tokenAddress: string): Promise<SecurityAnalysis>`

Performs a comprehensive security analysis on a token.

**Parameters:**
- `tokenAddress`: The address of the token to analyze

**Returns:**
A promise that resolves to a SecurityAnalysis object with risk metrics.

**Example:**
```typescript
const securityReport = await tokenSecurity.analyzeToken('0x5678...');
```

## Utility Functions

### Cache Utilities

```typescript
import { cacheData, getCachedData, clearCache } from '../utils/cacheUtils';
```

#### Methods

##### `cacheData(key: string, data: any, ttl?: number): void`

Stores data in the cache.

**Parameters:**
- `key`: Unique identifier for the cached data
- `data`: The data to cache
- `ttl` (optional): Time-to-live in seconds (default: 3600)

##### `getCachedData(key: string): any | null`

Retrieves data from the cache.

**Parameters:**
- `key`: The identifier for the cached data

**Returns:**
The cached data or null if not found or expired.

##### `clearCache(pattern?: string): void`

Clears items from the cache.

**Parameters:**
- `pattern` (optional): Pattern to match keys to clear (clears all if not specified)

### Database Utilities

```typescript
import { query, batchQuery, optimizeQuery } from '../utils/dbUtils';
```

#### Methods

##### `query(sql: string, params?: any[]): Promise<any>`

Executes a database query.

**Parameters:**
- `sql`: SQL query string
- `params` (optional): Parameters for the query

**Returns:**
A promise that resolves to the query results.

##### `batchQuery(queries: {sql: string, params?: any[]}[]): Promise<any[]>`

Executes multiple queries in a batch.

**Parameters:**
- `queries`: Array of query objects

**Returns:**
A promise that resolves to an array of query results.

##### `optimizeQuery(sql: string): string`

Optimizes a SQL query for better performance.

**Parameters:**
- `sql`: SQL query string to optimize

**Returns:**
Optimized SQL query string.

## Error Handling

All API methods follow a consistent error handling pattern:

```typescript
try {
  const result = await apiMethod();
  // Process result
} catch (error) {
  if (error instanceof ApiError) {
    // Handle specific API error
    console.error(`API Error: ${error.code} - ${error.message}`);
  } else {
    // Handle unexpected errors
    console.error('Unexpected error:', error);
  }
}
```

## Type Definitions

Refer to the `types.ts` file for comprehensive type definitions used throughout the API.