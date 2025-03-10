import { describe, expect, test, jest, beforeEach } from '@jest/globals';
import { SuiClient, SuiObjectResponse } from '@mysten/sui/client';
import { Dex, Pool, loadDexes, getLiquidity } from '../../dex';
import * as fs from 'fs';
import * as path from 'path';

jest.mock('fs');
jest.mock('path');

describe('DEX Components', () => {
  const mockClient = {
    getObject: jest.fn<() => Promise<SuiObjectResponse>>() as jest.MockedFunction<any>,
    queryEvents: jest.fn<() => Promise<any>>() as jest.MockedFunction<any>
  } as unknown as SuiClient;

  const samplePool: Pool = {
    id: 'pool1',
    poolId: 'pool1',
    coin_a: 'coin_a_address::module::type',
    coin_b: 'coin_b_address::module::type',
    dex: 'TestDex',
    poolCreated: Date.now(),
    price: '1.5',
    liquidity: '1000'
  };

  describe('loadDexes Function', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      (fs.readdirSync as jest.Mock).mockReturnValue(['index.ts', 'TestDex.ts', 'AnotherDex.ts']);
      (path.join as jest.Mock).mockImplementation((dir, file) => `${dir}/${file}`);
    });

    test('should load DEX modules correctly', async () => {
      jest.mock('../../dex/TestDex.ts', () => ({
        default: {
          Name: 'TestDex',
          MoveEventType: 'test::event::type',
          GetPools: jest.fn<() => Promise<Pool[]>>().mockResolvedValue([]),
          PoolIds: new Set<string>(),
          lastScanTime: 0,
          scanInterval: 5000
        }
      }), { virtual: true });

      jest.mock('../../dex/AnotherDex.ts', () => ({
        default: {
          Name: 'AnotherDex',
          MoveEventType: 'another::event::type',
          GetPools: jest.fn<() => Promise<Pool[]>>().mockResolvedValue([samplePool]),
          PoolIds: new Set<string>(),
          lastScanTime: 0,
          scanInterval: 5000
        }
      }), { virtual: true });

      const dexes = await loadDexes(mockClient);
      expect(dexes).toBeDefined();
      expect(Object.keys(dexes).length).toBe(2);
    });
  });

  describe('getLiquidity Function', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    test('should calculate liquidity correctly', async () => {
        (mockClient.getObject as jest.MockedFunction<() => Promise<SuiObjectResponse>>).mockResolvedValue({
            data: {
              objectId: 'mockObjectId',
              version: '1',
              digest: 'mockDigest',
              type: 'mockType',
              owner: { AddressOwner: 'mockOwner' },
              previousTransaction: 'mockTx',
              storageRebate: 'mockRebate',
              content: {
                dataType: 'moveObject',
                type: 'mockType',
                hasPublicTransfer: true,
                fields: {
                  coin_b: 500
                }
              }
            }
          } as unknown as SuiObjectResponse);

      const liquidity = await getLiquidity(mockClient, 'pool1');
      expect(typeof liquidity).toBe('string');
    });

    test('should handle errors gracefully', async () => {
      (mockClient.getObject as jest.MockedFunction<any>).mockRejectedValue(new Error('Network error'));
      await expect(getLiquidity(mockClient, 'pool1')).rejects.toThrow('Network error');
    });
  });
});
