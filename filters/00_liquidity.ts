import { TradeFilterPlugin, TradeFilterRule } from './index';
import { Trade, TradeStatus } from '../trade';
import { SuiClient } from '@mysten/sui/client';

const Liquidity: TradeFilterPlugin = {
    Name: "Liquidity Filter",
    Client: null as unknown as SuiClient,
    TradeFilterRule: null as unknown as TradeFilterRule,
    CheckTrades: async function(tradeList: Trade[]): Promise<boolean> {
        try {
            const config: Record<string, any> = this.TradeFilterRule?.Params || {};
            if (config['disabled']) {
                console.log(`${this.Name} is disabled`);
                return true;
            }
            const minLiquidity = Number(config['minLiquidity']) || 500;
            console.log(`Checking for minimum liquidity of '${minLiquidity}'`);
            
            for (const trade of tradeList.filter(t => t.status === TradeStatus.New)) {
                const liquidityValue = trade.liquidity ? Number(trade.liquidity) : 0;
                if (isNaN(liquidityValue) || liquidityValue < minLiquidity) {
                    trade.status = TradeStatus.Invalid;
                    trade.note = `Liquidity too low (${liquidityValue} < ${minLiquidity})`;
                }
            }
            return true;
        } catch (error) {
            console.error(`Error in ${this.Name}:`, error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }
};

export default Liquidity;