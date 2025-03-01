import { WebsocketClient } from '@mysten/sui/dist/cjs/client/rpc-websocket-client';
import WebSocket from 'ws';

interface WebsocketClientOptions {
    callTimeout?: number;
    reconnectAttempts?: number;
    reconnectDelay?: number;
    connectionTimeout?: number;
    WebSocketConstructor?: any;
    reconnectTimeout?: number;
    maxReconnects?: number;
}

interface SubscriptionRequest<T> {
    method: string;
    params: any[];
    onMessage: (event: T) => void;
    unsubscribe: string;
}

const DEFAULT_CLIENT_OPTIONS: Required<WebsocketClientOptions> = {
    callTimeout: 30000,
    reconnectAttempts: 5,
    reconnectDelay: 5000,
    connectionTimeout: 10000,
    WebSocketConstructor: WebSocket,
    reconnectTimeout: 30000,
    maxReconnects: 5
};

export interface WebSocketEventHandlers {
    onopen?: (event: any) => void;
    onmessage?: (data: WebSocket.Data) => void;
    onerror?: (error: Error) => void;
    onclose?: (code: number, reason: string) => void;
}

export interface EnhancedWebsocketClient extends WebsocketClient, WebSocketEventHandlers {
    isConnected: () => boolean;
    reconnect: () => void;
    send: (data: string) => void;
    close: () => void;
}

export class WebSocketWrapper implements Omit<EnhancedWebsocketClient, '#private'> {
    private privateData: {
        ws: WebSocket | null;
        messageHandlers: Map<string, ((data: WebSocket.Data) => void)[]>;
        isConnecting: boolean;
        reconnectAttempts: number;
        subscriptions: Map<string, SubscriptionRequest<any>>;
    };
        
    endpoint: string;
    options: Required<WebsocketClientOptions>;
    onopen?: (event: any) => void;
    onmessage?: (data: WebSocket.Data) => void;
    onerror?: (error: Error) => void;
    onclose?: (code: number, reason: string) => void;

    private readonly MAX_RECONNECT_ATTEMPTS: number;
    private readonly RECONNECT_DELAY: number;
    private readonly CONNECTION_TIMEOUT: number;

    constructor(endpoint: string, options?: WebsocketClientOptions) {
        this.endpoint = endpoint;
        this.options = { ...DEFAULT_CLIENT_OPTIONS, ...options };
        this.MAX_RECONNECT_ATTEMPTS = this.options.reconnectAttempts;
        this.RECONNECT_DELAY = this.options.reconnectDelay;
        this.CONNECTION_TIMEOUT = this.options.connectionTimeout;
        
        // Änderung: Initialisiere privateData statt #private
        this.privateData = {
            ws: null,
            messageHandlers: new Map(),
            isConnecting: false,
            reconnectAttempts: 0,
            subscriptions: new Map()
        };
        
        this.initializeWebSocket().catch(error => {
            console.error('Failed to initialize WebSocket:', error);
        });
    }

    private async initializeWebSocket(): Promise<void> {
        if (this.privateData.isConnecting) return;
        this.privateData.isConnecting = true;

        try {
            this.privateData.ws = new WebSocket(this.endpoint);
            this.setupEventHandlers();

            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    this.privateData.ws?.close();
                    reject(new Error('WebSocket connection timeout'));
                }, this.CONNECTION_TIMEOUT);

                this.privateData.ws!.once('open', () => {
                    clearTimeout(timeout);
                    console.log('WebSocket connection established');
                    this.privateData.reconnectAttempts = 0;
                    this.privateData.isConnecting = false;
                    this.resubscribeAll().catch(error => {
                        console.error('Failed to resubscribe:', error);
                    });
                    resolve();
                });

