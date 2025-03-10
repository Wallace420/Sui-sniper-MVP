"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketWrapper = void 0;
var ws_1 = require("ws");
var DEFAULT_CLIENT_OPTIONS = {
    callTimeout: 30000,
    reconnectAttempts: 5,
    reconnectDelay: 5000,
    connectionTimeout: 10000,
    WebSocketConstructor: ws_1.default,
    reconnectTimeout: 30000,
    maxReconnects: 5
};
var WebSocketWrapper = /** @class */ (function () {
    function WebSocketWrapper(endpoint, options) {
        this.endpoint = endpoint;
        this.options = __assign(__assign({}, DEFAULT_CLIENT_OPTIONS), options);
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
        this.initializeWebSocket().catch(function (error) {
            console.error('Failed to initialize WebSocket:', error);
        });
    }
    WebSocketWrapper.prototype.initializeWebSocket = function () {
        return __awaiter(this, void 0, void 0, function () {
            var error_1;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (this.privateData.isConnecting)
                            return [2 /*return*/];
                        this.privateData.isConnecting = true;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        this.privateData.ws = new ws_1.default(this.endpoint);
                        this.setupEventHandlers();
                        return [4 /*yield*/, new Promise(function (resolve, reject) {
                                var timeout = setTimeout(function () {
                                    var _a;
                                    (_a = _this.privateData.ws) === null || _a === void 0 ? void 0 : _a.close();
                                    reject(new Error('WebSocket connection timeout'));
                                }, _this.CONNECTION_TIMEOUT);
                                _this.privateData.ws.once('open', function () {
                                    clearTimeout(timeout);
                                    console.log('WebSocket connection established');
                                    _this.privateData.reconnectAttempts = 0;
                                    _this.privateData.isConnecting = false;
                                    _this.resubscribeAll().catch(function (error) {
                                        console.error('Failed to resubscribe:', error);
                                    });
                                    resolve();
                                });
                                _this.privateData.ws.once('error', function (error) {
                                    clearTimeout(timeout);
                                    console.error('WebSocket connection error:', error);
                                    reject(error);
                                });
                            })];
                    case 2:
                        _a.sent();
                        return [3 /*break*/, 4];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Failed to initialize WebSocket:', error_1);
                        this.privateData.isConnecting = false;
                        this.handleReconnection();
                        throw error_1;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    WebSocketWrapper.prototype.resubscribeAll = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _i, _a, _b, method, subscription, error_2;
            return __generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        _i = 0, _a = this.privateData.subscriptions.entries();
                        _c.label = 1;
                    case 1:
                        if (!(_i < _a.length)) return [3 /*break*/, 6];
                        _b = _a[_i], method = _b[0], subscription = _b[1];
                        _c.label = 2;
                    case 2:
                        _c.trys.push([2, 4, , 5]);
                        return [4 /*yield*/, this.subscribe({
                                method: subscription.method,
                                params: subscription.params,
                                onMessage: subscription.onMessage,
                                unsubscribe: subscription.unsubscribe
                            })];
                    case 3:
                        _c.sent();
                        return [3 /*break*/, 5];
                    case 4:
                        error_2 = _c.sent();
                        console.error("Failed to resubscribe to ".concat(method, ":"), error_2);
                        return [3 /*break*/, 5];
                    case 5:
                        _i++;
                        return [3 /*break*/, 1];
                    case 6: return [2 /*return*/];
                }
            });
        });
    };
    WebSocketWrapper.prototype.handleReconnection = function () {
        var _this = this;
        if (this.privateData.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
            console.error('Max reconnection attempts reached');
            return;
        }
        this.privateData.reconnectAttempts++;
        console.log("Attempting to reconnect (".concat(this.privateData.reconnectAttempts, "/").concat(this.MAX_RECONNECT_ATTEMPTS, ")..."));
        setTimeout(function () {
            _this.initializeWebSocket().catch(function (error) {
                console.error('Reconnection failed:', error);
                _this.handleReconnection();
            });
        }, this.RECONNECT_DELAY);
    };
    WebSocketWrapper.prototype.setupEventHandlers = function () {
        var _this = this;
        if (!this.privateData.ws)
            return;
        this.privateData.ws.on('open', function (event) {
            _this.privateData.reconnectAttempts = 0;
            if (_this.onopen)
                _this.onopen(event);
        });
        this.privateData.ws.on('message', function (data) {
            if (_this.onmessage)
                _this.onmessage(data);
            _this.privateData.messageHandlers.forEach(function (handlers) {
                handlers.forEach(function (handler) { return handler(data); });
            });
        });
        this.privateData.ws.on('error', function (error) {
            if (_this.onerror)
                _this.onerror(error);
            console.error('WebSocket error:', error);
            _this.handleReconnection();
        });
        this.privateData.ws.on('close', function (code, reason) {
            if (_this.onclose)
                _this.onclose(code, reason.toString());
            _this.handleReconnection();
        });
        this.privateData.ws.on('unexpected-response', function (request, response) {
            console.error('Unexpected WebSocket response:', response.statusCode);
            _this.handleReconnection();
        });
    };
    WebSocketWrapper.prototype.makeRequest = function (method, params) {
        return __awaiter(this, void 0, void 0, function () {
            var request;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.privateData.ws) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initializeWebSocket()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.isConnected()) {
                            throw new Error('WebSocket is not connected');
                        }
                        request = {
                            jsonrpc: '2.0',
                            id: Date.now(),
                            method: method,
                            params: params
                        };
                        return [2 /*return*/, new Promise(function (resolve, reject) {
                                var _a;
                                var timeout = setTimeout(function () {
                                    var _a;
                                    (_a = _this.privateData.ws) === null || _a === void 0 ? void 0 : _a.removeListener('message', messageHandler);
                                    reject(new Error('Request timeout'));
                                }, _this.options.callTimeout);
                                var messageHandler = function (data) {
                                    var _a, _b;
                                    try {
                                        // Änderung: Konvertiere Buffer zu String
                                        var dataString = data instanceof Buffer ? data.toString('utf8') :
                                            typeof data === 'string' ? data :
                                                JSON.stringify(data);
                                        var response = JSON.parse(dataString);
                                        if (response.id === request.id) {
                                            clearTimeout(timeout);
                                            (_a = _this.privateData.ws) === null || _a === void 0 ? void 0 : _a.removeListener('message', messageHandler);
                                            if (response.error) {
                                                reject(new Error(response.error.message));
                                            }
                                            else {
                                                resolve(response.result);
                                            }
                                        }
                                    }
                                    catch (error) {
                                        clearTimeout(timeout);
                                        (_b = _this.privateData.ws) === null || _b === void 0 ? void 0 : _b.removeListener('message', messageHandler);
                                        reject(error);
                                    }
                                };
                                _this.privateData.ws.on('message', messageHandler);
                                try {
                                    _this.privateData.ws.send(JSON.stringify(request));
                                }
                                catch (error) {
                                    clearTimeout(timeout);
                                    (_a = _this.privateData.ws) === null || _a === void 0 ? void 0 : _a.removeListener('message', messageHandler);
                                    reject(error);
                                }
                            })];
                }
            });
        });
    };
    WebSocketWrapper.prototype.subscribe = function (input) {
        return __awaiter(this, void 0, void 0, function () {
            var method, params, onMessage, unsubscribe, request, messageHandler;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!!this.privateData.ws) return [3 /*break*/, 2];
                        return [4 /*yield*/, this.initializeWebSocket()];
                    case 1:
                        _a.sent();
                        _a.label = 2;
                    case 2:
                        if (!this.isConnected()) {
                            throw new Error('WebSocket is not connected');
                        }
                        method = input.method, params = input.params, onMessage = input.onMessage, unsubscribe = input.unsubscribe;
                        request = {
                            jsonrpc: '2.0',
                            id: Date.now(),
                            method: method,
                            params: params
                        };
                        this.privateData.subscriptions.set(method, input);
                        messageHandler = function (data) {
                            try {
                                // Änderung: Konvertiere Buffer zu String
                                var dataString = data instanceof Buffer ? data.toString('utf8') :
                                    typeof data === 'string' ? data :
                                        JSON.stringify(data);
                                var parsedData = JSON.parse(dataString);
                                if (parsedData.method === method) {
                                    onMessage(parsedData.params);
                                }
                            }
                            catch (error) {
                                console.error('Error processing subscription message:', error);
                            }
                        };
                        this.privateData.ws.on('message', messageHandler);
                        this.privateData.ws.send(JSON.stringify(request));
                        return [2 /*return*/, function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    if (this.privateData.ws) {
                                        this.privateData.ws.removeListener('message', messageHandler);
                                        this.privateData.subscriptions.delete(method);
                                        return [2 /*return*/, Promise.resolve()];
                                    }
                                    return [2 /*return*/, Promise.resolve()];
                                });
                            }); }];
                }
            });
        });
    };
    WebSocketWrapper.prototype.isConnected = function () {
        return this.privateData.ws !== null && this.privateData.ws.readyState === ws_1.default.OPEN;
    };
    WebSocketWrapper.prototype.reconnect = function () {
        if (this.privateData.ws) {
            this.privateData.ws.removeAllListeners();
            this.privateData.ws.close();
            this.privateData.ws = null;
        }
        this.privateData.messageHandlers.clear();
        this.initializeWebSocket();
    };
    WebSocketWrapper.prototype.close = function () {
        if (this.privateData.ws) {
            this.privateData.ws.removeAllListeners();
            this.privateData.ws.close();
            this.privateData.ws = null;
        }
        this.privateData.messageHandlers.clear();
        this.privateData.subscriptions.clear();
    };
    WebSocketWrapper.prototype.send = function (data) {
        if (!this.privateData.ws) {
            throw new Error('WebSocket not initialized');
        }
        this.privateData.ws.send(data);
    };
    return WebSocketWrapper;
}());
exports.WebSocketWrapper = WebSocketWrapper;
