# Development Guidelines for Sui Liquidity Sniper

This document provides comprehensive guidelines for developers contributing to the Sui Liquidity Sniper project.

## Table of Contents

1. [Development Environment](#development-environment)
2. [Code Style](#code-style)
3. [Project Structure](#project-structure)
4. [Testing Guidelines](#testing-guidelines)
5. [Documentation Standards](#documentation-standards)
6. [Git Workflow](#git-workflow)
7. [Performance Considerations](#performance-considerations)

## Development Environment

### Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)
- TypeScript (v4.5 or higher)
- Sui SDK

### Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/sui-liquidity-sniper.git

# Navigate to the project directory
cd sui-liquidity-sniper

# Install dependencies
npm install

# Build the project
npm run build
```

## Code Style

We follow a consistent code style throughout the project:

### TypeScript Guidelines

- Use TypeScript for all new code
- Define explicit types for function parameters and return values
- Avoid using `any` type when possible
- Use interfaces for object shapes
- Use enums for predefined sets of values

### Naming Conventions

- **Files**: Use camelCase for file names (e.g., `poolScanner.ts`)
- **Classes**: Use PascalCase for class names (e.g., `PoolScanner`)
- **Functions**: Use camelCase for function names (e.g., `scanPools`)
- **Variables**: Use camelCase for variable names (e.g., `poolAddress`)
- **Constants**: Use UPPER_SNAKE_CASE for constants (e.g., `MAX_POOLS`)
- **Interfaces**: Prefix with 'I' (e.g., `IPoolData`)
- **Types**: Use PascalCase (e.g., `PoolType`)

### Code Formatting

We use ESLint and Prettier for code formatting. Configuration files are included in the repository.

```bash
# Run linter
npm run lint

# Fix linting issues
npm run lint:fix
```

## Project Structure

The project follows a modular structure:

```
├── dex/                  # DEX-specific implementations
├── documentation/        # Project documentation
├── filters/              # Pool filtering logic
├── services/             # Core services
│   ├── analytics/        # Analytics services
│   ├── db/               # Database services
│   └── websocket/        # WebSocket services
├── tests/                # Test suite
│   ├── unit/             # Unit tests
│   ├── integration/      # Integration tests
│   └── performance/      # Performance tests
├── trade/                # Trading logic
├── utils/                # Utility functions
└── index.ts              # Main entry point
```

### Adding New Features

When adding new features:

1. Create a new module in the appropriate directory
2. Export the module from the directory's index.ts file
3. Add unit tests for the new module
4. Update documentation as needed

## Testing Guidelines

### Test Structure

We use Jest for testing. Tests should be organized as follows:

- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test interactions between components
- **Performance Tests**: Measure efficiency and response times

### Writing Tests

- Each test file should correspond to a source file
- Use descriptive test names that explain what is being tested
- Follow the Arrange-Act-Assert pattern
- Mock external dependencies

### Running Tests

```bash
# Run all tests
npm test

# Run specific test categories
npm test -- --testPathPattern=unit
npm test -- --testPathPattern=integration
npm test -- --testPathPattern=performance

# Generate coverage report
npm test -- --coverage
```

## Documentation Standards

### Code Documentation

- Use JSDoc comments for all public functions and classes
- Document parameters, return values, and thrown exceptions
- Include examples for complex functions

Example:

```typescript
/**
 * Scans for new liquidity pools on the Sui network.
 *
 * @param options - Configuration options for the scan
 * @param options.timeout - Maximum time in ms for the scan (default: 30000)
 * @param options.maxResults - Maximum number of pools to return (default: 100)
 * @param options.filters - Array of filter functions to apply
 * @returns A promise that resolves to an array of Pool objects
 * @throws {ConnectionError} If unable to connect to the Sui network
 *
 * @example
 * const newPools = await poolScanner.scanPools({
 *   timeout: 15000,
 *   maxResults: 50
 * });
 */
async function scanPools(options?: ScanOptions): Promise<Pool[]> {
  // Implementation
}
```

### Project Documentation

- Keep README.md up to date with installation and basic usage instructions
- Maintain comprehensive API documentation
- Update user guides when adding new features
- Document architectural decisions

## Git Workflow

### Branching Strategy

We follow a feature branch workflow:

- `main`: Production-ready code
- `develop`: Integration branch for features
- `feature/*`: New features
- `bugfix/*`: Bug fixes
- `release/*`: Release preparation

### Commit Messages

Follow the conventional commits specification:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

Types include:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code changes that neither fix bugs nor add features
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Changes to the build process or auxiliary tools

### Pull Requests

- Create a pull request for each feature or bug fix
- Reference related issues in the PR description
- Ensure all tests pass before requesting review
- Request review from at least one team member
- Squash commits when merging

## Performance Considerations

### Database Optimization

- Use indexes for frequently queried fields
- Optimize queries for performance
- Use connection pooling
- Implement caching for frequent queries

### Network Efficiency

- Batch API requests when possible
- Implement retry logic with exponential backoff
- Use WebSockets for real-time updates
- Compress data when appropriate

### Memory Management

- Avoid memory leaks by properly cleaning up resources
- Use pagination for large data sets
- Implement proper error handling to prevent resource leaks

## Security Best Practices

- Never commit sensitive information (API keys, private keys, etc.)
- Use environment variables for configuration
- Validate and sanitize all user inputs
- Implement proper error handling to avoid exposing sensitive information
- Regularly update dependencies to address security vulnerabilities

## Continuous Integration

We use GitHub Actions for CI/CD:

- Automated testing on pull requests
- Code quality checks
- Build verification
- Deployment to staging environments

## Support

If you have questions or need assistance, please contact the project maintainers or open an issue on GitHub.