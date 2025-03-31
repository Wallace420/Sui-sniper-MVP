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
    }));
    
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