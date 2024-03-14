import { defineChain } from "viem";

export const gelatoOPTestnet = defineChain({
  id: 42069,
  name: "Gelato OPTestnet",
  network: "gelatoOPTestnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.op-testnet.gelato.digital"],
      webSocket: [],
    },
    public: {
      http: ["https://rpc.op-testnet.gelato.digital"],
      webSocket: [],
    },
  },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: "https://blockscout.op-testnet.gelato.digital",
    },
  },
});

export const astarZKatana = defineChain({
  id: 1261120,
  name: "Astar zKatana",
  network: "astarZKatana",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["https://rpc.zkatana.gelato.digital"],
      webSocket: ["https://ws.zkatana.gelato.digital"],
    },
    public: {
      http: ["https://rpc.zkatana.gelato.digital"],
      webSocket: ["https://ws.zkatana.gelato.digital"],
    },
  },
  blockExplorers: {
    default: {
      name: "Explorer",
      url: "https://zkatana.blockscout.com",
    },
  },
});

export const astarZkEVM = defineChain({
  id: 3_776,
  name: 'Astar zkEVM',
  network: 'AstarZkEVM',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://rpc.startale.com/astar-zkevm'],
    },
    public: {
        http: ['https://rpc.startale.com/astar-zkevm'],
    },
  },
  blockExplorers: {
    default: {
      name: 'Astar zkEVM Explorer',
      url: 'https://astar-zkevm.explorer.startale.com',
    },
  },
  contracts: {
    multicall3: {
      address: '0x36eabf148272BA81A5225C6a3637972F0EE17771',
      blockCreated: 93528,
    },
  },
  testnet: false,
})
