import React, { useEffect, useState } from 'react'
import { useTypink } from 'typink'
import { usePolkadot } from '../providers/PolkadotProvider'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Activity, Database, Users, TrendingUp, Clock, Zap, Info, 
  ArrowUpRight, Sparkles, BarChart3, Circle, Wallet, Code
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { formatBalance } from '@polkadot/util'
import NetworkIndicator from '../components/polkadot/NetworkIndicator'
import BlockNumber from '../components/polkadot/BlockNumber'
import AddressDisplay from '../components/polkadot/AddressDisplay'

export default function Dashboard() {
  const { connectedAccount } = useTypink()
  const { api } = usePolkadot()
  
  const [chainData, setChainData] = useState({
    blockNumber: 0,
    totalIssuance: '0',
    validatorCount: 0,
    activeEra: 0,
    chainName: '',
    tokenSymbol: '',
    tokenDecimals: 0,
  })
  
  const [accountBalance, setAccountBalance] = useState({
    free: '0',
    reserved: '0',
    frozen: '0',
  })
  
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!api) return

    let unsubBlock: any
    
    const loadChainData = async () => {
      try {
        // Get chain properties
        const [chain, properties] = await Promise.all([
          api.rpc.system.chain(),
          api.rpc.system.properties(),
        ])
        
        const tokenSymbol = properties.tokenSymbol.unwrapOr(['DOT'])[0].toString()
        const tokenDecimals = Number(properties.tokenDecimals.unwrapOr([12])[0])
        
        formatBalance.setDefaults({ 
          decimals: tokenDecimals, 
          unit: tokenSymbol 
        })

        // Subscribe to new blocks
        unsubBlock = await api.rpc.chain.subscribeNewHeads(async (header) => {
          const [totalIssuance, validatorCount, activeEra] = await Promise.all([
            api.query.balances.totalIssuance(),
            api.query.staking?.validatorCount?.() || Promise.resolve(0),
            api.query.staking?.activeEra?.() || Promise.resolve(null),
          ])

          setChainData({
            blockNumber: header.number.toNumber(),
            totalIssuance: formatBalance(totalIssuance.toString(), { 
              withSi: true, 
              forceUnit: tokenSymbol 
            }),
            validatorCount: Number(validatorCount),
            activeEra: activeEra ? Number((activeEra as any).unwrapOr({ index: 0 }).index) : 0,
            chainName: chain.toString(),
            tokenSymbol,
            tokenDecimals,
          })
          
          setLoading(false)
        })
      } catch (error) {
        console.error('Error loading chain data:', error)
        setLoading(false)
      }
    }

    loadChainData()
    
    return () => {
      if (unsubBlock) unsubBlock()
    }
  }, [api])

  useEffect(() => {
    if (!api || !connectedAccount) return

    let unsub: any
    
    const loadAccountData = async () => {
      try {
        // Subscribe to account balance changes
        unsub = await api.query.system.account(
          connectedAccount.address,
          (accountInfo: any) => {
            setAccountBalance({
              free: formatBalance(accountInfo.data.free.toString(), { withSi: true }),
              reserved: formatBalance(accountInfo.data.reserved.toString(), { withSi: true }),
              frozen: formatBalance(accountInfo.data.frozen.toString(), { withSi: true }),
            })
          }
        )
      } catch (error) {
        console.error('Error loading account data:', error)
      }
    }

    loadAccountData()
    
    return () => {
      if (unsub) unsub()
    }
  }, [api, connectedAccount])

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
      {/* Enhanced Status Bar with Gradient Border */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-pink-500/20 via-violet-500/20 to-cyan-500/20 blur-xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4 p-5 glass border border-white/20 backdrop-blur-xl">
          <div className="flex items-center gap-6 flex-wrap">
            <NetworkIndicator />
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            <BlockNumber />
            <div className="h-8 w-px bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            <div className="flex items-center gap-2 text-sm">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <Info className="w-4 h-4 text-cyan-400" />
              </div>
              <span className="font-medium text-white">{chainData.chainName || 'Loading...'}</span>
            </div>
          </div>
          {connectedAccount && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <AddressDisplay 
                address={connectedAccount.address} 
                name={connectedAccount.name}
                truncate={6}
                className="bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-white/20 px-4 py-2.5 rounded-xl backdrop-blur-sm"
              />
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Enhanced Welcome Section with Animated Background */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl"
      >
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-cyan-500/10" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-72 h-72 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>
        
        <div className="relative glass border border-white/20 p-10 backdrop-blur-xl">
          <div className="flex items-start justify-between flex-wrap gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="p-3 rounded-2xl bg-gradient-to-br from-pink-500/20 to-violet-500/20 border border-white/10"
                >
                  <Sparkles className="w-6 h-6 text-pink-400" />
                </motion.div>
                <h1 className="text-5xl font-bold text-gradient">
                  {connectedAccount ? `Welcome back, ${connectedAccount.name || 'User'}!` : 'Network Dashboard'}
                </h1>
              </div>
              <p className="text-gray-300 text-lg leading-relaxed max-w-2xl">
                {connectedAccount 
                  ? `Connected to ${chainData.chainName || 'Polkadot'}. Monitor real-time network activity, track your balances, and explore on-chain data with elegant visualizations.`
                  : 'Connect your wallet to unlock personalized insights, view your account balance, and interact seamlessly with the Polkadot ecosystem.'}
              </p>
              {!connectedAccount && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <Button variant="gradient" size="lg" className="mt-4 group">
                    <Wallet className="w-5 h-5 mr-2" />
                    Connect Wallet
                    <ArrowUpRight className="w-4 h-4 ml-2 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                  </Button>
                </motion.div>
              )}
            </div>
            
            {/* Stats Preview */}
            {!loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 }}
                className="flex flex-col gap-3 p-6 rounded-2xl bg-black/30 border border-white/10 backdrop-blur-sm"
              >
                <div className="flex items-center gap-2 text-sm text-gray-400">
                  <BarChart3 className="w-4 h-4" />
                  <span>Quick Stats</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-gray-400 text-sm">Block Height</span>
                    <span className="text-white font-semibold">#{chainData.blockNumber.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-gray-400 text-sm">Validators</span>
                    <span className="text-white font-semibold">{chainData.validatorCount}</span>
                  </div>
                  <div className="flex items-center justify-between gap-8">
                    <span className="text-gray-400 text-sm">Era</span>
                    <span className="text-white font-semibold">{chainData.activeEra}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Enhanced Chain Stats Grid */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">Network Metrics</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
        </div>
        
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <motion.div variants={item} whileHover={{ y: -4 }}>
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-pink-500/0 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <Card className="relative glass-dark hover:border-pink-500/50 border-white/10 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-white text-lg">Latest Block</CardTitle>
                      <CardDescription className="text-gray-400 text-xs">Current block height</CardDescription>
                    </div>
                    <div className="p-3 rounded-xl bg-pink-500/10 border border-pink-500/20">
                      <Activity className="w-6 h-6 text-pink-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gradient mb-3">
                    {loading ? '...' : `#${chainData.blockNumber.toLocaleString()}`}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Circle className="w-2 h-2 fill-green-400 text-green-400 animate-pulse" />
                    <span className="text-green-400 font-medium">Live Updates</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          <motion.div variants={item} whileHover={{ y: -4 }}>
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-violet-500/0 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <Card className="relative glass-dark hover:border-violet-500/50 border-white/10 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-white text-lg">Total Issuance</CardTitle>
                      <CardDescription className="text-gray-400 text-xs">Circulating {chainData.tokenSymbol || 'supply'}</CardDescription>
                    </div>
                    <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                      <Database className="w-6 h-6 text-violet-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-2">
                    {loading ? '...' : chainData.totalIssuance}
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          <motion.div variants={item} whileHover={{ y: -4 }}>
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 to-cyan-500/0 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <Card className="relative glass-dark hover:border-cyan-500/50 border-white/10 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-white text-lg">Validators</CardTitle>
                      <CardDescription className="text-gray-400 text-xs">Active validator nodes</CardDescription>
                    </div>
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                      <Users className="w-6 h-6 text-cyan-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gradient mb-3">
                    {loading ? '...' : chainData.validatorCount}
                  </div>
                  <div className="text-sm text-gray-400">Securing the network</div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          <motion.div variants={item} whileHover={{ y: -4 }}>
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-lime-500/20 to-lime-500/0 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <Card className="relative glass-dark hover:border-lime-500/50 border-white/10 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-lime-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-white text-lg">Active Era</CardTitle>
                      <CardDescription className="text-gray-400 text-xs">Current staking period</CardDescription>
                    </div>
                    <div className="p-3 rounded-xl bg-lime-500/10 border border-lime-500/20">
                      <Clock className="w-6 h-6 text-lime-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-gradient mb-3">
                    {loading ? '...' : chainData.activeEra}
                  </div>
                  <div className="text-sm text-gray-400">Staking rewards active</div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          <motion.div variants={item} whileHover={{ y: -4 }}>
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 via-violet-500/20 to-cyan-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
              <Card className="relative glass-dark hover:border-pink-500/50 border-white/10 transition-all duration-300 overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 rounded-full blur-2xl -mr-16 -mt-16" />
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-white text-lg">Network</CardTitle>
                      <CardDescription className="text-gray-400 text-xs">Connected blockchain</CardDescription>
                    </div>
                    <div className="p-3 rounded-xl bg-gradient-to-br from-pink-500/10 to-violet-500/10 border border-pink-500/20">
                      <Zap className="w-6 h-6 text-pink-400" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-white mb-2">
                    {loading ? '...' : chainData.chainName}
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                    <span className="text-sm text-gray-300">{chainData.tokenSymbol}</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </motion.div>

          <AnimatePresence>
            {connectedAccount && (
              <motion.div 
                variants={item} 
                whileHover={{ y: -4 }}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
              >
                <div className="group relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-pink-500/20 to-violet-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300" />
                  <Card className="relative glass-dark hover:border-violet-500/50 border-white/10 transition-all duration-300 overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/20 to-pink-500/20 rounded-full blur-2xl -mr-16 -mt-16" />
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-white text-lg">Your Balance</CardTitle>
                          <CardDescription className="text-gray-400 text-xs">Available funds</CardDescription>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-violet-500/10 to-pink-500/10 border border-violet-500/20">
                          <TrendingUp className="w-6 h-6 text-violet-400" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-gradient mb-4">
                        {accountBalance.free}
                      </div>
                      <div className="space-y-2 p-3 rounded-xl bg-black/30 border border-white/10">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Reserved:</span>
                          <span className="text-white font-semibold">{accountBalance.reserved}</span>
                        </div>
                        <div className="h-px bg-white/5" />
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-400">Frozen:</span>
                          <span className="text-white font-semibold">{accountBalance.frozen}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Enhanced Getting Started / Features Section */}
      <AnimatePresence>
        {!connectedAccount ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: 0.4 }}
            className="relative overflow-hidden rounded-3xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-violet-500/10 to-pink-500/10" />
            <div className="relative glass-dark border border-white/20 p-8 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Getting Started</h2>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { icon: Wallet, title: 'Connect Your Wallet', desc: 'Click "Connect Wallet" to link your Polkadot account', color: 'pink' },
                  { icon: BarChart3, title: 'Monitor Network', desc: 'View real-time chain data and track network activity', color: 'violet' },
                  { icon: TrendingUp, title: 'Check Balances', desc: 'See your account balance and transaction history', color: 'cyan' },
                  { icon: Code, title: 'Explore Examples', desc: 'Browse code samples and integration guides', color: 'lime' },
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1 }}
                    className="flex items-start gap-4 p-4 rounded-2xl bg-black/20 border border-white/10 hover:border-white/20 transition-all duration-300 group cursor-pointer"
                  >
                    <div className={`p-3 rounded-xl bg-${item.color}-500/10 border border-${item.color}-500/20 group-hover:scale-110 transition-transform`}>
                      <item.icon className={`w-5 h-5 text-${item.color}-400`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                      <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative overflow-hidden rounded-3xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-cyan-500/10 to-blue-500/10" />
            <div className="relative glass-dark border border-white/20 p-8 backdrop-blur-xl">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-white/10">
                    <Activity className="w-5 h-5 text-green-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Account Activity</h2>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                  <Circle className="w-2 h-2 fill-green-400 text-green-400 animate-pulse" />
                  <span className="text-green-400 text-sm font-medium">Connected</span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-black/20 border border-white/10">
                  <div className="text-gray-400 text-sm mb-2">Account Name</div>
                  <div className="text-white font-semibold text-lg">{connectedAccount.name || 'Unnamed Account'}</div>
                </div>
                <div className="p-6 rounded-2xl bg-black/20 border border-white/10">
                  <div className="text-gray-400 text-sm mb-2">Wallet Source</div>
                  <div className="text-white font-semibold text-lg capitalize">{connectedAccount.source}</div>
                </div>
                <div className="p-6 rounded-2xl bg-black/20 border border-white/10">
                  <div className="text-gray-400 text-sm mb-2">Network</div>
                  <div className="text-white font-semibold text-lg">{chainData.chainName}</div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
