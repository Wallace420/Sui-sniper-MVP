/**
 * Enhanced WebSocket Wrapper with Connection Pooling, Reconnection Logic, and Error Handling
 * 
 * This implementation addresses the requirements in Phase 5 of the debugging plan:
 * - Connection pooling
 * - Reconnection logic
 * - Proper error handling
 * - Message batching
 * - Compression
 * - Connection performance monitoring
 */

import WebSocket from 'ws';
import { WebsocketClient } from '@mysten/sui/dist/cjs/client/rpc-websocket-client';
import { v4 as uuidv4 } from 'uuid';
import * as Sentry from '@sentry/node';
import { performance } from 'perf_hooks';
import { gzip, ungzip } from 'node-gzip';

// Configuration interface for the WebSocket wrapper
export interface WebSocketConfig {
  endpoint: string;
  maxConnections?: number;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
  connectionTimeout?: number;
  callTimeout?: number;
  enableCompression?: boolean;
  batchInterval?: number;
  maxBatchSize?: number;
  monitoringInterval?: number;
  enableSentry?: boolean;
}

// Event handlers interface
export interface WebSocketEventHandlers {
  onopen?: (event: any) => void;
  onmessage?: (data: WebSocket.Data) => void;
  onerror?: (error: Error) => void;
  onclose?: (code: number, reason: string) => void;
}

// Subscription request interface
interface SubscriptionRequest<T> {
  id: string;
  method: string;
  params: any[];
  onMessage: (event: T) => void;
  unsubscribe: string;
}

// Message to be sent
interface PendingMessage {
  id: string;
  data: string;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (reason: any) => void;
}

// Connection statistics for monitoring
interface ConnectionStats {
  id: string;
  messagesReceived: number;
  messagesSent: number;
  errors: number;
  reconnects: number;
  latency: number[];
  lastActivity: number;
  createdAt: number;
}

// Default configuration
const DEFAULT_CONFIG: Required<WebSocketConfig> = {
  endpoint: '',
  maxConnections: 5,
  maxReconnectAttempts: 10,
  reconnectDelay: 3000,
  connectionTimeout: 10000,
  callTimeout: 30000,
  enableCompression: true,
  batchInterval: 50, // ms
  maxBatchSize: 100, // messages
  monitoringInterval: 60000, // 1 minute
  enableSentry: true
};

/**
 * Enhanced WebSocket Wrapper with connection pooling, reconnection logic, and error handling
 */
export class EnhancedWebSocketWrapper implements WebsocketClient, WebSocketEventHandlers {
  private config: Required<WebSocketConfig>;
  private connections: Map<string, WebSocket> = new Map();
  private connectionStats: Map<string, ConnectionStats> = new Map();
  private subscriptions: Map<string, SubscriptionRequest<any>> = new Map();
  private pendingMessages: PendingMessage[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private monitoringTimer: NodeJS.Timeout | null = null;
  private isInitialized: boolean = false;
  
  // Event handlers
  public onopen?: (event: any) => void;
  public onmessage?: (data: WebSocket.Data) => void;
  public onerror?: (error: Error) => void;
  public onclose?: (code: number, reason: string) => void;

  /**
   * Constructor
   * @param config WebSocket configuration
   */
  constructor(config: WebSocketConfig) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize Sentry if enabled
    if (this.config.enableSentry && Sentry) {
      Sentry.init({ dsn: process.env.SENTRY_DSN });
    }
    
    this.initialize();
  }

  /**
   * Initialize the WebSocket pool and monitoring
   */
  private initialize(): void {
    if (this.isInitialized) return;
    
    // Initialize connection pool
    this.initializeConnectionPool();
    
    // Start message batching
    this.startMessageBatching();
    
    // Start connection monitoring
    this.startConnectionMonitoring();
    
    this.isInitialized = true;
  }

  /**
   * Initialize the connection pool with the configured number of connections
   */
  private initializeConnectionPool(): void {
    for (let i = 0; i < this.config.maxConnections; i++) {
      this.createConnection();
    }
  }

