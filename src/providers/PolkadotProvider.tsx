import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { ApiPromise, WsProvider } from '@polkadot/api'

const DEFAULT_WS = 'wss://rpc.polkadot.io'

type ProviderState = {
  api: ApiPromise | null
  status: 'not-connected' | 'connecting' | 'connected' | 'error'
}

const PolkadotContext = createContext<ProviderState>({ api: null, status: 'not-connected' })

export function usePolkadot() {
  return useContext(PolkadotContext)
}

export function PolkadotProvider({ children, endpoint = DEFAULT_WS }: { children: React.ReactNode; endpoint?: string }){
  const [api, setApi] = useState<ApiPromise | null>(null)
  const [status, setStatus] = useState<ProviderState['status']>('not-connected')

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setStatus('connecting')
      try {
        const provider = new WsProvider(endpoint)
        const apiInstance = await ApiPromise.create({ provider })
        await apiInstance.isReady
        if (!mounted) return
        setApi(apiInstance)
        setStatus('connected')
      } catch (e) {
        console.error('Failed to connect to Polkadot API', e)
        setStatus('error')
      }
    })()
    return () => { mounted = false; if (api) api.disconnect() }
  }, [endpoint])

  const value = useMemo(() => ({ api, status }), [api, status])

  return <PolkadotContext.Provider value={value}>{children}</PolkadotContext.Provider>
}
