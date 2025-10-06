import React, { useEffect, useState } from 'react'
import { usePolkadot } from '../providers/PolkadotProvider'

export default function BalanceDisplay({address}:{address:string}){
  const { api, status } = usePolkadot()
  const [balance, setBalance] = useState<string | null>(null)

  useEffect(()=>{
    // api.query returns either an unsubscribe function or a Codec value depending
    // on whether a callback is provided. We treat unsub as any and defensively
    // call it if it's a function.
    let unsub: any = null
    if (!api || status !== 'connected') return
    ;(async ()=>{
      try{
        unsub = await api.query.system.account(address, (info:any) => {
          setBalance(info?.data?.free?.toString() ?? null)
        })
      }catch(e){
        console.error('Balance error', e)
      }
    })()
    return ()=>{ if (typeof unsub === 'function') unsub() }
  },[api, status, address])

  return (
    <div className="card">
      <h4>Balances</h4>
      <div>{balance ? balance : <span style={{color:'#9aa4b2'}}>Not available</span>}</div>
    </div>
  )
}
