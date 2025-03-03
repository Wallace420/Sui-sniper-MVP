import { Dex, Pool, populateLiquidity, populateMetadata } from './index';
import { convertMYSTtoSUI, formatPoolDate } from '../utils';

const Turbos: Dex = {
    Name: 'Turbos',
    MoveEventType: '0x5c45d10c26c5fb53bfaff819666da6bc7053d2190dfa29fec311cc666ff1f4b0::pool::PoolCreatedEvent',
    GetPools: async function () {
        try {
            const eventsResult: any = await this.Client.queryEvents({
                query: { MoveEventType: this.MoveEventType },
                order: "descending",
                limit: this.Limit,
                cursor: null // Start with no cursor to get latest events
            });

            if (!eventsResult?.data) {
                console.error('Invalid events result from Turbos');
                return [];
            }

            let pools: Pool[] = [];
            for (const e of eventsResult.data) {
                try {
                    if (!e?.parsedJson?.pool_id) {
                        console.error('Invalid event format:', e);
                        continue;
                    }

                    if (!this.PoolIds.has(e.parsedJson.pool_id)) {
                        const pool = await parseEventToPool(e.parsedJson);

                        // Get liquidity immediately after pool creation
                        try {
                            pool.liquidity = await this.getLiquidity(pool.poolId);
                        } catch (liqError) {
                            console.error(`Error fetching liquidity for pool ${pool.poolId}:`, liqError);
                            pool.liquidity = '0';
                        }

                        this.PoolIds.add(e.parsedJson.pool_id);
                        pools.push(pool);
                        console.log(`Found new pool: ${pool.poolId} with liquidity: ${pool.liquidity}`);
                    }
                } catch (eventError) {
                    console.error(`Error processing Turbos event: ${eventError}`);
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
            }

            return pools;
        } catch (error) {
            console.error('Error in Turbos GetPools:', error);
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
    lastScanTime: 0,
    scanInterval: 0
};

async function parseEventToPool(event: any) {
    const pool: Pool = {
        price: '0',
        id: event.pool_id,
        poolId: event.pool_id,
        coin_a: `0x${event.coin_type_a}`,
        coin_b: `0x${event.coin_type_b}`,
        dex: 'Turbos',
        poolCreated: event.timestampMs || Date.now(),
        formattedDate: formatPoolDate(event.timestampMs || Date.now())
    }
	return pool
}

export default Turbos;


