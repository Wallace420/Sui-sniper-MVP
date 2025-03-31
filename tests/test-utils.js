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
exports.SuiClientMock = exports.mockDexes = exports.samplePool = exports.mockSuiClient = void 0;
exports.createMockPoolResponse = createMockPoolResponse;
exports.createPaginatedMock = createPaginatedMock;
exports.isSuiObjectResponse = isSuiObjectResponse;
exports.validatePoolResponse = validatePoolResponse;
var globals_1 = require("@jest/globals");
var crypto_1 = require("crypto");
// Mock SuiClient with proper type implementations
exports.mockSuiClient = {
    getObject: globals_1.jest.fn(),
    queryEvents: globals_1.jest.fn(),
    getTransactionBlock: globals_1.jest.fn(),
    getDynamicFields: globals_1.jest.fn(),
    getCoins: globals_1.jest.fn(),
};
// Sample pool for testing
exports.samplePool = {
    id: 'pool1',
    poolId: '0x1',
    coin_a: '0x2::sui::SUI',
    coin_b: '0x3::usdc::USDC',
    dex: 'Cetus',
    price: '1.0',
    liquidity: '1000000',
    poolCreated: Date.now()
};
// Mock dexes for testing
exports.mockDexes = {
    getDexByName: globals_1.jest.fn(),
    getAllDexes: globals_1.jest.fn().mockReturnValue([
        { Name: 'TestDex', PoolIds: new Set(['pool1', 'pool2']) }
    ])
};
/**
 * Creates a properly typed mock SuiObjectResponse for a pool
 */
function createMockPoolResponse(poolId) {
    if (poolId === void 0) { poolId = '0x1'; }
    return {
        objectId: poolId,
        version: '1',
        digest: 'mockDigest',
        data: {
            objectId: poolId, //objectId hinzufügen
            content: {
                dataType: 'moveObject',
                type: '0x2::amm::Pool',
                hasPublicTransfer: true,
                fields: {
                    coin_a: { id: 'tokenA' },
                    coin_b: { id: 'tokenB' },
                    reserve_a: '10000',
                    reserve_b: '20000'
                }
            },
            digest: 'mockDigest',
            version: '1'
        }
    };
}
/**
 * Creates a properly typed mock SuiPaginatedEvents
 */
function createPaginatedMock(data) {
    return {
        data: data.map(function (item, index) { return ({
            id: { txDigest: "tx".concat(index), eventSeq: index },
            timestampMs: String(Date.now() - index * 3600000),
            type: '0x3::amm::SwapEvent',
            packageId: '0x3',
            transactionModule: 'mock_module',
            parsedJson: {
                amount: (1000 + index * 100).toString()
            },
            sender: "0xsender".concat(index),
            bcs: '0x'
        }); }),
        hasNextPage: false,
        nextCursor: null
    };
}
/**
 * Creates a mock SuiClient with customizable behavior
 */
var SuiClientMock = /** @class */ (function () {
    function SuiClientMock() {
        this.objects = new Map();
        this.events = new Map();
    }
    SuiClientMock.prototype.registerObject = function (id, data) {
        this.objects.set(id, {
            data: {
                objectId: id,
                version: '1',
                digest: crypto_1.default.randomBytes(32).toString('hex'),
                content: {
                    dataType: 'moveObject',
                    type: '0x2::amm::Pool',
                    hasPublicTransfer: true,
                    fields: __assign({ coin_a: { id: 'tokenA' }, coin_b: { id: 'tokenB' }, reserve_a: '10000', reserve_b: '20000' }, data)
                }
            }
        });
    };
    SuiClientMock.prototype.getObject = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                return [2 /*return*/, (_a = this.objects.get(params.id)) !== null && _a !== void 0 ? _a : null];
            });
        });
    };
    SuiClientMock.prototype.registerEvents = function (query, events) {
        this.events.set(query, {
            data: events,
            hasNextPage: false,
            nextCursor: null
        });
    };
    SuiClientMock.prototype.queryEvents = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var key;
            var _a;
            return __generator(this, function (_b) {
                key = JSON.stringify(params);
                return [2 /*return*/, (_a = this.events.get(key)) !== null && _a !== void 0 ? _a : createPaginatedMock([])];
            });
        });
    };
    return SuiClientMock;
}());
exports.SuiClientMock = SuiClientMock;
/**
 * Helper function to validate if an object is a valid SuiObjectResponse
 */
function isSuiObjectResponse(obj) {
    var _a, _b;
    return ((_b = (_a = obj === null || obj === void 0 ? void 0 : obj.data) === null || _a === void 0 ? void 0 : _a.content) === null || _b === void 0 ? void 0 : _b.dataType) !== undefined;
}
/**
 * Helper function to validate if a pool response is valid
 */
function validatePoolResponse(response) {
    var _a, _b;
    if (!isSuiObjectResponse(response))
        return false;
    var content = (_a = response.data) === null || _a === void 0 ? void 0 : _a.content;
    if ((content === null || content === void 0 ? void 0 : content.dataType) !== 'moveObject')
        return false;
    if (!content.hasPublicTransfer)
        return false;
    if (!((_b = content.type) === null || _b === void 0 ? void 0 : _b.includes('::Pool')))
        return false;
    var fields = content.fields;
    if (!fields || typeof fields !== 'object')
        return false;
    // Check if fields has the required properties using type assertion
    var fieldsObj = fields;
    return 'coin_a' in fieldsObj && 'coin_b' in fieldsObj &&
        'reserve_a' in fieldsObj && 'reserve_b' in fieldsObj;
}
