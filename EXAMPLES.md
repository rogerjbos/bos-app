# Quick Start Examples

Ready-to-use code snippets for common Polkadot development tasks. Just copy, paste, and customize!

## 📋 Table of Contents

- [Basic Setup](#basic-setup)
- [Network Management](#network-management)
- [Account Management](#account-management)
- [Transaction Queue](#transaction-queue)
- [Block Explorer Integration](#block-explorer-integration)
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

---

## 🌐 Network Management

### Network Switcher Component

```typescript
import { NetworkSwitcher } from './components/NetworkSwitcher'

function Header() {
  return (
    <div className="flex items-center gap-4">
      <h1>My dApp</h1>
      <NetworkSwitcher />
    </div>
  )
}
```

### Switch Network Programmatically

```typescript
import { usePolkadotContext } from './providers/PolkadotProvider'
import { KUSAMA, WESTEND } from './config/chains'

function NetworkButtons() {
  const { switchNetwork, currentEndpoint } = usePolkadotContext()

  return (
    <div>
      <button onClick={() => switchNetwork(KUSAMA.endpoint)}>
        Switch to Kusama
      </button>
      <button onClick={() => switchNetwork(WESTEND.endpoint)}>
        Switch to Westend
      </button>
      <p>Current: {currentEndpoint}</p>
    </div>
  )
}
```

### Get Current Network Info

```typescript
import { usePolkadotContext } from './providers/PolkadotProvider'
import { CHAINS } from './config/chains'

function CurrentNetwork() {
  const { currentEndpoint } = usePolkadotContext()
  
  const currentChain = Object.values(CHAINS).find(
    (chain) => chain.endpoint === currentEndpoint
  )

  return (
    <div>
      <div 
        className="w-3 h-3 rounded-full" 
        style={{ backgroundColor: currentChain?.color }}
      />
      <span>{currentChain?.name || 'Unknown'}</span>
      <span>{currentChain?.tokenSymbol}</span>
    </div>
  )
}
```

---

## 👤 Account Management

### Account Manager Component

```typescript
import { AccountManager } from './components/AccountManager'

function Header() {
  return (
    <div className="flex items-center gap-4">
      <NetworkSwitcher />
      <AccountManager />
    </div>
  )
}
```

### List All Accounts

```typescript
import { useEffect, useState } from 'react'

function AccountList() {
  const [accounts, setAccounts] = useState([])

  useEffect(() => {
    const loadAccounts = async () => {
      if (!window.injectedWeb3) return

      const extension = await window.injectedWeb3['polkadot-js']
        .enable('My dApp')
      const accounts = await extension.accounts.get()
      setAccounts(accounts)
    }

    loadAccounts()
  }, [])

  return (
    <ul>
      {accounts.map((account) => (
        <li key={account.address}>
          {account.name} - {account.address}
        </li>
      ))}
    </ul>
  )
}
```

### Save Account Nicknames

```typescript
function saveAccountNickname(address: string, nickname: string) {
  const nicknames = JSON.parse(
    localStorage.getItem('account_nicknames') || '{}'
  )
  nicknames[address] = nickname
  localStorage.setItem('account_nicknames', JSON.stringify(nicknames))
}

function getAccountNickname(address: string): string | null {
  const nicknames = JSON.parse(
    localStorage.getItem('account_nicknames') || '{}'
  )
  return nicknames[address] || null
}
```

---

## 📊 Transaction Queue

### Basic Transaction Queue

```typescript
import { TransactionQueue, useTransactionQueue } from './components/TransactionQueue'

function App() {
  return (
    <div>
      <YourAppContent />
      <TransactionQueue />
    </div>
  )
}
```

### Add Transactions to Queue

```typescript
import { useTransactionQueue } from './components/TransactionQueue'

function TransferButton() {
  const { addTransaction, updateTransaction } = useTransactionQueue()

  const handleTransfer = async () => {
    // Add to queue
    const txId = addTransaction({
      type: 'transfer',
      description: 'Transfer 10 DOT to Alice',
    })

    try {
      // Update status: broadcasting
      updateTransaction(txId, { status: 'broadcasting' })

      // Send transaction
      const hash = await sendTransaction()
      
      // Update with hash
      updateTransaction(txId, { 
        status: 'inBlock', 
        hash,
        explorerUrl: `https://polkadot.subscan.io/extrinsic/${hash}`
      })

      // Wait for finalization
      await waitForFinalization(hash)
      
      // Mark as finalized
      updateTransaction(txId, { status: 'finalized' })
    } catch (error) {
      // Mark as error
      updateTransaction(txId, { 
        status: 'error', 
        error: error.message 
      })
    }
  }

  return <button onClick={handleTransfer}>Transfer</button>
}
```

### Transaction Queue with Custom Settings

```typescript
<TransactionQueue 
  maxVisible={3}           // Show max 3 transactions
  autoRemoveDelay={10000}  // Remove after 10s
