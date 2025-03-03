import * as fs from 'fs';
import * as path from 'path';
import { CoinMetadata, SuiClient } from '@mysten/sui/client';
import { convertMYSTtoSUI } from '../utils';
import { TokenLinks } from '../utils/links';
import { LinkManager } from '../utils/links';


/**
 * Interface representing a decentralized exchange (DEX) implementation
 */
export interface Dex {
    /** Gets the liquidity for a specific pool */
    getLiquidity(poolId: string): Promise<string>;
    /** Name of the DEX */
    Name: string;
    /** Type of Move event to monitor */
    MoveEventType: string;
    /** Retrieves latest pools from the DEX */
    GetPools: () => Promise<Pool[]>;
    /** Set of known pool IDs to prevent duplicates */
    PoolIds: Set<string>;
    /** Sui client instance */
    Client: SuiClient;
    /** Maximum number of events to query */
    Limit: number;
    /** Timestamp of last scan */
    lastScanTime: number;
    /** Minimum interval between scans in ms */
    scanInterval: number;
}

/**
 * Interface representing a liquidity pool
 */
export interface Pool {
    price: string;
    /** Unique identifier */
    id: string;
    /** Pool contract ID */
    poolId: string;
    /** First token in the pair */
    coin_a: string;
    /** Second token in the pair */
    coin_b: string;
    /** DEX name */
    dex: string;
    /** Pool creation timestamp */
    poolCreated: number;
    /** Metadata for coin_a */
    metadata?: CoinMetadata | null;
    /** Total liquidity in SUI */
    liquidity?: string;
    /** Social and info links */
    links?: TokenLinks;
    /** Formatted creation date */
    formattedDate?: string;
}

// Using the shared formatPoolDate function from utils/index.ts
// This removes duplication and centralizes the date formatting logic

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

export const populateMetadata: PoolListFunc = async (client: SuiClient, pools: Pool[]) => {
    for(const pool of pools) {
        const metadata = await client.getCoinMetadata({ coinType: pool.coin_a })
        pool.metadata = metadata
        pool.links = LinkManager.getTokenLinks(metadata, pool.poolId)
    }
    return true
}
