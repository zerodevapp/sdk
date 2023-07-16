import { parseUnits, type Hex } from "viem";
import type { IGasTokenAddresses } from "./paymaster/types.js";

export const BUNDLER_URL = "https://v0-6-meta-bundler.onrender.com";
export const PAYMASTER_URL = "https://v0-6-paymaster.onrender.com";
export const ENTRYPOINT_ADDRESS: Hex =
  "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
export const MULTISEND_ADDR: Hex = "0x8ae01fcf7c655655ff2c6ef907b8b4718ab4e17c";
export const BACKEND_URL = "https://backend-vikp.onrender.com";
export const API_URL = "https://prod-api.zerodev.app";
export const ECDSA_VALIDATOR_ADDRESS =
  "0x180D6465F921C7E0DEA0040107D342c87455fFF5";
export const KERNEL_FACTORY_ADDRESS =
  "0x5D006d3880645ec6e254E18C1F879DAC9Dd71A39";

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
