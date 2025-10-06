/**
 * Custom React hooks for Polkadot chain interactions
 * 
 * These hooks provide easy access to common Polkadot data and functionality,
 * with built-in caching, error handling, and TypeScript support.
 * 
 * All hooks use @tanstack/react-query for efficient data fetching and caching.
 * 
 * @module hooks
 */

export { usePolkadot } from '../providers/PolkadotProvider'
export { useBlockNumber } from './useBlockNumber'
export { useBalance, type BalanceInfo } from './useBalance'
export { useChainInfo, type ChainInfo } from './useChainInfo'
export { useStakingInfo, type StakingInfo } from './useStakingInfo'
export { useNonce } from './useNonce'
export { useEvents, type ChainEvent } from './useEvents'
