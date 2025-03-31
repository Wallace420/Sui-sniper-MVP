import { SuiClient, SuiObjectResponse, SuiObjectData, PaginatedEvents as SuiPaginatedEvents, SuiEvent, PaginatedObjectsResponse } from '@mysten/sui/client';
import { Pool } from '../dex';
import { jest } from '@jest/globals';
import crypto from 'crypto';
import { version } from 'os';

export function createMockPoolResponse(poolId: string = '0x1'): SuiObjectResponse {
  return {
    data: {
      digest: 'mockDigest', // Dummy-Wert hinzugefügt
      objectId: poolId,
      version: 'version 1', // Dummy-Wert hinzugefügt
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
      },
    } as SuiObjectData,
  };
}