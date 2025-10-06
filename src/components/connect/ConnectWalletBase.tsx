import React from 'react'
import { Button } from '../ui/Button'
import { cn } from '../../lib/utils'

export type WalletInfo = {id:string; name:string; installed:boolean; installUrl?:string; logo?:string}
export type AccountInfo = {address:string; name?:string; source:string}

export type ConnectWalletServices = {
  wallets: WalletInfo[];
  connectedWallets: WalletInfo[];
  accounts: AccountInfo[];
  connectedAccount?: AccountInfo | null;
  connectWallet: (id:string)=>Promise<void>;
  disconnect: (id?:string)=>void;
  setConnectedAccount: (a:AccountInfo)=>void;
}

export function ConnectWalletBase({services, placeholder='Connect'}:{services:ConnectWalletServices; placeholder?:string}){
  const {connectedAccount} = services

  return (
    <div>
      <Button variant="default">{placeholder} {connectedAccount?.name?`(${connectedAccount.name})`:''}</Button>
      <div style={{marginTop:12}}>
        <div className="card">
          <h4>Connected wallets</h4>
          <div style={{display:'grid',gap:8}}>
            {services.wallets.map(w=> (
              <div key={w.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                <div>{w.name}</div>
                <div>
                  {w.installed ? <button onClick={()=>services.connectWallet(w.id)}>Connect</button> : <a href={w.installUrl} target="_blank" rel="noreferrer">Install</a>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div style={{marginTop:12}} className="card">
          <h4>Accounts</h4>
          {services.accounts.length===0 ? <div style={{color:'#9aa4b2'}}>No accounts</div> : services.accounts.map(a=> (
            <div key={a.address} style={{display:'flex',justifyContent:'space-between'}}>
              <div>{a.name ?? a.address}</div>
              <div><button onClick={()=>services.setConnectedAccount(a)}>Use</button></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ConnectWalletBase
