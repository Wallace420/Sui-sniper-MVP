import { SuiTransactionBlock } from '@mysten/sui/client';

export interface MEVProtectionConfig {
    maxGasBudget: number;
    minGasPrice: number;
    priorityFee: number;
    flashbotRPC?: string;
    privateMempool?: boolean;
    maxRetries?: number;
    dynamicGasMultiplier?: number;
}

export class MEVProtection {
    private config: Required<MEVProtectionConfig>;

    constructor(config: MEVProtectionConfig) {
        this.config = {
            maxGasBudget: config.maxGasBudget || 50000000,
            minGasPrice: config.minGasPrice || 1000,
            priorityFee: config.priorityFee || 0,
            flashbotRPC: config.flashbotRPC || '',
            privateMempool: config.privateMempool || false,
            maxRetries: config.maxRetries || 3,
            dynamicGasMultiplier: config.dynamicGasMultiplier || 1.2
        };
    }

    async protectTransaction(tx: SuiTransactionBlock): Promise<SuiTransactionBlock> {
        // Set optimal gas budget with headroom for competition
        const gasBuffer = Math.floor(this.config.maxGasBudget * 0.1); // 10% buffer
tx.setGasBudget(this.config.maxGasBudget + gasBuffer);

        // Calculate competitive gas price
        let gasPrice = this.config.minGasPrice;
        
        // Add priority fee with dynamic adjustment
        if (this.config.priorityFee > 0) {
            gasPrice += this.config.priorityFee * this.config.dynamicGasMultiplier;
        }

        // Add additional protection mechanisms
        if (this.config.privateMempool) {
            // Use private mempool with premium
            gasPrice = Math.floor(gasPrice * this.config.dynamicGasMultiplier);
        }

        tx.setGasPrice(gasPrice);

        return tx;
    }

    async optimizeGas(baseGas: number): Promise<number> {
        // Dynamic gas optimization based on network conditions and competition
        const gasPrice = Math.max(baseGas, this.config.minGasPrice);
        const optimizedGas = Math.floor(gasPrice * this.config.dynamicGasMultiplier);
        
        return optimizedGas + this.config.priorityFee;
    }

    getConfig(): Required<MEVProtectionConfig> {
        return { ...this.config };
    }

    updateConfig(newConfig: Partial<MEVProtectionConfig>): void {
        this.config = {
            ...this.config,
            ...newConfig
        };
    }
}