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
