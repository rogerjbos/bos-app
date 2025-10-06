import React, { useEffect, useState } from 'react'
import { useTypink } from 'typink'
import { usePolkadot } from '../providers/PolkadotProvider'
import { motion } from 'framer-motion'
import { Wallet, Copy, Check, ExternalLink, User, Send } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '../components/ui/Dialog'
import Identicon from '@polkadot/react-identicon'
import { formatBalance } from '@polkadot/util'
import { web3FromAddress } from '@polkadot/extension-dapp'

interface AccountData {
  address: string
  name?: string
  source: string
  balance: string
  free: string
  reserved: string
  frozen: string
  nonce: number
}

export default function Accounts() {
  const { accounts, connectedAccount, setConnectedAccount } = useTypink()
  const { api } = usePolkadot()
  const [accountsData, setAccountsData] = useState<AccountData[]>([])
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferTo, setTransferTo] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferStatus, setTransferStatus] = useState('')

  useEffect(() => {
    if (!api || accounts.length === 0) return

    const loadAccountData = async () => {
      const data = await Promise.all(
        accounts.map(async (account) => {
          try {
            const accountInfo: any = await api.query.system.account(account.address)
            return {
              address: account.address,
              name: account.name,
              source: account.source,
              balance: formatBalance(accountInfo.data.free.toString(), { withSi: true }),
              free: formatBalance(accountInfo.data.free.toString(), { withSi: true }),
              reserved: formatBalance(accountInfo.data.reserved.toString(), { withSi: true }),
              frozen: formatBalance(accountInfo.data.frozen.toString(), { withSi: true }),
              nonce: Number(accountInfo.nonce),
            }
          } catch (error) {
            console.error('Error loading account:', error)
            return {
              address: account.address,
              name: account.name,
              source: account.source,
              balance: '0',
              free: '0',
              reserved: '0',
              frozen: '0',
              nonce: 0,
            }
          }
        })
      )
      setAccountsData(data)
    }

    loadAccountData()

    // Refresh every 30 seconds
    const interval = setInterval(loadAccountData, 30000)
    return () => clearInterval(interval)
  }, [api, accounts])

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address)
    setCopiedAddress(address)
    setTimeout(() => setCopiedAddress(null), 2000)
  }

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 8)}...${address.slice(-8)}`
  }

  const handleTransfer = async () => {
    if (!api || !connectedAccount) return
    
    try {
      setTransferStatus('Preparing transaction...')
      
      const injector = await web3FromAddress(connectedAccount.address)
      
      // Parse amount (assuming it's in the base unit, e.g., DOT)
      const amount = parseFloat(transferAmount) * Math.pow(10, 10) // 10 decimals for DOT
      
      setTransferStatus('Signing transaction...')
      
      const transfer = api.tx.balances.transferKeepAlive(transferTo, amount)
      
      await transfer.signAndSend(
        connectedAccount.address,
        { signer: injector.signer },
        ({ status, events }) => {
          if (status.isInBlock) {
            setTransferStatus(`In block: ${status.asInBlock.toString().slice(0, 10)}...`)
          } else if (status.isFinalized) {
            setTransferStatus('Transfer finalized! ✅')
            setTimeout(() => {
              setTransferOpen(false)
              setTransferStatus('')
              setTransferTo('')
              setTransferAmount('')
            }, 3000)
          }
        }
      )
    } catch (error: any) {
      setTransferStatus(`Error: ${error.message}`)
    }
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  }

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 border border-white/10"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <User className="w-8 h-8 text-pink-500" />
              <h1 className="text-4xl font-bold text-gradient">Your Accounts</h1>
            </div>
            <p className="text-gray-400 text-lg">
              {accounts.length > 0 
                ? `Managing ${accounts.length} account${accounts.length !== 1 ? 's' : ''} from your connected wallet${accounts.length !== 1 ? 's' : ''}`
                : 'Connect your wallet to see your accounts'}
            </p>
          </div>
          {connectedAccount && (
            <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
              <DialogTrigger asChild>
                <Button variant="gradient" size="lg" className="gap-2">
                  <Send className="w-5 h-5" />
                  Send Transfer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="text-gradient">Send Transfer</DialogTitle>
                  <DialogDescription>
                    Send tokens from {connectedAccount.name || 'your account'}
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Recipient Address
                    </label>
                    <input
                      type="text"
                      value={transferTo}
                      onChange={(e) => setTransferTo(e.target.value)}
                      placeholder="5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY"
                      className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:border-pink-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Amount (DOT)
                    </label>
                    <input
                      type="number"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      placeholder="1.0"
                      step="0.1"
                      min="0"
                      className="w-full px-4 py-2 rounded-lg bg-black/40 border border-white/10 text-white focus:border-pink-500 focus:outline-none"
                    />
                  </div>
                  {transferStatus && (
                    <div className="p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm">
                      {transferStatus}
                    </div>
                  )}
                  <Button
                    variant="gradient"
                    className="w-full"
                    onClick={handleTransfer}
                    disabled={!transferTo || !transferAmount || !!transferStatus}
                  >
                    Send Transfer
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </motion.div>

      {/* Accounts Grid */}
      {accounts.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-dark rounded-2xl p-12 border border-white/10 text-center"
        >
          <Wallet className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-semibold text-white mb-2">No Accounts Connected</h3>
          <p className="text-gray-400 mb-6">
            Connect your wallet to view and manage your accounts
          </p>
          <Button variant="gradient" size="lg">
            Connect Wallet
          </Button>
        </motion.div>
      ) : (
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {accountsData.map((account) => {
            const isActive = connectedAccount?.address === account.address

            return (
              <motion.div key={account.address} variants={item}>
                <Card className={`glass-dark transition-all duration-300 ${
                  isActive 
                    ? 'border-pink-500 shadow-lg shadow-pink-500/20' 
                    : 'border-white/10 hover:border-violet-500/50'
                }`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <Identicon
                          value={account.address}
                          size={56}
                          theme="polkadot"
                        />
                        <div>
                          <CardTitle className="text-white flex items-center gap-2">
                            {account.name || 'Unnamed Account'}
                            {isActive && (
                              <span className="px-2 py-0.5 text-xs rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
                                Active
                              </span>
                            )}
                          </CardTitle>
                          <CardDescription className="mt-1 font-mono text-xs">
                            {truncateAddress(account.address)}
                          </CardDescription>
                          <div className="mt-1 text-xs text-gray-500">
                            from {account.source}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Balance */}
                    <div className="p-4 rounded-lg bg-gradient-to-br from-pink-500/10 to-violet-500/10 border border-white/10">
                      <div className="text-sm text-gray-400 mb-1">Total Balance</div>
                      <div className="text-2xl font-bold text-gradient">
                        {account.balance}
                      </div>
                    </div>

                    {/* Detailed Breakdown */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-xs text-gray-400 mb-1">Free</div>
                        <div className="text-sm font-semibold text-white">{account.free}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-xs text-gray-400 mb-1">Reserved</div>
                        <div className="text-sm font-semibold text-white">{account.reserved}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-xs text-gray-400 mb-1">Frozen</div>
                        <div className="text-sm font-semibold text-white">{account.frozen}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                        <div className="text-xs text-gray-400 mb-1">Nonce</div>
                        <div className="text-sm font-semibold text-white">{account.nonce}</div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      {!isActive && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => setConnectedAccount(account)}
                        >
                          Set as Active
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyAddress(account.address)}
                        className="gap-2"
                      >
                        {copiedAddress === account.address ? (
                          <>
                            <Check className="w-4 h-4 text-green-400" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(`https://polkadot.subscan.io/account/${account.address}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      )}
    </div>
  )
}
