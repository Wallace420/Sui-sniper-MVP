import { Decimal } from 'decimal.js';
import { LogUtils } from './logUtils';
import { DatabaseUtils } from './dbUtils';
import { CacheUtils, CacheStore, CacheOptions } from './cacheUtils';

/** Constant representing the number of MYST units in 1 SUI (10^9) */
const MYST_PER_SUI = new Decimal(10).pow(9);

/**
 * Converts MYST amount to SUI with proper decimal formatting
 * @param mystAmount - The amount in MYST to convert
 * @returns The equivalent amount in SUI as a formatted string with 9 decimal places
 */
export function convertMYSTtoSUI(mystAmount: Decimal.Value): string {
	return new Decimal(mystAmount).dividedBy(MYST_PER_SUI).toFixed(9);
}

/**
 * Formats a USDC amount by dividing by 10^6 and formatting to 2 decimal places
 * @param usdcAmount - The amount in USDC base units
 * @returns The formatted USDC amount as a string with 2 decimal places
 */
export function formatUSDC(usdcAmount: Decimal.Value): string {
	return new Decimal(usdcAmount).dividedBy(new Decimal(10).pow(6)).toFixed(2);
}

/**
 * Calculates the number of minutes elapsed since a given epoch timestamp
 * @param epochMillis - The epoch timestamp in milliseconds
 * @returns The number of minutes elapsed since the given timestamp
 */
export function getMinutesSinceEpoch(epochMillis: number): number {
	const currentMillis = Date.now();
	const differenceMillis = currentMillis - epochMillis;
	return Math.floor(differenceMillis / (1000 * 60));
}

/**
 * Formats a timestamp into a human-readable date string
 * @param timestamp - The timestamp in milliseconds
 * @returns A localized date string
 */
export function formatPoolDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString();
}

/**
 * Creates a promise that resolves after the specified delay
 * @param ms - The delay in milliseconds
 * @returns A promise that resolves after the specified delay
 */
export function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}