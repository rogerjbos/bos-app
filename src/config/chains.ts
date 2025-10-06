/**
 * Common Polkadot ecosystem chain configurations
 * 
 * This file contains pre-configured settings for popular chains,
 * making it easy to switch networks or support multiple chains.
 * 
 * @module config/chains
 */

export interface ChainConfig {
  id: string
  name: string
  displayName: string
  endpoint: string
  tokenSymbol: string
  tokenDecimals: number
  ss58Format: number
  explorerUrl: string
  color: string
  icon?: string
  testnet?: boolean
}

/**
 * Polkadot Mainnet Configuration
 */
export const POLKADOT: ChainConfig = {
  id: 'polkadot',
  name: 'Polkadot',
  displayName: 'Polkadot Relay Chain',
  endpoint: 'wss://rpc.polkadot.io',
  tokenSymbol: 'DOT',
  tokenDecimals: 10,
  ss58Format: 0,
  explorerUrl: 'https://polkadot.subscan.io',
  color: '#E6007A',
  testnet: false,
}

/**
 * Kusama Network Configuration
 */
export const KUSAMA: ChainConfig = {
  id: 'kusama',
  name: 'Kusama',
  displayName: 'Kusama Network',
  endpoint: 'wss://kusama-rpc.polkadot.io',
  tokenSymbol: 'KSM',
  tokenDecimals: 12,
  ss58Format: 2,
  explorerUrl: 'https://kusama.subscan.io',
  color: '#000000',
  testnet: false,
}

/**
 * Westend Testnet Configuration
 */
export const WESTEND: ChainConfig = {
  id: 'westend',
  name: 'Westend',
  displayName: 'Westend Testnet',
  endpoint: 'wss://westend-rpc.polkadot.io',
  tokenSymbol: 'WND',
  tokenDecimals: 12,
  ss58Format: 42,
  explorerUrl: 'https://westend.subscan.io',
  color: '#DA68A7',
  testnet: true,
}

/**
 * Paseo Testnet Configuration
 */
export const PASEO: ChainConfig = {
  id: 'paseo',
  name: 'Paseo',
  displayName: 'Paseo Testnet',
  endpoint: 'wss://paseo.rpc.amforc.com',
  tokenSymbol: 'PAS',
  tokenDecimals: 10,
  ss58Format: 42,
  explorerUrl: 'https://paseo.subscan.io',
  color: '#6D3AEE',
  testnet: true,
}

/**
 * Local Development Node Configuration
 */
export const LOCAL: ChainConfig = {
  id: 'local',
  name: 'Local',
  displayName: 'Local Development Node',
  endpoint: 'ws://127.0.0.1:9944',
  tokenSymbol: 'UNIT',
  tokenDecimals: 12,
  ss58Format: 42,
  explorerUrl: '',
  color: '#888888',
  testnet: true,
}

/**
 * Popular Polkadot Parachains
 */
export const ASTAR: ChainConfig = {
  id: 'astar',
  name: 'Astar',
  displayName: 'Astar Network',
  endpoint: 'wss://rpc.astar.network',
  tokenSymbol: 'ASTR',
  tokenDecimals: 18,
  ss58Format: 5,
  explorerUrl: 'https://astar.subscan.io',
  color: '#0AE2FF',
  testnet: false,
}

export const MOONBEAM: ChainConfig = {
  id: 'moonbeam',
  name: 'Moonbeam',
  displayName: 'Moonbeam Network',
  endpoint: 'wss://wss.api.moonbeam.network',
  tokenSymbol: 'GLMR',
  tokenDecimals: 18,
  ss58Format: 1284,
  explorerUrl: 'https://moonbeam.subscan.io',
  color: '#53CBC9',
  testnet: false,
}

export const ACALA: ChainConfig = {
  id: 'acala',
  name: 'Acala',
  displayName: 'Acala Network',
  endpoint: 'wss://acala-rpc.dwellir.com',
  tokenSymbol: 'ACA',
  tokenDecimals: 12,
  ss58Format: 10,
  explorerUrl: 'https://acala.subscan.io',
  color: '#E40C5B',
  testnet: false,
}

/**
 * All available chain configurations
 */
export const CHAINS: Record<string, ChainConfig> = {
  polkadot: POLKADOT,
  kusama: KUSAMA,
  westend: WESTEND,
  paseo: PASEO,
  local: LOCAL,
  astar: ASTAR,
  moonbeam: MOONBEAM,
  acala: ACALA,
}

/**
 * Get chain configuration by ID
 * 
 * @param chainId - The chain identifier
 * @returns Chain configuration or undefined
 * 
 * @example
 * ```ts
 * const config = getChainConfig('polkadot')
 * console.log(config.endpoint) // 'wss://rpc.polkadot.io'
 * ```
 */
export function getChainConfig(chainId: string): ChainConfig | undefined {
  return CHAINS[chainId]
}

/**
 * Get all mainnet chains (non-testnet)
 */
export function getMainnets(): ChainConfig[] {
  return Object.values(CHAINS).filter((chain) => !chain.testnet)
}

/**
 * Get all testnet chains
 */
export function getTestnets(): ChainConfig[] {
  return Object.values(CHAINS).filter((chain) => chain.testnet)
}

/**
 * Default chain ID from environment or fallback to Polkadot
 */
export const DEFAULT_CHAIN_ID = (import.meta as any).env?.VITE_DEFAULT_CHAIN || 'polkadot'

/**
 * Default chain configuration
 */
export const DEFAULT_CHAIN = getChainConfig(DEFAULT_CHAIN_ID) || POLKADOT
