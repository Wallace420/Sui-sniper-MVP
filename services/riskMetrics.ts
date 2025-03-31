import { SuiClient, TransactionEffects, SuiTransactionBlockKind, ExtendedObjectOwner, TransactionInput, RiskMetricsData } from '../types/sui-sdk';
import { TokenSecurity } from './tokenSecurity';
import { LiquidityAnalytics } from './analytics/liquidityAnalytics';
import { TokenAnalytics } from './analytics/tokenAnalytics';
import { WebSocketWrapper } from './websocket/WebSocketWrapper';

/**
 * Interface for token audit status information
 */
export interface TokenAuditInfo {
  tokenId: string;
  isAudited: boolean;
  auditProvider?: string;
  auditDate?: Date;
  auditScore?: number; // 0-100 scale
  auditUrl?: string;
  issues?: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  lastUpdated?: number;
}

/**
 * Interface for token ownership analysis
 */
export interface OwnershipAnalysis {
  tokenId: string;
  creator: string;
  ownershipStructure: {
    isRenounced: boolean;
    hasMultiSig: boolean;
    adminCount: number;
    timelock?: number; // in seconds
  };
  permissionRisk: number; // 0-10 scale, higher means more risk
  lastUpdated: number;
}

/**
 * Interface for token permission analysis
 */
export interface PermissionAnalysis {
  tokenId: string;
  permissions: {
    canMint: boolean;
    canBurn: boolean;
    canPause: boolean;
    canUpgrade: boolean;
    hasBlacklist: boolean;
    hasFees: boolean;
  };
  riskLevel: number; // 0-10 scale, higher means more risk
  lastUpdated: number;
}

/**
 * Interface for liquidity lock status
 */
export interface LiquidityLockInfo {
  poolId: string;
  tokenId: string;
  isLocked: boolean;
  lockDuration?: number; // in seconds
  lockExpiry?: number; // timestamp
  lockedPercentage: number; // 0-100
  lockContract?: string;
  lastUpdated: number;
}

/**
 * Interface for historical liquidity stability
 */
export interface LiquidityStabilityInfo {
  poolId: string;
  tokenId: string;
  stabilityScore: number; // 0-100, higher means more stable
  volatilityIndex: number; // 0-10, higher means more volatile
  liquidityHistory: {
    timestamp: number;
    liquidity: number;
  }[];
  significantChanges: {
    timestamp: number;
    changePercent: number;
    isIncrease: boolean;
  }[];
  lastUpdated: number;
}

/**
 * Interface for wash trading detection
 */
export interface WashTradingAnalysis {
  tokenId: string;
  suspiciousScore: number; // 0-100, higher means more suspicious
  suspiciousVolume: number; // percentage of total volume
  suspiciousPatterns: {
    circularTrading: number; // 0-10 scale
    selfTrading: number; // 0-10 scale
    uniformTrading: number; // 0-10 scale
  };
  suspiciousAddresses: string[];
  lastUpdated: number;
}

/**
 * Interface for market manipulation indicators
 */
export interface ManipulationIndicators {
  tokenId: string;
  manipulationScore: number; // 0-100, higher means more manipulation
  pumpAndDumpRisk: number; // 0-10 scale
  spoofingDetected: boolean;
  layeringDetected: boolean;
  momentumIgnition: number; // 0-10 scale
  abnormalPatterns: {
    pattern: string;
    severity: number; // 0-10 scale
    detectedAt: number;
  }[];
  lastUpdated: number;
}

/**
 * Interface for whale activity monitoring
 */
export interface WhaleActivityInfo {
  tokenId: string;
  whales: {
    address: string;
    balance: bigint;
    percentage: number;
    recentActivity: {
      buys: number;
      sells: number;
      netAmount: number;
      lastActivity: number;
    };
  }[];
  whaleConcentration: number; // 0-100, percentage held by whales
  recentWhaleActivity: {
    timestamp: number;
    address: string;
    action: 'buy' | 'sell';
    amount: number;
    priceImpact: number;
  }[];
  whaleRiskScore: number; // 0-10 scale, higher means more risk
  lastUpdated: number;
}

/**
 * Configuration for RiskMetrics
 */