  /**
   * Create a new WebSocket connection
   * @returns Promise that resolves when the connection is established
   */
  private async createConnection(): Promise<string> {
    const connectionId = uuidv4();
    const ws = new WebSocket(this.config.endpoint);
    
    // Initialize connection statistics
    this.connectionStats.set(connectionId, {
      id: connectionId,
      messagesReceived: 0,
      messagesSent: 0,
      errors: 0,
      reconnects: 0,
      latency: [],
      lastActivity: Date.now(),
      createdAt: Date.now()
    });
    
    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.close();
        reject(new Error('WebSocket connection timeout'));
      }, this.config.connectionTimeout);
      
      ws.on('open', () => {
        clearTimeout(timeout);
        this.connections.set(connectionId, ws);
        this.setupEventHandlers(ws, connectionId);
        console.log(`WebSocket connection established: ${connectionId}`);
        resolve(connectionId);
      });
      
      ws.on('error', (error) => {
        clearTimeout(timeout);
        this.handleError(error, connectionId);
        reject(error);
      });
    });
  }

  /**
   * Set up event handlers for a WebSocket connection
   * @param ws WebSocket connection
   * @param connectionId Connection ID
   */
  private setupEventHandlers(ws: WebSocket, connectionId: string): void {
    ws.on('message', (data) => {
      this.handleMessage(data, connectionId);
    });
    
    ws.on('error', (error) => {
      this.handleError(error, connectionId);
    });
    
    ws.on('close', (code, reason) => {
      this.handleClose(code, reason, connectionId);
    });
  }

  /**
   * Handle incoming WebSocket messages
   * @param data Message data
   * @param connectionId Connection ID
   */
  private async handleMessage(data: WebSocket.Data, connectionId: string): Promise<void> {
    try {
      // Update connection statistics
      const stats = this.connectionStats.get(connectionId);
      if (stats) {
        stats.messagesReceived++;
        stats.lastActivity = Date.now();
      }
      
      // Call the onmessage handler if defined
      if (this.onmessage) {
        this.onmessage(data);
      }
      
      // Process the message
      let message: any;
      
      if (this.config.enableCompression && typeof data === 'object' && Buffer.isBuffer(data)) {
        // Decompress the message if compression is enabled
        const decompressed = await ungzip(data);
        message = JSON.parse(decompressed.toString());
      } else if (typeof data === 'string') {
        message = JSON.parse(data);
      } else {
        message = data;
      }
      
      // Handle subscription messages
      if (message.method === 'subscription') {
        const subscription = Array.from(this.subscriptions.values()).find(
          (sub) => sub.method === message.params.subscription
        );
        
        if (subscription) {
          subscription.onMessage(message.params.result);
        }
      }
    } catch (error) {
      this.handleError(error as Error, connectionId);
    }
  }

  /**
   * Handle WebSocket errors
   * @param error Error object
   * @param connectionId Connection ID
   */
  private handleError(error: Error, connectionId: string): void {
    // Update connection statistics
    const stats = this.connectionStats.get(connectionId);
    if (stats) {
      stats.errors++;
    }
    
    // Log the error
    console.error(`WebSocket error on connection ${connectionId}:`, error);
    
    // Report to Sentry if enabled
    if (this.config.enableSentry && Sentry) {
      Sentry.captureException(error);
    }
    
    // Call the onerror handler if defined
    if (this.onerror) {
      this.onerror(error);
    }
  }

  /**
   * Handle WebSocket connection close
   * @param code Close code
   * @param reason Close reason
   * @param connectionId Connection ID
   */
  private handleClose(code: number, reason: string, connectionId: string): void {
    console.log(`WebSocket connection closed: ${connectionId}, code: ${code}, reason: ${reason}`);
    
    // Remove the connection from the pool
    this.connections.delete(connectionId);
    
    // Call the onclose handler if defined
    if (this.onclose) {
      this.onclose(code, reason);
    }
    
    // Attempt to reconnect if not a normal closure
    if (code !== 1000) {
      this.handleReconnection(connectionId);
    } else {
      // Create a new connection to maintain the pool size
      this.createConnection().catch(error => {
        console.error('Failed to create new connection:', error);
      });
    }
  }

  /**
   * Handle reconnection logic
   * @param connectionId Connection ID
   */
  private handleReconnection(connectionId: string): void {
    const stats = this.connectionStats.get(connectionId);
    
    if (stats && stats.reconnects < this.config.maxReconnectAttempts) {
      stats.reconnects++;
      
      console.log(`Attempting to reconnect (${stats.reconnects}/${this.config.maxReconnectAttempts})...`);
      
      // Exponential backoff for reconnection
      const delay = this.config.reconnectDelay * Math.pow(1.5, stats.reconnects - 1);
      
      setTimeout(() => {
        this.createConnection().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      
      // Create a new connection with a new ID to maintain the pool size
      this.createConnection().catch(error => {
        console.error('Failed to create new connection:', error);
      });
    }
  }

  /**
   * Start message batching
   */
  private startMessageBatching(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    
    this.batchTimer = setInterval(() => {
      this.processPendingMessages();
    }, this.config.batchInterval);
  }

  /**
   * Process pending messages in batches
   */
  private async processPendingMessages(): Promise<void> {
    if (this.pendingMessages.length === 0) return;
    
    // Get a batch of messages
    const batch = this.pendingMessages.splice(0, this.config.maxBatchSize);
    
    // Get an available connection
    const connectionId = this.getLeastBusyConnection();
    if (!connectionId) {
      // Put messages back in the queue if no connection is available
      this.pendingMessages.unshift(...batch);
      return;
    }
    
    const connection = this.connections.get(connectionId);
    if (!connection || connection.readyState !== WebSocket.OPEN) {
      // Put messages back in the queue if the connection is not open
      this.pendingMessages.unshift(...batch);
      return;
    }
    
    try {
      // Prepare the batch data
      let batchData: string;
      
      if (batch.length === 1) {
        // Single message, no need for batching
        batchData = batch[0].data;
      } else {
        // Multiple messages, create a batch
        batchData = JSON.stringify(batch.map(msg => JSON.parse(msg.data)));
      }
      
      // Compress the data if enabled
      let dataToSend: string | Buffer = batchData;
      if (this.config.enableCompression) {
        dataToSend = await gzip(batchData);
      }
      
      // Measure latency
      const startTime = performance.now();
      
      // Send the data
      connection.send(dataToSend);
      
      // Update connection statistics
      const stats = this.connectionStats.get(connectionId);
      if (stats) {
        stats.messagesSent += batch.length;
        stats.lastActivity = Date.now();
        stats.latency.push(performance.now() - startTime);
        
        // Keep only the last 100 latency measurements
        if (stats.latency.length > 100) {
          stats.latency.shift();
        }
      }
      
      // Resolve all promises
      batch.forEach(msg => {
        msg.resolve({ success: true });
      });
    } catch (error) {
      // Handle error
      this.handleError(error as Error, connectionId);
      
      // Reject all promises
      batch.forEach(msg => {
        msg.reject(error);
      });
    }
  }

  /**
   * Get the least busy connection
   * @returns Connection ID of the least busy connection
   */
  private getLeastBusyConnection(): string | undefined {
    let leastBusyId: string | undefined;
    let lowestActivity = Infinity;
    
    for (const [id, connection] of this.connections.entries()) {
      if (connection.readyState === WebSocket.OPEN) {
        const stats = this.connectionStats.get(id);
        if (stats) {
          const activity = stats.messagesSent + stats.messagesReceived;
          if (activity < lowestActivity) {
            lowestActivity = activity;
            leastBusyId = id;
          }
        }
      }
    }
    
    return leastBusyId;
  }

  /**
   * Start connection monitoring
   */
  private startConnectionMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
    }
    
    this.monitoringTimer = setInterval(() => {
      this.monitorConnections();
    }, this.config.monitoringInterval);
  }

  /**
   * Monitor connections and log statistics
   */
  private monitorConnections(): void {
    console.log(`WebSocket connection pool status: ${this.connections.size}/${this.config.maxConnections} connections`);
    
    for (const [id, stats] of this.connectionStats.entries()) {
      const connection = this.connections.get(id);
      const state = connection ? ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][connection.readyState] : 'DISCONNECTED';
      const avgLatency = stats.latency.length > 0 ? stats.latency.reduce((a, b) => a + b, 0) / stats.latency.length : 0;
      
      console.log(`Connection ${id}: ${state}, Messages: ${stats.messagesSent}/${stats.messagesReceived}, Errors: ${stats.errors}, Reconnects: ${stats.reconnects}, Avg Latency: ${avgLatency.toFixed(2)}ms`);
      
      // Recreate connection if it's closed or has too many errors
      if (!connection || connection.readyState === WebSocket.CLOSED) {
        this.connections.delete(id);
        this.createConnection().catch(error => {
          console.error('Failed to create new connection:', error);
        });
      }
    }
  }

  /**
   * Subscribe to a WebSocket event
   * @param request Subscription request
   * @returns Promise that resolves when the subscription is successful
   */
  async subscribe<T>(request: { method: string; params: any[]; onMessage: (event: T) => void; unsubscribe: string }): Promise<string> {
    const id = uuidv4();
    const subscriptionRequest: SubscriptionRequest<T> = {
      id,
      ...request
    };
    
    // Store the subscription
    this.subscriptions.set(id, subscriptionRequest);
    
    // Create the subscription message
    const message = JSON.stringify({
      jsonrpc: '2.0',
      id,
      method: request.method,
      params: request.params
    });
    
    // Send the message
    await this.send(message);
    
    return id;
  }

  /**
   * Unsubscribe from a WebSocket event
   * @param id Subscription ID
   * @returns Promise that resolves when the unsubscription is successful
   */
  async unsubscribe(id: string): Promise<void> {
    const subscription = this.subscriptions.get(id);
    if (!subscription) {
      throw new Error(`Subscription with ID ${id} not found`);
    }
    
    // Create the unsubscription message
    const message = JSON.stringify({
      jsonrpc: '2.0',
      id: uuidv4(),
      method: subscription.unsubscribe,
      params: [id]
    });
    
    // Send the message
    await this.send(message);
    
    // Remove the subscription
    this.subscriptions.delete(id);
  }

  /**
   * Send a message over WebSocket
   * @param data Message data
   * @returns Promise that resolves when the message is sent
   */
  async send(data: string): Promise<any> {
    return new Promise((resolve, reject) => {
      // Create a pending message
      const message: PendingMessage = {
        id: uuidv4(),
        data,
        timestamp: Date.now(),
        resolve,
        reject
      };
      
      // Add the message to the queue
      this.pendingMessages.push(message);
      
      // Set a timeout for the message
      setTimeout(() => {
        const index = this.pendingMessages.findIndex(msg => msg.id === message.id);
        if (index !== -1) {
          // Remove the message from the queue
          this.pendingMessages.splice(index, 1);
          reject(new Error('Message send timeout'));
        }
      }, this.config.callTimeout);
    });
  }

  /**
   * Close all WebSocket connections
   */
  close(): void {
    // Clear timers
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    // Close all connections
    for (const [id, connection] of this.connections.entries()) {
      connection.close();
    }
    
    // Clear maps
    this.connections.clear();
    this.connectionStats.clear();
    this.subscriptions.clear();
    
    // Reject all pending messages
    this.pendingMessages.forEach(msg => {
      msg.reject(new Error('WebSocket connections closed'));
    });
    this.pendingMessages = [];
    
    this.isInitialized = false;
  }

  /**
   * Check if any connection is open
   * @returns True if at least one connection is open
   */
  isConnected(): boolean {
    for (const connection of this.connections.values()) {
      if (connection.readyState === WebSocket.OPEN) {
        return true;
      }
    }
    return false;
  }
}