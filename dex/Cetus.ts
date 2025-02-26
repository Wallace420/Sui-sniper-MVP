import { Dex, Pool, populateLiquidity, populateMetadata } from './index';
import { formatPoolDate, convertMYSTtoSUI } from '../utils';

const Cetus: Dex = {
    Name: 'Cetus',
    MoveEventType: '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::factory::CreatePoolEvent',
    lastScanTime: 0,
    scanInterval: 5000, // 5 seconds minimum between scans
    GetPools: async function() {
        try {
            // Rate limiting check
            const now = Date.now();
            if (now - this.lastScanTime < this.scanInterval) {
                console.debug('Skipping scan due to rate limiting');
                return [];
            }
            this.lastScanTime = now;

            const eventsResult: any = await this.Client.queryEvents({
                query: { MoveEventType: this.MoveEventType },
                order: "descending",
                limit: this.Limit,
            });
    
            if (!eventsResult?.data) {
                console.error('Invalid events result from Cetus');
                return [];
            }
    
            const timestampThreshold = Date.now() - (60 * 1000); // Extended to 60 seconds for better coverage
            let pools: Pool[] = []
            
            for(const e of eventsResult.data) {
                try {
                    if (!e?.parsedJson?.pool_id) {
                        console.error('Invalid event format: missing pool_id', e);
                        continue;
                    }

                    const eventTimestamp = e.timestampMs ? Number(e.timestampMs) : Date.now();
    
                    // Skip old events with improved logging
                    if (eventTimestamp < timestampThreshold) {
                        console.debug(`Skipping old pool ${e.parsedJson.pool_id} from ${new Date(eventTimestamp).toISOString()}`);
                        continue;
                    }

                    // Additional timestamp validation
                    if (eventTimestamp > Date.now() + 1000) { // Future timestamp check (1 second buffer)
                        console.debug(`Skipping pool with future timestamp ${e.parsedJson.pool_id}`);
                        continue;
                    }
    
                    if(!this.PoolIds.has(e.parsedJson.pool_id)) {
                        // Validate pool existence before processing
                        try {
                            const poolObject = await this.Client.getObject({
                                id: e.parsedJson.pool_id,
                                options: { showContent: true }
                            });

                            if (!poolObject?.data?.content) {
                                console.error(`Pool ${e.parsedJson.pool_id} not found or invalid`);
                                continue;
                            }

                            const pool = await parseEventToPool(e.parsedJson, eventTimestamp);
                            this.PoolIds.add(e.parsedJson.pool_id);
                            pools.push(pool);
                            console.log(`Found new pool: ${pool.poolId} created at ${pool.formattedDate}`);
                        } catch (poolError) {
                            console.error(`Error validating pool ${e.parsedJson.pool_id}:`, poolError);
                            continue;
                        }
                    } else {
                        console.debug(`Pool ${e.parsedJson.pool_id} already processed`);
                    }
                } catch (eventError) {
                    console.error(`Error processing Cetus event:`, eventError);
                    continue;
                }
            };
    
            if (pools.length > 0) {
                await Promise.all([
                    populateMetadata(this.Client, pools).catch(err => {
                        console.error('Error populating metadata:', err);
                    }),
                    populateLiquidity(this.Client, pools).catch(err => {
                        console.error('Error populating liquidity:', err);
                    })
                ]);
                console.log(`Successfully processed ${pools.length} new pools`);
            } else {
                console.debug('No new pools found in this scan');
            }
    
            return pools;
        } catch (error) {
            console.error('Error in Cetus GetPools:', error);
            return [];
        }
    },
    getLiquidity: async function(poolId: string) {
        try {
            const ob: any = await this.Client.getObject({ id: poolId, options: { showContent: true }});
            const content: any = ob.data.content;
            const liq0 = content.fields.coin_b || content.fields.reserve_x;
            const liquidity = convertMYSTtoSUI(liq0*2);
            return liquidity;
        } catch (error) {
            console.error(`Error getting liquidity for pool ${poolId}:`, error);
            return '0';
        }
    },
    PoolIds: new Set<string>(),
    Client: undefined as any,
    Limit: 25,
};

async function parseEventToPool(event: any, timestamp: number) {
    const pool: Pool = {
        id: event.pool_id,
        poolId: event.pool_id,
        coin_a: `0x${event.coin_type_a}`,
        coin_b: `0x${event.coin_type_b}`,
        dex: 'Cetus',
        poolCreated: timestamp,
        formattedDate: formatPoolDate(timestamp)
    }
    return pool
}

export default Cetus;