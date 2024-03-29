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

export const arbitrumNova = defineChain({
  id: 42_170,
  name: 'Arbitrum Nova',
  network: "arbitrumNova",
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: {
      http: ['https://nova.arbitrum.io/rpc'],
    },
    public: {
      http: ['https://nova.arbitrum.io/rpc'],
  },
  },
  blockExplorers: {
    default: {
      name: 'Arbiscan',
      url: 'https://nova.arbiscan.io',
    },
  },
  contracts: {
    multicall3: {
      address: '0xca11bde05977b3631167028862be2a173976ca11',
      blockCreated: 1746963,
    },
  },
  testnet: false,
})

export const arbitrumBlueberry = defineChain({
  id: 88_153_591_557,
  name: 'Arbitrum Blueberry',
  network: 'arbitrum-blueberry',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc.arb-blueberry.gelato.digital'] },
    public: { http: ['https://rpc.arb-blueberry.gelato.digital'] },
  },
  blockExplorers: {
    default: { name: 'Gelatoscout', url: 'https://arb-blueberry.gelatoscout.com' },
  },
  testnet: true,
})

export const opCelestiaRaspberry = defineChain({
  id: 123_420_111,
  name: 'OP Celestia Raspberry',
  network: 'op-celestia-raspberry',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc.opcelestia-raspberry.gelato.digital'] },
    public: { http: ['https://rpc.opcelestia-raspberry.gelato.digital'] },
  },
  blockExplorers: {
    default: { name: 'Gelatoscout', url: 'https://opcelestia-raspberry.gelatoscout.com' },
  },
  testnet: true,
})

export const polygonBlackberry = defineChain({
  id: 94_204_209,
  name: 'Polygon Blackberry',
  network: 'polybon-blackberry',
  nativeCurrency: {
    decimals: 18,
    name: 'Ether',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['https://rpc.polygon-blackberry.gelato.digital'] },
    public: { http: ['https://rpc.polygon-blackberry.gelato.digital'] },
  },
  blockExplorers: {
    default: { name: 'Gelatoscout', url: 'https://polygon-blackberry.gelatoscout.com' },
  },
  testnet: true,
})