export interface RiskMetricsConfig {
  cacheTimeMs?: number;
  whaleThresholdPercent?: number; // Percentage of supply to be considered a whale
  washTradingThreshold?: number; // Threshold for wash trading detection
  manipulationThreshold?: number; // Threshold for manipulation detection
  liquidityLockThreshold?: number; // Minimum lock percentage considered safe
  auditScoreThreshold?: number; // Minimum audit score considered safe
  websocketEndpoint?: string; // Endpoint for real-time data
}

/**
 * WebSocket event interfaces for better type safety
 */
export interface WebSocketOpenEvent extends Event {
  target: WebSocket;
}

export interface WebSocketMessageEvent extends MessageEvent {
  data: string | ArrayBuffer | Blob;
}

export interface WebSocketCloseEvent extends CloseEvent {
  code: number;
  reason: string;
  wasClean: boolean;
}

/**
 * Transaction event interface for better type safety
 */
export interface TransactionEvent {
  transaction?: {
    data?: {
      transaction?: {
        kind?: string;
        inputs?: TransactionInput[];
      };
      sender?: string;
      function?: string;
      arguments?: any[];
    };
    sender?: string;
    kind?: string;
  };
  effects?: {
    status?: {
      status?: string;
    };
    effects?: TransactionEffects[];
  };
}

/**
 * Class for advanced risk metrics analysis
 */
export class RiskMetrics {
  private client: SuiClient;
  private tokenSecurity: TokenSecurity;
  private liquidityAnalytics: LiquidityAnalytics;
  private tokenAnalytics: TokenAnalytics;
  private ws: WebSocketWrapper | null = null;
  
  private auditCache: Map<string, TokenAuditInfo> = new Map();
  private ownershipCache: Map<string, OwnershipAnalysis> = new Map();
  private permissionCache: Map<string, PermissionAnalysis> = new Map();
  private liquidityLockCache: Map<string, LiquidityLockInfo> = new Map();
  private stabilityCache: Map<string, LiquidityStabilityInfo> = new Map();
  private washTradingCache: Map<string, WashTradingAnalysis> = new Map();
  private manipulationCache: Map<string, ManipulationIndicators> = new Map();
  private whaleActivityCache: Map<string, WhaleActivityInfo> = new Map();
  
  private readonly DEFAULT_CACHE_TIME = 300000; // 5 minutes
  private readonly config: Required<RiskMetricsConfig>;
  
  constructor(client: SuiClient, tokenSecurity: TokenSecurity, config?: RiskMetricsConfig) {
    this.client = client;
    this.tokenSecurity = tokenSecurity;
    this.liquidityAnalytics = new LiquidityAnalytics(client);
    this.tokenAnalytics = new TokenAnalytics(client);
    
    // Set default configuration values
    this.config = {
      cacheTimeMs: config?.cacheTimeMs || this.DEFAULT_CACHE_TIME,
      whaleThresholdPercent: config?.whaleThresholdPercent || 2,
      washTradingThreshold: config?.washTradingThreshold || 30,
      manipulationThreshold: config?.manipulationThreshold || 40,
      liquidityLockThreshold: config?.liquidityLockThreshold || 80,
      auditScoreThreshold: config?.auditScoreThreshold || 70,
      websocketEndpoint: config?.websocketEndpoint || ''
    };
    
    // Initialize WebSocket for real-time data if endpoint is provided
    if (this.config.websocketEndpoint) {
      this.initializeWebSocket();
    }
  }
  
  /**
   * Initialize WebSocket connection for real-time data
   */
  private initializeWebSocket(): void {
    if (!this.config.websocketEndpoint) {
      console.warn('No WebSocket endpoint provided, skipping initialization');
      return;
    }
    
    try {
      this.ws = new WebSocketWrapper(this.config.websocketEndpoint);
      
      // Set up event handlers using the correct interface
      this.ws.onopen = (event: WebSocketOpenEvent) => {
        console.log('WebSocket connection established for risk metrics');
        this.subscribeToEvents();
      };
      
      this.ws.onerror = (error: Error) => {
        console.error('WebSocket error in risk metrics:', error);
      };
      
      this.ws.onclose = (event: WebSocketCloseEvent) => {
        console.log(`WebSocket connection closed for risk metrics: Code ${event.code}, Reason: ${event.reason}`);
        // Attempt to reconnect
        setTimeout(() => this.initializeWebSocket(), 5000);
      };
      
      // Add message handler if needed
      this.ws.onmessage = (event: WebSocketMessageEvent) => {
        // Process general messages if needed
        // Most message handling will be done through subscriptions
        this.processWebSocketMessage(event.data);
      };
    } catch (error) {
      console.error('Failed to initialize WebSocket:', error instanceof Error ? error.message : String(error));
    }
  }
  
