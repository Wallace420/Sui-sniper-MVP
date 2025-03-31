# Test Suite for Sui Liquidity Sniper

This directory contains comprehensive tests for the Sui Liquidity Sniper project.

## Test Structure

- `unit/`: Unit tests for individual components and functions
- `integration/`: Integration tests for testing interactions between components
- `performance/`: Performance tests to measure efficiency and response times

## Running Tests

To run all tests:

```bash
npm test
```

To run specific test categories:

```bash
npm test -- --testPathPattern=unit
npm test -- --testPathPattern=integration
npm test -- --testPathPattern=performance
```

## Test Coverage

To generate a test coverage report:

```bash
npm test -- --coverage
```

The coverage report will be available in the `coverage/` directory.