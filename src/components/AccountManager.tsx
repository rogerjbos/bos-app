import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Copy, Check, ExternalLink, Edit2, Trash2, Plus } from 'lucide-react'
import { usePolkadot } from '@/providers/PolkadotProvider'
import { useTypink } from 'typink'
import { formatAddress, copyToClipboard } from '@/lib/polkadot'
import { useBalance } from '@/hooks/useBalance'
import { cn } from '@/lib/utils'
import { Button } from './ui/Button'
import { CHAINS } from '@/config/chains'
import Identicon from '@polkadot/react-identicon'

interface Account {
  address: string
  name?: string
  source?: string
  balance?: string
}

/**
 * Account Manager Component
 * 
 * Manages multiple accounts with the following features:
 * - List all connected accounts
 * - Switch active account
 * - Show balances for each account
 * - Edit account nicknames
 * - Copy addresses
 * - View on block explorer
 * 
 * @example
 * ```tsx
 * <AccountManager />
 * ```
 */
export function AccountManager() {
  const [isOpen, setIsOpen] = useState(false)
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [editingAccount, setEditingAccount] = useState<string | null>(null)
  const [nickname, setNickname] = useState('')
  const [nicknames, setNicknames] = useState<Record<string, string>>({})

  const { accounts, connectedAccount, setConnectedAccount } = useTypink()
  const { api } = usePolkadot()

  // Load saved nicknames from localStorage
  useEffect(() => {
    const savedNicknames = JSON.parse(
      localStorage.getItem('account_nicknames') || '{}'
    )
    setNicknames(savedNicknames)
  }, [])

  const handleCopy = async (address: string) => {
    await copyToClipboard(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const handleEditNickname = (address: string, currentName?: string) => {
    setEditingAccount(address)
    setNickname(currentName || '')
  }

  const saveNickname = (address: string) => {
    const updatedNicknames = {
      ...nicknames,
      [address]: nickname
    }
    setNicknames(updatedNicknames)
    localStorage.setItem('account_nicknames', JSON.stringify(updatedNicknames))
    setEditingAccount(null)
    setNickname('')
  }

  const getExplorerUrl = (address: string) => {
    // This will be dynamic based on current network
    return `https://polkadot.subscan.io/account/${address}`
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-4 py-2 rounded-lg',
          'bg-white/5 hover:bg-white/10 border border-white/10',
          'transition-all duration-200'
        )}
      >
        <Users className="w-4 h-4 text-white/60" />
        <span className="text-sm font-medium text-white">
          {accounts.length} Account{accounts.length !== 1 ? 's' : ''}
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Dropdown */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute right-0 mt-2 w-96 max-h-[600px] overflow-auto z-50',
                'glass-dark rounded-xl border border-white/10',
                'shadow-xl'
              )}
            >
              {/* Header */}
              <div className="sticky top-0 bg-black/40 backdrop-blur-lg border-b border-white/10 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-white">Accounts</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      // Trigger wallet connection
                      setIsOpen(false)
                    }}
                  >
                    <Plus className="w-3 h-3" />
                    Connect
                  </Button>
                </div>
                <p className="text-xs text-white/40">
                  Manage your connected accounts
                </p>
              </div>

              {/* Account List */}
              <div className="p-2">
                {accounts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    <Users className="w-12 h-12 text-white/20 mb-4" />
                    <p className="text-sm text-white/60 mb-2">
                      No accounts connected
                    </p>
                    <p className="text-xs text-white/40">
                      Connect a wallet to get started
                    </p>
                  </div>
                ) : (
                  accounts.map((account) => (
                    <AccountItem
                      key={account.address}
                      account={{
                        address: account.address,
                        name: nicknames[account.address] || account.name,
                        source: account.source
                      }}
                      isActive={account.address === connectedAccount?.address}
                      onCopy={handleCopy}
                      copiedAddress={copiedAddress}
                      onEdit={handleEditNickname}
                      editingAccount={editingAccount}
                      nickname={nickname}
                      setNickname={setNickname}
                      saveNickname={saveNickname}
                      getExplorerUrl={getExplorerUrl}
                      onSelect={() => setConnectedAccount(account)}
                    />
                  ))
                )}
              </div>

              {/* Footer */}
              {accounts.length > 0 && (
                <div className="sticky bottom-0 bg-black/40 backdrop-blur-lg border-t border-white/10 p-3">
                  <div className="text-xs text-white/40 text-center">
                    Nicknames saved to localStorage
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

interface AccountItemProps {
  account: Account
  isActive: boolean
  onCopy: (address: string) => void
  copiedAddress: string | null
  onEdit: (address: string, name?: string) => void
  editingAccount: string | null
  nickname: string
  setNickname: (name: string) => void
  saveNickname: (address: string) => void
  getExplorerUrl: (address: string) => string
  onSelect: () => void
}

function AccountItem({
  account,
  isActive,
  onCopy,
  copiedAddress,
  onEdit,
  editingAccount,
  nickname,
  setNickname,
  saveNickname,
  getExplorerUrl,
  onSelect,
}: AccountItemProps) {
  const { data: balance, isLoading } = useBalance(account.address)

  const isEditing = editingAccount === account.address

  return (
    <div
      onClick={!isActive ? onSelect : undefined}
      className={cn(
        'p-3 rounded-lg mb-2 transition-all',
        isActive
          ? 'bg-gradient-to-r from-pink-500/10 to-purple-500/10 border-2 border-pink-500/30'
          : 'bg-white/5 hover:bg-white/10 border border-white/10 cursor-pointer'
      )}
    >
      <div className="flex items-start gap-3">
        {/* Identicon */}
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
          <Identicon value={account.address} size={40} theme="polkadot" />
        </div>

        <div className="flex-1 min-w-0">
          {/* Name / Edit */}
          {isEditing ? (
            <div className="flex items-center gap-2 mb-1">
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveNickname(account.address)
                  if (e.key === 'Escape') {
                    setNickname('')
                    onEdit('', '')
                  }
                }}
                className="flex-1 px-2 py-1 bg-white/10 border border-white/20 rounded text-sm text-white focus:outline-none focus:border-pink-500"
                placeholder="Enter nickname"
                autoFocus
              />
              <button
                onClick={() => saveNickname(account.address)}
                className="text-green-400 hover:text-green-300"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-medium text-white truncate">
                {account.name || 'Unnamed Account'}
              </span>
              {isActive && (
                <span className="px-2 py-0.5 text-xs font-semibold text-pink-400 bg-pink-500/10 border border-pink-500/20 rounded">
                  Active
                </span>
              )}
            </div>
          )}

          {/* Address */}
          <div className="text-xs text-white/60 font-mono mb-2">
            {formatAddress(account.address, 8, 8)}
          </div>

          {/* Balance */}
          <div className="text-sm font-semibold text-white mb-3">
            {isLoading ? (
              <div className="h-4 w-24 bg-white/10 animate-pulse rounded" />
            ) : (
              <span>
                {balance ? (parseFloat(balance.total) / 1e10).toFixed(4) : '0.0000'} DOT
              </span>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCopy(account.address)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
            >
              {copiedAddress === account.address ? (
                <>
                  <Check className="w-3 h-3" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  Copy
                </>
              )}
            </button>

            <button
              onClick={() => onEdit(account.address, account.name)}
              className="flex items-center gap-1 px-2 py-1 text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
            >
              <Edit2 className="w-3 h-3" />
              Edit
            </button>

            <a
              href={getExplorerUrl(account.address)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-2 py-1 text-xs text-white/60 hover:text-white bg-white/5 hover:bg-white/10 rounded transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              Explorer
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AccountManager
