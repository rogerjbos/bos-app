import { useQuery } from '@tanstack/react-query'
import { usePolkadot } from '../providers/PolkadotProvider'

/**
 * Hook to fetch account nonce (transaction count)
 * Useful for displaying transaction counts or managing transaction ordering
 * 
 * @param address - The account address to query
 * @param refetchInterval - Time in ms between refetches (default: 10000)
 * @returns Query result with account nonce
 * 
 * @example
 * ```tsx
 * function AccountNonce({ address }: { address: string }) {
 *   const { data: nonce, isLoading } = useNonce(address)
 *   
 *   if (isLoading) return <div>Loading...</div>
 *   
 *   return <div>Transaction Count: {nonce}</div>
 * }
 * ```
 */
export function useNonce(address: string | undefined, refetchInterval = 10000) {
  const { api, status } = usePolkadot()

  return useQuery({
    queryKey: ['nonce', address],
    queryFn: async (): Promise<number> => {
      if (!api) throw new Error('API not connected')
      if (!address) throw new Error('Address is required')

      const nonce = await api.rpc.system.accountNextIndex(address)
      return nonce.toNumber()
    },
    enabled: status === 'connected' && !!api && !!address,
    refetchInterval,
    staleTime: 8000,
  })
}
