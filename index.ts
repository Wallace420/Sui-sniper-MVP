import { getFullnodeUrl, MoveStruct, SuiClient, SuiObjectResponse, SuiParsedData, TransactionEffects, BalanceChange, ObjectOwner } from '@mysten/sui/client';
import { loadDexes } from './dex';
import { TradeConfig, FilterPlugins, loadFilters } from './filters';
import { sleep } from './utils'

const client = new SuiClient({ url: getFullnodeUrl('mainnet') });

const main = async () => {
    const dexes = await loadDexes(client);
    const config: TradeConfig = {
        DatabasePath: '',
        MaxTradeAmount: '',
        TradeBalancePercent: 0,
        TargetGain: 0,
        MaxTradeDuration: 0,
        SlippagePercent: 0,
        MaxOpenAttempts: 0,
        MaxCloseAttempts: 0,
        SecretKey: '',
        TradeFilterRules: {
            "Liquidity Filter": {
                Params: {
                    minLiquidity: 100,
                },
                Plugin: "Liquidity Filter",
                RuleName: "Liquidity Rules",
            }
        }
    }

    const filter = await FilterPlugins(client, config);
    
    console.log('Starting continuous pool monitoring...');
    let lastScanTime = 0;
    const SCAN_INTERVAL = 5000; // 5 seconds
    const ERROR_RETRY_INTERVAL = 10000; // 10 seconds
    const MAX_RETRIES = 3;

    while (true) {
        try {
            const now = Date.now();
            if (now - lastScanTime < SCAN_INTERVAL) {
                await sleep(SCAN_INTERVAL - (now - lastScanTime));
                continue;
            }

            console.log('Starting new scan cycle...');
            let retryCount = 0;
            
            for (const _dex of Object.keys(dexes)) {
                const dex = dexes[_dex];
                dex.Limit = 10;

                while (retryCount < MAX_RETRIES) {
                    try {
                        const pools = await dex.GetPools();
                        if (pools.length > 0) {
                            console.log(`Found ${pools.length} pools for ${dex.Name}:`);
                            pools.forEach(pool => {
                                console.log(`- Pool ${pool.poolId} created at ${pool.formattedDate} with liquidity: ${pool.liquidity}`);
                            });
                            
                            const trades = await filter.filterPools(pools);
                            if (trades.length > 0) {
                                console.log(`Found ${trades.length} valid trades:`, trades);
                            }
                        }
                        break; // Success, exit retry loop
                    } catch (dexError) {
                        retryCount++;
                        console.error(`Error scanning ${dex.Name} (attempt ${retryCount}/${MAX_RETRIES}):`, dexError);
                        if (retryCount < MAX_RETRIES) {
                            await sleep(ERROR_RETRY_INTERVAL);
                        }
                    }
                }
            }
            
            lastScanTime = Date.now();
            console.log('Scan cycle completed. Waiting for next cycle...');
            
        } catch (error) {
            console.error('Critical error during pool scanning:', error);
            await sleep(ERROR_RETRY_INTERVAL);
        }
    }
};

// Handle process termination gracefully
process.on('SIGINT', () => {
    console.log('Received SIGINT. Gracefully shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Gracefully shutting down...');
    process.exit(0);
});

main().catch(console.error);
