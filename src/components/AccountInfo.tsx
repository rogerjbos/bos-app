import React from 'react'

export default function AccountInfo({address, name}:{address:string; name?:string}){
  return (
    <div className="card">
      <h4>Account</h4>
      <div><strong>Address:</strong> <code style={{color:'#9ae6ff'}}>{address}</code></div>
      {name && <div><strong>Name:</strong> {name}</div>}
    </div>
  )
}
