import React, { useEffect, useState } from 'react'
import { usePolkadot } from '../../providers/PolkadotProvider'
import { Activity } from 'lucide-react'

interface BlockNumberProps {
  showIcon?: boolean
  className?: string
  format?: 'full' | 'short'
}

export function BlockNumber({ showIcon = true, className = '', format = 'full' }: BlockNumberProps) {
  const { api, status } = usePolkadot()
  const [blockNumber, setBlockNumber] = useState<number>(0)
  const [isLive, setIsLive] = useState(false)

  useEffect(() => {
    if (!api || status !== 'connected') return

    let unsub: any

    const subscribe = async () => {
      unsub = await api.rpc.chain.subscribeNewHeads((header) => {
        setBlockNumber(header.number.toNumber())
        setIsLive(true)
        setTimeout(() => setIsLive(false), 500)
      })
    }

    subscribe()

    return () => {
      if (unsub) unsub()
    }
  }, [api, status])

  const formatNumber = (num: number) => {
    if (format === 'short' && num >= 1000000) {
      return `${(num / 1000000).toFixed(2)}M`
    } else if (format === 'short' && num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return num.toLocaleString()
  }

  if (status !== 'connected' || blockNumber === 0) {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        {showIcon && <Activity className="w-4 h-4 text-gray-500 animate-pulse" />}
        <span className="text-gray-500 font-mono">...</span>
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showIcon && (
        <Activity className={`w-4 h-4 text-pink-500 ${isLive ? 'animate-pulse' : ''}`} />
      )}
      <span className="font-mono font-semibold text-white">
        #{formatNumber(blockNumber)}
      </span>
    </div>
  )
}

export default BlockNumber
