import { parseUnits, type Hex } from "viem";
import type { IGasTokenAddresses } from "./paymaster/types.js";
import { polygon } from "viem/chains";

export const DEFAULT_SEND_TX_MAX_RETRIES = 3;
export const DEFAULT_SEND_TX_RETRY_INTERVAL_MS = 60000; // 1 minutes
export const BUNDLER_URL = "https://v0-6-meta-bundler.onrender.com";
export const PAYMASTER_URL = "https://v0-6-paymaster.onrender.com";
export const ENTRYPOINT_ADDRESS: Hex =
  "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
export const MULTISEND_ADDR: Hex = "0x8ae01fcf7c655655ff2c6ef907b8b4718ab4e17c";
export const BACKEND_URL = "https://backend-vikp.onrender.com";
export const API_URL = "https://prod-api.zerodev.app";
export const ECDSA_VALIDATOR_ADDRESS =
  "0xd9AB5096a832b9ce79914329DAEE236f8Eea0390";
export const KERNEL_FACTORY_ADDRESS =
  "0x5de4839a76cf55d0c90e2061ef4386d962E15ae3";
export const KERNEL_IMPL_ADDRESS = "0xf048AD83CB2dfd6037A43902a2A5Be04e53cd2Eb";
export const KILL_SWITCH_VALIDATOR_ADDRESS =
  "0x7393A7dA58CCfFb78f52adb09705BE6E20F704BC";
export const KILL_SWITCH_ACTION = "0x3f38e479304c7F18F988269a1bDa7d646bd48243";
export const DUMMY_ECDSA_SIG =
  "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c";
export const ERC165_SESSION_KEY_VALIDATOR_ADDRESS =
  "0xe149290800De29D4b0BF9dB82c508255D81902E6";
export const TOKEN_ACTION = "0x2087C7FfD0d0DAE80a00EE74325aBF3449e0eaf1";
export const SESSION_KEY_VALIDATOR_ADDRESS =
  "0x1C1D5b70aD6e0c04366aab100261A6Bcc251EA3f";
export const oneAddress = "0x0000000000000000000000000000000000000001";

export const gasTokenChainAddresses: IGasTokenAddresses = {
  USDC: {
    1: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    // 5: "0x2f3A40A3db8a7e3D09B0adfEfbCe4f6F81927557",
    137: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    // 80001: "",
    // 420: "0x7F5c764cBc14f9669B88837ca1490cCa17c31607",
    42161: "0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8",
    // 421613: "",
    43114: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
    // 43113: "",
    // 56: "",
    // 97: ""
  },
  PEPE: {
    1: "0x6982508145454Ce325dDbE47a25d4ec3d2311933",
  },
};

export const ERC20_APPROVAL_AMOUNT: { [key: string]: bigint } = {
  // ETH
  [gasTokenChainAddresses["USDC"][1]]: parseUnits("100", 6),

  // Goerli
  [gasTokenChainAddresses["USDC"][5]]: parseUnits("100", 6),

  // Polygon
  [gasTokenChainAddresses["USDC"][137]]: parseUnits("10", 6),

  // Arbitrum
  [gasTokenChainAddresses["USDC"][42161]]: parseUnits("10", 6),

  // Avalanche
  [gasTokenChainAddresses["USDC"][43114]]: parseUnits("10", 6),

  // ETH
  [gasTokenChainAddresses["PEPE"][1]]: parseUnits("50000000", 18),

  "0x3870419Ba2BBf0127060bCB37f69A1b1C090992B": parseUnits("100", 18),
};

export const minPriorityFeePerBidDefaults = new Map<number, bigint>([
  [polygon.id, 30_000_000_000n],
]);

export const INFURA_API_KEY = "f36f7f706a58477884ce6fe89165666c";
export const CHAIN_ID_TO_NODE: { [key: number]: string } = {
  1: `https://mainnet.infura.io/v3/${INFURA_API_KEY}`,
  5: `https://goerli.infura.io/v3/${INFURA_API_KEY}`,
  11155111: 'https://fittest-ultra-aura.ethereum-sepolia.quiknode.pro/3893d01b1dd411fdfa9b6dd372dd2b4f69fcf1ea/',
  137: `https://polygon-mainnet.infura.io/v3/${INFURA_API_KEY}`,
  80001: `https://polygon-mumbai.infura.io/v3/${INFURA_API_KEY}`,
  10: `https://optimism-mainnet.infura.io/v3/${INFURA_API_KEY}`,
  420: `https://optimism-goerli.infura.io/v3/${INFURA_API_KEY}`,
  42161: `https://arbitrum-mainnet.infura.io/v3/${INFURA_API_KEY}`,
  // 42161: 'https://evocative-stylish-dinghy.arbitrum-mainnet.discover.quiknode.pro/80b526d14fa9fd9a8b0db1e65554acaf00c6a1ab/',
  421613: `https://arbitrum-goerli.infura.io/v3/${INFURA_API_KEY}`,
  43114: `https://avalanche-mainnet.infura.io/v3/${INFURA_API_KEY}`,
  43113: `https://avalanche-fuji.infura.io/v3/${INFURA_API_KEY}`,
  1313161554: `https://aurora-mainnet.infura.io/v3/${INFURA_API_KEY}`,
  1313161555: `https://aurora-testnet.infura.io/v3/${INFURA_API_KEY}`,
  56: "https://neat-greatest-layer.bsc.quiknode.pro/9405a499ceee314e5f2f68c9d47518d3537fce6a/",
  8453: "https://twilight-red-tree.base-mainnet.quiknode.pro/dc6eb27bf0f917df215922488dd97f4de7d9b08e/",
  84531:
    "https://icy-long-mountain.base-goerli.quiknode.pro/5b80d93e97cc9412a63c10a30841869abbef9596/",
  100: "https://thrilling-fluent-film.xdai.quiknode.pro/305955cffb9868cdd95b5e3dc9775f20678ad9ac/",
  10200: "https://nd-810-853-201.p2pify.com/e828b09f0d43591de96c297b3f36fffd",
};
