import { useQuery } from '@tanstack/react-query'
import { usePolkadot } from '../providers/PolkadotProvider'

export interface ChainInfo {
  chainName: string
  tokenSymbol: string
  tokenDecimals: number
  ss58Format: number
  genesisHash: string
}

/**
 * Hook to fetch chain metadata and properties
 * This data is relatively static and cached for 5 minutes
 * 
 * @returns Query result with chain information
 * 
 * @example
 * ```tsx
 * function ChainInfo() {
 *   const { data, isLoading } = useChainInfo()
 *   
 *   if (isLoading) return <div>Loading...</div>
 *   
 *   return (
 *     <div>
 *       <p>Chain: {data?.chainName}</p>
 *       <p>Token: {data?.tokenSymbol}</p>
 *       <p>Decimals: {data?.tokenDecimals}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useChainInfo() {
  const { api, status } = usePolkadot()

  return useQuery({
    queryKey: ['chainInfo'],
    queryFn: async (): Promise<ChainInfo> => {
      if (!api) throw new Error('API not connected')

      const [chain, properties, genesisHash] = await Promise.all([
        api.rpc.system.chain(),
        api.rpc.system.properties(),
        api.genesisHash,
      ])

      const tokenSymbol = properties.tokenSymbol.unwrapOr(['UNIT'])[0]?.toString() || 'UNIT'
      const tokenDecimals = Number(properties.tokenDecimals.unwrapOr([12])[0] || 12)
      const ss58Format = Number(properties.ss58Format.unwrapOr(42))

      return {
        chainName: chain.toString(),
        tokenSymbol,
        tokenDecimals,
        ss58Format,
        genesisHash: genesisHash.toHex(),
      }
    },
    enabled: status === 'connected' && !!api,
    staleTime: 5 * 60 * 1000, // 5 minutes - chain info rarely changes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })
}
