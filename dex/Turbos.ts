import { Dex, Pool, populateLiquidity, populateMetadata, getLiquidity } from './index';
import { SuiClient } from '@mysten/sui/client';


const Turbos: Dex = {
    Name: 'Turbos',
    MoveEventType: '0x5c45d10c26c5fb53bfaff819666da6bc7053d2190dfa29fec311cc666ff1f4b0::pool::PoolCreatedEvent',
    GetPools: async function() {
        const eventsResult: any = await this.Client.queryEvents({
            query: { MoveEventType: this.MoveEventType },
            order: "descending",
            limit: this.Limit,
        });
    
        let pools: Pool[] = []
        for(const e of eventsResult.data) {
            if(!this.PoolIds.has(e.parsedJson.pool_id)) {
                const pool = await parseEventToPool(e.parsedJson)
                this.PoolIds.add(e.parsedJson.pool_id)
                pools.push(pool)
            }
        };
        await populateMetadata(this.Client, pools)
        await populateLiquidity(this.Client, pools)
        return pools
    },
    getLiquidity: async function(poolId: string) {
        return await getLiquidity(this.Client, poolId);
    },
    PoolIds: new Set<string>(),
    Client: undefined as any,
    Limit: 25,
};

async function parseEventToPool(event: any) {
    const pool: Pool = {
        id: event.pool_id,
        poolId: event.pool_id,
        coin_a: `0x${event.coin_type_a}`,
        coin_b: `0x${event.coin_type_b}`,
        dex: 'Turbos',
        poolCreated: Date.now()
    }
	return pool
}

export default Turbos;
