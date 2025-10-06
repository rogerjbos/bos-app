# Quick Start Examples

Ready-to-use code snippets for common Polkadot development tasks. Just copy, paste, and customize!

## 📋 Table of Contents

- [Basic Setup](#basic-setup)
- [Wallet Connection](#wallet-connection)
- [Fetching Data](#fetching-data)
- [Displaying Components](#displaying-components)
- [Transactions](#transactions)
- [Real-time Subscriptions](#real-time-subscriptions)
- [Formatting & Utilities](#formatting--utilities)

## 🚀 Basic Setup

### Connect to a Different Network

```typescript
// In src/main.tsx or where PolkadotProvider is used
import { PolkadotProvider } from './providers/PolkadotProvider'
import { KUSAMA, WESTEND } from './config/chains'

// Use Kusama
<PolkadotProvider endpoint={KUSAMA.endpoint}>
  <App />
</PolkadotProvider>

// Use Westend testnet
<PolkadotProvider endpoint={WESTEND.endpoint}>
  <App />
</PolkadotProvider>

// Use custom endpoint
<PolkadotProvider endpoint="wss://your-node.com">
  <App />
</PolkadotProvider>
```

### Access API in Components

```typescript
import { usePolkadot } from './providers/PolkadotProvider'

function MyComponent() {
  const { api, status } = usePolkadot()
  
  if (status === 'connecting') return <div>Connecting...</div>
  if (status === 'error') return <div>Connection failed</div>
  if (!api) return null
  
  // Use api here
  return <div>Connected!</div>
}
```

## 🔐 Wallet Connection

### Basic Wallet Connection

```typescript
import ConnectWallet from './components/ConnectWallet'
import { useTypink } from 'typink'

function App() {
  const { connectedAccount, accounts } = useTypink()
  
  return (
    <div>
      <ConnectWallet />
      {connectedAccount && (
        <div>
          Connected: {connectedAccount.address}
          <br />
          Total accounts: {accounts.length}
        </div>
      )}
    </div>
  )
}
```

### Display Connected Account

```typescript
import { useTypink } from 'typink'
import AddressDisplay from './components/polkadot/AddressDisplay'

function AccountInfo() {
  const { connectedAccount } = useTypink()
  
  if (!connectedAccount) {
    return <div>Please connect your wallet</div>
  }
  
  return (
    <div>
      <h3>Your Account</h3>
      <AddressDisplay 
        address={connectedAccount.address} 
        name={connectedAccount.name}
      />
    </div>
  )
}
```

### Require Wallet Connection

```typescript
import { useTypink } from 'typink'
import ConnectWallet from './components/ConnectWallet'

function ProtectedFeature() {
  const { connectedAccount } = useTypink()
  
  if (!connectedAccount) {
    return (
      <div className="text-center p-8">
        <h2>Wallet Required</h2>
        <p>Please connect your wallet to access this feature</p>
        <ConnectWallet />
      </div>
    )
  }
  
  return <div>Protected content here</div>
}
```

## 📊 Fetching Data

### Get Current Block Number

```typescript
import { useBlockNumber } from './hooks/useBlockNumber'

function BlockDisplay() {
  const { data: blockNumber, isLoading, error } = useBlockNumber()
  
  if (isLoading) return <div>Loading block...</div>
  if (error) return <div>Error: {error.message}</div>
  
  return <div>Current Block: #{blockNumber?.toLocaleString()}</div>
}
```

### Get Account Balance

```typescript
import { useBalance } from './hooks/useBalance'
import { formatTokenBalance } from './lib/polkadot'

function BalanceDisplay({ address }: { address: string }) {
  const { data: balance, isLoading } = useBalance(address)
  
  if (isLoading) return <div>Loading balance...</div>
  
  return (
    <div>
      <div>Free: {formatTokenBalance(balance?.free, 10, 'DOT')}</div>
      <div>Reserved: {formatTokenBalance(balance?.reserved, 10, 'DOT')}</div>
      <div>Total: {formatTokenBalance(balance?.total, 10, 'DOT')}</div>
    </div>
  )
}
```

### Get Chain Information

```typescript
import { useChainInfo } from './hooks/useChainInfo'

function ChainInfo() {
  const { data: chain, isLoading } = useChainInfo()
  
  if (isLoading) return <div>Loading...</div>
  
  return (
    <div>
      <h3>{chain?.chainName}</h3>
      <p>Token: {chain?.tokenSymbol}</p>
      <p>Decimals: {chain?.tokenDecimals}</p>
      <p>SS58 Format: {chain?.ss58Format}</p>
    </div>
  )
}
```

### Get Staking Information

```typescript
import { useStakingInfo } from './hooks/useStakingInfo'
import { formatTokenBalance } from './lib/polkadot'

function StakingStats() {
  const { data: staking, isLoading } = useStakingInfo()
  
  if (isLoading) return <div>Loading staking info...</div>
  
  return (
    <div>
      <div>Active Era: #{staking?.activeEra}</div>
      <div>Validators: {staking?.validatorCount}</div>
      <div>Total Stake: {formatTokenBalance(staking?.totalStake, 10, 'DOT')}</div>
      <div>Min Nominator Bond: {formatTokenBalance(staking?.minNominatorBond, 10, 'DOT')}</div>
    </div>
  )
}
```

### Get Account Nonce

```typescript
import { useNonce } from './hooks/useNonce'

function TransactionCount({ address }: { address: string }) {
  const { data: nonce, isLoading } = useNonce(address)
  
  if (isLoading) return <div>Loading...</div>
  
  return <div>Transactions: {nonce}</div>
}
```

## 🎨 Displaying Components

### Show Network Status

```typescript
import NetworkIndicator from './components/polkadot/NetworkIndicator'
import BlockNumber from './components/polkadot/BlockNumber'

function Header() {
  return (
    <div className="flex items-center gap-4">
      <NetworkIndicator />
      <BlockNumber />
    </div>
  )
}
```

### Format and Display Address

```typescript
import { formatAddress, copyToClipboard } from './lib/polkadot'
import { Copy } from 'lucide-react'

function AddressCard({ address }: { address: string }) {
  const handleCopy = async () => {
    await copyToClipboard(address)
    alert('Address copied!')
  }
  
  return (
    <div className="flex items-center gap-2">
      <span>{formatAddress(address)}</span>
      <button onClick={handleCopy}>
        <Copy className="w-4 h-4" />
      </button>
    </div>
  )
}
```

### Display Balance with Card

```typescript
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/Card'
import { useBalance } from './hooks/useBalance'
import { formatTokenBalance } from './lib/polkadot'

function BalanceCard({ address }: { address: string }) {
  const { data: balance, isLoading } = useBalance(address)
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Account Balance</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div>Loading...</div>
        ) : (
          <div className="text-2xl font-bold text-gradient">
            {formatTokenBalance(balance?.free, 10, 'DOT')}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
```

## 💸 Transactions

### Simple Balance Transfer

```typescript
import { usePolkadot } from './providers/PolkadotProvider'
import { useTypink } from 'typink'
import { web3FromAddress } from '@polkadot/extension-dapp'
import { Button } from './components/ui/Button'

function TransferButton({ to, amount }: { to: string; amount: string }) {
  const { api } = usePolkadot()
  const { connectedAccount } = useTypink()
  const [loading, setLoading] = useState(false)
  
  const handleTransfer = async () => {
    if (!api || !connectedAccount) return
    
    try {
      setLoading(true)
      
      // Get the injector
      const injector = await web3FromAddress(connectedAccount.address)
      
      // Create transfer
      const transfer = api.tx.balances.transferKeepAlive(to, amount)
      
      // Sign and send
      await transfer.signAndSend(
        connectedAccount.address,
        { signer: injector.signer },
        ({ status, events }) => {
          if (status.isInBlock) {
            console.log(`Transaction included in block ${status.asInBlock}`)
          }
          if (status.isFinalized) {
            console.log(`Transaction finalized in block ${status.asFinalized}`)
            alert('Transfer successful!')
            setLoading(false)
          }
        }
      )
    } catch (error) {
      console.error('Transfer failed:', error)
      alert('Transfer failed')
      setLoading(false)
    }
  }
  
  return (
    <Button onClick={handleTransfer} disabled={loading}>
      {loading ? 'Sending...' : 'Send Transfer'}
    </Button>
  )
}
```

### Estimate Transaction Fee

```typescript
import { usePolkadot } from './providers/PolkadotProvider'

async function estimateFee(from: string, to: string, amount: string) {
  const { api } = usePolkadot()
  if (!api) return null
  
  const transfer = api.tx.balances.transferKeepAlive(to, amount)
  const info = await transfer.paymentInfo(from)
  
  return info.partialFee.toString()
}

// Usage in component
function FeeEstimate({ from, to, amount }: Props) {
  const [fee, setFee] = useState<string>()
  
  useEffect(() => {
    estimateFee(from, to, amount).then(setFee)
  }, [from, to, amount])
  
  return <div>Est. Fee: {formatTokenBalance(fee, 10, 'DOT')}</div>
}
```

## 📡 Real-time Subscriptions

### Subscribe to New Blocks

```typescript
import { usePolkadot } from './providers/PolkadotProvider'
import { useState, useEffect } from 'react'

function LiveBlockNumber() {
  const { api, status } = usePolkadot()
  const [block, setBlock] = useState(0)
  
  useEffect(() => {
    if (status !== 'connected' || !api) return
    
    let unsub: any
    
    api.rpc.chain.subscribeNewHeads((header) => {
      setBlock(header.number.toNumber())
    }).then((unsubscribe) => {
      unsub = unsubscribe
    })
    
    return () => {
      if (unsub) unsub()
    }
  }, [api, status])
  
  return <div>Block: #{block}</div>
}
```

### Subscribe to Balance Changes

```typescript
import { usePolkadot } from './providers/PolkadotProvider'
import { useState, useEffect } from 'react'
import { formatTokenBalance } from './lib/polkadot'

function LiveBalance({ address }: { address: string }) {
  const { api, status } = usePolkadot()
  const [balance, setBalance] = useState('')
  
  useEffect(() => {
    if (status !== 'connected' || !api || !address) return
    
    let unsub: any
    
    api.query.system.account(address, ({ data }: any) => {
      setBalance(data.free.toString())
    }).then((unsubscribe) => {
      unsub = unsubscribe
    })
    
    return () => {
      if (unsub) unsub()
    }
  }, [api, status, address])
  
  return <div>Balance: {formatTokenBalance(balance, 10, 'DOT')}</div>
}
```

### Monitor Chain Events

```typescript
import { useEvents } from './hooks/useEvents'

function EventFeed() {
  const events = useEvents(10) // Keep last 10 events
  
  return (
    <div>
      <h3>Recent Events</h3>
      {events.map((event, i) => (
        <div key={i} className="p-2 border-b">
          <span className="font-mono">
            {event.section}.{event.method}
          </span>
          <span className="text-sm text-gray-500 ml-2">
            Block #{event.blockNumber}
          </span>
        </div>
      ))}
    </div>
  )
}
```

## 🛠️ Formatting & Utilities

### Format Address

```typescript
import { formatAddress } from './lib/polkadot'

const fullAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'

// Default: 6 chars prefix, 4 chars suffix
formatAddress(fullAddress)
// Output: '5Grwva...utQY'

// Custom lengths
formatAddress(fullAddress, 8, 6)
// Output: '5GrwvaEF...GKutQY'
```

### Format Balance

```typescript
import { formatTokenBalance } from './lib/polkadot'

const balance = '12345678900000' // Planck units

// With symbol
formatTokenBalance(balance, 10, 'DOT')
// Output: '1.23 kDOT'

// Without symbol
formatTokenBalance(balance, 10, 'DOT', false)
// Output: '1.23k'
```

### Validate Address

```typescript
import { isValidAddress } from './lib/polkadot'

isValidAddress('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')
// Output: true

isValidAddress('invalid-address')
// Output: false
```

### Convert Address Format

```typescript
import { convertAddress } from './lib/polkadot'

const polkadotAddress = '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY'

// Convert to Kusama format (ss58Format: 2)
const kusamaAddress = convertAddress(polkadotAddress, 2)

// Convert to generic format (ss58Format: 42)
const genericAddress = convertAddress(polkadotAddress, 42)
```

### Format Time Ago

```typescript
import { formatTimeAgo } from './lib/polkadot'

const timestamp = Date.now() - 3600000 // 1 hour ago

formatTimeAgo(timestamp)
// Output: '1h ago'

formatTimeAgo(Date.now() - 120000) // 2 minutes ago
// Output: '2m ago'
```

### Calculate Percentage

```typescript
import { calculatePercentage } from './lib/polkadot'

calculatePercentage(25, 100)
// Output: '25.00%'

calculatePercentage(7, 13, 1)
// Output: '53.8%'
```

### Copy to Clipboard

```typescript
import { copyToClipboard } from './lib/polkadot'

async function handleCopy(text: string) {
  try {
    await copyToClipboard(text)
    alert('Copied!')
  } catch (error) {
    alert('Failed to copy')
  }
}
```

## 🎨 Complete Component Examples

### Dashboard Stats Card

```typescript
import { Card, CardHeader, CardTitle, CardContent } from './components/ui/Card'
import { useBlockNumber } from './hooks/useBlockNumber'
import { useChainInfo } from './hooks/useChainInfo'
import { Zap } from 'lucide-react'
import { motion } from 'framer-motion'

function DashboardStats() {
  const { data: blockNumber } = useBlockNumber()
  const { data: chain } = useChainInfo()
  
  return (
    <div className="grid md:grid-cols-3 gap-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <CardTitle>Latest Block</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gradient">
              #{blockNumber?.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Network</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {chain?.chainName}
            </div>
            <div className="text-sm text-white/60">
              {chain?.tokenSymbol}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
```

### Account Selector

```typescript
import { useTypink } from 'typink'
import { formatAddress } from './lib/polkadot'
import AddressDisplay from './components/polkadot/AddressDisplay'

function AccountSelector() {
  const { accounts, connectedAccount, selectAccount } = useTypink()
  
  if (accounts.length === 0) {
    return <div>No accounts found</div>
  }
  
  return (
    <div className="space-y-2">
      <h3>Select Account</h3>
      {accounts.map((account) => (
        <button
          key={account.address}
          onClick={() => selectAccount(account.address)}
          className={`
            w-full p-4 rounded-lg border transition-all
            ${account.address === connectedAccount?.address
              ? 'border-pink-500 bg-pink-500/10'
              : 'border-white/10 hover:border-white/20'
            }
          `}
        >
          <AddressDisplay 
            address={account.address}
            name={account.name}
          />
        </button>
      ))}
    </div>
  )
}
```

---

## 💡 Tips

1. **Always check loading states**: Show loading indicators while data is fetching
2. **Handle errors gracefully**: Display user-friendly error messages
3. **Use TypeScript**: Leverage types for better developer experience
4. **Optimize re-renders**: Use React Query's caching to avoid unnecessary API calls
5. **Test with different networks**: Switch between Polkadot, Kusama, and testnets

Need more examples? Check out the [Components Showcase](/components) page in the running app!
