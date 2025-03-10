# Sui Liquidity Sniper User Guide

This guide provides comprehensive instructions for using the Sui Liquidity Sniper tool effectively.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Basic Usage](#basic-usage)
3. [Advanced Features](#advanced-features)
4. [Configuration Options](#configuration-options)
5. [Troubleshooting](#troubleshooting)

## Getting Started

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/sui-liquidity-sniper.git

# Navigate to the project directory
cd sui-liquidity-sniper

# Install dependencies
npm install
```

### Initial Setup

1. Configure your Sui wallet by creating a `.env` file with your wallet details:

```
WALLET_MNEMONIC=your mnemonic phrase here
RPC_URL=https://sui-mainnet-rpc.example.com
```

2. Build the project:

```bash
npm run build
```

## Basic Usage

### Scanning for New Pools

To scan for new liquidity pools:

```bash
npm start -- scan
```

This will start scanning for new liquidity pools based on your default configuration.

### Analyzing a Specific Pool

To analyze a specific pool by its address:

```bash
npm start -- analyze 0x1234567890abcdef1234567890abcdef
```

### Setting Up Alerts

To set up alerts for new pools that match specific criteria:

```bash
npm start -- alerts --min-liquidity 1000 --token-type SUI
```

## Advanced Features

### Custom Filtering

You can create custom filters to focus on specific types of pools:

```typescript
// Example custom filter
import { Pool } from './types';

export function myCustomFilter(pool: Pool): boolean {
  // Your custom logic here
  const minLiquidity = 5000; // SUI
  return pool.liquidityValue >= minLiquidity;
}
```

Then apply your filter when scanning:

```bash
npm start -- scan --filter myCustomFilter
```

### Risk Analysis

To perform a comprehensive risk analysis on a token:

```bash
npm start -- risk 0x1234567890abcdef1234567890abcdef
```

This will provide a detailed security report including:
- Contract audit status
- Ownership analysis
- Permission checks
- Liquidity lock status

### Automated Trading

To set up automated trading based on specific criteria:

```bash
npm start -- trade --strategy default --max-slippage 1.5
```

## Configuration Options

### Global Configuration

Edit the `config.json` file to customize global settings:

```json
{
  "scanInterval": 5000,
  "maxPoolsToTrack": 100,
  "defaultSlippage": 1.0,
  "gasSettings": {
    "priorityFee": 1000,
    "maxGasPrice": 10000
  },
  "filters": [
    "minLiquidity",
    "tokenSecurity"
  ]
}
```

### Trading Strategies

Create custom trading strategies in the `strategies` directory:

```typescript
// strategies/myStrategy.ts
import { Pool, TradeDecision } from '../types';

export function evaluatePool(pool: Pool): TradeDecision {
  // Your strategy logic here
  return {
    action: 'BUY',
    amount: 1.5, // SUI
    reason: 'Strong liquidity growth detected'
  };
}
```

## Troubleshooting

### Common Issues

#### Connection Problems

**Issue**: Cannot connect to Sui network

**Solution**: 
- Verify your RPC_URL in the .env file
- Check your internet connection
- Try an alternative RPC provider

#### Transaction Failures

**Issue**: Transactions are failing

**Solution**:
- Ensure you have sufficient SUI for gas fees
- Check that your slippage tolerance is appropriate
- Verify the pool has sufficient liquidity

### Logs

Check the logs for detailed error information:

```bash
cat logs/error.log
```

For more detailed debugging:

```bash
DEBUG=true npm start -- scan
```

## Support

If you encounter issues not covered in this guide, please open an issue on our GitHub repository or contact support at support@example.com.