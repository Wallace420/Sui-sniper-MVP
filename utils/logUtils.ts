import chalk from 'chalk';
import { Pool } from '../dex';

/**
 * Utility class for standardized logging across the application
 */
export class LogUtils {
    /**
     * Log an informational message
     * @param message The message to log
     * @param context Optional context information
     */
    static info(message: string, context?: any): void {
        console.log(chalk.blue(`[INFO] ${message}`));
        if (context) {
            console.log(chalk.gray(JSON.stringify(context, null, 2)));
        }
    }

    /**
     * Log a success message
     * @param message The message to log
     * @param context Optional context information
     */
    static success(message: string, context?: any): void {
        console.log(chalk.green(`[SUCCESS] ${message}`));
        if (context) {
            console.log(chalk.gray(JSON.stringify(context, null, 2)));
        }
    }

    /**
     * Log a warning message
     * @param message The message to log
     * @param context Optional context information
     */
    static warn(message: string, context?: any): void {
        console.log(chalk.yellow(`[WARNING] ${message}`));
        if (context) {
            console.log(chalk.gray(JSON.stringify(context, null, 2)));
        }
    }

    /**
     * Log an error message
     * @param message The error message
     * @param error The error object
     * @param context Optional context information
     */
    static error(message: string, error?: Error | unknown, context?: any): void {
        console.error(chalk.red(`[ERROR] ${message}`));
        if (error instanceof Error) {
            console.error(chalk.red(`${error.name}: ${error.message}`));
            if (error.stack) {
                console.error(chalk.gray(error.stack));
            }
        } else if (error) {
            console.error(chalk.red(String(error)));
        }
        if (context) {
            console.error(chalk.gray(JSON.stringify(context, null, 2)));
        }
    }

    /**
     * Log pool information
     * @param pool The pool to log
     * @param prefix Optional prefix for the log message
     */
    static logPool(pool: Pool, prefix: string = 'Pool'): void {
        console.log(chalk.cyan(`[${prefix}] ${pool.dex} - ${pool.coin_a}/${pool.coin_b}`));
        console.log(chalk.cyan(`  ID: ${pool.poolId}`));
        console.log(chalk.cyan(`  Liquidity: ${pool.liquidity}`));
        console.log(chalk.cyan(`  Created: ${new Date(pool.poolCreated).toLocaleString()}`));
    }

    /**
     * Log a debug message (only in development)
     * @param message The message to log
     * @param data Optional data to log
     */
    static debug(message: string, data?: any): void {
        if (process.env.NODE_ENV === 'development') {
            console.log(chalk.magenta(`[DEBUG] ${message}`));
            if (data) {
                console.log(chalk.gray(JSON.stringify(data, null, 2)));
            }
        }
    }
}