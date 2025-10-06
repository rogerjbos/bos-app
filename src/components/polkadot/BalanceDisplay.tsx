import React, { useEffect, useState } from 'react'
import { usePolkadot } from '../../providers/PolkadotProvider'
import { formatBalance } from '@polkadot/util'
import { Wallet, Loader2 } from 'lucide-react'

interface BalanceDisplayProps {
  address: string
  showIcon?: boolean
  className?: string
  type?: 'free' | 'total' | 'detailed'
}

export function BalanceDisplay({ 
  address, 
  showIcon = true, 
  className = '', 
  type = 'free' 
}: BalanceDisplayProps) {
  const { api, status } = usePolkadot()
  const [balance, setBalance] = useState({
    free: '0',
    reserved: '0',
    frozen: '0',
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api || status !== 'connected' || !address) return

    let unsub: any

    const subscribe = async () => {
      try {
        unsub = await api.query.system.account(address, (accountInfo: any) => {
          setBalance({
            free: formatBalance(accountInfo.data.free.toString(), { withSi: true }),
            reserved: formatBalance(accountInfo.data.reserved.toString(), { withSi: true }),
            frozen: formatBalance(accountInfo.data.frozen.toString(), { withSi: true }),
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

  if (loading || status !== 'connected') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {showIcon && <Loader2 className="w-4 h-4 text-gray-500 animate-spin" />}
        <span className="text-gray-500">Loading...</span>
      </div>
    )
  }

  if (type === 'detailed') {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Free:</span>
          <span className="font-semibold text-white">{balance.free}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Reserved:</span>
          <span className="font-semibold text-white">{balance.reserved}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-400">Frozen:</span>
          <span className="font-semibold text-white">{balance.frozen}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showIcon && <Wallet className="w-4 h-4 text-violet-500" />}
      <span className="font-semibold text-white">{balance.free}</span>
    </div>
  )
}

export default BalanceDisplay
