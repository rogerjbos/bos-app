import { useEffect, useState } from 'react'
import { usePolkadot } from '../providers/PolkadotProvider'

/**
 * Hook to get current block number with real-time updates
 */
export function useBlockNumber() {
  const { api, status } = usePolkadot()
  const [blockNumber, setBlockNumber] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api || status !== 'connected') return

    let unsub: any

    const subscribe = async () => {
      try {
        unsub = await api.rpc.chain.subscribeNewHeads((header) => {
          setBlockNumber(header.number.toNumber())
          setLoading(false)
        })
      } catch (error) {
        console.error('Error subscribing to blocks:', error)
        setLoading(false)
      }
    }

    subscribe()

    return () => {
      if (unsub) unsub()
    }
  }, [api, status])

  return { blockNumber, loading }
}

/**
 * Hook to get account balance with real-time updates
 */
export function useBalance(address?: string) {
  const { api, status } = usePolkadot()
  const [balance, setBalance] = useState({
    free: '0',
    reserved: '0',
    frozen: '0',
    total: '0',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api || status !== 'connected' || !address) {
      setLoading(false)
      return
    }

    let unsub: any

    const subscribe = async () => {
      try {
        unsub = await api.query.system.account(address, (accountInfo: any) => {
          const free = accountInfo.data.free.toString()
          const reserved = accountInfo.data.reserved.toString()
          const frozen = accountInfo.data.frozen.toString()
          const total = (BigInt(free) + BigInt(reserved)).toString()

          setBalance({
            free,
            reserved,
            frozen,
            total,
          })
          setLoading(false)
        })
      } catch (error) {
        console.error('Error loading balance:', error)
        setLoading(false)
      }
    }

    subscribe()

    return () => {
      if (unsub) unsub()
    }
  }, [api, status, address])

  return { balance, loading }
}

/**
 * Hook to get chain information
 */
export function useChainInfo() {
  const { api, status } = usePolkadot()
  const [chainInfo, setChainInfo] = useState({
    name: '',
    tokenSymbol: '',
    tokenDecimals: 0,
    version: '',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api || status !== 'connected') return

    const loadChainInfo = async () => {
      try {
        const [chain, properties, version] = await Promise.all([
          api.rpc.system.chain(),
          api.rpc.system.properties(),
          api.rpc.system.version(),
        ])

        setChainInfo({
          name: chain.toString(),
          tokenSymbol: properties.tokenSymbol.unwrapOr(['DOT'])[0].toString(),
          tokenDecimals: Number(properties.tokenDecimals.unwrapOr([12])[0]),
          version: version.toString(),
        })
        setLoading(false)
      } catch (error) {
        console.error('Error loading chain info:', error)
        setLoading(false)
      }
    }

    loadChainInfo()
  }, [api, status])

  return { chainInfo, loading }
}

/**
 * Hook to get account nonce
 */
export function useNonce(address?: string) {
  const { api, status } = usePolkadot()
  const [nonce, setNonce] = useState<number>(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api || status !== 'connected' || !address) {
      setLoading(false)
      return
    }

    const loadNonce = async () => {
      try {
        const accountInfo: any = await api.query.system.account(address)
        setNonce(Number(accountInfo.nonce))
        setLoading(false)
      } catch (error) {
        console.error('Error loading nonce:', error)
        setLoading(false)
      }
    }

    loadNonce()
  }, [api, status, address])

  return { nonce, loading }
}

/**
 * Hook to subscribe to events
 */
export function useEvents(limit: number = 10) {
  const { api, status } = usePolkadot()
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api || status !== 'connected') return

    let unsub: any
    const eventList: any[] = []

    const subscribe = async () => {
      try {
        unsub = await api.query.system.events((events: any) => {
          events.forEach((record: any) => {
            const { event } = record
            eventList.unshift({
              section: event.section,
              method: event.method,
              data: event.data.toString(),
              timestamp: Date.now(),
            })
            
            if (eventList.length > limit) {
              eventList.pop()
            }
          })
          setEvents([...eventList])
          setLoading(false)
        })
      } catch (error) {
        console.error('Error subscribing to events:', error)
        setLoading(false)
      }
    }

    subscribe()

    return () => {
      if (unsub) unsub()
    }
  }, [api, status, limit])

  return { events, loading }
}

/**
 * Hook to get staking information
 */
export function useStakingInfo() {
  const { api, status } = usePolkadot()
  const [stakingInfo, setStakingInfo] = useState({
    validatorCount: 0,
    activeEra: 0,
    minNominatorBond: '0',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api || status !== 'connected') return

    const loadStakingInfo = async () => {
      try {
        const [validatorCount, activeEra, minNominatorBond] = await Promise.all([
          api.query.staking?.validatorCount?.() || Promise.resolve(0),
          api.query.staking?.activeEra?.() || Promise.resolve(null),
          api.query.staking?.minNominatorBond?.() || Promise.resolve('0'),
        ])

        setStakingInfo({
          validatorCount: Number(validatorCount),
          activeEra: activeEra ? Number((activeEra as any).unwrapOr({ index: 0 }).index) : 0,
          minNominatorBond: minNominatorBond.toString(),
        })
        setLoading(false)
      } catch (error) {
        console.error('Error loading staking info:', error)
        setLoading(false)
      }
    }

    loadStakingInfo()
  }, [api, status])

  return { stakingInfo, loading }
}
