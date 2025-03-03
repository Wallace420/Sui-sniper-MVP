import { Dex, Pool, populateLiquidity, populateMetadata } from './index';
import { convertMYSTtoSUI, formatPoolDate } from '../utils';

const Bluemove: Dex = {
    Name: 'Bluemove',
    MoveEventType: '0xb24b6789e088b876afabca733bed2299fbc9e2d6369be4d1acfa17d8145454d9::swap::Created_Pool_Event',
    GetPools: async function () {
        try {
            const eventsResult: any = await this.Client.queryEvents({
                query: { MoveEventType: this.MoveEventType },
                order: "descending",
                limit: this.Limit,
            });

            if (!eventsResult?.data) {
                console.error('Invalid events result from Bluemove');
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
                        this.PoolIds.add(e.parsedJson.pool_id);
                        pools.push(pool);
                    }
                } catch (eventError) {
                    console.error(`Error processing Bluemove event: ${eventError}`);
                    continue;
                }
            };

            if (pools.length > 0) {
                await Promise.all([
                    populateLiquidity(this.Client, pools).catch(err => {
                        console.error('Error populating liquidity:', err);
                    }),
                    populateMetadata(this.Client, pools).catch(err => {
                        console.error('Error populating metadata:', err);
                    })
                ]);
            }

            return pools;
        } catch (error) {
            console.error('Error in Bluemove GetPools:', error);
            return [];
        }
    },
    PoolIds: new Set<string>(),
    Client: undefined as any,
    Limit: 25,
    lastScanTime: Date.now(),
    scanInterval: 5000,
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
    }
};

async function parseEventToPool(event: any) {
    const pool: Pool = {
        price: '0',
        id: event.pool_id,
        poolId: event.pool_id,
        coin_a: `0x${event.token_y_name}`,
        coin_b: `0x${event.token_x_name}`,
        dex: 'Bluemove',
        poolCreated: event.timestampMs || Date.now(),
        formattedDate: formatPoolDate(event.timestampMs || Date.now())
    }
	return pool
}

export default Bluemove;
