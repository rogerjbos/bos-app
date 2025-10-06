import { motion } from "framer-motion";
import {
  ArrowRight,
  Blocks,
  CheckCircle2,
  Code2,
  Layers,
  Package,
  Shield,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import { Link } from "react-router-dom";
import ConnectWallet from "../components/ConnectWallet";
import { Button } from "../components/ui/Button";

export default function Homepage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Elegant Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0a0a1f] via-[#150a28] to-[#0a0a1f]">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-[var(--color-polkadot-pink)] rounded-full blur-[140px] animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[var(--color-polkadot-cyan)] rounded-full blur-[140px] animate-pulse delay-700"></div>
          <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-[var(--color-polkadot-violet)] rounded-full blur-[120px] animate-pulse delay-1000"></div>
        </div>
        {/* Grid overlay for depth */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:4rem_4rem]"></div>
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-6 pt-32 pb-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-6xl mx-auto"
          >
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full glass-dark text-white/90 text-sm font-medium mb-8 border border-white/10 backdrop-blur-xl"
            >
              <Sparkles className="w-4 h-4 text-[var(--color-polkadot-cyan)]" />
              Built on Polkadot
            </motion.div>

            {/* Heading */}
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="text-5xl md:text-6xl lg:text-7xl font-bold mb-8 leading-[1.1]"
            >
              <span className="text-white">Your Polkadot App</span>
              <br />
              <span className="text-gradient">Starts Here</span>
            </motion.h1>

            {/* Description */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="text-lg md:text-xl text-white/60 mb-12 max-w-3xl mx-auto leading-relaxed"
            >
              A complete React template featuring{" "}
              <span className="text-white/90 font-semibold">
                20+ production-ready components
              </span>{" "}
              from the Polkadot-UI library. Build beautiful, type-safe Web3
              applications in minutes, not months.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-20"
            >
              <Link to="/components">
                <Button
                  variant="gradient"
                  size="xl"
                  className="min-w-[220px] gap-2"
                >
                  <Package className="w-5 h-5" />
                  Explore Components
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </Link>
              <ConnectWallet />
            </motion.div>

            {/* Feature Highlights Grid */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
            >
              {[
                { label: "UI Components", value: "20+", icon: Layers },
                { label: "TypeScript", value: "100%", icon: Shield },
                { label: "Setup Time", value: "<5min", icon: Zap },
                { label: "Production Ready", value: "✓", icon: CheckCircle2 },
              ].map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 + index * 0.1, duration: 0.5 }}
                  className="glass-dark p-6 rounded-xl border border-white/10 backdrop-blur-xl hover:border-white/20 transition-all group"
                >
                  <stat.icon className="w-7 h-7 mx-auto mb-3 text-white/70 group-hover:text-white/90 group-hover:scale-110 transition-all" />
                  <div className="text-2xl font-bold text-white mb-1">
                    {stat.value}
                  </div>
                  <div className="text-xs text-white/50 uppercase tracking-wider">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>

        {/* What's Included Section */}
        <section className="container mx-auto px-6 py-24">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Everything You Need to Build
              </h2>
              <p className="text-lg text-white/60 max-w-2xl mx-auto">
                Polkadot-UI components integrated with modern React patterns
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 mb-12">
              {[
                {
                  title: "Wallet Integration",
                  description:
                    "Multi-wallet support for Polkadot.js, Talisman, SubWallet, and more. One-click connection with account management.",
                  icon: Wallet,
                  features: [
                    "ConnectWallet",
                    "AddressDisplay",
                    "AccountInfo",
                    "RequireAccount",
                  ],
                },
                {
                  title: "Network Components",
                  description:
                    "Real-time chain data with live block numbers, connection status, and network indicators.",
                  icon: Blocks,
                  features: [
                    "NetworkIndicator",
                    "BlockNumber",
                    "RequireConnection",
                  ],
                },
                {
                  title: "Balance & Tokens",
                  description:
                    "Display and manage token balances with formatting, token selection, and multi-asset support.",
                  icon: Sparkles,
                  features: ["BalanceDisplay", "SelectToken", "AmountInput"],
                },
                {
                  title: "Transaction Tools",
                  description:
                    "Submit transactions with progress tracking, status notifications, and error handling built-in.",
                  icon: Zap,
                  features: ["TxButton", "TxNotification", "AddressInput"],
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1, duration: 0.5 }}
                  viewport={{ once: true }}
                  className="glass-dark p-8 rounded-2xl border border-white/10 hover:border-white/20 transition-all duration-300 group"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <feature.icon className="w-7 h-7 text-white/70 group-hover:text-white/90 transition-colors" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-white/60 leading-relaxed text-sm">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                    {feature.features.map((comp) => (
                      <span
                        key={comp}
                        className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-white/70 border border-white/10"
                      >
                        {comp}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              viewport={{ once: true }}
              className="glass-dark p-8 rounded-2xl border border-white/10 backdrop-blur-xl"
            >
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-3xl font-bold text-gradient mb-2">
                    20+
                  </div>
                  <div className="text-sm text-white/60">
                    Ready-to-use components
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gradient mb-2">6</div>
                  <div className="text-sm text-white/60">
                    Custom React hooks
                  </div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-gradient mb-2">
                    100%
                  </div>
                  <div className="text-sm text-white/60">
                    TypeScript coverage
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Developer Experience Section */}
        <section className="container mx-auto px-6 py-24">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
                  Built for Developers
                </h2>
                <p className="text-lg text-white/60 mb-8 leading-relaxed">
                  Focus on your app's logic while we handle the UI. Every
                  component is designed for maximum developer experience with
                  TypeScript support and intuitive APIs.
                </p>
                <div className="space-y-4">
                  {[
                    {
                      icon: Code2,
                      text: "Full TypeScript support with auto-complete",
                      color: "polkadot-cyan",
                    },
                    {
                      icon: Shield,
                      text: "Type-safe API integration with Polkadot.js",
                      color: "polkadot-violet",
                    },
                    {
                      icon: Zap,
                      text: "Hot reload and instant preview during development",
                      color: "polkadot-lime",
                    },
                    {
                      icon: Package,
                      text: "Modular components - use what you need",
                      color: "polkadot-pink",
                    },
                  ].map((item, index) => (
                    <motion.div
                      key={item.text}
                      initial={{ opacity: 0, x: -20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-3"
                    >
                      <div
                        className={`w-10 h-10 rounded-lg bg-[var(--color-${item.color})]/10 border border-[var(--color-${item.color})]/20 flex items-center justify-center flex-shrink-0`}
                      >
                        <item.icon
                          className={`w-5 h-5 text-[var(--color-${item.color})]`}
                        />
                      </div>
                      <span className="text-white/80">{item.text}</span>
                    </motion.div>
                  ))}
                </div>
              </div>
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true }}
                className="glass-dark p-6 rounded-2xl border border-white/10 backdrop-blur-xl"
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="ml-2 text-white/40">App.tsx</span>
                  </div>
                  <pre className="text-left text-sm leading-relaxed overflow-x-auto">
                    <code className="text-white/80">
                      <span className="text-purple-400">import</span> {`{ `}
                      <span className="text-cyan-300">ConnectWallet</span>
                      {` }`} <span className="text-purple-400">from</span>{" "}
                      <span className="text-green-400">'typink'</span>
                      {"\n"}
                      <span className="text-purple-400">import</span> {`{ `}
                      <span className="text-cyan-300">BalanceDisplay</span>
                      {` }`} <span className="text-purple-400">from</span>{" "}
                      <span className="text-green-400">'./components'</span>
                      {"\n\n"}
                      <span className="text-purple-400">function</span>{" "}
                      <span className="text-yellow-300">App</span>() {`{`}
                      {"\n"}
                      {"  "}
                      <span className="text-purple-400">return</span> ({"\n"}
                      {"    "}
                      <span className="text-pink-400">&lt;div&gt;</span>
                      {"\n"}
                      {"      "}
                      <span className="text-pink-400">
                        &lt;ConnectWallet /&gt;
                      </span>
                      {"\n"}
                      {"      "}
                      <span className="text-pink-400">
                        &lt;BalanceDisplay
                      </span>{" "}
                      <span className="text-cyan-300">address</span>=
                      <span className="text-green-400">{`{address}`}</span>{" "}
                      <span className="text-pink-400">/&gt;</span>
                      {"\n"}
                      {"    "}
                      <span className="text-pink-400">&lt;/div&gt;</span>
                      {"\n"}
                      {"  "}){"\n"}
                      {`}`}
                    </code>
                  </pre>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-24 mb-20">
          <div className="max-w-5xl mx-auto relative">
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-polkadot-pink)]/20 via-[var(--color-polkadot-violet)]/20 to-[var(--color-polkadot-cyan)]/20 rounded-3xl blur-3xl"></div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="relative glass-dark p-12 md:p-16 rounded-3xl border border-white/10 backdrop-blur-xl text-center"
            >
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 text-white/90 text-sm font-medium mb-6 border border-white/10">
                  <Sparkles className="w-4 h-4 text-[var(--color-polkadot-cyan)]" />
                  Start Building Today
                </div>
              </motion.div>

              <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                Clone, Customize, Deploy
              </h2>
              <p className="text-lg md:text-xl text-white/60 mb-10 max-w-2xl mx-auto leading-relaxed">
                Everything is ready. Just clone this template, connect your
                wallet, and start building your next Polkadot application.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-10">
                <Link to="/components">
                  <Button
                    variant="gradient"
                    size="xl"
                    className="min-w-[200px]"
                  >
                    <Package className="w-5 h-5" />
                    View Components
                  </Button>
                </Link>
                <Link to="/examples">
                  <Button variant="outline" size="xl" className="min-w-[200px]">
                    <Code2 className="w-5 h-5" />
                    See Examples
                  </Button>
                </Link>
              </div>

              {/* Quick Links */}
              <div className="flex flex-wrap gap-6 justify-center text-sm text-white/50 pt-8 border-t border-white/5">
                <Link
                  to="/wallet"
                  className="hover:text-white/80 transition-colors flex items-center gap-2"
                >
                  <Wallet className="w-4 h-4" />
                  Wallet Page
                </Link>
                <Link
                  to="/dashboard"
                  className="hover:text-white/80 transition-colors flex items-center gap-2"
                >
                  <Layers className="w-4 h-4" />
                  Dashboard
                </Link>
                <a
                  href="https://github.com/Polkadot-UI-Initiative/polkadot-ui"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white/80 transition-colors flex items-center gap-2"
                >
                  <Code2 className="w-4 h-4" />
                  Polkadot UI Docs
                </a>
              </div>
            </motion.div>
          </div>
        </section>
      </div>
    </div>
  );
}
