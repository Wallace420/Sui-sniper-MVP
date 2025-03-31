/**
 * WebSocket Connection Manager
 * 
 * This module provides a robust WebSocket connection management system
 * for handling real-time data streams in the Sui Liquidity Sniper project.
 * It implements connection pooling, automatic reconnection, and efficient
 * message handling to optimize performance.
 */

import WebSocket from 'ws';
import { EventEmitter } from 'events';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { gzip, ungzip } from 'node-gzip';

// Configuration interface for the connection manager
export interface WebSocketConnectionConfig {
  maxConnections: number;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  pingInterval: number;
  rateLimit: number;
  rateLimitDuration: number;
  enableCompression?: boolean;
}

// Default configuration values
const DEFAULT_CONFIG: WebSocketConnectionConfig = {
  maxConnections: 5,
  reconnectInterval: 1000,
  maxReconnectAttempts: 10,
  pingInterval: 30000,
  rateLimit: 100,
  rateLimitDuration: 60,
  enableCompression: false
};

// Connection status enum
enum ConnectionStatus {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed'
}

// Connection interface
interface Connection {
  id: string;
  url: string;
  ws: WebSocket;
  status: ConnectionStatus;
  reconnectAttempts: number;
  lastActivity: number;
  subscriptions: Set<string>;
}

/**
 * WebSocket Connection Manager class
 * Handles multiple WebSocket connections with automatic reconnection,
 * connection pooling, and message handling.
 */
export class WebSocketConnectionManager extends EventEmitter {
  private connections: Map<string, Connection> = new Map();
  private config: WebSocketConnectionConfig;
  private rateLimiter: RateLimiterMemory;
  private pingIntervalId: NodeJS.Timeout | null = null;
  
  /**
   * Creates a new WebSocketConnectionManager instance
   * @param config Configuration options
   */
  constructor(config: Partial<WebSocketConnectionConfig> = {}) {
    super();
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    // Initialize rate limiter
    this.rateLimiter = new RateLimiterMemory({
      points: this.config.rateLimit,
      duration: this.config.rateLimitDuration
    });
    
    // Start ping interval
    this.startPingInterval();
  }
  
  /**
   * Creates a new WebSocket connection or returns an existing one
   * @param url WebSocket URL
   * @param protocols WebSocket protocols
   * @returns Connection ID
   */
  public connect(url: string, protocols?: string | string[]): string {
    // Ensure URL uses secure WebSocket protocol for production
    if (process.env.NODE_ENV === 'production' && url.startsWith('ws://')) {
      url = url.replace('ws://', 'wss://');
      console.warn('Insecure WebSocket URL detected. Upgraded to WSS for security.');
    }
    
    // Check if we already have a connection to this URL
    const existingConnection = this.findConnectionByUrl(url);
    if (existingConnection) {
      return existingConnection.id;
    }
    
    // Check if we've reached the maximum number of connections
    if (this.connections.size >= this.config.maxConnections) {
      // Find the least active connection to replace
      const leastActiveConnection = this.findLeastActiveConnection();
      if (leastActiveConnection) {
        this.disconnect(leastActiveConnection.id);
      }
    }
    
    // Create a new connection
    const id = this.generateConnectionId();
    const ws = new WebSocket(url, protocols);
    
    const connection: Connection = {
      id,
      url,
      ws,
      status: ConnectionStatus.CONNECTING,
      reconnectAttempts: 0,
      lastActivity: Date.now(),
      subscriptions: new Set()
    };
    
    this.connections.set(id, connection);
    
    // Set up event handlers
    this.setupEventHandlers(connection);
    
    return id;
  }
  
  /**
   * Disconnects a WebSocket connection
   * @param id Connection ID
   * @returns True if disconnected successfully
   */
  public disconnect(id: string): boolean {
    const connection = this.connections.get(id);
    if (!connection) {
      return false;
    }
    
    connection.ws.close();
    this.connections.delete(id);
    this.emit('disconnected', { id, url: connection.url });
    
    return true;
  }
  
