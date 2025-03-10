"use strict";
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
exports.populateMetadata = exports.populateLiquidity = exports.loadDexes = void 0;
exports.getLiquidity = getLiquidity;
var fs = require("fs");
var path = require("path");
var utils_1 = require("../utils");
var links_1 = require("../utils/links");
// Using the shared formatPoolDate function from utils/index.ts
// This removes duplication and centralizes the date formatting logic
var loadDexes = function (client) { return __awaiter(void 0, void 0, void 0, function () {
    var dexes, files, _i, files_1, file, modulePath, dexModule, dex, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                dexes = {};
                files = fs.readdirSync(__dirname);
                _i = 0, files_1 = files;
                _a.label = 1;
            case 1:
                if (!(_i < files_1.length)) return [3 /*break*/, 6];
                file = files_1[_i];
                if (!(file !== 'index.ts' && file.endsWith('.ts'))) return [3 /*break*/, 5];
                _a.label = 2;
            case 2:
                _a.trys.push([2, 4, , 5]);
                modulePath = path.join(__dirname, file);
                return [4 /*yield*/, Promise.resolve("".concat(modulePath)).then(function (s) { return require(s); })];
            case 3:
                dexModule = _a.sent();
                if (dexModule.default) {
                    dex = dexModule.default;
                    dex.Client = client;
                    dex.PoolIds = new Set(); // Reset pool IDs on load
                    dexes[dex.Name] = dex;
                    console.log("Loaded DEX: ".concat(dex.Name, " with event type: ").concat(dex.MoveEventType));
                }
                return [3 /*break*/, 5];
            case 4:
                error_1 = _a.sent();
                console.error("Error loading DEX from ".concat(file, ":"), error_1);
                return [3 /*break*/, 5];
            case 5:
                _i++;
                return [3 /*break*/, 1];
            case 6:
                if (Object.keys(dexes).length === 0) {
                    console.warn('No DEX modules were loaded successfully');
                }
                return [2 /*return*/, dexes];
        }
    });
}); };
exports.loadDexes = loadDexes;
function getLiquidity(client, poolId) {
    return __awaiter(this, void 0, void 0, function () {
        var ob, content, liq0, liquidity;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, client.getObject({ id: poolId, options: { showContent: true } })];
                case 1:
                    ob = _a.sent();
                    content = ob.data.content;
                    liq0 = content.fields.coin_b || content.fields.reserve_x;
                    liquidity = (0, utils_1.convertMYSTtoSUI)(liq0 * 2);
                    return [2 /*return*/, liquidity];
            }
        });
    });
}
var populateLiquidity = function (client, pools) { return __awaiter(void 0, void 0, void 0, function () {
    var _i, pools_1, pool, liquidity;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _i = 0, pools_1 = pools;
                _a.label = 1;
            case 1:
                if (!(_i < pools_1.length)) return [3 /*break*/, 4];
                pool = pools_1[_i];
                return [4 /*yield*/, getLiquidity(client, pool.poolId)];
            case 2:
                liquidity = _a.sent();
                pool.liquidity = liquidity;
                _a.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/, true];
        }
    });
}); };
exports.populateLiquidity = populateLiquidity;
var populateMetadata = function (client, pools) { return __awaiter(void 0, void 0, void 0, function () {
    var _i, pools_2, pool, metadata;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _i = 0, pools_2 = pools;
                _a.label = 1;
            case 1:
                if (!(_i < pools_2.length)) return [3 /*break*/, 4];
                pool = pools_2[_i];
                return [4 /*yield*/, client.getCoinMetadata({ coinType: pool.coin_a })];
            case 2:
                metadata = _a.sent();
                pool.metadata = metadata;
                pool.links = links_1.LinkManager.getTokenLinks(metadata, pool.poolId);
                _a.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [2 /*return*/, true];
        }
    });
}); };
exports.populateMetadata = populateMetadata;