                this.privateData.ws!.once('error', (error) => {
                    clearTimeout(timeout);
                    console.error('WebSocket connection error:', error);
                    reject(error);
                });
            });
        } catch (error) {
            console.error('Failed to initialize WebSocket:', error);
            this.privateData.isConnecting = false;
            this.handleReconnection();
            throw error;
        }
    }

    private async resubscribeAll(): Promise<void> {
        for (const [method, subscription] of this.privateData.subscriptions.entries()) {
            try {
                await this.subscribe({
                    method: subscription.method,
                    params: subscription.params,
                    onMessage: subscription.onMessage,
                    unsubscribe: subscription.unsubscribe
                });
            } catch (error) {
                console.error(`Failed to resubscribe to ${method}:`, error);
            }
        }
    }

    private handleReconnection(): void {
        if (this.privateData.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            console.error('Max reconnection attempts reached');
            return;
        }

        this.privateData.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.privateData.reconnectAttempts}/${this.MAX_RECONNECT_ATTEMPTS})...`);
        setTimeout(() => {
            this.initializeWebSocket().catch(error => {
                console.error('Reconnection failed:', error);
                this.handleReconnection();
            });
        }, this.RECONNECT_DELAY);
    }

    private setupEventHandlers(): void {
        if (!this.privateData.ws) return;

        this.privateData.ws.on('open', (event) => {
            this.privateData.reconnectAttempts = 0;
            if (this.onopen) this.onopen(event);
        });

        this.privateData.ws.on('message', (data) => {
            if (this.onmessage) this.onmessage(data);
            this.privateData.messageHandlers.forEach(handlers => {
                handlers.forEach(handler => handler(data));
            });
        });

        this.privateData.ws.on('error', (error) => {
            if (this.onerror) this.onerror(error);
            console.error('WebSocket error:', error);
            this.handleReconnection();
        });

        this.privateData.ws.on('close', (code, reason) => {
            if (this.onclose) this.onclose(code, reason.toString());
            this.handleReconnection();
        });

        this.privateData.ws.on('unexpected-response', (request, response) => {
            console.error('Unexpected WebSocket response:', response.statusCode);
            this.handleReconnection();
        });
    }

    async makeRequest<T>(method: string, params: any[]): Promise<T> {
        if (!this.privateData.ws) {
            await this.initializeWebSocket();
        }

        if (!this.isConnected()) {
            throw new Error('WebSocket is not connected');
        }

        const request = {
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params
        };

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.privateData.ws?.removeListener('message', messageHandler);
                reject(new Error('Request timeout'));
            }, this.options.callTimeout);

            const messageHandler = (data: WebSocket.Data) => {
                try {
                    // Änderung: Konvertiere Buffer zu String
                    const dataString = data instanceof Buffer ? data.toString('utf8') : 
                                      typeof data === 'string' ? data : 
                                      JSON.stringify(data);
                    
                    const response = JSON.parse(dataString);
                    if (response.id === request.id) {
                        clearTimeout(timeout);
                        this.privateData.ws?.removeListener('message', messageHandler);
                        if (response.error) {
                            reject(new Error(response.error.message));
                        } else {
                            resolve(response.result);
                        }
                    }
                } catch (error) {
                    clearTimeout(timeout);
                    this.privateData.ws?.removeListener('message', messageHandler);
                    reject(error);
                }
            };

            this.privateData.ws!.on('message', messageHandler);
            try {
                this.privateData.ws!.send(JSON.stringify(request));
            } catch (error) {
                clearTimeout(timeout);
                this.privateData.ws?.removeListener('message', messageHandler);
                reject(error);
            }
        });
    }

    async subscribe<T>(input: SubscriptionRequest<T>): Promise<() => Promise<unknown>> {
        if (!this.privateData.ws) {
            await this.initializeWebSocket();
        }

        if (!this.isConnected()) {
            throw new Error('WebSocket is not connected');
        }

        const { method, params, onMessage, unsubscribe } = input;
        const request = {
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params
        };

        this.privateData.subscriptions.set(method, input);

        const messageHandler = (data: WebSocket.Data) => {
            try {
                // Änderung: Konvertiere Buffer zu String
                const dataString = data instanceof Buffer ? data.toString('utf8') : 
                                  typeof data === 'string' ? data : 
                                  JSON.stringify(data);
                
                const parsedData = JSON.parse(dataString);
                if (parsedData.method === method) {
                    onMessage(parsedData.params);
                }
            } catch (error) {
                console.error('Error processing subscription message:', error);
            }
        };

        this.privateData.ws!.on('message', messageHandler);
        this.privateData.ws!.send(JSON.stringify(request));

        return async () => {
            if (this.privateData.ws) {
                this.privateData.ws.removeListener('message', messageHandler);
                this.privateData.subscriptions.delete(method);
                return Promise.resolve();
            }
            return Promise.resolve();
        };
    }

    isConnected(): boolean {
        return this.privateData.ws !== null && this.privateData.ws.readyState === WebSocket.OPEN;
    }

    reconnect(): void {
        if (this.privateData.ws) {
            this.privateData.ws.removeAllListeners();
            this.privateData.ws.close();
            this.privateData.ws = null;
        }
        this.privateData.messageHandlers.clear();
        this.initializeWebSocket();
    }

    close(): void {
        if (this.privateData.ws) {
            this.privateData.ws.removeAllListeners();
            this.privateData.ws.close();
            this.privateData.ws = null;
        }
        this.privateData.messageHandlers.clear();
        this.privateData.subscriptions.clear();
    }

    send(data: string): void {
        if (!this.privateData.ws) {
            throw new Error('WebSocket not initialized');
        }
        this.privateData.ws.send(data);
    }
}
