import { SuiClient } from '@mysten/sui/client';
import { TradeFilterPlugin, TradeFilterRule } from './index';
import { Trade, TradeStatus } from '../trade';

const DenyList: TradeFilterPlugin = {
    Name: "DenyList Filter",
    Client: null as unknown as SuiClient,
    TradeFilterRule: null as unknown as TradeFilterRule,
    CheckTrades: async function(tradeList: Trade[]): Promise<boolean> {
        try {
            const config: Record<string, any> = this.TradeFilterRule?.Params || {};
            if(config['disabled']) {
                console.log(`${this.Name} is disabled`);
                return true;
            }
            console.log(`Checking for deny list`);
            for(const trade of tradeList.filter(t => t.status === TradeStatus.New)) {
                const _denyList = await _hasDenyList(this.Client, trade.coin_a);
                if(_denyList) {
                    trade.status = TradeStatus.Invalid;
                    trade.note = "Coin has deny list";
                }
            }
            return true;
        } catch (error) {
            console.error(`Error in ${this.Name}:`, error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }
}

async function _hasDenyList(client: SuiClient, coin: string): Promise<boolean> {
    try {
        const coinObject = coin.split('::')[0];
        const ob: any = await client.getObject({ 
            id: coinObject, 
            options: { 
                showContent: true, 
                showDisplay: true, 
                showBcs: true, 
                showPreviousTransaction: true, 
                showType: true 
            }
        });
        for(const key of Object.keys(ob.data.content.disassembled)) {
            const bytecode = ob.data.content.disassembled[key];
            if(bytecode.includes('DenyCap')) {
                return true;
            }
        }
        return false;
    } catch (error) {
        console.error('Error checking deny list:', error instanceof Error ? error.message : 'Unknown error');
        return false;
    }
}

export default DenyList;