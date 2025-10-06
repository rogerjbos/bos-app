import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTypink } from 'typink'
import { 
  Wallet, Shield, Zap, Check, AlertCircle, ExternalLink, 
  Copy, CheckCircle2, Info, Sparkles, Lock, Globe, ArrowRight
} from 'lucide-react'
import ConnectWallet from '../components/ConnectWallet'
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import AddressDisplay from '../components/polkadot/AddressDisplay'

export default function WalletPage() {
  const { connectedAccount, wallets, supportedNetworks } = useTypink()
  const [copiedAddress, setCopiedAddress] = useState(false)

  const copyAddress = () => {
    if (connectedAccount) {
      navigator.clipboard.writeText(connectedAccount.address)
      setCopiedAddress(true)
      setTimeout(() => setCopiedAddress(false), 2000)
    }
  }

  const supportedWallets = [
    {
      name: 'Polkadot.js',
      icon: '🔴',
      url: 'https://polkadot.js.org/extension/',
      description: 'Official browser extension for Polkadot ecosystem',
      features: ['Multi-chain', 'Open Source', 'Most Compatible']
    },
    {
      name: 'Talisman',
      icon: '👹',
      url: 'https://talisman.xyz/',
      description: 'Beautiful wallet for Polkadot & Ethereum',
      features: ['Multi-chain', 'NFT Support', 'Portfolio View']
    },
    {
      name: 'SubWallet',
      icon: '🦊',
      url: 'https://subwallet.app/',
      description: 'Comprehensive wallet for Substrate chains',
      features: ['Staking', 'Cross-chain', 'Mobile App']
    },
    {
      name: 'Nova Wallet',
      icon: '⭐',
      url: 'https://novawallet.io/',
      description: 'Next-gen wallet for Polkadot & Kusama',
      features: ['Crowdloans', 'Governance', 'Mobile First']
    },
    {
      name: 'Enkrypt',
      icon: '🔐',
      url: 'https://www.enkrypt.com/',
      description: 'Multi-chain wallet by MEW',
      features: ['Privacy', 'Multi-chain', 'Hardware Wallet']
    },
  ]

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-violet-500/10 to-cyan-500/10" />
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-96 h-96 bg-pink-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="relative glass border border-white/20 p-10 backdrop-blur-xl">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="p-3 rounded-2xl bg-gradient-to-br from-pink-500/20 to-violet-500/20 border border-white/10"
                >
                  <Wallet className="w-7 h-7 text-pink-400" />
                </motion.div>
                <div>
                  <h1 className="text-5xl font-bold text-gradient">Wallet Connection</h1>
                  <p className="text-gray-400 mt-2">Secure access to the Polkadot ecosystem</p>
                </div>
              </div>
              
              <p className="text-gray-300 text-lg leading-relaxed max-w-2xl">
                Connect your preferred wallet to interact with Polkadot, Kusama, and all parachain networks. 
                Your keys remain secure in your wallet at all times.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-4">
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm font-medium">Secure Connection</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <Zap className="w-4 h-4 text-cyan-400" />
                  <span className="text-cyan-400 text-sm font-medium">Multi-Wallet Support</span>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
                  <Lock className="w-4 h-4 text-violet-400" />
                  <span className="text-violet-400 text-sm font-medium">Non-Custodial</span>
                </div>
              </div>
            </div>

            <div className="w-full lg:w-auto">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="p-6 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm"
              >
                <ConnectWallet />
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Connected Account Section */}
      <AnimatePresence>
        {connectedAccount && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="relative overflow-hidden rounded-3xl"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-cyan-500/10 to-blue-500/10" />
            <div className="relative glass border border-white/20 p-8 backdrop-blur-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-gradient-to-br from-green-500/20 to-cyan-500/20 border border-white/10">
                  <CheckCircle2 className="w-6 h-6 text-green-400" />
                </div>
                <h2 className="text-3xl font-bold text-white">Connected Account</h2>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-dark border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Info className="w-5 h-5 text-cyan-400" />
                      Account Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="text-gray-400 text-sm mb-2">Account Name</div>
                      <div className="text-white font-semibold text-xl">{connectedAccount.name || 'Unnamed Account'}</div>
                    </div>
                    <div className="h-px bg-white/10" />
                    <div>
                      <div className="text-gray-400 text-sm mb-2">Address</div>
                      <AddressDisplay 
                        address={connectedAccount.address}
                        showCopy
                        showExplorer
                        className="text-sm"
                      />
                    </div>
                    <div className="h-px bg-white/10" />
                    <div>
                      <div className="text-gray-400 text-sm mb-2">Wallet Source</div>
                      <div className="text-white font-medium capitalize">{connectedAccount.source}</div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-dark border-white/10">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Globe className="w-5 h-5 text-violet-400" />
                      Supported Networks
                    </CardTitle>
                    <CardDescription>Connected across multiple chains</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {supportedNetworks?.slice(0, 8).map((network, idx) => (
                        <motion.div
                          key={network.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className="flex items-center justify-between p-3 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-2 h-2 bg-green-400 rounded-full" />
                            <span className="text-white text-sm font-medium">{network.name}</span>
                          </div>
                          <span className="text-gray-400 text-xs">{network.symbol}</span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Supported Wallets Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold text-white">Supported Wallets</h2>
          <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {supportedWallets.map((wallet, idx) => (
            <motion.div
              key={wallet.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              whileHover={{ y: -4 }}
            >
              <Card className="glass-dark border-white/10 hover:border-pink-500/30 transition-all duration-300 h-full group">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{wallet.icon}</div>
                      <div>
                        <CardTitle className="text-white text-lg group-hover:text-gradient transition-all">
                          {wallet.name}
                        </CardTitle>
                      </div>
                    </div>
                    <a
                      href={wallet.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all group"
                    >
                      <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors" />
                    </a>
                  </div>
                  <CardDescription className="mt-2">{wallet.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {wallet.features.map((feature) => (
                      <span
                        key={feature}
                        className="px-3 py-1 text-xs rounded-full bg-white/5 border border-white/10 text-gray-300"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Getting Started Guide */}
      {!connectedAccount && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-3xl"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-violet-500/10 to-pink-500/10" />
          <div className="relative glass-dark border border-white/20 p-8 backdrop-blur-xl">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10">
                <Sparkles className="w-5 h-5 text-cyan-400" />
              </div>
              <h2 className="text-2xl font-bold text-white">How to Connect</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: '1',
                  title: 'Install a Wallet',
                  desc: 'Choose and install one of the supported wallet extensions from the list above',
                  icon: Wallet,
                  color: 'pink'
                },
                {
                  step: '2',
                  title: 'Create or Import',
                  desc: 'Set up a new account or import an existing one using your seed phrase',
                  icon: Lock,
                  color: 'violet'
                },
                {
                  step: '3',
                  title: 'Click Connect',
                  desc: 'Click the "Connect Wallet" button above and approve the connection request',
                  icon: Check,
                  color: 'cyan'
                },
              ].map((step, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + idx * 0.1 }}
                  className="relative group"
                >
                  <div className={`absolute inset-0 bg-gradient-to-br from-${step.color}-500/10 to-${step.color}-500/0 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-300`} />
                  <div className="relative p-6 rounded-2xl bg-black/20 border border-white/10 hover:border-white/20 transition-all duration-300">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-${step.color}-500/10 border border-${step.color}-500/20 flex items-center justify-center text-${step.color}-400 font-bold text-xl`}>
                        {step.step}
                      </div>
                      <div className={`p-2 rounded-lg bg-${step.color}-500/10 border border-${step.color}-500/20`}>
                        <step.icon className={`w-5 h-5 text-${step.color}-400`} />
                      </div>
                    </div>
                    <h3 className="text-white font-semibold text-lg mb-2">{step.title}</h3>
                    <p className="text-gray-400 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                  {idx < 2 && (
                    <div className="hidden md:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                      <ArrowRight className="w-6 h-6 text-gray-600" />
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Security Notice */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-yellow-500/5 border border-yellow-500/20"
      >
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 shrink-0">
            <AlertCircle className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="space-y-2">
            <h3 className="text-yellow-400 font-semibold">Security Notice</h3>
            <p className="text-gray-300 text-sm leading-relaxed">
              This application never has access to your private keys or seed phrase. All transactions 
              are signed securely within your wallet extension. Never share your seed phrase with anyone, 
              and always verify the URL before connecting your wallet.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
