# Polkadot UI Template

> A beautiful, production-ready React template for building Polkadot applications with modern UI components and multi-wallet support.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat&logo=typescript&logoColor=white)
![Polkadot](https://img.shields.io/badge/Polkadot-E6007A?style=flat&logo=polkadot&logoColor=white)

## Overview

This template provides everything you need to build a stunning Polkadot application with:
- 🎨 **Beautiful UI** - Glassmorphism effects, gradient animations, and Polkadot brand colors
- 🔗 **Multi-Wallet Support** - Connect to 5+ wallets (Polkadot.js, Talisman, SubWallet, Nova, Enkrypt)
- � **Real-Time Data** - Live chain metrics, balances, and network monitoring
- 🧩 **15+ Components** - Production-ready components from Polkadot UI Initiative
- 📚 **Code Examples** - 8+ copy-paste ready samples for common operations
- ⚡ **Modern Stack** - React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

## 🔌 Wallet Integration

### 🧩 Polkadot UI Components Library

This template showcases **15+ reusable components and hooks** from the [Polkadot UI Initiative](https://github.com/Polkadot-UI-Initiative/polkadot-ui).

**Wallet & Account:**
- **ConnectWallet** - Multi-wallet connection (Polkadot.js, Talisman, SubWallet, Nova, Enkrypt)
- **AddressDisplay** - Address with identicon, copy, and explorer links
- **RequireAccount** - Conditional rendering based on account
- **AccountInfo** - Display identity, balance, and metadata

**Network & Connection:**
- **NetworkIndicator** - Connection status with animated indicators
- **BlockNumber** - Real-time block number display
- **RequireConnection** - Gate content behind connection

**Balance & Token:**
- **BalanceDisplay** - Account balance with auto-formatting
- **SelectToken** - Token dropdown with balance display
- **SelectTokenDialog** - Dialog-based token selector with search

**Transactions:**
- **TxButton** - Submit transactions with progress & notifications
- **TxNotification** - Transaction status toasts

**Input Components:**
- **AddressInput** - Validated address input with identity lookup
- **AmountInput** - Token amount input with max button

**Custom Hooks:**
- **useBlockNumber**, **useBalance**, **useChainInfo**, **useStakingInfo**, **useNonce**, **useEvents**


> 💡 Some components can be installed via: `npx polkadot-ui add <component-name>`

### 📚 Code Examples

8+ copy-paste ready code samples across categories:
- **Query Examples** - Fetch chain data, balances, staking info
- **Transaction Examples** - Sign and send transfers with fee estimation
- **Subscription Examples** - Real-time updates for blocks and balances
- **Hook Examples** - Use wallet state with Typink
- One-click clipboard copying
- Category filtering
- Syntax highlighting

### 📊 Dashboard Features

Real-time Polkadot network monitoring:
- Latest block number with live indicator
- Total issuance and validator count
- Active era and network info
- Account balances (free, reserved, frozen)
- Connection status
- Beautiful glassmorphism UI with gradient animations

### 🚀 Tech Stack

### 🚀 Modern Tech Stackplate for building Polkadot applications with modern UI components and multi-wallet support.

![Polkadot UI Template](https://img.shields.io/badge/Polkadot-E6007A?style=for-the-badge&logo=polkadot&logoColor=white)
![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=for-the-badge&logo=typescript&logoColor=white)

## ✨ Features

### 🎨 Beautiful Design System
- **Polkadot Brand Colors**: Official pink, violet, cyan, and lime
- **Modern UI Components**: Built with Radix UI primitives and CVA
- **Glassmorphism Effects**: Stunning backdrop blur and transparency effects
- **Gradient Animations**: Smooth animated gradients throughout
- **Dark Mode Support**: Beautiful dark theme with CSS variables
- **Responsive Design**: Mobile-first approach with elegant breakpoints

### 🔗 Multi-Wallet Support
Powered by **Typink** - Connect to multiple Polkadot wallets:
- ✅ Polkadot.js Extension
- ✅ Talisman
- ✅ SubWallet  
- ✅ Nova Wallet
- ✅ Enkrypt

**Features:**
- Beautiful modal dialog for wallet selection
- Auto-detection of installed wallets
- Direct install links for missing wallets
- Account selection with Identicon avatars
- Connection status indicators
- Persistent account selection

### 📊 Real-Time Chain Data
Live dashboard with actual Polkadot network information:
- **Latest Block Number** - Real-time block height with live indicator
- **Total Issuance** - Current token supply in circulation
- **Validator Count** - Number of active validators
- **Active Era** - Current staking era
- **Network Info** - Chain name and token details
- **Account Balance** - Free, reserved, and frozen balances

### � Account Management
Comprehensive account view with:
- **Balance Overview** - Total, free, reserved, and frozen amounts
- **Account Details** - Name, address, source wallet, and nonce
- **Identicon Display** - Visual account identifiers
- **Copy Address** - One-click address copying
- **Subscan Integration** - Direct links to blockchain explorer
- **Set Active Account** - Switch between multiple accounts
- **Send Transfers** - Built-in transfer functionality with status tracking

### 📚 Code Examples
Complete examples page with copy-paste ready samples:
- **Query Examples** - Fetch chain data, balances, staking info
- **Transaction Examples** - Sign and send transfers with fee estimation
- **Subscription Examples** - Real-time updates for blocks and balances
- **Hook Examples** - Use wallet state with Typink
- **Copy to Clipboard** - One-click code copying
- **Category Filter** - Filter by query, transaction, subscription, or hook

### �🚀 Modern Tech Stack
- **React 18.2** with TypeScript
- **Vite 7.1** for lightning-fast development
- **Tailwind CSS v4** with native CSS variables
- **Framer Motion** for smooth animations
- **Radix UI** for accessible primitives
- **Typink** for multi-wallet abstraction
- **Polkadot.js API** for blockchain interaction
- **@polkadot/util** for formatting and utilities

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ (recommended: 20+)
- pnpm (or npm/yarn)
- A Polkadot wallet extension

### Installation

\`\`\`bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
\`\`\`

Open your browser to the URL shown in terminal (usually http://localhost:5173)

## � Pages

### 🏠 Homepage
Stunning landing page with:
- Animated gradient backgrounds with Polkadot colors
- Hero section with call-to-action
- Feature showcase with 6 key features
- Stats section displaying chain metrics
- Smooth animations with Framer Motion

### 📊 Dashboard
Real-time network monitoring:
- Live block number with animated indicator
- Total token issuance
- Validator count and active era
- Connected account balance breakdown
- Automatic updates every block
- Welcome message with network info

### 👤 Accounts
Complete account management:
- Grid view of all connected accounts
- Balance details (free, reserved, frozen, nonce)
- Identicon visual identifiers
- Set active account
- Copy address to clipboard
- View on Subscan explorer
- Send transfer dialog with:
  - Recipient input
  - Amount input with validation
  - Real-time transaction status
  - Success confirmation

### 📚 Examples
Comprehensive code samples:
- 8+ ready-to-use examples
- Categories: Query, Transaction, Subscription, Hook
- Syntax highlighted code blocks
- One-click copy to clipboard
- Filter by category
- External resource links (Polkadot.js docs, Wiki, Typink, Substrate)

## �🔌 Wallet Integration

### Using ConnectWallet

\`\`\`tsx
import ConnectWallet from './components/ConnectWallet'

function MyComponent() {
  return <ConnectWallet />
}
\`\`\`

### Accessing Wallet State

\`\`\`tsx
import { useTypink } from 'typink'

function MyComponent() {
  const {
    wallets,
    connectedAccount,
    connectWallet,
    disconnect
  } = useTypink()
  
  // Use wallet state...
}
\`\`\`

## 📦 Components

All components are fully customizable and follow best practices:

- **Button**: 7 variants (default, gradient, outline, secondary, ghost, link, destructive) with 5 sizes
- **Card**: Complete suite with CardHeader, CardTitle, CardDescription, CardContent, CardFooter
- **Dialog**: Animated modals with backdrop blur and Radix UI primitives
- **ConnectWallet**: Multi-wallet integration with two-step flow
- **Navigation**: Glassmorphism nav bar with responsive design
- **Footer**: Elegant footer with external links

## 🎯 What Makes This Template Special?

### For Developers
- **Zero Configuration** - Clone and start building immediately
- **Type-Safe** - Full TypeScript support with proper type definitions
- **Best Practices** - Follows React, Polkadot, and accessibility standards
- **Production Ready** - Optimized build, error handling, loading states
- **Well Documented** - Comprehensive comments and examples
- **Modern Stack** - Latest versions of all dependencies

### For Polkadot Builders
- **Real Examples** - Actual working code, not just placeholders
- **Multi-Wallet** - Support all major Polkadot wallets out of the box
- **Live Data** - Real-time chain data subscriptions
- **Transaction Ready** - Sign and send transactions with proper error handling
- **Balance Management** - Properly formatted balances with denominations
- **Network Agnostic** - Works with Polkadot, Kusama, and parachains

### For Users
- **Beautiful UI** - Professional design with Polkadot branding
- **Smooth Animations** - Delightful interactions with Framer Motion
- **Responsive** - Works perfectly on mobile, tablet, and desktop
- **Accessible** - Built with Radix UI for proper a11y support
- **Fast** - Vite for instant HMR and optimized builds

## 🚀 Deployment

The template is ready to deploy to any static hosting:

\`\`\`bash
# Build for production
pnpm build

# Preview production build
pnpm preview
\`\`\`

**Recommended Hosts:**
- [Vercel](https://vercel.com) - Zero config deployment
- [Netlify](https://netlify.com) - Automatic builds from Git
- [GitHub Pages](https://pages.github.com) - Free hosting for public repos
- [Cloudflare Pages](https://pages.cloudflare.com) - Global CDN

## 📄 License

MIT License - free to use for any project!

## 🙏 Credits

- [Polkadot UI Initiative](https://github.com/Polkadot-UI-Initiative/polkadot-ui)
- [Typink](https://github.com/dedotdev/typink)
- [Radix UI](https://www.radix-ui.com/)

---

**Built with ❤️ for the Polkadot ecosystem**
