import React from 'react'
import { usePolkadot } from '../providers/PolkadotProvider'

export function RequireConnection({children, fallback, loadingFallback}:{children:React.ReactNode; fallback:React.ReactNode; loadingFallback?:React.ReactNode}){
  const { status } = usePolkadot()
  if(status === 'connecting') return <>{loadingFallback ?? <div>Connecting...</div>}</>
  return <>{status === 'connected' ? children : fallback}</>
}

export default RequireConnection
