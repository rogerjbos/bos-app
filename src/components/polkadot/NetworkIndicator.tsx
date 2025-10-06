import React from 'react'
import { usePolkadot } from '../../providers/PolkadotProvider'
import { Zap, WifiOff, Loader2 } from 'lucide-react'

interface NetworkIndicatorProps {
  showLabel?: boolean
  className?: string
}

export function NetworkIndicator({ showLabel = true, className = '' }: NetworkIndicatorProps) {
  const { status } = usePolkadot()

  const displayStatus = status === 'connected' ? 'connected' : status === 'error' ? 'error' : 'connecting'

  const statusConfig = {
    connected: {
      icon: Zap,
      color: 'text-green-400',
      bgColor: 'bg-green-400/10',
      borderColor: 'border-green-400/20',
      label: 'Connected',
      pulse: true,
    },
    connecting: {
      icon: Loader2,
      color: 'text-yellow-400',
      bgColor: 'bg-yellow-400/10',
      borderColor: 'border-yellow-400/20',
      label: 'Connecting...',
      pulse: false,
      spin: true,
    },
    error: {
      icon: WifiOff,
      color: 'text-red-400',
      bgColor: 'bg-red-400/10',
      borderColor: 'border-red-400/20',
      label: 'Disconnected',
      pulse: false,
    },
  }

  const config = statusConfig[displayStatus]
  const Icon = config.icon

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${config.bgColor} ${config.borderColor} ${className}`}>
      <div className="relative">
        <Icon className={`w-4 h-4 ${config.color} ${'spin' in config && config.spin ? 'animate-spin' : ''}`} />
        {config.pulse && (
          <span className="absolute inset-0 w-4 h-4">
            <span className={`absolute inset-0 rounded-full ${config.bgColor} animate-ping`} />
          </span>
        )}
      </div>
      {showLabel && (
        <span className={`text-sm font-medium ${config.color}`}>
          {config.label}
        </span>
      )}
    </div>
  )
}

export default NetworkIndicator