  /**
   * Process incoming WebSocket messages
   */
  private processWebSocketMessage(data: string | ArrayBuffer | Blob): void {
    try {
      // Handle different data types
      let jsonData: any;
      
      if (typeof data === 'string') {
        jsonData = JSON.parse(data);
      } else if (data instanceof ArrayBuffer) {
        const decoder = new TextDecoder();
        jsonData = JSON.parse(decoder.decode(data));
      } else if (data instanceof Blob) {
        // Handle Blob data if needed
        console.log('Received Blob data, processing not implemented');
        return;
      } else {
        console.warn('Received unknown data type from WebSocket');
        return;
      }
      
      // Process the JSON data based on its type
      if (jsonData.type === 'transaction') {
        this.processTransactionEvent(jsonData as TransactionEvent);
      } else if (jsonData.type === 'liquidity_change') {
        this.processLiquidityEvent(jsonData);
      } else if (jsonData.type === 'whale_movement') {
        this.processWhaleEvent(jsonData);
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error instanceof Error ? error.message : String(error));
    }
  }
  
  /**
   * Subscribe to relevant blockchain events for real-time monitoring
   */
  private subscribeToEvents(): void {
    if (!this.ws || !this.ws.isConnected()) {
      console.warn('WebSocket not connected, cannot subscribe to events');
      return;
    }
    
    // Subscribe to transaction events
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      event: 'transactions',
      filter: {
        // Add filters as needed
      }
    }));
    
    // Subscribe to liquidity events
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      event: 'liquidity_changes',
      filter: {
        // Add filters as needed
      }
<<<<<<< HEAD
    }));
