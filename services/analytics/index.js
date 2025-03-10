"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAnalytics = exports.SocialAnalytics = exports.LiquidityAnalytics = exports.TokenAnalytics = void 0;
var tokenAnalytics_1 = require("./tokenAnalytics");
Object.defineProperty(exports, "TokenAnalytics", { enumerable: true, get: function () { return tokenAnalytics_1.TokenAnalytics; } });
var liquidityAnalytics_1 = require("./liquidityAnalytics");
Object.defineProperty(exports, "LiquidityAnalytics", { enumerable: true, get: function () { return liquidityAnalytics_1.LiquidityAnalytics; } });
var socialAnalytics_1 = require("./socialAnalytics");
Object.defineProperty(exports, "SocialAnalytics", { enumerable: true, get: function () { return socialAnalytics_1.SocialAnalytics; } });
// Factory function to create analytics instances
var createAnalytics = function (client, socialApiConfig) {
    return {
        tokenAnalytics: new tokenAnalytics_1.TokenAnalytics(client),
        liquidityAnalytics: new liquidityAnalytics_1.LiquidityAnalytics(client),
        socialAnalytics: new socialAnalytics_1.SocialAnalytics(client, socialApiConfig || {})
    };
};
exports.createAnalytics = createAnalytics;
