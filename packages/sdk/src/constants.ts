export const BACKEND_URL =
  process.env.REACT_APP_ZERODEV_BACKEND_URL ??
  'https://backend-vikp.onrender.com'

export const LOGGER_URL =
  process.env.REACT_APP_ZERODEV_LOGGER_URL ??
  'https://prod-logger.onrender.com'

export const PAYMASTER_URL =
  process.env.REACT_APP_ZERODEV_PAYMASTER_URL ??
  'https://prod-paymaster.onrender.com'

export { default as PAYMASTER_ABI } from './abi/paymaster_abi.json'

export const BUNDLER_URL: { [key: string]: any } = {
  '1': 'https://node.stackup.sh/v1/rpc/ce81376415a8c1449ccb50ccded4ebac7215b4ed1404a67b618d2efacd47d5fb',
  '5': 'https://node.stackup.sh/v1/rpc/97e6a0445873f90694d4bc7f6ced4fbb008b4f97b181e254c7be14f1359629fb',
  '137': 'https://node.stackup.sh/v1/rpc/a5ea86585738b937382fae716fbdce54a55bec9e47779793e5d578fe5d750067',
  '80001': 'https://node.stackup.sh/v1/rpc/b991bbfc1843e426cf1dddde8cfc89277cb08736a6b85df30cf0fe45c473c910',
}

export const ENTRYPOINT_ADDRESS = '0x0576a174D229E3cFA37253523E645A78A0C91B57'
export const PAYMASTER_ADDRESS = '0x95341fe310FcDcA0d08c7b263773963ff4Bc3439'
export const ACCOUNT_FACTORY_ADDRESS = '0x3e9fCFf3E490881855cBE07f23A674E91d163894'
export const UPDATE_SINGLETON_ADDRESS = '0x3d4d0cab438cee791b7405cf10448daaa98087c0'

export const INFURA_API_KEY = 'f36f7f706a58477884ce6fe89165666c'
export const WALLET_CONNECT_PROJECT_ID = '9832ea3eefe6c1b75a689ed0c90ce085'
export const WALLET_CONNECT_RELAY_URL = 'wss://relay.walletconnect.com'

export const CHAIN_ID_TO_INFURA_NAME: { [key: string]: any } = {
  '1': 'mainnet',
  '5': 'goerli',
  '137': 'polygon-mainnet',
  '80001': 'polygon-mumbai',
  '10': 'optimism-mainnet',
  '420': 'optimism-goerli',
  '42161': 'arbitrum-mainnet',
  '421613': 'arbitrum-goerli',
  '43114': 'avalanche-mainnet',
  '43113': 'avalanche-fuji',
  '1313161554': 'aurora-mainnet',
  '1313161555': 'aurora-testnet',
}


export const ERC721_ABI = [
  "function transferFrom(address from, address to, uint256 tokenId) external",
  "function safeTransferFrom(address from, address to, uint256 tokenId) external",
  "function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata _data) external",
  "function balanceOf(address owner) external view returns (uint256 balance)",
];

export const ERC20_ABI = [
  "function transfer(address to, uint256 value) external returns (bool)",
  "function transferFrom(address from, address to, uint256 value) external returns (bool)",
  "function approve(address spender, uint256 value) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address owner) external view returns (uint256)",
]

export const ERC1155_ABI = [
  "function safeTransferFrom(address from, address to, uint256 id, uint256 amount, bytes calldata data) external",
  "function safeBatchTransferFrom(address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data) external",
  "function balanceOf(address account, uint256 id) external view returns (uint256)",
  "function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) external view returns (uint256[] memory)",
]