import React from 'react'
import ConnectWallet from '../components/ConnectWallet'

export default function WalletPage(){
  return (
    <div style={{display:'grid',gap:16}}>
      <ConnectWallet />
      <div className="card">
        <h3>Quick start</h3>
        <p style={{color:'#9aa4b2'}}>Use the Connect Wallet button to request accounts from the Polkadot extension. After connecting, you can use @polkadot/api to query chain state.</p>
      </div>
    </div>
  )
}
