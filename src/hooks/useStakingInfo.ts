import { useQuery } from '@tanstack/react-query'
import { usePolkadot } from '../providers/PolkadotProvider'

export interface StakingInfo {
  activeEra: number
  validatorCount: number
  minimumValidatorCount: number
  totalStake: string
  minNominatorBond: string
}

/**
 * Hook to fetch current staking information
 * Only works on chains with staking pallet (Polkadot, Kusama, etc.)
 * 
 * @param refetchInterval - Time in ms between refetches (default: 30000)
 * @returns Query result with staking information
 * 
 * @example
 * ```tsx
 * function StakingMetrics() {
 *   const { data, isLoading, error } = useStakingInfo()
 *   
 *   if (isLoading) return <div>Loading staking info...</div>
 *   if (error) return <div>Staking not available on this chain</div>
 *   
 *   return (
 *     <div>
 *       <p>Active Era: {data?.activeEra}</p>
 *       <p>Validators: {data?.validatorCount}</p>
 *     </div>
 *   )
 * }
 * ```
 */
export function useStakingInfo(refetchInterval = 30000) {
  const { api, status } = usePolkadot()

  return useQuery({
    queryKey: ['stakingInfo'],
    queryFn: async (): Promise<StakingInfo> => {
      if (!api) throw new Error('API not connected')
      if (!api.query.staking) throw new Error('Staking pallet not available')

      const [activeEraInfo, validatorCount, minimumValidatorCount, minNominatorBond] = 
        await Promise.all([
          api.query.staking.activeEra(),
          api.query.staking.validatorCount?.() || Promise.resolve(0),
          api.query.staking.minimumValidatorCount?.() || Promise.resolve(0),
          api.query.staking.minNominatorBond?.() || Promise.resolve('0'),
        ])

      const activeEra: any = (activeEraInfo as any)?.unwrapOr?.({ index: 0 }) || { index: 0 }
      const totalStake = await api.query.staking.erasTotalStake?.(activeEra.index) || '0'

      return {
        activeEra: Number(activeEra.index),
        validatorCount: Number(validatorCount),
        minimumValidatorCount: Number(minimumValidatorCount),
        totalStake: totalStake.toString(),
        minNominatorBond: minNominatorBond.toString(),
      }
    },
    enabled: status === 'connected' && !!api,
    refetchInterval,
    staleTime: 20000,
    retry: 1, // Only retry once if staking pallet not available
  })
}
