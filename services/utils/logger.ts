const chalk = require('chalk');
import { Pool } from '../../dex';

export class Logger {
    static poolHeader(dexName: string) {
        console.log(
            chalk.blue.bold('\n===================================')
            + chalk.cyan.bold(`\nScanning ${dexName} for new pools...`)
            + chalk.blue.bold('\n===================================\n')
        );
    }

    static poolFound(pool: Pool) {
        console.log(
            chalk.green.bold('\n🌟 NEW POOL DETECTED 🌟')
            + '\n' + chalk.cyan('Pool ID: ') + chalk.yellow(pool.id)
            + '\n' + chalk.cyan('DEX: ') + chalk.yellow(pool.dex)
            + '\n' + chalk.cyan('Token A: ') + chalk.yellow(pool.coin_a)
            + '\n' + chalk.cyan('Token B: ') + chalk.yellow(pool.coin_b)
            + '\n' + chalk.cyan('Liquidity: ') + chalk.yellow(pool.liquidity)
            + '\n' + chalk.cyan('Created: ') + chalk.yellow(pool.formattedDate)
            + '\n' + chalk.green.bold('===================================\n')
        );
    }

    static poolProcessing(poolId: string, dexName: string) {
        console.log(chalk.cyan(`🔄 Processing pool ${chalk.yellow(poolId)} from ${chalk.yellow(dexName)}...`));
    }

    static poolValidated(poolId: string) {
        console.log(chalk.green(`✅ Pool ${chalk.yellow(poolId)} passed security validation`));
    }

    static poolValidationFailed(poolId: string, attempt: number, maxAttempts: number, reason?: string) {
        console.log(
            chalk.yellow(`⚠️ Pool ${chalk.cyan(poolId)} failed validation (Attempt ${attempt}/${maxAttempts})`)
            + (reason ? `\n   Reason: ${chalk.red(reason)}` : '')
        );
    }

    static error(message: string, error?: any) {
        console.error(
            chalk.red.bold('❌ ERROR: ') + chalk.red(message)
            + (error ? '\n' + chalk.red(error.message || error) : '')
        );
    }

    static warning(message: string) {
        console.warn(chalk.yellow('⚠️ WARNING: ') + message);
    }

    static info(message: string) {
        console.log(chalk.blue('ℹ️ INFO: ') + message);
    }

    static success(message: string) {
        console.log(chalk.green('✅ SUCCESS: ') + message);
    }

    static websocketStatus(status: string) {
        const icon = status === 'connected' ? '🟢' : status === 'disconnected' ? '🔴' : '🟡';
        console.log(`${icon} WebSocket ${chalk.cyan(status)}`);
    }

    static scanningStatus(dexName: string, eventCount: number) {
        if (eventCount === 0) {
            console.log(chalk.gray(`📡 No new events found for ${chalk.cyan(dexName)}`))
        } else {
            console.log(chalk.blue(`📡 Found ${chalk.yellow(eventCount.toString())} new events for ${chalk.cyan(dexName)}`))
        }
    }
}