/>
```

---

## 🔍 Block Explorer Integration

### Generate Explorer Links

```typescript
import { getExplorerLink } from './lib/explorer'

function ExplorerLinks() {
  const accountUrl = getExplorerLink('Polkadot', 'account', '1234...')
  const blockUrl = getExplorerLink('Polkadot', 'block', '12345')
  const extrinsicUrl = getExplorerLink('Polkadot', 'extrinsic', '0x1234...')

  return (
    <div>
      <a href={accountUrl} target="_blank">View Account</a>
      <a href={blockUrl} target="_blank">View Block</a>
      <a href={extrinsicUrl} target="_blank">View Extrinsic</a>
    </div>
  )
}
```

### Open Explorer Programmatically

```typescript
import { openExplorerLink } from './lib/explorer'

function AccountButton({ address }: { address: string }) {
  return (
    <button onClick={() => openExplorerLink('Polkadot', 'account', address)}>
      View on Explorer
    </button>
  )
}
```

### Format Explorer Links

```typescript
import { formatExplorerLink } from './lib/explorer'

function TransactionHash({ hash }: { hash: string }) {
  const { url, text } = formatExplorerLink('Polkadot', 'extrinsic', hash)

  return (
    <a href={url} target="_blank" className="font-mono">
      {text}
    </a>
  )
}
```

### Get Multiple Explorers

```typescript
import { getChainExplorers } from './lib/explorer'

function ExplorerOptions({ address }: { address: string }) {
  const explorers = getChainExplorers('Polkadot')

  return (
    <div>
      {explorers.map((explorer) => (
        <a 
          key={explorer.name}
          href={`${explorer.url}/account/${address}`}
          target="_blank"
        >
          View on {explorer.name}
        </a>
      ))}
    </div>
  )
}
```

---

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
import { formatAddress } from "./lib/polkadot";

const fullAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

// Default: 6 chars prefix, 4 chars suffix
formatAddress(fullAddress);
// Output: '5Grwva...utQY'

// Custom lengths
formatAddress(fullAddress, 8, 6);
// Output: '5GrwvaEF...GKutQY'
```

### Format Balance

```typescript
import { formatTokenBalance } from "./lib/polkadot";

const balance = "12345678900000"; // Planck units

// With symbol
formatTokenBalance(balance, 10, "DOT");
// Output: '1.23 kDOT'

// Without symbol
formatTokenBalance(balance, 10, "DOT", false);
// Output: '1.23k'
```

### Validate Address

```typescript
import { isValidAddress } from "./lib/polkadot";

isValidAddress("5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY");
// Output: true

isValidAddress("invalid-address");
// Output: false
```

### Convert Address Format

```typescript
import { convertAddress } from "./lib/polkadot";

const polkadotAddress = "5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY";

// Convert to Kusama format (ss58Format: 2)
const kusamaAddress = convertAddress(polkadotAddress, 2);

// Convert to generic format (ss58Format: 42)
const genericAddress = convertAddress(polkadotAddress, 42);
```

### Format Time Ago

```typescript
import { formatTimeAgo } from "./lib/polkadot";

const timestamp = Date.now() - 3600000; // 1 hour ago

formatTimeAgo(timestamp);
// Output: '1h ago'

formatTimeAgo(Date.now() - 120000); // 2 minutes ago
// Output: '2m ago'
```

### Calculate Percentage

```typescript
import { calculatePercentage } from "./lib/polkadot";

calculatePercentage(25, 100);
// Output: '25.00%'

calculatePercentage(7, 13, 1);
// Output: '53.8%'
```

### Copy to Clipboard

```typescript
import { copyToClipboard } from "./lib/polkadot";

async function handleCopy(text: string) {
  try {
    await copyToClipboard(text);
    alert("Copied!");
  } catch (error) {
    alert("Failed to copy");
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

## �️ Error Handling

### Using Error Boundary

```typescript
import { ErrorBoundary } from './components/ErrorBoundary'

