import { useQuery } from '@tanstack/react-query'
import { usePolkadot } from '../providers/PolkadotProvider'

/**
 * Hook to fetch and subscribe to the current block number
 * Updates every 6 seconds by default
 * 
 * @param refetchInterval - Time in ms between refetches (default: 6000)
 * @returns Query result with block number
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data: blockNumber, isLoading } = useBlockNumber()
 *   return <div>Block: {blockNumber}</div>
 * }
 * ```
 */
export function useBlockNumber(refetchInterval = 6000) {
  const { api, status } = usePolkadot()

  return useQuery({
    queryKey: ['blockNumber'],
    queryFn: async () => {
      if (!api) throw new Error('API not connected')
      const header = await api.rpc.chain.getHeader()
      return header.number.toNumber()
    },
    enabled: status === 'connected' && !!api,
    refetchInterval,
    staleTime: 5000,
  })
}
