import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { useTypink } from 'typink'
import { Package, Copy, Check, Code, Wallet, CreditCard, Hash, User, Send, Network, AlertCircle, List } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import NetworkIndicator from '../components/polkadot/NetworkIndicator'
import BlockNumber from '../components/polkadot/BlockNumber'
import BalanceDisplay from '../components/polkadot/BalanceDisplay'
import AddressDisplay from '../components/polkadot/AddressDisplay'
import { useBlockNumber, useBalance, useChainInfo, useStakingInfo, useNonce, useEvents } from '../hooks/usePolkadot'

interface ComponentExample {
  title: string
  description: string
  component: React.ReactNode
  code: string
  category: 'component' | 'hook' | 'wallet' | 'transaction' | 'input' | 'display'
  icon?: React.ReactNode
  href?: string
}

export default function Components() {
  const { connectedAccount } = useTypink()
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  // Hook examples
  const { blockNumber } = useBlockNumber()
  const { balance } = useBalance(connectedAccount?.address)
  const { chainInfo } = useChainInfo()
  const { stakingInfo } = useStakingInfo()
  const { nonce } = useNonce(connectedAccount?.address)
  const { events } = useEvents(5)

  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const examples: ComponentExample[] = [
    // Wallet & Account Components
    {
      title: 'ConnectWallet',
      description: 'Multi-wallet connection with account selection (Polkadot.js, Talisman, SubWallet, etc.)',
      component: (
        <div className="text-gray-400 text-sm text-center">
          <p>See the header for live example →</p>
          <p className="mt-2 text-xs">Already implemented in this template</p>
        </div>
      ),
      code: `import { ConnectWallet } from 'typink'

function App() {
  return <ConnectWallet />
}`,
      category: 'wallet',
      icon: <Wallet className="w-5 h-5" />,
      href: 'https://github.com/Polkadot-UI-Initiative/polkadot-ui/tree/main/packages/registry/registry/polkadot-ui/blocks/connect-wallet',
    },
    {
      title: 'AddressDisplay',
      description: 'Format addresses with identicon, copy, and explorer links',
      component: connectedAccount ? (
        <div className="space-y-4">
          <AddressDisplay address={connectedAccount.address} />
          <AddressDisplay address={connectedAccount.address} showCopy={false} showExplorer={false} />
        </div>
      ) : (
        <div className="text-gray-400 text-sm">Connect wallet to see address</div>
      ),
      code: `import AddressDisplay from './components/polkadot/AddressDisplay'

function MyComponent({ address }: { address: string }) {
  return (
    <>
      <AddressDisplay address={address} />
      <AddressDisplay address={address} showCopy={false} />
    </>
  )
}`,
      category: 'component',
      icon: <User className="w-5 h-5" />,
    },
    {
      title: 'RequireAccount',
      description: 'Conditional rendering based on account connection',
      component: (
        <div className="p-4 border border-polkadot-pink/20 rounded-lg bg-polkadot-pink/5">
          {connectedAccount ? (
            <div className="text-green-400">✓ Account connected: {connectedAccount.name}</div>
          ) : (
            <div className="text-yellow-400">⚠ Please connect an account</div>
          )}
        </div>
      ),
      code: `import { useTypink } from 'typink'

function MyComponent() {
  const { connectedAccount } = useTypink()
  
  if (!connectedAccount) {
    return <div>Please connect an account</div>
  }
  
  return <div>Connected: {connectedAccount.name}</div>
}`,
      category: 'wallet',
      icon: <User className="w-5 h-5" />,
      href: 'https://github.com/Polkadot-UI-Initiative/polkadot-ui/tree/main/packages/registry/registry/polkadot-ui/blocks/require-account',
    },
    {
      title: 'AccountInfo',
      description: 'Display account identity, balance, and metadata',
      component: connectedAccount ? (
        <div className="p-4 border border-polkadot-cyan/20 rounded-lg bg-polkadot-cyan/5">
          <div className="space-y-2 text-sm">
            <div><strong>Name:</strong> {connectedAccount.name || 'Unknown'}</div>
            <div><strong>Address:</strong> {connectedAccount.address.slice(0, 8)}...{connectedAccount.address.slice(-8)}</div>
            <div><strong>Source:</strong> {connectedAccount.source}</div>
          </div>
        </div>
      ) : (
        <div className="text-gray-400 text-sm">Connect wallet to see account info</div>
      ),
      code: `import { useTypink } from 'typink'

function AccountInfo() {
  const { connectedAccount } = useTypink()
  
  return (
    <div>
      <div>Name: {connectedAccount?.name}</div>
      <div>Address: {connectedAccount?.address}</div>
      <div>Source: {connectedAccount?.source}</div>
    </div>
  )
}`,
      category: 'wallet',
      icon: <User className="w-5 h-5" />,
      href: 'https://github.com/Polkadot-UI-Initiative/polkadot-ui/tree/main/packages/registry/registry/polkadot-ui/blocks/account-info',
    },

    // Network & Connection Components
    {
      title: 'NetworkIndicator',
      description: 'Display connection status with animated indicators',
      component: (
        <div className="space-y-4">
          <NetworkIndicator />
          <NetworkIndicator showLabel={false} />
        </div>
      ),
      code: `import NetworkIndicator from './components/polkadot/NetworkIndicator'

function MyComponent() {
  return (
    <>
      <NetworkIndicator />
      <NetworkIndicator showLabel={false} />
    </>
  )
}`,
      category: 'component',
      icon: <Network className="w-5 h-5" />,
    },
    {
      title: 'BlockNumber',
      description: 'Real-time block number with live updates',
      component: (
        <div className="space-y-4">
          <BlockNumber />
          <BlockNumber showIcon={false} />
          <BlockNumber format="short" />
        </div>
      ),
      code: `import BlockNumber from './components/polkadot/BlockNumber'

function MyComponent() {
  return (
    <>
      <BlockNumber />
      <BlockNumber showIcon={false} />
      <BlockNumber format="short" />
    </>
  )
}`,
      category: 'component',
      icon: <Hash className="w-5 h-5" />,
    },
    {
      title: 'RequireConnection',
      description: 'Gate content behind network connection',
      component: (
        <div className="p-4 border border-polkadot-violet/20 rounded-lg bg-polkadot-violet/5">
          <div className="text-green-400">✓ Connected to network</div>
        </div>
      ),
      code: `import { usePolkadot } from './providers/PolkadotProvider'

function MyComponent() {
  const { status } = usePolkadot()
  
  if (status !== 'connected') {
    return <div>Connecting to network...</div>
  }
  
  return <div>Connected!</div>
}`,
      category: 'component',
      icon: <Network className="w-5 h-5" />,
      href: 'https://github.com/Polkadot-UI-Initiative/polkadot-ui/tree/main/packages/registry/registry/polkadot-ui/blocks/require-connection',
    },

    // Balance & Token Components
    {
      title: 'BalanceDisplay',
      description: 'Account balance with real-time updates and formatting',
      component: connectedAccount ? (
        <div className="space-y-4">
          <BalanceDisplay address={connectedAccount.address} />
          <BalanceDisplay address={connectedAccount.address} type="detailed" showIcon={false} />
        </div>
      ) : (
        <div className="text-gray-400 text-sm">Connect wallet to see balance</div>
      ),
      code: `import BalanceDisplay from './components/polkadot/BalanceDisplay'

function MyComponent({ address }: { address: string }) {
  return (
    <>
      <BalanceDisplay address={address} />
      <BalanceDisplay address={address} type="detailed" />
    </>
  )
}`,
      category: 'display',
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      title: 'SelectToken',
      description: 'Token selection dropdown with balance display',
      component: (
        <div className="p-4 border border-polkadot-lime/20 rounded-lg bg-polkadot-lime/5">
          <div className="text-sm text-gray-400">Token selector component</div>
          <div className="text-xs mt-2">Select from available tokens with live balances</div>
        </div>
      ),
      code: `// Install from polkadot-ui
// npx polkadot-ui add select-token

import { SelectToken } from './components/polkadot/SelectToken'

function MyComponent() {
  return (
    <SelectToken 
      chainId="polkadot"
      assetIds={[1984, 1337, 7777]}
      withBalance
    />
  )
}`,
      category: 'input',
      icon: <CreditCard className="w-5 h-5" />,
      href: 'https://github.com/Polkadot-UI-Initiative/polkadot-ui/tree/main/packages/registry/registry/polkadot-ui/blocks/select-token',
    },
    {
      title: 'SelectTokenDialog',
      description: 'Dialog-based token selection with search',
      component: (
        <div className="p-4 border border-polkadot-cyan/20 rounded-lg bg-polkadot-cyan/5">
          <div className="text-sm text-gray-400">Token dialog component</div>
          <div className="text-xs mt-2">Full-screen token selector with search & filtering</div>
        </div>
      ),
      code: `// Install from polkadot-ui
// npx polkadot-ui add select-token-dialog

import { SelectTokenDialog } from './components/polkadot/SelectTokenDialog'

function MyComponent() {
  return (
    <SelectTokenDialog 
      chainId="polkadot"
      assetIds={[1984, 8, 27]}
      withBalance
      withSearch
    />
  )
}`,
      category: 'input',
      icon: <CreditCard className="w-5 h-5" />,
      href: 'https://github.com/Polkadot-UI-Initiative/polkadot-ui/tree/main/packages/registry/registry/polkadot-ui/blocks/select-token',
    },

    // Transaction Components
    {
      title: 'TxButton',
      description: 'Submit transactions with progress states and notifications',
      component: (
        <div className="p-4 border border-polkadot-pink/20 rounded-lg bg-polkadot-pink/5">
          <div className="text-sm text-gray-400">Transaction button component</div>
          <div className="text-xs mt-2">Handles signing, submission, and notifications</div>
        </div>
      ),
      code: `// Install from polkadot-ui
// npx polkadot-ui add tx-button

import { TxButton } from './components/polkadot/TxButton'
import { useTx } from 'typink'

function MyComponent() {
  const tx = useTx((tx) => tx.system.remark)
  
  return (
    <TxButton
      tx={tx}
      args={["Hello Polkadot!"]}
      networkId="polkadot"
    >
      Submit Transaction
    </TxButton>
  )
}`,
      category: 'transaction',
      icon: <Send className="w-5 h-5" />,
      href: 'https://github.com/Polkadot-UI-Initiative/polkadot-ui/tree/main/packages/registry/registry/polkadot-ui/blocks/tx-button',
    },
    {
      title: 'TxNotification',
      description: 'Transaction status notifications and toasts',
      component: (
        <div className="p-4 border border-polkadot-violet/20 rounded-lg bg-polkadot-violet/5">
          <div className="text-sm text-gray-400">Transaction notification system</div>
          <div className="text-xs mt-2">Shows signing, broadcasting, inclusion, and finalization states</div>
        </div>
      ),
      code: `// Install from polkadot-ui
// npx polkadot-ui add tx-notification

import { txStatusNotification } from './components/polkadot/TxNotification'

function MyComponent() {
  const handleTransaction = async () => {
    const notificationId = txStatusNotification({
      status: 'signing',
      title: 'Transfer',
    })
    
    // Update notification as transaction progresses
    txStatusNotification({
      id: notificationId,
      status: 'broadcasting',
    })
  }
}`,
      category: 'transaction',
      icon: <AlertCircle className="w-5 h-5" />,
      href: 'https://github.com/Polkadot-UI-Initiative/polkadot-ui/tree/main/packages/registry/registry/polkadot-ui/blocks/tx-notification',
    },

    // Input Components
    {
      title: 'AddressInput',
      description: 'Address input with SS58/Ethereum validation',
      component: (
        <div className="p-4 border border-polkadot-lime/20 rounded-lg bg-polkadot-lime/5">
          <div className="text-sm text-gray-400">Address input component</div>
          <div className="text-xs mt-2">Validates addresses and shows identity lookup</div>
        </div>
      ),
      code: `// Install from polkadot-ui
// npx polkadot-ui add address-input

import { AddressInput } from './components/polkadot/AddressInput'

function MyComponent() {
  const [address, setAddress] = useState('')
  
  return (
    <AddressInput
      value={address}
      onChange={setAddress}
      chainId="polkadot"
      withIdentityLookup
    />
  )
}`,
      category: 'input',
      icon: <Hash className="w-5 h-5" />,
      href: 'https://github.com/Polkadot-UI-Initiative/polkadot-ui/tree/main/packages/registry/registry/polkadot-ui/blocks/address-input',
    },
    {
      title: 'AmountInput',
      description: 'Token amount input with balance and max button',
      component: (
        <div className="p-4 border border-polkadot-cyan/20 rounded-lg bg-polkadot-cyan/5">
          <div className="text-sm text-gray-400">Amount input component</div>
          <div className="text-xs mt-2">Input for token amounts with max button and validation</div>
        </div>
      ),
      code: `// Install from polkadot-ui
// npx polkadot-ui add amount-input

import { AmountInput } from './components/polkadot/AmountInput'

function MyComponent() {
  const [amount, setAmount] = useState('')
  
  return (
    <AmountInput
      value={amount}
      onChange={setAmount}
      chainId="polkadot"
      assetId={1984}
      withMaxButton
    />
  )
}`,
      category: 'input',
      icon: <CreditCard className="w-5 h-5" />,
      href: 'https://github.com/Polkadot-UI-Initiative/polkadot-ui/tree/main/packages/registry/registry/polkadot-ui/blocks/amount-input',
    },

    // Custom Hooks
    {
      title: 'useBlockNumber Hook',
      description: 'Get current block number with real-time updates',
      component: (
        <div className="p-4 rounded-lg bg-black/40 border border-white/10">
          <div className="text-sm text-gray-400 mb-2">Current Block:</div>
          <div className="text-2xl font-bold text-gradient">
            #{blockNumber.toLocaleString()}
          </div>
        </div>
      ),
      code: `import { useBlockNumber } from './hooks/usePolkadot'

function MyComponent() {
  const { blockNumber, loading } = useBlockNumber()
  
  if (loading) return <div>Loading...</div>
  
  return <div>Block: #{blockNumber}</div>
}`,
      category: 'hook',
      icon: <Hash className="w-5 h-5" />,
    },
    {
      title: 'useBalance Hook',
      description: 'Get account balance with subscriptions',
      component: connectedAccount ? (
        <div className="p-4 rounded-lg bg-black/40 border border-white/10 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Free:</span>
            <span className="text-white font-mono">{balance.free}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Reserved:</span>
            <span className="text-white font-mono">{balance.reserved}</span>
          </div>
        </div>
      ) : (
        <div className="text-gray-400 text-sm">Connect wallet to see balance</div>
      ),
      code: `import { useBalance } from './hooks/usePolkadot'

function MyComponent({ address }: { address: string }) {
  const { balance, loading } = useBalance(address)
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <div>Free: {balance.free}</div>
      <div>Reserved: {balance.reserved}</div>
    </div>
  )
}`,
      category: 'hook',
      icon: <CreditCard className="w-5 h-5" />,
    },
    {
      title: 'useChainInfo Hook',
      description: 'Get chain metadata and properties',
      component: (
        <div className="p-4 rounded-lg bg-black/40 border border-white/10 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Chain:</span>
            <span className="text-white">{chainInfo.name}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Token:</span>
            <span className="text-white">{chainInfo.tokenSymbol}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Decimals:</span>
            <span className="text-white">{chainInfo.tokenDecimals}</span>
          </div>
        </div>
      ),
      code: `import { useChainInfo } from './hooks/usePolkadot'

function MyComponent() {
  const { chainInfo, loading } = useChainInfo()
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <div>Chain: {chainInfo.name}</div>
      <div>Token: {chainInfo.tokenSymbol}</div>
      <div>Decimals: {chainInfo.tokenDecimals}</div>
    </div>
  )
}`,
      category: 'hook',
      icon: <Network className="w-5 h-5" />,
    },
    {
      title: 'useStakingInfo Hook',
      description: 'Get staking metrics and validator info',
      component: (
        <div className="p-4 rounded-lg bg-black/40 border border-white/10 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Validators:</span>
            <span className="text-white">{stakingInfo.validatorCount}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Active Era:</span>
            <span className="text-white">{stakingInfo.activeEra}</span>
          </div>
        </div>
      ),
      code: `import { useStakingInfo } from './hooks/usePolkadot'

function MyComponent() {
  const { stakingInfo, loading } = useStakingInfo()
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      <div>Validators: {stakingInfo.validatorCount}</div>
      <div>Era: {stakingInfo.activeEra}</div>
    </div>
  )
}`,
      category: 'hook',
      icon: <Network className="w-5 h-5" />,
    },
    {
      title: 'useNonce Hook',
      description: 'Get account transaction nonce',
      component: connectedAccount ? (
        <div className="p-4 rounded-lg bg-black/40 border border-white/10">
          <div className="text-sm text-gray-400 mb-2">Account Nonce:</div>
          <div className="text-2xl font-bold text-white">{nonce}</div>
        </div>
      ) : (
        <div className="text-gray-400 text-sm">Connect wallet to see nonce</div>
      ),
      code: `import { useNonce } from './hooks/usePolkadot'

function MyComponent({ address }: { address: string }) {
  const { nonce, loading } = useNonce(address)
  
  if (loading) return <div>Loading...</div>
  
  return <div>Nonce: {nonce}</div>
}`,
      category: 'hook',
      icon: <Hash className="w-5 h-5" />,
    },
    {
      title: 'useEvents Hook',
      description: 'Subscribe to chain events',
      component: (
        <div className="p-4 rounded-lg bg-black/40 border border-white/10">
          <div className="text-sm text-gray-400 mb-2">Recent Events:</div>
          <div className="text-xs text-white space-y-1 max-h-20 overflow-auto">
            {events.slice(0, 3).map((event, i) => (
              <div key={i} className="truncate">{event.section}.{event.method}</div>
            ))}
          </div>
        </div>
      ),
      code: `import { useEvents } from './hooks/usePolkadot'

function MyComponent() {
  const { events, loading } = useEvents(10)
  
  if (loading) return <div>Loading...</div>
  
  return (
    <div>
      {events.map((event, i) => (
        <div key={i}>{event.section}.{event.method}</div>
      ))}
    </div>
  )
}`,
      category: 'hook',
      icon: <List className="w-5 h-5" />,
    },
  ]

  const categories = [
    { id: 'all', label: 'All Components', count: examples.length },
    { id: 'wallet', label: 'Wallet & Account', count: examples.filter(e => e.category === 'wallet').length },
    { id: 'display', label: 'Display', count: examples.filter(e => e.category === 'display').length },
    { id: 'input', label: 'Input', count: examples.filter(e => e.category === 'input').length },
    { id: 'transaction', label: 'Transaction', count: examples.filter(e => e.category === 'transaction').length },
    { id: 'component', label: 'Network', count: examples.filter(e => e.category === 'component').length },
    { id: 'hook', label: 'Hooks', count: examples.filter(e => e.category === 'hook').length },
  ]
  const filteredExamples = selectedCategory === 'all' 
    ? examples 
    : examples.filter(ex => ex.category === selectedCategory)

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 border border-white/10"
      >
        <div className="flex items-center gap-3 mb-4">
          <Package className="w-8 h-8 text-pink-500" />
          <h1 className="text-4xl font-bold text-gradient">Polkadot Components</h1>
        </div>
        <p className="text-gray-400 text-lg">
          Reusable components and hooks for building Polkadot applications. Copy the code and use them in your project.
        </p>
      </motion.div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'gradient' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
            className="capitalize"
          >
            {category.label} ({category.count})
          </Button>
        ))}
      </div>

      {/* Components Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredExamples.map((example, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="glass-dark border-white/10 hover:border-pink-500/50 transition-all duration-300 h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-gradient-polkadot">
                      <Code className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-white">{example.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {example.description}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Live Preview */}
                <div className="p-4 rounded-lg bg-black/20 border border-white/5">
                  <div className="text-xs text-gray-400 mb-3 font-semibold uppercase tracking-wide">
                    Live Preview
                  </div>
                  {example.component}
                </div>

                {/* Code */}
                <div className="relative">
                  <div className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">
                    Code
                  </div>
                  <pre className="bg-black/40 rounded-lg p-4 overflow-x-auto text-sm border border-white/5">
                    <code className="text-gray-300 font-mono text-xs">
                      {example.code}
                    </code>
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-6 right-2 bg-black/60 hover:bg-black/80"
                    onClick={() => copyToClipboard(example.code, index)}
                  >
                    {copiedIndex === index ? (
                      <>
                        <Check className="w-4 h-4 text-green-400" />
                        <span className="ml-2 text-green-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span className="ml-2">Copy</span>
                      </>
                    )}
                  </Button>
                </div>

                <div>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-500/10 text-pink-400 border border-pink-500/20 capitalize">
                    {example.category}
                  </span>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Installation Guide */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-dark rounded-2xl p-8 border border-white/10"
      >
        <h2 className="text-2xl font-bold text-white mb-4">Installation</h2>
        <p className="text-gray-300 mb-4">
          All components and hooks are included in this template. Simply copy the code and customize for your needs.
        </p>
        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="text-sm font-semibold text-white mb-1">Components Location</div>
            <code className="text-xs text-gray-400 font-mono">src/components/polkadot/</code>
          </div>
          <div className="p-4 rounded-lg bg-white/5 border border-white/10">
            <div className="text-sm font-semibold text-white mb-1">Hooks Location</div>
            <code className="text-xs text-gray-400 font-mono">src/hooks/usePolkadot.ts</code>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
