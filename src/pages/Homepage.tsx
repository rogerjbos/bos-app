import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { Wallet, Zap, Shield, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/Button'
import ConnectWallet from '../components/ConnectWallet'

export default function Homepage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0b0b1e] via-[#1a0b2e] to-[#0b0b1e]">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-96 h-96 bg-[var(--color-polkadot-pink)] rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-[var(--color-polkadot-cyan)] rounded-full blur-[120px] animate-pulse delay-700"></div>
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-[var(--color-polkadot-violet)] rounded-full blur-[120px] animate-pulse delay-1000"></div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-6 pt-20 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-5xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-dark text-white/90 text-sm font-medium mb-8 border border-white/10"
            >
              <Sparkles className="w-4 h-4 text-[var(--color-polkadot-cyan)]" />
              Built on Polkadot
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-6xl md:text-7xl lg:text-8xl font-bold mb-6 leading-tight"
            >
              <span className="text-gradient">
                Build the Future
              </span>
              <br />
              <span className="text-white">
                on Polkadot
              </span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-xl md:text-2xl text-white/70 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              A production-ready React template with beautiful UI components,
              wallet integration, and everything you need to build amazing Web3 applications.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16"
            >
              <ConnectWallet />
              <Link to="/examples">
                <Button variant="outline" size="lg" className="min-w-[200px]">
                  <Zap className="w-5 h-5" />
                  View Examples
                </Button>
              </Link>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto"
            >
              {[
                { label: 'Components', value: '20+', icon: Sparkles },
                { label: 'Type Safe', value: '100%', icon: Shield },
                { label: 'Ready to Use', value: '1min', icon: Zap },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
                  className="glass-dark p-6 rounded-2xl border border-white/10"
                >
                  <stat.icon className="w-8 h-8 mx-auto mb-3 text-[var(--color-polkadot-cyan)]" />
                  <div className="text-3xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-white/60">{stat.label}</div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-20">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-6xl mx-auto"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-center mb-4 text-white">
              Everything You Need
            </h2>
            <p className="text-xl text-white/60 text-center mb-16">
              Production-ready components and tools for Polkadot development
            </p>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: 'Wallet Connect',
                  description: 'Seamless integration with Polkadot.js and other browser extensions',
                  icon: Wallet,
                  color: 'polkadot-pink',
                },
                {
                  title: 'Beautiful UI',
                  description: 'Gorgeous components built with Radix UI and Tailwind CSS',
                  icon: Sparkles,
                  color: 'polkadot-violet',
                },
                {
                  title: 'Type Safe',
                  description: 'Full TypeScript support with excellent DX and autocomplete',
                  icon: Shield,
                  color: 'polkadot-cyan',
                },
                {
                  title: 'Fast Setup',
                  description: 'Get started in minutes with our CLI and pre-built templates',
                  icon: Zap,
                  color: 'polkadot-lime',
                },
                {
                  title: 'Responsive',
                  description: 'Mobile-first design that works beautifully on all devices',
                  icon: Sparkles,
                  color: 'polkadot-pink',
                },
                {
                  title: 'Customizable',
                  description: 'Easily customize colors, themes, and components to match your brand',
                  icon: Sparkles,
                  color: 'polkadot-violet',
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  whileHover={{ scale: 1.05, transition: { duration: 0.2 } }}
                  className="glass-dark p-8 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 cursor-pointer group"
                >
                  <div className={`w-12 h-12 rounded-xl bg-[var(--color-${feature.color})]/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <feature.icon className={`w-6 h-6 text-[var(--color-${feature.color})]`} />
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                  <p className="text-white/60 leading-relaxed">{feature.description}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-20 mb-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="max-w-4xl mx-auto glass-dark p-12 rounded-3xl border border-white/10 text-center"
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Build?
            </h2>
            <p className="text-xl text-white/70 mb-10 max-w-2xl mx-auto">
              Start building your Polkadot application today with our comprehensive template and component library.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/wallet">
                <Button variant="gradient" size="xl">
                  <Wallet className="w-5 h-5" />
                  Get Started
                </Button>
              </Link>
              <Link to="/examples">
                <Button variant="outline" size="xl">
                  Explore Examples
                </Button>
              </Link>
            </div>
          </motion.div>
        </section>
      </div>
    </div>
  )
}
