# kerneljs

The @kerneljs packages are TypeScript libraries for interacting with the ERC-4337 compliant [Kernel smart contract wallet](https://github.com/zerodevapp/kernel) using various plugins, such as ECDSAValidator and SessionKeyValidator. It leverages the `viem` and `permissionless` libraries to provide a robust and permissionless interaction layer with Kernel.

## Features

- **Modular Packages**: The SDK is structured into multiple packages, allowing you to include only the parts you need.
- **ECDSA Validator Support**: Utilize the `@kerneljs/ecdsa-validator` plugin for ECDSAValidator support.
- **SessionKey Validator**: Coming soon - a plugin for session key signature validation.
- **Extendable**: Easily extend the core functionality with additional plugins and validators.

## Packages

The SDK includes the following packages to start with:

- `@kerneljs/core`: The core package that provides the base functionality for interacting with the Kernel smart contract wallet.
- `@kerneljs/ecdsa-validator`: A plugin package that implements the ECDSAValidator logic.

## Installation

To use the SDK, install the core package along with any plugins you need:

```bash
npm install viem permissionless @kerneljs/core @kerneljs/ecdsa-validator
```

```bash
yarn add viem permissionless @kerneljs/core @kerneljs/ecdsa-validator
```

```bash
bun install viem permissionless @kerneljs/core @kerneljs/ecdsa-validator
```

## Environment Setup

Before running the tests, ensure you have installed the necessary dependencies and built the core package:
```bash
bun install
cd packages/core
bun run build
```

Then, copy the `.env.example` file to `.env` and define all necessary environment variables:
```bash
cp .env.example .env
```

Edit .env to include all required environment variables


## Documentation

For detailed documentation and how to use other features of the SDK, please refer to our [documentation page](https://docs.kerneljs.org).

## Contributing

Contributions are welcome! Please read our [contributing guidelines](./CONTRIBUTING.md) for details on how to contribute to the project.

## License

The @kerneljs packages are released under the MIT License. See the [LICENSE](./LICENSE) file for more details.

## Contact

If you have any questions or would like to get in touch with the team, please join our [Discord channel](https://discord.gg/KS9MRaTSjx).