// Wrap your app or components
function App() {
  return (
    <ErrorBoundary>
      <YourAppContent />
    </ErrorBoundary>
  )
}

// Custom fallback UI
<ErrorBoundary
  fallback={
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-white">Something went wrong</p>
    </div>
  }
>
  <YourComponent />
</ErrorBoundary>
```

### Using Toast Notifications

```typescript
import { ToastProvider, useToast } from './components/Toast'

// 1. Wrap your app with ToastProvider
function App() {
  return (
    <ToastProvider>
      <YourAppContent />
    </ToastProvider>
  )
}

// 2. Use in any component
function TransferButton() {
  const { showToast } = useToast()

  const handleTransfer = async () => {
    try {
      // Your transaction logic
      await sendTransaction()

      showToast({
        type: 'success',
        message: 'Transaction sent!',
        description: 'Your transfer is being processed'
      })
    } catch (error) {
      showToast({
        type: 'error',
        message: 'Transaction failed',
        description: error.message,
        duration: 7000 // Optional, defaults to 5000ms
      })
    }
  }

  return <button onClick={handleTransfer}>Transfer</button>
}

// Different toast types
showToast({ type: 'success', message: 'Success!' })
showToast({ type: 'error', message: 'Error occurred' })
showToast({ type: 'info', message: 'Did you know...' })
showToast({ type: 'warning', message: 'Please wait...' })
```

---

## 🎨 Loading States

### Using Loading Skeletons

```typescript
import {
  LoadingSkeleton,
  CardSkeleton,
  StatsBoxSkeleton,
  TableRowSkeleton
} from './components/LoadingSkeleton'

// Basic skeleton
function MyComponent() {
  const { data, isLoading } = useBlockNumber()

  if (isLoading) {
    return <LoadingSkeleton variant="text" lines={3} />
  }

  return <div>{data?.blockNumber}</div>
}

// Card skeleton
function CardList() {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    )
  }
  // ...
}

// Stats box skeleton
function Dashboard() {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsBoxSkeleton />
        <StatsBoxSkeleton />
        <StatsBoxSkeleton />
        <StatsBoxSkeleton />
      </div>
    )
  }
  // ...
}

// Table skeleton
function DataTable() {
  if (isLoading) {
    return (
      <div>
        <TableRowSkeleton columns={5} />
        <TableRowSkeleton columns={5} />
        <TableRowSkeleton columns={5} />
      </div>
    )
  }
  // ...
}

// Custom skeleton with animation
<LoadingSkeleton
  className="h-32 w-full rounded-lg"
  animation="wave" // or "pulse" or "none"
/>
```

### Complete Loading Example

```typescript
import { useBalance } from './hooks/useBalance'
import { LoadingSkeleton } from './components/LoadingSkeleton'
import { useToast } from './components/Toast'

function BalanceCard({ address }: { address: string }) {
  const { data, isLoading, error } = useBalance(address)
  const { showToast } = useToast()

  // Show error toast
  if (error) {
    showToast({
      type: 'error',
      message: 'Failed to load balance',
      description: error.message
    })
    return null
  }

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="glass-dark p-6 rounded-xl">
        <LoadingSkeleton variant="text" className="h-4 w-20 mb-2" />
        <LoadingSkeleton variant="text" className="h-8 w-32 mb-1" />
        <LoadingSkeleton variant="text" className="h-3 w-24" />
      </div>
    )
  }

  // Show data
  return (
    <div className="glass-dark p-6 rounded-xl">
      <p className="text-sm text-white/60 mb-2">Total Balance</p>
      <p className="text-3xl font-bold text-white mb-1">
        {data?.total.toFixed(4)} DOT
      </p>
      <p className="text-xs text-white/40">
        Free: {data?.free.toFixed(4)} DOT
      </p>
    </div>
  )
}
```

---

## �💡 Tips

1. **Always check loading states**: Show loading indicators while data is fetching
2. **Handle errors gracefully**: Display user-friendly error messages
3. **Use TypeScript**: Leverage types for better developer experience
4. **Optimize re-renders**: Use React Query's caching to avoid unnecessary API calls
5. **Test with different networks**: Switch between Polkadot, Kusama, and testnets
6. **Wrap with ErrorBoundary**: Catch React errors in production
7. **Use Toast for feedback**: Show success/error messages for user actions
8. **Show loading skeletons**: Better UX than spinners or blank screens

Need more examples? Check out the [Components Showcase](/components) page in the running app!
