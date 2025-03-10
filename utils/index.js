"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertMYSTtoSUI = convertMYSTtoSUI;
exports.formatUSDC = formatUSDC;
exports.getMinutesSinceEpoch = getMinutesSinceEpoch;
exports.formatPoolDate = formatPoolDate;
exports.sleep = sleep;
var decimal_js_1 = require("decimal.js");
/** Constant representing the number of MYST units in 1 SUI (10^9) */
var MYST_PER_SUI = new decimal_js_1.Decimal(10).pow(9);
/**
 * Converts MYST amount to SUI with proper decimal formatting
 * @param mystAmount - The amount in MYST to convert
 * @returns The equivalent amount in SUI as a formatted string with 9 decimal places
 */
function convertMYSTtoSUI(mystAmount) {
    return new decimal_js_1.Decimal(mystAmount).dividedBy(MYST_PER_SUI).toFixed(9);
}
/**
 * Formats a USDC amount by dividing by 10^6 and formatting to 2 decimal places
 * @param usdcAmount - The amount in USDC base units
 * @returns The formatted USDC amount as a string with 2 decimal places
 */
function formatUSDC(usdcAmount) {
    return new decimal_js_1.Decimal(usdcAmount).dividedBy(new decimal_js_1.Decimal(10).pow(6)).toFixed(2);
}
/**
 * Calculates the number of minutes elapsed since a given epoch timestamp
 * @param epochMillis - The epoch timestamp in milliseconds
 * @returns The number of minutes elapsed since the given timestamp
 */
function getMinutesSinceEpoch(epochMillis) {
    var currentMillis = Date.now();
    var differenceMillis = currentMillis - epochMillis;
    return Math.floor(differenceMillis / (1000 * 60));
}
/**
 * Formats a timestamp into a human-readable date string
 * @param timestamp - The timestamp in milliseconds
 * @returns A localized date string
 */
function formatPoolDate(timestamp) {
    var date = new Date(timestamp);
    return date.toLocaleString();
}
/**
 * Creates a promise that resolves after the specified delay
 * @param ms - The delay in milliseconds
 * @returns A promise that resolves after the specified delay
 */
function sleep(ms) {
    return new Promise(function (resolve) { return setTimeout(resolve, ms); });
}
// Performance optimization utilities (Phase 5)
__exportStar(require("./optimizationIndex"), exports);
