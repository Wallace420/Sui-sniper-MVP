import { SuiClient, SuiObjectResponse, PaginatedEvents as SuiPaginatedEvents, SuiEvent, PaginatedObjectsResponse } from '@mysten/sui/client';
import { Pool } from '../dex';
import { jest } from '@jest/globals';
import crypto from 'crypto';

// Mock SuiClient with proper type implementations
export const mockSuiClient = {
  getObject: jest.fn() as jest.Mock,
  queryEvents: jest.fn() as jest.Mock,
  getTransactionBlock: jest.fn() as jest.Mock,
  getDynamicFields: jest.fn() as jest.Mock,
  getCoins: jest.fn() as jest.Mock
} as unknown as SuiClient;

// Sample pool for testing
export const samplePool: Pool = {
  id: 'pool1',
  poolId: '0x1',
  coin_a: '0x2::sui::SUI',
  coin_b: '0x3::usdc::USDC',
  dex: 'Cetus',
  price: '1.0',
  liquidity: '1000000',
  poolCreated: Date.now()
};

// Mock dexes for testing
export const mockDexes = {
  getDexByName: jest.fn(),
  getAllDexes: jest.fn().mockReturnValue([
    { Name: 'TestDex', PoolIds: new Set(['pool1', 'pool2']) }
  ])
};

/**
 * Creates a properly typed mock SuiObjectResponse for a pool
 */
export function createMockPoolResponse(poolId: string = '0x1'): SuiObjectResponse {
  return {
    data: {
      digest: 'mockDigest',
      objectId: poolId,
      version: '1',
      content: {
        dataType: 'moveObject' as const,
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
  };
}

/**
 * Creates a properly typed mock SuiPaginatedEvents
 */
export function createPaginatedMock<T>(data: T[]): SuiPaginatedEvents {
  return {
    data: data.map((item, index) => ({
      id: { txDigest: `tx${index}`, eventSeq: index },
      timestampMs: String(Date.now() - index * 3600000),
      type: '0x3::amm::SwapEvent',
      packageId: '0x3',
      transactionModule: 'mock_module',
      parsedJson: {
        amount: (1000 + index * 100).toString()
      },
      sender: `0xsender${index}`,
      bcs: '0x'
    })),
    hasNextPage: false,
    nextCursor: null
  } as unknown as SuiPaginatedEvents;
}

/**
 * Creates a mock SuiClient with customizable behavior
 */
export class SuiClientMock {
  private objects = new Map<string, SuiObjectResponse>();
  private events = new Map<string, SuiPaginatedEvents>();

  registerObject(id: string, data: Partial<any>) {
    this.objects.set(id, {
      data: {
        objectId: id,
        version: '1',
        digest: crypto.randomBytes(32).toString('hex'),
        content: {
          dataType: 'moveObject',
          type: '0x2::amm::Pool',
          hasPublicTransfer: true,
          fields: {
            coin_a: { id: 'tokenA' },
            coin_b: { id: 'tokenB' },
            reserve_a: '10000',
            reserve_b: '20000',
            ...data
          }
        }
      }
    } as unknown as SuiObjectResponse);
  }

  async getObject(params: { id: string }) {
    return this.objects.get(params.id) ?? null;
  }

  registerEvents(query: string, events: SuiEvent[]) {
    this.events.set(query, {
      data: events,
      hasNextPage: false,
      nextCursor: null
    } as unknown as SuiPaginatedEvents);
  }

  async queryEvents(params: any) {
    const key = JSON.stringify(params);
    return this.events.get(key) ?? createPaginatedMock([]);
  }
}

/**
 * Helper function to validate if an object is a valid SuiObjectResponse
 */
export function isSuiObjectResponse(obj: any): obj is SuiObjectResponse {
  return obj?.data?.content?.dataType !== undefined;
}

/**
 * Helper function to validate if a pool response is valid
 */
export function validatePoolResponse(response: unknown): response is SuiObjectResponse {
  if (!isSuiObjectResponse(response)) return false;
  
  const content = response.data?.content;
  if (content?.dataType !== 'moveObject') return false;
  if (!content.hasPublicTransfer) return false;
  if (!content.type?.includes('::Pool')) return false;
  
  const fields = content.fields;
  if (!fields || typeof fields !== 'object') return false;
  
  // Check if fields has the required properties using type assertion
  const fieldsObj = fields as Record<string, unknown>;
  return 'coin_a' in fieldsObj && 'coin_b' in fieldsObj &&
         'reserve_a' in fieldsObj && 'reserve_b' in fieldsObj;
}