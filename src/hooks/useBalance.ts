import { useQuery } from '@tanstack/react-query'
import { usePolkadot } from '../providers/PolkadotProvider'

export interface BalanceInfo {
  free: string
  reserved: string
  frozen: string
  total: string
}

/**
 * Hook to fetch account balance information
 * 
 * @param address - The account address to query
 * @param refetchInterval - Time in ms between refetches (default: 12000)
 * @returns Query result with balance information
 * 
 * @example
 * ```tsx
 * function Balance({ address }: { address: string }) {
 *   const { data, isLoading, error } = useBalance(address)
 *   
 *   if (isLoading) return <div>Loading...</div>
 *   if (error) return <div>Error loading balance</div>
 *   
 *   return <div>Free: {data?.free}</div>
 * }
 * ```
 */
export function useBalance(address: string | undefined, refetchInterval = 12000) {
  const { api, status } = usePolkadot()

  return useQuery({
    queryKey: ['balance', address],
    queryFn: async (): Promise<BalanceInfo> => {
      if (!api) throw new Error('API not connected')
      if (!address) throw new Error('Address is required')

      const accountInfo: any = await api.query.system.account(address)
      const data = accountInfo.data
      
      return {
        free: data.free.toString(),
        reserved: data.reserved.toString(),
        frozen: data.frozen?.toString() || data.feeFrozen?.toString() || '0',
        total: data.free.add(data.reserved).toString(),
      }
    },
    enabled: status === 'connected' && !!api && !!address,
    refetchInterval,
    staleTime: 10000,
  })
}
