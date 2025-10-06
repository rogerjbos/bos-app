import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Code, Copy, Check, Book, Zap, Database, Send } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'

interface CodeExample {
  title: string
  description: string
  code: string
  category: 'query' | 'transaction' | 'subscription' | 'hook'
}

const examples: CodeExample[] = [
  {
    title: 'Query Chain Data',
    description: 'Fetch current block number and chain information',
    category: 'query',
    code: `import { usePolkadot } from './providers/PolkadotProvider'

function MyComponent() {
  const { api } = usePolkadot()
  const [blockNumber, setBlockNumber] = useState(0)

  useEffect(() => {
    if (!api) return
    
    const fetchBlock = async () => {
      const header = await api.rpc.chain.getHeader()
      setBlockNumber(header.number.toNumber())
    }
    
    fetchBlock()
  }, [api])

  return <div>Block: {blockNumber}</div>
}`
  },
  {
    title: 'Subscribe to New Blocks',
    description: 'Real-time subscription to new block headers',
    category: 'subscription',
    code: `import { usePolkadot } from './providers/PolkadotProvider'

function BlockSubscriber() {
  const { api } = usePolkadot()
  const [block, setBlock] = useState(0)

  useEffect(() => {
    if (!api) return
    let unsub: any

    api.rpc.chain.subscribeNewHeads((header) => {
      setBlock(header.number.toNumber())
    }).then((u) => { unsub = u })

    return () => { if (unsub) unsub() }
  }, [api])

  return <div>Latest: #{block}</div>
}`
  },
  {
    title: 'Query Account Balance',
    description: 'Fetch and display account balance with formatting',
    category: 'query',
    code: `import { usePolkadot } from './providers/PolkadotProvider'
import { formatBalance } from '@polkadot/util'

function BalanceDisplay({ address }: { address: string }) {
  const { api } = usePolkadot()
  const [balance, setBalance] = useState('')

  useEffect(() => {
    if (!api) return

    const loadBalance = async () => {
      const { data } = await api.query.system.account(address)
      setBalance(formatBalance(data.free, { 
        withSi: true 
      }))
    }

    loadBalance()
  }, [api, address])

  return <div>Balance: {balance}</div>
}`
  },
  {
    title: 'Send Transfer Transaction',
    description: 'Sign and send a balance transfer with the connected account',
    category: 'transaction',
    code: `import { usePolkadot } from './providers/PolkadotProvider'
import { useTypink } from 'typink'
import { web3FromAddress } from '@polkadot/extension-dapp'

function TransferButton({ to, amount }: Props) {
  const { api } = usePolkadot()
  const { connectedAccount } = useTypink()
  const [status, setStatus] = useState('')

  const handleTransfer = async () => {
    if (!api || !connectedAccount) return
    
    try {
      setStatus('Signing...')
      const injector = await web3FromAddress(
        connectedAccount.address
      )
      
      const transfer = api.tx.balances.transferKeepAlive(
        to,
        amount
      )
      
      await transfer.signAndSend(
        connectedAccount.address,
        { signer: injector.signer },
        ({ status }) => {
          if (status.isInBlock) {
            setStatus('In block!')
          }
        }
      )
    } catch (error) {
      setStatus('Error: ' + error.message)
    }
  }

  return (
    <div>
      <button onClick={handleTransfer}>
        Send Transfer
      </button>
      <div>{status}</div>
    </div>
  )
}`
  },
  {
    title: 'Subscribe to Account Balance',
    description: 'Real-time balance updates for connected account',
    category: 'subscription',
    code: `import { usePolkadot } from './providers/PolkadotProvider'
import { useTypink } from 'typink'
import { formatBalance } from '@polkadot/util'

function LiveBalance() {
  const { api } = usePolkadot()
  const { connectedAccount } = useTypink()
  const [balance, setBalance] = useState('')

  useEffect(() => {
    if (!api || !connectedAccount) return
    let unsub: any

    api.query.system.account(
      connectedAccount.address,
      ({ data }) => {
        setBalance(formatBalance(data.free, { 
          withSi: true 
        }))
      }
    ).then((u) => { unsub = u })

    return () => { if (unsub) unsub() }
  }, [api, connectedAccount])

  return <div>Balance: {balance}</div>
}`
  },
  {
    title: 'Use Wallet Hook',
    description: 'Access wallet state and connection methods with Typink',
    category: 'hook',
    code: `import { useTypink } from 'typink'

function WalletInfo() {
  const {
    wallets,           // All available wallets
    connectedWallets,  // Currently connected
    accounts,          // All accounts
    connectedAccount,  // Active account
    connectWallet,     // Connect function
    disconnect,        // Disconnect function
  } = useTypink()

  return (
    <div>
      <div>Wallets: {wallets.length}</div>
      <div>Connected: {connectedWallets.length}</div>
      <div>Accounts: {accounts.length}</div>
      {connectedAccount && (
        <div>Active: {connectedAccount.name}</div>
      )}
    </div>
  )
}`
  },
  {
    title: 'Query Staking Info',
    description: 'Fetch staking data including validators and era',
    category: 'query',
    code: `import { usePolkadot } from './providers/PolkadotProvider'

function StakingInfo() {
  const { api } = usePolkadot()
  const [staking, setStaking] = useState({
    validators: 0,
    era: 0
  })

  useEffect(() => {
    if (!api) return

    const loadStaking = async () => {
      const [validators, activeEra] = await Promise.all([
        api.query.staking.validatorCount(),
        api.query.staking.activeEra()
      ])
      
      setStaking({
        validators: validators.toNumber(),
        era: activeEra.unwrapOr({ index: 0 })
          .index.toNumber()
      })
    }

    loadStaking()
  }, [api])

  return (
    <div>
      <div>Validators: {staking.validators}</div>
      <div>Era: {staking.era}</div>
    </div>
  )
}`
  },
  {
    title: 'Estimate Transaction Fees',
    description: 'Calculate fees before sending a transaction',
    category: 'query',
    code: `import { usePolkadot } from './providers/PolkadotProvider'
import { formatBalance } from '@polkadot/util'

function FeeEstimator({ to, amount, from }: Props) {
  const { api } = usePolkadot()
  const [fee, setFee] = useState('')

  useEffect(() => {
    if (!api || !from) return

    const estimateFee = async () => {
      const transfer = api.tx.balances.transferKeepAlive(
        to,
        amount
      )
      
      const info = await transfer.paymentInfo(from)
      
      setFee(formatBalance(info.partialFee, { 
        withSi: true 
      }))
    }

    estimateFee()
  }, [api, to, amount, from])

  return <div>Estimated Fee: {fee}</div>
}`
  }
]

