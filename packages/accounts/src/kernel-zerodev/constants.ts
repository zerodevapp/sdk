import { parseUnits } from "viem";
import { gasTokenChainAddresses } from "./middleware/types";

export const BUNDLER_URL = "https://v0-6-meta-bundler.onrender.com";
export const PAYMASTER_URL = "https://v0-6-paymaster.onrender.com";
export const ENTRYPOINT_ADDRESS = "0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789";
export const MULTISEND_ADDR = "0x8ae01fcf7c655655ff2c6ef907b8b4718ab4e17c";

export const ERC20_ABI = [
    'function transfer(address to, uint256 value) external returns (bool)',
    'function transferFrom(address from, address to, uint256 value) external returns (bool)',
    'function approve(address spender, uint256 value) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function balanceOf(address owner) external view returns (uint256)'
];

export const ERC20_APPROVAL_AMOUNT: { [key: string]: bigint } = {
    // ETH
    [gasTokenChainAddresses["USDC"][1]]: parseUnits('100', 6),
  
    // Goerli
    [gasTokenChainAddresses["USDC"][5]]: parseUnits('100', 6),
  
    // Polygon
    [gasTokenChainAddresses["USDC"][137]]: parseUnits('10', 6),
  
    // Arbitrum
    [gasTokenChainAddresses["USDC"][42161]]: parseUnits('10', 6),
  
    // Avalanche
    [gasTokenChainAddresses["USDC"][43114]]: parseUnits('10', 6),
  
    // ETH
    [gasTokenChainAddresses["PEPE"][1]]: parseUnits('50000000', 18),
  
    '0x3870419Ba2BBf0127060bCB37f69A1b1C090992B': parseUnits('100', 18)
  }