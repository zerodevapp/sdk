# kernel.js

The [@kerneljs packages](https://www.npmjs.com/org/kerneljs) are TypeScript libraries for interacting with the ERC-4337 compliant [Kernel smart account](https://github.com/zerodevapp/kernel) using various plugins, such as ECDSAValidator and SessionKeyValidator. It leverages `viem` and `permissionless` to provide a robust and permissionless interaction layer with Kernel.

[See here for detailed documentation.](https://new-docs.zerodev.app/kerneljs/getting-started/intro)

## Installation

To use the SDK, install the core package along with any plugins you need:

```bash
npm install viem permissionless @kerneljs/core @kerneljs/ecdsa-validator
```

```bash
yarn add viem permissionless @kerneljs/core @kerneljs/ecdsa-validator
```

## Environment Setup

Before running the tests, copy the `.env.example` file to `.env` and define all necessary environment variables:
```bash
cp .env.example .env
```

Edit .env to include all required environment variables

## Contributing

Contributions are welcome! Please read our [contributing guidelines](./CONTRIBUTING.md) for details on how to contribute to the project.

## License

The @kerneljs packages are released under the MIT License. See the [LICENSE](./LICENSE) file for more details.

## Contact

If you have any questions or would like to get in touch with the team, please join our [Discord channel](https://discord.gg/KS9MRaTSjx).
