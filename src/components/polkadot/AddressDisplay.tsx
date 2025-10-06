import React, { useState } from 'react'
import { Copy, Check, ExternalLink } from 'lucide-react'
import Identicon from '@polkadot/react-identicon'
import { Button } from '../ui/Button'

interface AddressDisplayProps {
  address: string
  name?: string
  showIdenticon?: boolean
  showCopy?: boolean
  showExplorer?: boolean
  truncate?: boolean | number
  className?: string
  explorerUrl?: string
}

export function AddressDisplay({
  address,
  name,
  showIdenticon = true,
  showCopy = true,
  showExplorer = false,
  truncate = true,
  className = '',
  explorerUrl = 'https://polkadot.subscan.io/account',
}: AddressDisplayProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const formatAddress = (addr: string) => {
    if (!truncate) return addr
    const length = typeof truncate === 'number' ? truncate : 8
    return `${addr.slice(0, length)}...${addr.slice(-length)}`
  }

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {showIdenticon && (
        <Identicon value={address} size={32} theme="polkadot" />
      )}
      <div className="flex flex-col">
        {name && (
          <span className="text-sm font-semibold text-white">{name}</span>
        )}
        <span className={`font-mono text-xs ${name ? 'text-gray-400' : 'text-white'}`}>
          {formatAddress(address)}
        </span>
      </div>
      {showCopy && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-8 w-8 p-0"
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-400" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </Button>
      )}
      {showExplorer && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => window.open(`${explorerUrl}/${address}`, '_blank')}
          className="h-8 w-8 p-0"
        >
          <ExternalLink className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}

export default AddressDisplay
