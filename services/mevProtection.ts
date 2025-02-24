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

export interface ProtectedTransaction {
    transactionBlock: SuiTransactionBlock;
    gasBudget: number;
    gasPrice: number;
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
            dynamicGasMultiplier: config.dynamicGasMultiplier || 1.2,
        };
    }

    async protectTransaction(tx: SuiTransactionBlock): Promise<ProtectedTransaction> {
        // Berechne einen Gas-Puffer von 10 % des maximalen Budgets
        const gasBuffer = Math.floor(this.config.maxGasBudget * 0.1);

        // Starte mit dem Mindest-Gaspreis
        let gasPrice = this.config.minGasPrice;

        // Berücksichtige die Priority Fee (mit dynamischer Anpassung)
        if (this.config.priorityFee > 0) {
            gasPrice += this.config.priorityFee * this.config.dynamicGasMultiplier;
        }

        // Falls ein privater Mempool genutzt wird, wird der Gaspreis weiter angepasst
        if (this.config.privateMempool) {
            gasPrice = Math.floor(gasPrice * this.config.dynamicGasMultiplier);
        }

        const gasBudget = this.config.maxGasBudget + gasBuffer;

        // Anstatt direkt Methoden am Transaction Block aufzurufen,
        // geben wir den Transaction Block zusammen mit den berechneten Gaswerten zurück.
        // Diese Werte sollten dann beim Ausführen des Transaction Blocks als Options-Parameter übergeben werden.
        return {
            transactionBlock: tx,
            gasBudget,
            gasPrice,
        };
    }

    async optimizeGas(baseGas: number): Promise<number> {
        // Dynamische Gasoptimierung basierend auf Netzbedingungen
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
            ...newConfig,
        };
    }
}
