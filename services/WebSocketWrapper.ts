import { SuiClient } from '@mysten/sui/client';
import WebSocket from 'ws';

export interface WebsocketClient {
    makeRequest<T>(method: string, params: any[]): Promise<T>;
    subscribe<T>(method: string, params: any[], onMessage: (event: T) => void): Promise<(() => void)>;
    send(data: string): void;
    close(): void;
    onopen: ((event: any) => void) | null;
    onmessage: ((data: WebSocket.Data) => void) | null;
    onerror: ((error: Error) => void) | null;
    onclose: ((code: number, reason: string) => void) | null;
}

export class WebSocketWrapper implements WebsocketClient {
    private ws: WebSocket | null = null;
    private endpoint: string;
    public onopen: ((event: any) => void) | null = null;
    public onmessage: ((data: WebSocket.Data) => void) | null = null;
    public onerror: ((error: Error) => void) | null = null;
    public onclose: ((code: number, reason: string) => void) | null = null;

    constructor(endpoint: string) {
        this.endpoint = endpoint;
        this.ws = new WebSocket(endpoint);
        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        const ws = this.ws;
        if (!ws) return;

        ws.on('open', (event) => {
            if (this.onopen) this.onopen(event);
        });

        ws.on('message', (data) => {
            if (this.onmessage) this.onmessage(data);
        });

        ws.on('error', (error) => {
            if (this.onerror) this.onerror(error);
        });

        ws.on('close', (code, reason) => {
            if (this.onclose) {
                // Wenn "reason" ein Buffer ist, in einen String konvertieren
                const reasonStr = typeof reason === 'string' ? reason : reason.toString('utf8');
                this.onclose(code, reasonStr);
            }
        });
    }

    async makeRequest<T>(method: string, params: any[]): Promise<T> {
        const ws = this.ws;
        if (!ws) throw new Error('WebSocket not initialized');
        
        const request = {
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params
        };

        ws.send(JSON.stringify(request));
        
        return new Promise<T>((resolve, reject) => {
            const handler = (data: WebSocket.Data) => {
                try {
                    let dataString: string;
                    
                    if (Buffer.isBuffer(data)) {
                        dataString = data.toString('utf8');
                    } else if (typeof data === 'string') {
                        dataString = data;
                    } else {
                        dataString = JSON.stringify(data);
                    }
                    
                    const parsedData = JSON.parse(dataString);
                    if (parsedData.method === method) {
                        resolve(parsedData.params);
                        // Entfernt den Event-Handler, um Mehrfachaufrufe zu vermeiden
                        ws.removeListener('message', handler);
                    }
                } catch (error) {
                    console.error('Error processing response message:', error);
                    reject(error);
                }
            };

            ws.on('message', handler);
        });
    }

    async subscribe<T>(method: string, params: any[], onMessage: (event: T) => void): Promise<(() => void)> {
        const ws = this.ws;
        if (!ws) throw new Error('WebSocket not initialized');

        const request = {
            jsonrpc: '2.0',
            id: Date.now(),
            method,
            params
        };

        ws.send(JSON.stringify(request));

        const handler = (data: WebSocket.Data) => {
            try {
                let dataString: string;
                if (Buffer.isBuffer(data)) {
                    dataString = data.toString('utf8');
                } else if (typeof data === 'string') {
                    dataString = data;
                } else {
                    dataString = JSON.stringify(data);
                }
                
                const parsedData = JSON.parse(dataString);
                if (parsedData.method === method) {
                    onMessage(parsedData.params);
                }
            } catch (error) {
                console.error('Error processing subscription message:', error);
            }
        };

        ws.on('message', handler);

        return () => {
            ws.removeListener('message', handler);
        };
    }

    send(data: string): void {
        const ws = this.ws;
        if (!ws) throw new Error('WebSocket not initialized');
        ws.send(data);
    }

    close(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}
