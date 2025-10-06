import React from 'react'
import { usePolkadot } from '../providers/PolkadotProvider'

export default function NetworkIndicator(){
  const { status, api } = usePolkadot()
  return (
    <div className="card">
      <strong>Network</strong>
      <div style={{marginTop:8}}>
        <div>Status: {status}</div>
        <div>Endpoint: {api? (api as any)._options?.provider?.endpoint ?? 'connected' : 'disconnected'}</div>
      </div>
    </div>
  )
}
