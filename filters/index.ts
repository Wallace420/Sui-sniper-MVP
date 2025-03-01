import * as fs from 'fs';
import * as path from 'path';

import { SuiClient } from '@mysten/sui/client';
import { Pool } from '../dex';
import { Trade, TradeStatus } from '../trade';

export interface TradeFilterResult {
    pool: Pool;
    pass: boolean;
    note?: string;
}

export interface TradeFilterPlugin {
    Name: string;
    CheckTrades: (tradeList: Trade[]) => Promise<boolean>;
    Client: SuiClient;  
    TradeFilterRule?: TradeFilterRule;
}

export interface TradeFilterRule {
    Plugin: string;
    Params: Record<string, unknown>;
    RuleName: string;
}

export interface TradeConfig {
    DatabasePath: string;
    MaxTradeAmount: string;
    TradeBalancePercent: number;
    TargetGain: number;
    MaxTradeDuration: number;
    SlippagePercent: number;
    MaxOpenAttempts: number;
    MaxCloseAttempts: number;
    SecretKey: string;
    ExtraPluginDirectory?: string;
    TradeFilterRules?: Record<string, TradeFilterRule>;
}

let _tradeFilters: Record<string, TradeFilterPlugin> = {};

export const loadFilters = async (client: SuiClient, tradeConfig: TradeConfig): Promise<Record<string, TradeFilterPlugin>> => {
    const filters: Record<string, TradeFilterPlugin> = {};
    const files = fs.readdirSync(__dirname);

    for (const file of files) {
        if (file !== 'index.ts' && file.endsWith('.ts')) {
            const modulePath = path.join(__dirname, file);
            console.log(`Try to load filter: ${file}`);
            try {
                const filterModule = await import(modulePath);
                if (filterModule.default) {
                    const dex: TradeFilterPlugin = filterModule.default;
                    console.log(`Load filter: ${dex.Name}`);
                    dex.Client = client; // Assign the passed SuiClient instance
                    const _conf = tradeConfig.TradeFilterRules || {};
                    dex.TradeFilterRule = _conf[dex.Name];
                    filters[dex.Name] = dex; // Use the Name as the key
                } else {
                    console.log(`No default export for ${file}`);
                }
            } catch (error) {
                console.error(`Error loading filter ${file}:`, error instanceof Error ? error.message : 'Unknown error');
            }
        }
    }
    _tradeFilters = filters;
    console.log("FILTERS:", _tradeFilters);
    return filters;
};

interface FilterPlugins {
    client: SuiClient;
    config: TradeConfig;
    filters: Record<string, TradeFilterPlugin>;
    filterPools: (pools: Pool[]) => Promise<Trade[]>;
}

export const FilterPlugins = async (client: SuiClient, tradeConfig: TradeConfig): Promise<FilterPlugins> => { 
    await loadFilters(client, tradeConfig);
    const _f: FilterPlugins = {
        client: client,
        config: tradeConfig,
        filters: _tradeFilters,
        filterPools: async function(pools: Pool[]): Promise<Trade[]> {
            const _trades: Trade[] = [];
            for (const pool of pools) {
                const trade: Trade = {
                    ...pool,
                    status: TradeStatus.New,
                    created: Date.now(),
                    opened: 0,
                    cost: 0,
                    closedValue: 0,
                    baseCoin: pool.coin_b,  // Use coin_b as base coin by default
                    openAttempts: 0,
                    closeAttempts: 0,
                    price: parseFloat(pool.liquidity || '0'),  // Convert liquidity to price
                    balance: 0,
                    manualClose: false
                };
                _trades.push(trade);
            }
            for (const filter of Object.keys(this.filters)) {
                console.log(`Apply filter: '${filter}'`);
                await this.filters[filter].CheckTrades(_trades);
            }
            return _trades;
        }
    };
    return _f;
};

// Type definitions
export type PoolFilterFunc = (pools: Pool[]) => Promise<Trade[]>;
export type TradeFilter = (trade: Trade) => Promise<boolean>;