  /**
   * Sends a message through a WebSocket connection
   * @param id Connection ID
   * @param data Message data
   * @returns True if sent successfully
   */
  public async send(id: string, data: string | Buffer): Promise<boolean> {
    const connection = this.connections.get(id);
    if (!connection || connection.status !== ConnectionStatus.CONNECTED) {
      return false;
    }
    
    try {
      // Apply rate limiting
      await this.rateLimiter.consume(id);
      
      // Compress data if enabled
      let dataToSend: string | Buffer = data;
      if (this.config.enableCompression && typeof data === 'string') {
        try {
          dataToSend = await gzip(data);
        } catch (compressionError) {
          console.error('Failed to compress message:', compressionError);
          // Fall back to uncompressed data
          dataToSend = data;
        }
      }
      
      connection.ws.send(dataToSend);
      connection.lastActivity = Date.now();
      return true;
    } catch (error) {
      if (error.name === 'RateLimiterRes') {
        this.emit('rateLimit', { id, url: connection.url });
      } else {
        this.emit('error', { id, url: connection.url, error });
      }
      return false;
    }
  }
  
  /**
   * Subscribes to a specific topic on a connection
   * @param id Connection ID
   * @param topic Topic to subscribe to
   * @param data Subscription data
   * @returns True if subscribed successfully
   */
  public async subscribe(id: string, topic: string, data?: any): Promise<boolean> {
    const connection = this.connections.get(id);
    if (!connection || connection.status !== ConnectionStatus.CONNECTED) {
      return false;
    }
    
    try {
      const subscriptionData = {
        method: 'subscribe',
        topic,
        ...data
      };
      
      const success = await this.send(id, JSON.stringify(subscriptionData));
      if (success) {
        connection.subscriptions.add(topic);
      }
      
      return success;
    } catch (error) {
      this.emit('error', { id, url: connection.url, error });
      return false;
    }
  }
  
  /**
   * Unsubscribes from a specific topic on a connection
   * @param id Connection ID
   * @param topic Topic to unsubscribe from
   * @param data Unsubscription data
   * @returns True if unsubscribed successfully
   */
  public async unsubscribe(id: string, topic: string, data?: any): Promise<boolean> {
    const connection = this.connections.get(id);
    if (!connection || connection.status !== ConnectionStatus.CONNECTED) {
      return false;
    }
    
    try {
      const unsubscriptionData = {
        method: 'unsubscribe',
        topic,
        ...data
      };
      
      const success = await this.send(id, JSON.stringify(unsubscriptionData));
      if (success) {
        connection.subscriptions.delete(topic);
      }
      
      return success;
    } catch (error) {
      this.emit('error', { id, url: connection.url, error });
      return false;
    }
  }
  
  /**
   * Gets the status of a connection
   * @param id Connection ID
   * @returns Connection status
   */
  public getStatus(id: string): ConnectionStatus | null {
    const connection = this.connections.get(id);
    return connection ? connection.status : null;
  }
  
  /**
   * Gets all active connections
   * @returns Array of connection IDs and their URLs
   */
  public getConnections(): Array<{ id: string, url: string, status: ConnectionStatus }> {
    return Array.from(this.connections.values()).map(({ id, url, status }) => ({ id, url, status }));
  }
  
  /**
   * Closes all connections and cleans up resources
   */
  public closeAll(): void {
    for (const connection of this.connections.values()) {
      connection.ws.close();
    }
    
    this.connections.clear();
    
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
      this.pingIntervalId = null;
    }
    