=======

      // Extract transaction data with proper type checking
      const txData = event.transaction;
      if (!txData) {
        console.warn('No transaction data in event');
        return;
      }
      
      // Check for large transfers that might indicate whale activity
      if (txData.kind === 'TransferObject') {
        this.checkForWhaleActivity(txData);
      }
      
      // Check for suspicious trading patterns
      if (txData.data && typeof txData.data === 'object') {
        // Handle function calls for swaps and liquidity changes
        if (txData.kind === 'Call') {
          const functionName = typeof txData.data.function === 'string' ? txData.data.function : '';
          
          if (functionName.includes('swap')) {
            this.checkForSuspiciousTrading(txData);
          }
          
          // Check for liquidity changes
          if (functionName.includes('addLiquidity') || functionName.includes('removeLiquidity')) {
            this.checkForLiquidityChanges(txData);
          }
        }
      }
      
      // Handle programmable transactions
      if (txData.kind === 'ProgrammableTransaction' && txData.data?.transaction) {
        // Process programmable transaction data
        // This would analyze the transaction inputs and commands
        // For now, we'll log it for debugging
        console.log('Received programmable transaction:', txData.data.transaction);
      }
    } catch (error) {
      console.error('Error handling transaction event:', error instanceof Error ? error.message : String(error));
    }
  }
  
  /**
   * Check for whale activity in transaction
   */
  private checkForWhaleActivity(txData: any): void {
    if (!txData || typeof txData !== 'object') {
      console.error('Invalid transaction data for whale activity check');
      return;
    }
    try {
      // Extract transfer details
      if (!txData.data || typeof txData.data !== 'object') {
        console.warn('No transfer data in transaction');
        return;
      }
      
      const transferData = txData.data;
      
      if (!transferData.objectRef || typeof transferData.objectRef !== 'object') {
        console.warn('No object reference in transfer data');
        return;
      }
      
      const objectRef = transferData.objectRef;
      
      const objectId = objectRef.objectId as string;
      const recipient = transferData.recipient as string;
      const sender = txData.sender as string;
      
      if (!objectId || !recipient || !sender) {
        console.warn('Missing required transfer data properties');
        return;
      }
      
      // Get token type and amount
      this.client.getObject({
        id: objectId,
        options: { showContent: true, showType: true }
      }).then(objectData => {
        const type = objectData.data?.type as string;
        if (!type || !type.includes('::coin::')) {
          console.log(`Object ${objectId} is not a coin type: ${type}`);
          return;
        }
        
        // Extract token ID from type
        const tokenId = type.split('<')[1]?.split('>')[0];
        if (!tokenId) {
          console.log(`Could not extract token ID from type: ${type}`);
          return;
        }
        
        // Get token balance with proper type checking
        let fields: Record<string, unknown> = {};
        if (objectData.data?.content?.dataType === 'moveObject') {
          fields = (objectData.data.content as { fields: Record<string, unknown> }).fields || {};
        }
        
        const amount = BigInt(fields?.balance?.toString() || '0');
        
        
        // Check if this is a significant transfer
        this.tokenAnalytics.getTokenHolderAnalysis(tokenId).then(holderData => {
          // Calculate total supply
          const totalSupply = holderData.topHolders.reduce(
            (sum, holder) => sum + holder.balance, BigInt(0)
          );
          
          // Calculate percentage of total supply
          const percentage = totalSupply > 0 ? 
            Number((amount * BigInt(100)) / totalSupply) : 0;
          
          // Check if this is a whale transfer
          if (percentage >= this.config.whaleThresholdPercent) {
            // Get or initialize whale activity info
            let whaleInfo = this.whaleActivityCache.get(tokenId);
            if (!whaleInfo) {
              whaleInfo = {
                tokenId,
                whales: [],
                whaleConcentration: 0,
                recentWhaleActivity: [],
                whaleRiskScore: 0,
                lastUpdated: Date.now()
              };
            }
            
            // Add this activity to recent whale activity
            whaleInfo.recentWhaleActivity.push({
              timestamp: Date.now(),
              address: sender,
              action: 'sell',
              amount: Number(amount),
              priceImpact: 0 // Would calculate this in a real implementation
            });
            
            // Update whale info
            const existingWhaleIndex = whaleInfo.whales.findIndex(w => w.address === sender);
            if (existingWhaleIndex >= 0) {
              const whale = whaleInfo.whales[existingWhaleIndex];
              whale.recentActivity.sells += 1;
              whale.recentActivity.netAmount -= Number(amount);
              whale.recentActivity.lastActivity = Date.now();
            } else {
              // Add new whale if not already tracked
              whaleInfo.whales.push({
                address: sender,
                balance: amount,
                percentage: percentage,
                recentActivity: {
                  buys: 0,
                  sells: 1,
                  netAmount: -Number(amount),
                  lastActivity: Date.now()
                }
              });
            }
            
            // Update whale concentration
            whaleInfo.whaleConcentration = whaleInfo.whales.reduce(
              (sum, whale) => sum + whale.percentage, 0
            );
            
            // Calculate risk score based on concentration and activity
            whaleInfo.whaleRiskScore = Math.min(
              10,
              (whaleInfo.whaleConcentration / 10) + 
              (whaleInfo.recentWhaleActivity.length / 5)
            );
            
            // Update cache
            whaleInfo.lastUpdated = Date.now();
            this.whaleActivityCache.set(tokenId, whaleInfo);
            
            console.log(`Detected whale activity for token ${tokenId}: ${percentage.toFixed(2)}% transfer`);
          }
        }).catch(error => {
          console.error('Error analyzing holder data for whale activity:', 
            error instanceof Error ? error.message : String(error));
        });
      }).catch(error => {
        console.error('Error getting object data for whale activity check:', 
          error instanceof Error ? error.message : String(error));
      });
    } catch (error) {
      console.error('Error checking for whale activity:', 
        error instanceof Error ? error.message : String(error));
    }
  }
  
  /**
   * Check for suspicious trading patterns
   */
  private checkForSuspiciousTrading(txData: any): void {
    if (!txData || typeof txData !== 'object') {
      console.error('Invalid transaction data for suspicious trading check');
      return;
    }
    try {
      const callData = txData.data;
      if (!callData) {
        console.warn('No call data in transaction');
        return;
      }
      
      // Safely extract function name, sender and arguments with type checking
      const functionName = typeof callData.function === 'string' ? callData.function : '';
      const sender = typeof txData.sender === 'string' ? txData.sender : '';
      const arguments_ = Array.isArray(callData.arguments) ? callData.arguments : [];
      
      if (!functionName) {
        console.warn('No function name in call data');
        return;
      }
      
      if (!sender) {
        console.warn('No sender in transaction data');
        return;
      }
      
      if (arguments_.length < 3) {
        console.warn('Insufficient arguments for swap function');
        return;
      }
      
      // Extract token information from swap function with proper type checking
      const tokenInType = typeof arguments_[0] === 'string' ? arguments_[0] : '';
      const tokenOutType = typeof arguments_[1] === 'string' ? arguments_[1] : '';
      const amountIn = BigInt(arguments_[2]?.toString() || '0');
      
      if (!tokenInType || !tokenOutType) {
        console.warn('Invalid token types in swap function');
        return;
      }
      
      // Extract token IDs
      const tokenInId = tokenInType.split('<')[1]?.split('>')[0];
      const tokenOutId = tokenOutType.split('<')[1]?.split('>')[0];
      
      if (!tokenInId || !tokenOutId) {
        console.warn('Could not extract token IDs from type strings');
        return;
      }
      
      console.log(`Detected swap: ${tokenInId} -> ${tokenOutId}, amount: ${amountIn}`);
      
      // Check for wash trading patterns
      this.detectWashTrading(tokenInId, tokenOutId, sender, amountIn);
      
      // Check for market manipulation
      this.detectMarketManipulation(tokenInId, tokenOutId, sender, amountIn);
    } catch (error) {
      console.error('Error checking for suspicious trading:', 
        error instanceof Error ? error.message : String(error));
    }
  }
  
  /**
   * Detect wash trading patterns
   */
  private async detectWashTrading(
    tokenInId: string,
    tokenOutId: string,
    sender: string,
    amount: bigint
  ): Promise<void> {
    if (!tokenInId || !tokenOutId || !sender) {
      console.error('Invalid parameters for wash trading detection');
      return;
    }
    try {
      // Get recent transactions by this sender
      const txResponse = await this.client.queryTransactionBlocks({
        filter: { FromAddress: sender },
        options: { showInput: true, showEffects: true },
        limit: 20
      });
      
      if (!txResponse.data || txResponse.data.length === 0) return;
      
      // Look for circular trading patterns
      let circularTrades = 0;
      let selfTrades = 0;
      let uniformTrades = 0;
      
      // Track unique trading partners
      const tradingPartners = new Set<string>();
      const tradeAmounts = new Set<string>();
      
      // Analyze recent transactions
      for (const tx of txResponse.data) {
        const input = tx.transaction?.data?.transaction?.kind === 'ProgrammableTransaction' 
          ? (tx.transaction.data.transaction as { inputs?: unknown[] }).inputs 
          : undefined;
        if (!input) continue;
        
        // Check if this is a swap transaction
        const isSwap = input.some((i: any) => 
          i.type === 'pure' &&
          (i.value?.toString()?.includes(tokenInId) || i.value?.toString()?.includes(tokenOutId))
        );
        
        if (isSwap) {
          // Check for trading partners
          const recipients = tx.effects
            ? (tx.effects as unknown as ExtendedTransactionEffect[]).filter((e: ExtendedTransactionEffect) => e.type?.includes('::TransferObject'))
              .map((e: ExtendedTransactionEffect) => e.parsedJson?.recipient)
            : undefined;
          
          if (recipients) {
            recipients.forEach((r: string | undefined) => {
              if (r && r !== sender) tradingPartners.add(r);
            });
            
            // Self-trading check
            if (recipients.every((r: string | undefined) => r === sender)) {
              selfTrades++;
            }
          }
          
          // Check for uniform trade amounts
          const tradeAmount = input
            .find((i: any) => i.type === 'pure' && typeof i.value === 'number')
            ?.value?.toString();
          
          if (tradeAmount) {
            tradeAmounts.add(tradeAmount);
          }
        }
      }
      
      // Check for circular trading
      if (tradingPartners.size < 3 && txResponse.data.length > 5) {
        circularTrades = 5; // Suspicious circular trading pattern
      }
      
      // Check for uniform trading
      if (tradeAmounts.size < 3 && txResponse.data.length > 5) {
        uniformTrades = 5; // Suspicious uniform trading pattern
      }
      
      // Calculate suspicion score
      const suspiciousScore = (circularTrades + selfTrades + uniformTrades) * 10;
      
      if (suspiciousScore > this.config.washTradingThreshold) {
        // Get or initialize wash trading analysis
        let washTrading = this.washTradingCache.get(tokenInId);
        if (!washTrading) {
          washTrading = {
            tokenId: tokenInId,
            suspiciousScore: 0,
            suspiciousVolume: 0,
            suspiciousPatterns: {
              circularTrading: 0,
              selfTrading: 0,
              uniformTrading: 0
            },
            suspiciousAddresses: [],
            lastUpdated: Date.now()
          };
        }
        
        // Update wash trading analysis
        washTrading.suspiciousScore = Math.max(washTrading.suspiciousScore, suspiciousScore);
        washTrading.suspiciousPatterns.circularTrading = Math.max(
          washTrading.suspiciousPatterns.circularTrading,
          circularTrades
        );
        washTrading.suspiciousPatterns.selfTrading = Math.max(
          washTrading.suspiciousPatterns.selfTrading,
          selfTrades
        );
        washTrading.suspiciousPatterns.uniformTrading = Math.max(
          washTrading.suspiciousPatterns.uniformTrading,
          uniformTrades
        );
        
        if (!washTrading.suspiciousAddresses.includes(sender)) {
          washTrading.suspiciousAddresses.push(sender);
        }
        
        washTrading.lastUpdated = Date.now();
        this.washTradingCache.set(tokenInId, washTrading);
        
        console.log(`Detected potential wash trading for token ${tokenInId} by ${sender}`);
      }
    } catch (error) {
      console.error('Error detecting wash trading:', error);
    }
  }
  
  /**
   * Detect market manipulation patterns
   */
  private async detectMarketManipulation(
    tokenInId: string,
    tokenOutId: string,
    sender: string,
    amount: bigint
  ): Promise<void> {
    if (!tokenInId || !tokenOutId || !sender) {
      console.error('Invalid parameters for market manipulation detection');
      return;
    }
    try {
      // Get token volume data
      const volumeData = await this.tokenAnalytics.getTokenVolumeAnalysis(tokenInId);
      
      // Check for pump and dump patterns
      const priceChange = volumeData.priceChange24h;
      const volumeChange = volumeData.volumeChange24h;
      
      let pumpAndDumpRisk = 0;
      let momentumIgnition = 0;
      let spoofingDetected = false;
      let layeringDetected = false;
      
      // Check for pump and dump risk
      if (priceChange > 20 && volumeChange > 50) {
        pumpAndDumpRisk = Math.min(10, (priceChange / 10) + (volumeChange / 20));
      }
      
      // Check for momentum ignition
      if (priceChange > 10 && volumeData.transactions24h > 100) {
        momentumIgnition = Math.min(10, priceChange / 5);
      }
      
      // Get recent transactions for this token
      const txResponse = await this.client.queryTransactionBlocks({
        filter: { InputObject: tokenInId },
        options: { showInput: true, showEffects: true },
        limit: 50
      });
      
      if (txResponse.data && txResponse.data.length > 0) {
        // Check for spoofing (large orders that get canceled)
        const largeOrdersCanceled = txResponse.data.filter(tx => {
          const input = (tx.transaction?.data?.transaction as any)?.inputs;
          const isCanceled = tx.effects?.status?.status === 'failure';
          
          if (!input || !isCanceled) return false;
          
          // Check if this was a large order
          const orderSize = (input
            .find((i: any) => i.type === 'pure' && typeof i.value === 'number')
            ?.value as number) || 0;
          
          return orderSize && orderSize > volumeData.volume24h * 0.05; // 5% of daily volume
        });
        
        spoofingDetected = largeOrdersCanceled.length >= 3;
        
        // Check for layering (multiple orders at different price levels)
        const uniquePriceLevels = new Set<number>();
        txResponse.data.forEach(tx => {
          const input = (tx.transaction?.data?.transaction as SuiTransactionBlockKind & { inputs?: TransactionInput[] })?.inputs;
          if (!input) return;
          
          const priceLevel = input
            .find(i => i.type === 'pure' && typeof i.value === 'number')
            ?.value as number;
          
          if (priceLevel) uniquePriceLevels.add(priceLevel);
        });
        
        layeringDetected = uniquePriceLevels.size >= 5 && 
                          txResponse.data.length / uniquePriceLevels.size >= 3;
      }
      
      // Calculate manipulation score
      const manipulationScore = (
        pumpAndDumpRisk * 10 + 
        momentumIgnition * 10 + 
        (spoofingDetected ? 30 : 0) + 
        (layeringDetected ? 30 : 0)
      );
      
      if (manipulationScore > this.config.manipulationThreshold) {
        // Get or initialize manipulation indicators
        let manipulation = this.manipulationCache.get(tokenInId);
        if (!manipulation) {
          manipulation = {
            tokenId: tokenInId,
            manipulationScore: 0,
            pumpAndDumpRisk: 0,
            spoofingDetected: false,
            layeringDetected: false,
            momentumIgnition: 0,
            abnormalPatterns: [],
            lastUpdated: Date.now()
          };
        }
        
        // Update manipulation indicators
        manipulation.manipulationScore = Math.max(manipulation.manipulationScore, manipulationScore);
        manipulation.pumpAndDumpRisk = Math.max(manipulation.pumpAndDumpRisk, pumpAndDumpRisk);
        
        manipulation.layeringDetected = manipulation.layeringDetected || layeringDetected;
        manipulation.momentumIgnition = Math.max(manipulation.momentumIgnition, momentumIgnition);
        
        // Add abnormal pattern if detected
        if (pumpAndDumpRisk > 5 || momentumIgnition > 5 || spoofingDetected || layeringDetected) {
          manipulation.abnormalPatterns.push({
            pattern: pumpAndDumpRisk > 5 ? 'Pump and Dump' : 
                    momentumIgnition > 5 ? 'Momentum Ignition' :
                    spoofingDetected ? 'Spoofing' : 'Layering',
            severity: Math.max(pumpAndDumpRisk, momentumIgnition, spoofingDetected ? 7 : 0, layeringDetected ? 7 : 0),
            detectedAt: Date.now()
          });
        }
        
        manipulation.lastUpdated = Date.now();
        this.manipulationCache.set(tokenInId, manipulation);
        
        console.log(`Detected potential market manipulation for token ${tokenInId}`);
      }
    } catch (error) {
      console.error('Error detecting market manipulation:', error);
    }
  }
  
  /**
   * Check for significant liquidity changes
   */
  private async checkForLiquidityChanges(txData: any): Promise<void> {
    if (!txData || typeof txData !== 'object') {
      console.error('Invalid transaction data for liquidity changes check');
      return;
    }
    try {
      const callData = txData.data;
      if (!callData) {
        console.warn('No call data in transaction');
        return;
      }
      
      // Safely extract function name, sender and arguments with type checking
      const functionName = typeof callData.function === 'string' ? callData.function : '';
      const sender = typeof txData.sender === 'string' ? txData.sender : '';
      const arguments_ = Array.isArray(callData.arguments) ? callData.arguments : [];
      
      if (!functionName) {
        console.warn('No function name in call data');
        return;
      }
      
      if (!sender) {
        console.warn('No sender in transaction data');
        return;
      }
      
      if (arguments_.length === 0) {
        console.warn('No arguments for liquidity function');
        return;
      }
      
      // Extract pool ID and token information with proper type checking
      const poolId = typeof arguments_[0] === 'string' ? arguments_[0] : '';
      if (!poolId) {
        console.warn('Invalid pool ID in liquidity function');
        return;
      }
      
      // Determine if this is adding or removing liquidity
      const isAddingLiquidity = functionName.includes('addLiquidity');
      const isRemovingLiquidity = functionName.includes('removeLiquidity');
      
      if (!isAddingLiquidity && !isRemovingLiquidity) return;
      
      // Get pool data
      const poolData = await this.client.getObject({
        id: poolId,
        options: { showContent: true }
      });
      
      if (!poolData.data?.content) return;
      
      // Extract token IDs from pool
      const fields = (poolData.data.content as any).fields as Record<string, unknown>;
      const coinTypeA = fields.coin_type_a as string;
      const coinTypeB = fields.coin_type_b as string;
      
      if (!coinTypeA || !coinTypeB) return;
      
      // Extract token IDs
      const tokenAId = coinTypeA.split('<')[1]?.split('>')[0];
      const tokenBId = coinTypeB.split('<')[1]?.split('>')[0];
      
      if (!tokenAId || !tokenBId) return;
      
      // Get current liquidity data
      const liquidityData = await this.liquidityAnalytics.analyzeLiquidityDepth({
        poolId,
        coin_a: tokenAId,
        coin_b: tokenBId,
        price: fields.price?.toString() || '0',
        liquidity: fields.liquidity?.toString() || '0',
        id: poolId,
        dex: 'unknown',
        poolCreated: Date.now()
      });
      
      // Get or initialize stability info
      let stabilityInfo = this.stabilityCache.get(poolId);
      if (!stabilityInfo) {
        stabilityInfo = {
          poolId,
          tokenId: tokenAId, // Track primary token
          stabilityScore: 100, // Start with perfect score
          volatilityIndex: 0,
          liquidityHistory: [],
          significantChanges: [],
          lastUpdated: Date.now()
        };
      }
      
      // Add current liquidity to history
      const currentLiquidity = liquidityData.totalLiquidity;
      stabilityInfo.liquidityHistory.push({
        timestamp: Date.now(),
        liquidity: currentLiquidity
      });
      
      // Keep history to a reasonable size
      if (stabilityInfo.liquidityHistory.length > 100) {
        stabilityInfo.liquidityHistory = stabilityInfo.liquidityHistory.slice(-100);
      }
      
      // Check for significant changes
      if (stabilityInfo.liquidityHistory.length > 1) {
        const previousLiquidity = stabilityInfo.liquidityHistory[stabilityInfo.liquidityHistory.length - 2].liquidity;
        const changePercent = ((currentLiquidity - previousLiquidity) / previousLiquidity) * 100;
        
        // If change is significant (more than 5%), record it
        if (Math.abs(changePercent) > 5) {
          stabilityInfo.significantChanges.push({
            timestamp: Date.now(),
            changePercent,
            isIncrease: changePercent > 0
          });
          
          // Keep significant changes to a reasonable size
          if (stabilityInfo.significantChanges.length > 50) {
            stabilityInfo.significantChanges = stabilityInfo.significantChanges.slice(-50);
          }
          
          // Update stability score based on changes
          // More changes = lower stability
          stabilityInfo.stabilityScore = Math.max(
            0,
            100 - (stabilityInfo.significantChanges.length * 2)
          );
          
          // Update volatility index
          // More recent and larger changes = higher volatility
          const recentChanges = stabilityInfo.significantChanges
            .filter(change => Date.now() - change.timestamp < 24 * 60 * 60 * 1000) // Last 24 hours
            .reduce((sum, change) => sum + Math.abs(change.changePercent), 0);
          
          stabilityInfo.volatilityIndex = Math.min(10, recentChanges / 50);
          
          console.log(`Significant liquidity change detected for pool ${poolId}: ${changePercent.toFixed(2)}%`);
        }
      }
      
      // Update cache
      stabilityInfo.lastUpdated = Date.now();
      this.stabilityCache.set(poolId, stabilityInfo);
    } catch (error) {
      console.error('Error checking for liquidity changes:', error);
    }
  }
  
  /**
   * Analyze token permissions and security features
   */
  async analyzePermissions(tokenId: string): Promise<PermissionAnalysis> {
    // Check cache first
    const cached = this.permissionCache.get(tokenId);
    if (cached && Date.now() - cached.lastUpdated < this.config.cacheTimeMs) {
      return cached;
    }
>>>>>>> 8fbe437abf0a7bf44331343c53be04c7f6d10d24
    
    // Subscribe to whale movement events
    this.ws.send(JSON.stringify({
      type: 'subscribe',
      event: 'whale_movements',
      filter: {
        threshold: this.config.whaleThresholdPercent
      }
    }));
  }
  
  /**
   * Process transaction events from WebSocket
   */
  private processTransactionEvent(event: TransactionEvent): void {
    // Implementation for processing transaction events
    // This would analyze transactions for suspicious patterns
  }
  
  /**
   * Process liquidity events from WebSocket
   */
  private processLiquidityEvent(event: any): void {
    // Implementation for processing liquidity events
    // This would track significant liquidity changes
  }
  
  /**
   * Process whale movement events from WebSocket
   */
  private processWhaleEvent(event: any): void {
    // Implementation for processing whale movement events
    // This would track large token movements
  }
}