# ZeroDev SDK v5 - Claude Development Guide

## Project Overview

This is the ZeroDev SDK v5, a comprehensive SDK for building ERC-4337 (Account Abstraction) applications on Ethereum. The SDK provides utilities for working with smart contract wallets, bundlers, paymasters, and various validation plugins.

## Architecture & Core Concepts

### Project Type
- **Type**: TypeScript SDK for ERC-4337 Account Abstraction
- **Package Manager**: Bun (with support for npm/yarn)
- **Monorepo**: Uses workspaces for packages, plugins, and templates
- **Build System**: TypeScript compiler with ESM, CJS, and types outputs

### Key Components

1. **Smart Accounts**: Kernel-based smart contract wallets supporting multiple versions (v1, v2, v3)
2. **Validators/Plugins**: Modular validation systems (ECDSA, WebAuthn, Session Keys, Permissions)
3. **Clients**: Specialized clients for account operations, bundlers, and paymasters
4. **Actions**: Composable functions for account operations
5. **Providers**: EIP-1193 compatible providers for wallet integration

## Directory Structure

```
sdkv5/
├── packages/
│   ├── core/           # Main SDK package (@zerodev/sdk)
│   │   ├── accounts/   # Smart account implementations
│   │   ├── actions/    # Account actions and operations
│   │   ├── clients/    # Client implementations
│   │   ├── providers/  # EIP-1193 providers
│   │   └── types/      # TypeScript type definitions
│   ├── test/           # Test utilities and e2e tests
│   └── presets/        # Pre-configured setups
├── plugins/            # Validator and feature plugins
│   ├── ecdsa/          # ECDSA validator
│   ├── permission/     # Permission-based validators
│   ├── session-key/    # Session key management
│   ├── multi-chain-*   # Multi-chain validators
│   ├── webauthn-key/   # WebAuthn/Passkey support
│   ├── weighted-*      # Multi-sig validators
│   └── hooks/          # Smart contract hooks
├── templates/          # TypeScript config templates
├── wallet/             # Wallet integration utilities
└── walletconnect/      # WalletConnect integration
```

## Key Commands

### Development Commands
```bash
# Install dependencies
bun install

# Build all packages
bun run build

# Format code
bun run format

# Lint code
bun run lint
bun run lint:fix

# Run tests (requires .env setup)
bun test

# Changeset for versioning
bun run changeset
bun run changeset:version
bun run changeset:release
```

### Package-specific Build Commands
```bash
# Build individual package (run from package directory)
bun run build:cjs    # CommonJS build
bun run build:esm    # ES Modules build
bun run build:types  # TypeScript declarations
```

## Environment Setup

Copy `.env.example` to `.env` and configure:

```env
# Essential variables
TEST_PRIVATE_KEY=
ENTRYPOINT_ADDRESS=
TEST_CHAIN_ID=
RPC_URL=

# Provider API keys
PIMLICO_API_KEY=
STACKUP_API_KEY=
ZERODEV_PROJECT_ID=
ZERODEV_API_KEY=

# RPC endpoints
PIMLICO_BUNDLER_RPC_HOST=
PIMLICO_PAYMASTER_RPC_HOST=
ZERODEV_BUNDLER_RPC_HOST=
ZERODEV_PAYMASTER_RPC_HOST=

# Multi-chain test configs
SEPOLIA_RPC_URL=
OPTIMISM_SEPOLIA_RPC_URL=
```

## Code Style & Formatting

- **Formatter/Linter**: Biome (configured in `biome.json`)
- **Indentation**: 4 spaces
- **Line Width**: 80 characters
- **Semicolons**: As needed
- **Trailing Commas**: None
- **Pre-commit Hook**: Auto-formats and lints code

## Testing

### Test Structure
- Unit tests: Located alongside source files
- E2E tests: In `packages/test/`
- Version-specific tests: `v0.7/` directory for EntryPoint v0.7

### Running Tests
```bash
# Run all tests
bun test

# Run specific test file
bun test ecdsaKernelAccount.test.ts

# Run v0.7 tests
bun test v0.7/
```

## Development Workflow

1. **Feature Development**:
   - Create feature branch from `main`
   - Implement changes with tests
   - Run `bun run format` and `bun run lint:fix`
   - Create changeset: `bun run changeset`

2. **Building**:
   - Run `bun run build` at root to build all packages
   - Individual packages build to `_cjs/`, `_esm/`, and `_types/`

3. **Testing**:
   - Ensure `.env` is configured
   - Write tests in same directory as source
   - Run tests before committing

4. **Release Process**:
   - Uses changesets for version management
   - Automated via GitHub Actions
   - Publishes to npm registry

## Plugin Development

### Creating a New Plugin
1. Create directory in `plugins/`
2. Copy `tsconfig.build.json` from existing plugin
3. Set up `package.json` with standard scripts
4. Export main functionality from `index.ts`
5. Build outputs to `_cjs/`, `_esm/`, `_types/`

### Plugin Structure
```typescript
// Standard plugin exports
export { toPluginValidator } from './toPluginValidator'
export { PLUGIN_CONSTANTS } from './constants'
export type { PluginTypes } from './types'
```

## Important Notes

### Multi-version Support
- Supports EntryPoint v0.6 and v0.7
- Kernel versions: v1, v2 (0.2.x), v3 (0.3.x)
- Version-specific code in separate directories

### Type Safety
- Extensive TypeScript types
- Viem integration for chain types
- Strict type checking enabled

### Client Architecture
Based on NOTES.md, the architecture separates concerns:
- **BundlerClient**: UserOperation submission
- **PaymasterClient**: Sponsorship and gas abstraction  
- **KernelAccountClient**: High-level account operations
- **SmartAccount**: Account abstraction implementation

### Git Workflow
- Main branch: `main`
- Auto-formatting on pre-commit
- CI/CD via GitHub Actions
- Changesets for version management

## Common Development Tasks

### Adding a New Action
1. Create in `packages/core/actions/`
2. Export from appropriate index file
3. Add client decorator if needed
4. Include TypeScript types

### Updating Plugin Dependencies
1. Update in plugin's `package.json`
2. Update peer dependencies if needed
3. Run `bun install --lockfile-only`
4. Create changeset for version bump

### Debugging Tests
- Use `console.log` for debugging
- Check RPC endpoints in `.env`
- Verify contract deployments
- Use test utilities in `packages/test/utils.ts`

## Resources

- [Documentation](https://docs.zerodev.app)
- [Examples Repository](https://github.com/zerodevapp/zerodev-examples)
- [Discord Channel](https://discord.gg/KS9MRaTSjx)
- License: MIT