    this.emit('closed');
  }
  
  /**
   * Sets up event handlers for a WebSocket connection
   * @param connection Connection object
   */
  private setupEventHandlers(connection: Connection): void {
    const { ws, id, url } = connection;
    
    ws.on('open', () => {
      connection.status = ConnectionStatus.CONNECTED;
      connection.reconnectAttempts = 0;
      connection.lastActivity = Date.now();
      
      this.emit('connected', { id, url });
    });
    
    ws.on('message', async (data: WebSocket.Data) => {
      connection.lastActivity = Date.now();
      
      // Decompress data if needed
      let processedData = data;
      if (this.config.enableCompression && Buffer.isBuffer(data)) {
        try {
          const decompressed = await ungzip(data);
          processedData = decompressed.toString();
        } catch (decompressionError) {
          // If decompression fails, use the original data
          console.error('Failed to decompress message:', decompressionError);
        }
      }
      
      this.emit('message', { id, url, data: processedData });
    });
    
    ws.on('close', () => {
      connection.status = ConnectionStatus.DISCONNECTED;
      
      // Attempt to reconnect if not manually disconnected
      if (this.connections.has(id)) {
        this.attemptReconnect(connection);
      }
    });
    
    ws.on('error', (error) => {
      this.emit('error', { id, url, error });
      
      // WebSocket will also emit close after error
      connection.status = ConnectionStatus.DISCONNECTED;
    });
  }
  
  /**
   * Attempts to reconnect a disconnected WebSocket
   * @param connection Connection object
   */
  private attemptReconnect(connection: Connection): void {
    if (connection.reconnectAttempts >= this.config.maxReconnectAttempts) {
      connection.status = ConnectionStatus.FAILED;
      this.emit('reconnectFailed', { id: connection.id, url: connection.url });
      this.connections.delete(connection.id);
      return;
    }
    
    connection.status = ConnectionStatus.RECONNECTING;
    connection.reconnectAttempts++;
    
    this.emit('reconnecting', { 
      id: connection.id, 
      url: connection.url, 
      attempt: connection.reconnectAttempts, 
      maxAttempts: this.config.maxReconnectAttempts 
    });
    
    // Calculate delay with exponential backoff and jitter
    const baseDelay = this.config.reconnectInterval * Math.pow(1.5, connection.reconnectAttempts - 1);
    const jitter = Math.random() * 0.3 * baseDelay; // Add up to 30% jitter
    const delay = baseDelay + jitter;
    
    setTimeout(() => {
      if (!this.connections.has(connection.id)) {
        return; // Connection was manually closed during reconnect timeout
      }
      
      // Create a new WebSocket instance
      connection.ws = new WebSocket(connection.url);
      this.setupEventHandlers(connection);
    }, delay);
  }
  
  /**
   * Starts the ping interval to keep connections alive
   */
  private startPingInterval(): void {
    if (this.pingIntervalId) {
      clearInterval(this.pingIntervalId);
    }
    
    this.pingIntervalId = setInterval(() => {
      for (const connection of this.connections.values()) {
        if (connection.status === ConnectionStatus.CONNECTED) {
          // Send ping to keep connection alive
          if (connection.ws.readyState === WebSocket.OPEN) {
            connection.ws.ping();
          }
        }
      }
    }, this.config.pingInterval);
  }
  
  /**
   * Finds a connection by URL
   * @param url WebSocket URL
   * @returns Connection object or undefined
   */
  private findConnectionByUrl(url: string): Connection | undefined {
    for (const connection of this.connections.values()) {
      if (connection.url === url) {
        return connection;
      }
    }
    return undefined;
  }
  
  /**
   * Finds the least active connection
   * @returns Least active connection or undefined
   */
  private findLeastActiveConnection(): Connection | undefined {
    let leastActiveConnection: Connection | undefined;
    let oldestActivity = Infinity;
    
    for (const connection of this.connections.values()) {
      if (connection.lastActivity < oldestActivity) {
        oldestActivity = connection.lastActivity;
        leastActiveConnection = connection;
      }
    }
    
    return leastActiveConnection;
  }
  
  /**
   * Generates a unique connection ID
   * @returns Unique ID
   */
  private generateConnectionId(): string {
    return `ws-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}