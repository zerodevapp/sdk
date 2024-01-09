# Kernel.js

> If you find yourself here, you've discovered a secret!  Kernel.js is an upcoming SDK by ZeroDev.  It's in alpha and not officially released, and the docs are still in the works.  Please proceed with caution.

The [@kerneljs packages](https://www.npmjs.com/org/kerneljs) are TypeScript libraries for interacting with the ERC-4337 compliant [Kernel smart account](https://github.com/zerodevapp/kernel) using various plugins, such as ECDSAValidator and SessionKeyValidator. It leverages `viem` and `permissionless` to provide a robust and permissionless interaction layer with Kernel.

[See here for detailed documentation.](https://new-docs.zerodev.app/kerneljs/getting-started/intro)

## Examples

For examples using Kernel.js, check out [the examples repo](https://github.com/zerodevapp/kernel.js-examples).

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

## Building and Testing

Before running the tests, ensure you have installed [bun](https://bun.sh/) and all the necessary dependencies and built the core package:

```bash
bun install
bun run build
```

Then, copy the `.env.example` file to `.env` and define all necessary environment variables:

```bash
cp .env.example .env
```

Now you can run the tests:

```bash
bun test
```

## Contributing

Contributions are welcome! Please read our [contributing guidelines](./CONTRIBUTING.md) for details on how to contribute to the project.

## License

The @kerneljs packages are released under the MIT License. See the [LICENSE](./LICENSE) file for more details.

## Contact

If you have any questions or would like to get in touch with the team, please join our [Discord channel](https://discord.gg/KS9MRaTSjx).