export default function Examples() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const copyToClipboard = (code: string, index: number) => {
    navigator.clipboard.writeText(code)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const categories = ['all', 'query', 'transaction', 'subscription', 'hook']
  
  const filteredExamples = selectedCategory === 'all' 
    ? examples 
    : examples.filter(ex => ex.category === selectedCategory)

  const categoryIcons = {
    query: Database,
    transaction: Send,
    subscription: Zap,
    hook: Code,
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass rounded-2xl p-8 border border-white/10"
      >
        <div className="flex items-center gap-3 mb-4">
          <Book className="w-8 h-8 text-pink-500" />
          <h1 className="text-4xl font-bold text-gradient">Code Examples</h1>
        </div>
        <p className="text-gray-400 text-lg">
          Copy-paste ready examples for common Polkadot operations. All examples use the Polkadot.js API and Typink wallet integration.
        </p>
      </motion.div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-3">
        {categories.map((category) => (
          <Button
            key={category}
            variant={selectedCategory === category ? 'gradient' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category)}
            className="capitalize"
          >
            {category}
          </Button>
        ))}
      </div>

      {/* Examples Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredExamples.map((example, index) => {
          const Icon = categoryIcons[example.category]
          return (
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
                        <Icon className="w-5 h-5 text-white" />
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
                <CardContent>
                  <div className="relative">
                    <pre className="bg-black/40 rounded-lg p-4 overflow-x-auto text-sm border border-white/5">
                      <code className="text-gray-300 font-mono">
                        {example.code}
                      </code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 bg-black/60 hover:bg-black/80"
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
                  <div className="mt-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-500/10 text-pink-400 border border-pink-500/20 capitalize">
                      {example.category}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )
        })}
      </div>

      {/* Resources Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-dark rounded-2xl p-8 border border-white/10"
      >
        <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
          <Book className="w-6 h-6 text-violet-500" />
          Learn More
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-300">
          <a 
            href="https://polkadot.js.org/docs/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-pink-500/50"
          >
            <div className="font-semibold text-white mb-1">Polkadot.js Documentation</div>
            <div className="text-sm text-gray-400">Complete API reference and guides</div>
          </a>
          <a 
            href="https://wiki.polkadot.network/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-violet-500/50"
          >
            <div className="font-semibold text-white mb-1">Polkadot Wiki</div>
            <div className="text-sm text-gray-400">Learn about Polkadot ecosystem</div>
          </a>
          <a 
            href="https://github.com/dedotdev/typink" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-cyan-500/50"
          >
            <div className="font-semibold text-white mb-1">Typink GitHub</div>
            <div className="text-sm text-gray-400">Multi-wallet library documentation</div>
          </a>
          <a 
            href="https://substrate.io/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="p-4 rounded-lg bg-white/5 hover:bg-white/10 transition-all border border-white/10 hover:border-lime-500/50"
          >
            <div className="font-semibold text-white mb-1">Substrate Documentation</div>
            <div className="text-sm text-gray-400">Build your own blockchain</div>
          </a>
        </div>
      </motion.div>
    </div>
  )
}
