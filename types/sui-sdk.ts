/**
 * Centralized type definitions for Sui SDK interfaces
 * 
 * This file provides properly typed interfaces for Sui SDK to ensure
 * type compatibility across the project and eliminate the need for
 * unsafe type assertions.
 */

import { 
  SuiClient as OriginalSuiClient,
  SuiObjectResponse as OriginalSuiObjectResponse,
  PaginatedEvents as OriginalPaginatedEvents,
  SuiEvent as OriginalSuiEvent,
  PaginatedObjectsResponse as OriginalPaginatedObjectsResponse,
  SuiObjectData as OriginalSuiObjectData,
  SuiTransactionBlockResponse as OriginalSuiTransactionBlockResponse,
  PaginatedCoins as OriginalPaginatedCoins,
  TransactionEffects as OriginalTransactionEffects,
  SuiTransactionBlockKind as OriginalSuiTransactionBlockKind
} from '@mysten/sui/client';

// Re-export original types to ensure compatibility
export type SuiClient = OriginalSuiClient;
export type SuiEvent = OriginalSuiEvent;
export type PaginatedObjectsResponse = OriginalPaginatedObjectsResponse;
export type SuiObjectData = OriginalSuiObjectData;
export type SuiTransactionBlockResponse = OriginalSuiTransactionBlockResponse;
export type PaginatedCoins = OriginalPaginatedCoins;
export type SuiTransactionBlockKind = OriginalSuiTransactionBlockKind;

/**
 * Enhanced SuiObjectResponse interface with all required properties
 */
export interface SuiObjectResponse extends OriginalSuiObjectResponse {
  data?: {
    objectId: string;
    version: string;
    digest: string;
    content: {
      dataType: 'moveObject' | 'package';
      type: string;
      hasPublicTransfer: boolean;
      fields: Record<string, any>;
      bcs?: string;
      packageId?: string;
      moduleId?: string;
    };
    owner?: ExtendedObjectOwner;
    previousTransaction?: string;
    storageRebate?: string;
    display?: Record<string, string>;
    bcs?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
}

/**
 * Enhanced SuiPaginatedEvents interface with all required properties
 */
export interface SuiPaginatedEvents extends OriginalPaginatedEvents {
  data: Array<{
    id: {
      txDigest: string;
      eventSeq: number;
    };
    timestampMs: string;
    type: string;
    packageId: string;
    transactionModule: string;
    parsedJson: Record<string, any>;
    sender: string;
    bcs: string;
    bcsEncoding?: string;
  }>;
  hasNextPage: boolean;
  nextCursor: string | null;
}

/**
 * Enhanced TransactionEffects interface with additional properties
 */
export interface TransactionEffects extends OriginalTransactionEffects {
  type?: string;
  parsedJson?: {
    recipient: string;
    [key: string]: any;
  };
  status?: {
    status: 'success' | 'failure';
    error?: string;
  };
  executedEpoch?: string;
  gasUsed?: {
    computationCost: string;
    storageCost: string;
    storageRebate: string;
    nonRefundableStorageFee: string;
  };
  modifiedAtVersions?: Array<{
    objectId: string;
    version: string;
  }>;
}

/**
 * Interface for object ownership information
 */
export interface ExtendedObjectOwner {
  type?: 'Immutable' | 'Shared' | 'AddressOwner' | 'ObjectOwner';
  AddressOwner?: string;
  ObjectOwner?: string;
  Shared?: {
    initial_shared_version: string;
  };
}

/**
 * Interface for transaction input data
 */
export interface TransactionInput {
  type: string;
  value: unknown;
}

/**
 * Interface for token metadata
 */
export interface TokenMetadata {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  description?: string;
  iconUrl?: string;
  projectUrl?: string;
  totalSupply?: string;
  verified?: boolean;
}

/**
 * Interface for pool data
 */
export interface PoolData {
  poolId: string;
  tokenAId: string;
  tokenBId: string;
  reserveA: string;
  reserveB: string;
  fee: number;
  createdAt: number;
  lastUpdated: number;
}

/**
 * Interface for liquidity position
 */
export interface LiquidityPosition {
  positionId: string;
  poolId: string;
  owner: string;
  liquidityAmount: string;
  tokenAAmount: string;
  tokenBAmount: string;
  createdAt: number;
  lastUpdated: number;
}

/**
 * Interface for social metrics data
 */
export interface SocialMetricsData {
  tokenId: string;
  sentiment: number; // -1 to 1 scale
  mentions: number;
  followers: number;
  engagementRate: number;
  communityGrowth: number;
  lastUpdated: number;
  platforms?: Array<{
    name: string;
    followers: number;
    engagement: number;
    sentiment: number;
  }>;
  sentimentTrend?: Array<{
    timestamp: number;
    sentiment: number;
    source: string;
  }>;
  mentionsTrend?: Array<{
    timestamp: number;
    count: number;
    source: string;
  }>;
}

/**
 * Interface for risk metrics data
 */
export interface RiskMetricsData {
  tokenId: string;
  securityScore: number; // 0-100 scale
  liquidityScore: number; // 0-100 scale
  volatilityScore: number; // 0-100 scale
  concentrationRisk: number; // 0-100 scale
  overallRisk: number; // 0-100 scale
  lastUpdated: number;
  auditInfo?: {
    isAudited: boolean;
    auditProvider?: string;
    auditDate?: number;
    auditScore?: number;
    auditUrl?: string;
  };
  ownershipInfo?: {
    creator: string;
    isRenounced: boolean;
    hasMultiSig: boolean;
    adminCount: number;
    permissionRisk: number;
  };
  liquidityInfo?: {
    isLocked: boolean;
    lockDuration?: number;
    lockExpiry?: number;
    lockedPercentage: number;
    stabilityScore: number;
  };
  tradingPatterns?: {
    washTradingScore: number;
    manipulationScore: number;
    whaleConcentration: number;
    abnormalPatterns: boolean;
  };
}