import * as fs from 'fs';
import * as path from 'path';

import { CoinMetadata, SuiClient } from '@mysten/sui/client';
import { convertMYSTtoSUI } from '../utils';
import { TokenLinks } from '../utils/links';

export interface Dex {
    getLiquidity(poolId: any): any;
    Name: string;
    MoveEventType: string;
    GetPools: () => Promise<Pool[]>;
    PoolIds: Set<string>;
    Client: SuiClient;
    Limit: number;
    lastScanTime: number;
    scanInterval: number;
}

export interface Pool {
    id: string;
    poolId: string;
    coin_a: string;
    coin_b: string;
    dex: string;
    poolCreated: number;
    metadata?: CoinMetadata | null;
    liquidity?: string;
    links?: TokenLinks;
    formattedDate?: string;
}

export function formatPoolDate(timestamp: number): string {
    return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
    });
}

export const loadDexes = async (client: SuiClient): Promise<Record<string, Dex>> => {
    const dexes: Record<string, Dex> = {};
    const files = fs.readdirSync(__dirname);

    for (const file of files) {
        if (file !== 'index.ts' && file.endsWith('.ts')) {
            try {
                const modulePath = path.join(__dirname, file);
                const dexModule = await import(modulePath);

                if (dexModule.default) {
                    const dex: Dex = dexModule.default;
                    dex.Client = client;
                    dex.PoolIds = new Set<string>(); // Reset pool IDs on load
                    dexes[dex.Name] = dex;
                    console.log(`Loaded DEX: ${dex.Name} with event type: ${dex.MoveEventType}`);
                }
            } catch (error) {
                console.error(`Error loading DEX from ${file}:`, error);
            }
        }
    }

    if (Object.keys(dexes).length === 0) {
        console.warn('No DEX modules were loaded successfully');
    }

    return dexes;
};

export async function getLiquidity(client: SuiClient, poolId: any) {
	const ob: any = await client.getObject({ id: poolId, options: { showContent: true }})
	const content: any = ob.data.content
	const liq0 = content.fields.coin_b || content.fields.reserve_x
	const liquidity: string = convertMYSTtoSUI(liq0*2)
	return liquidity
}

type PoolListFunc = (client: SuiClient, pools: Pool[]) => Promise<boolean>

export const populateLiquidity: PoolListFunc = async (client: SuiClient, pools: Pool[]) => {
    for(const pool of pools) {
        const liquidity = await getLiquidity(client, pool.poolId)
        pool.liquidity = liquidity
    }
    return true
}

import { LinkManager } from '../utils/links';


export const populateMetadata: PoolListFunc = async (client: SuiClient, pools: Pool[]) => {
    for(const pool of pools) {
        const metadata = await client.getCoinMetadata({ coinType: pool.coin_a })
        pool.metadata = metadata
        pool.links = LinkManager.getTokenLinks(metadata, pool.poolId)
    }
    return true
}
