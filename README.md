# Polkadot UI Template# Polkadot UI Template



> A beautiful, production-ready React template for building Polkadot applications with modern UI components and multi-wallet support.> A beautiful, production-ready React template for building Polkadot applications with modern UI components and multi-wallet support.



[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat&logo=react&logoColor=black)![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=flat&logo=react&logoColor=black)

![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat&logo=typescript&logoColor=white)![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat&logo=typescript&logoColor=white)

![Polkadot](https://img.shields.io/badge/Polkadot-E6007A?style=flat&logo=polkadot&logoColor=white)![Polkadot](https://img.shields.io/badge/Polkadot-E6007A?style=flat&logo=polkadot&logoColor=white)



## Overview## Overview



This template provides everything you need to build a stunning Polkadot application with:This template provides everything you need to build a stunning Polkadot application with:

- 🎨 **Beautiful UI** - Glassmorphism effects, gradient animations, and Polkadot brand colors- 🎨 **Beautiful UI** - Glassmorphism effects, gradient animations, and Polkadot brand colors

- 🔗 **Multi-Wallet Support** - Connect to 5+ wallets (Polkadot.js, Talisman, SubWallet, Nova, Enkrypt)- 🔗 **Multi-Wallet Support** - Connect to 5+ wallets (Polkadot.js, Talisman, SubWallet, Nova, Enkrypt)

- 📊 **Real-Time Data** - Live chain metrics, balances, and network monitoring- � **Real-Time Data** - Live chain metrics, balances, and network monitoring

- 🧩 **15+ Components** - Production-ready components from Polkadot UI Initiative- 🧩 **15+ Components** - Production-ready components from Polkadot UI Initiative

- 📚 **Code Examples** - 8+ copy-paste ready samples for common operations- 📚 **Code Examples** - 8+ copy-paste ready samples for common operations

- ⚡ **Modern Stack** - React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion- ⚡ **Modern Stack** - React 18, TypeScript, Vite, Tailwind CSS v4, Framer Motion



## 📦 Quick Start## Quick Start



```bash```bash

# Clone the repository# Install dependencies

git clone https://github.com/paritytech/polkadot-ui-template.gitpnpm install

cd polkadot-ui-template

# Start development server

# Install dependenciespnpm dev

pnpm install

# Build for production

# Start development serverpnpm build

pnpm dev```



# Build for production## 🔌 Wallet Integration

pnpm build

```### 🧩 Polkadot UI Components Library



Open your browser to `http://localhost:5173`This template showcases **15+ reusable components and hooks** from the [Polkadot UI Initiative](https://github.com/Polkadot-UI-Initiative/polkadot-ui).



## ✨ Features**Wallet & Account:**

- **ConnectWallet** - Multi-wallet connection (Polkadot.js, Talisman, SubWallet, Nova, Enkrypt)

### 🎨 Beautiful Design System- **AddressDisplay** - Address with identicon, copy, and explorer links

- **Polkadot Brand Colors** - Official pink (#E6007A), violet, cyan, and lime- **RequireAccount** - Conditional rendering based on account

- **Glassmorphism Effects** - Stunning backdrop blur and transparency- **AccountInfo** - Display identity, balance, and metadata

- **Gradient Animations** - Smooth animated gradients throughout

- **Dark Mode** - Beautiful dark theme with CSS variables**Network & Connection:**

- **Responsive Design** - Mobile-first approach with elegant breakpoints- **NetworkIndicator** - Connection status with animated indicators

- **Modern Components** - Built with Radix UI primitives and CVA- **BlockNumber** - Real-time block number display

- **RequireConnection** - Gate content behind connection

### 🔗 Multi-Wallet Support

Powered by **Typink** - Connect to 5+ Polkadot wallets:**Balance & Token:**

- ✅ Polkadot.js Extension- **BalanceDisplay** - Account balance with auto-formatting

- ✅ Talisman- **SelectToken** - Token dropdown with balance display

- ✅ SubWallet  - **SelectTokenDialog** - Dialog-based token selector with search

- ✅ Nova Wallet

- ✅ Enkrypt**Transactions:**

- **TxButton** - Submit transactions with progress & notifications

**Features:**- **TxNotification** - Transaction status toasts

- Beautiful modal dialog for wallet selection

- Auto-detection of installed wallets**Input Components:**

- Direct install links for missing wallets- **AddressInput** - Validated address input with identity lookup

- Account selection with Identicon avatars- **AmountInput** - Token amount input with max button

- Connection status indicators

- Persistent account selection**Custom Hooks:**

- **useBlockNumber**, **useBalance**, **useChainInfo**, **useStakingInfo**, **useNonce**, **useEvents**

### 📊 Real-Time Chain Data

Live dashboard with actual Polkadot network information:

- Latest block number with animated indicator> 💡 Some components can be installed via: `npx polkadot-ui add <component-name>`

- Total token issuance and circulation

- Validator count and active era### 📚 Code Examples

- Network info (chain name, token details)

- Account balances (free, reserved, frozen)8+ copy-paste ready code samples across categories:

- Automatic updates every block- **Query Examples** - Fetch chain data, balances, staking info

- **Transaction Examples** - Sign and send transfers with fee estimation

### 👤 Account Management- **Subscription Examples** - Real-time updates for blocks and balances

- Balance overview (total, free, reserved, frozen)- **Hook Examples** - Use wallet state with Typink

- Account details with identicon display- One-click clipboard copying

- Copy address to clipboard- Category filtering

- Subscan explorer integration- Syntax highlighting

- Switch between multiple accounts

- Built-in transfer functionality with status tracking## ✨ Features



## 🧩 Polkadot UI Components### 🎨 Beautiful Design System

- **Polkadot Brand Colors** - Official pink (#E6007A), violet, cyan, and lime

This template showcases **15+ reusable components and hooks** from the [Polkadot UI Initiative](https://github.com/Polkadot-UI-Initiative/polkadot-ui).- **Glassmorphism Effects** - Stunning backdrop blur and transparency

- **Gradient Animations** - Smooth animated gradients throughout

### Wallet & Account- **Dark Mode** - Beautiful dark theme with CSS variables

- **ConnectWallet** - Multi-wallet connection dialog- **Responsive Design** - Mobile-first approach with elegant breakpoints

- **AddressDisplay** - Address with identicon, copy, and explorer links- **Modern Components** - Built with Radix UI primitives and CVA

- **RequireAccount** - Conditional rendering based on account

- **AccountInfo** - Display identity, balance, and metadata### 🔗 Multi-Wallet Support

Powered by **Typink** - Connect to 5+ Polkadot wallets:

### Network & Connection- ✅ Polkadot.js Extension

- **NetworkIndicator** - Connection status with animated indicators- ✅ Talisman

- **BlockNumber** - Real-time block number display- ✅ SubWallet  

- **RequireConnection** - Gate content behind connection- ✅ Nova Wallet

- ✅ Enkrypt

### Balance & Token

- **BalanceDisplay** - Account balance with auto-formatting**Features:**

- **SelectToken** - Token dropdown with balance display- Beautiful modal dialog for wallet selection

- **SelectTokenDialog** - Dialog-based token selector with search- Auto-detection of installed wallets

- Direct install links for missing wallets

### Transactions- Account selection with Identicon avatars

- **TxButton** - Submit transactions with progress & notifications- Connection status indicators

- **TxNotification** - Transaction status toasts- Persistent account selection



### Input Components### � Real-Time Chain Data

- **AddressInput** - Validated address input with identity lookupLive dashboard with actual Polkadot network information:

- **AmountInput** - Token amount input with max button- Latest block number with animated indicator

- Total token issuance and circulation

### Custom Hooks- Validator count and active era

- **useBlockNumber**, **useBalance**, **useChainInfo**, **useStakingInfo**, **useNonce**, **useEvents**- Network info (chain name, token details)

- Account balances (free, reserved, frozen)

> 💡 Install components via: `npx polkadot-ui add <component-name>`- Automatic updates every block



## 📚 Code Examples### 👤 Account Management

- Balance overview (total, free, reserved, frozen)

The template includes 8+ copy-paste ready code samples:- Account details with identicon display

- Copy address to clipboard

### Query Examples- Subscan explorer integration

- Fetch chain data (block number, validator count, total issuance)- Switch between multiple accounts

- Get account balances with proper formatting- Built-in transfer functionality with status tracking

- Query staking information (active era, validators)

### 🚀 Tech Stack

### Transaction Examples

- Sign and send transfers with fee estimation## ✨ Features

- Handle transaction lifecycle (pending, success, error)

- Display transaction notifications### 🎨 Beautiful Design System

- **Polkadot Brand Colors**: Official pink, violet, cyan, and lime

### Subscription Examples- **Modern UI Components**: Built with Radix UI primitives and CVA

- Subscribe to new blocks in real-time- **Glassmorphism Effects**: Stunning backdrop blur and transparency effects

- Watch balance changes- **Gradient Animations**: Smooth animated gradients throughout

- Monitor account activity- **Dark Mode Support**: Beautiful dark theme with CSS variables

- **Responsive Design**: Mobile-first approach with elegant breakpoints

### Hook Examples

- Use wallet state with Typink### 🔗 Multi-Wallet Support

- Custom React Query hooksPowered by **Typink** - Connect to multiple Polkadot wallets:

- Event subscriptions- ✅ Polkadot.js Extension

- ✅ Talisman

**Features:**- ✅ SubWallet  

- Syntax highlighting- ✅ Nova Wallet

- One-click clipboard copying- ✅ Enkrypt

- Category filtering

- External resource links (Polkadot.js docs, Wiki, Typink, Substrate)**Features:**

- Beautiful modal dialog for wallet selection

## 🚀 Tech Stack- Auto-detection of installed wallets

- Direct install links for missing wallets

- **React 18.2** with TypeScript 5.6- Account selection with Identicon avatars

- **Vite 7.1** - Lightning-fast development and optimized builds- Connection status indicators

- **Tailwind CSS v4** - Utility-first CSS with native CSS variables- Persistent account selection

- **Framer Motion** - Smooth animations and transitions

- **Radix UI** - Accessible, unstyled component primitives### 📊 Real-Time Chain Data

- **Typink** - Multi-wallet abstraction layerLive dashboard with actual Polkadot network information:

- **Polkadot.js API** - Blockchain interaction- **Latest Block Number** - Real-time block height with live indicator

- **TanStack Query** - Async state management- **Total Issuance** - Current token supply in circulation

- **Validator Count** - Number of active validators

## 📄 Pages- **Active Era** - Current staking era

- **Network Info** - Chain name and token details

### 🏠 Homepage- **Account Balance** - Free, reserved, and frozen balances

Stunning landing page with:

- Animated gradient backgrounds with Polkadot colors### � Account Management

- Hero section with call-to-actionComprehensive account view with:

- Feature showcase with 6 key features- **Balance Overview** - Total, free, reserved, and frozen amounts

- Stats section displaying live chain metrics- **Account Details** - Name, address, source wallet, and nonce

- Smooth animations with Framer Motion- **Identicon Display** - Visual account identifiers

- **Copy Address** - One-click address copying

### 📊 Dashboard- **Subscan Integration** - Direct links to blockchain explorer

Real-time network monitoring:- **Set Active Account** - Switch between multiple accounts

- Live block number with animated indicator- **Send Transfers** - Built-in transfer functionality with status tracking

- Total token issuance

- Validator count and active era### 📚 Code Examples

- Connected account balance breakdownComplete examples page with copy-paste ready samples:

- Automatic updates every block- **Query Examples** - Fetch chain data, balances, staking info

- Welcome message with network info- **Transaction Examples** - Sign and send transfers with fee estimation

- **Subscription Examples** - Real-time updates for blocks and balances

### 👤 Accounts- **Hook Examples** - Use wallet state with Typink

Complete account management:- **Copy to Clipboard** - One-click code copying

- Grid view of all connected accounts- **Category Filter** - Filter by query, transaction, subscription, or hook

- Balance details (free, reserved, frozen, nonce)

- Identicon visual identifiers### �🚀 Modern Tech Stack

- Set active account- **React 18.2** with TypeScript

- Copy address to clipboard- **Vite 7.1** for lightning-fast development

- View on Subscan explorer- **Tailwind CSS v4** with native CSS variables

- Send transfer dialog with real-time status- **Framer Motion** for smooth animations

- **Radix UI** for accessible primitives

### 💼 Wallet- **Typink** for multi-wallet abstraction

Comprehensive wallet hub:- **Polkadot.js API** for blockchain interaction

- Supported wallets showcase (5 wallets)- **@polkadot/util** for formatting and utilities

- Step-by-step connection guide

- Security badges and notices## 🚀 Quick Start

- Direct links to wallet downloads

### Prerequisites

### 🧩 Components- Node.js 18+ (recommended: 20+)

Browse all available Polkadot UI components:- pnpm (or npm/yarn)

- 15+ components organized by category- A Polkadot wallet extension

- Live previews with real data

- Installation instructions### Installation

- Category filtering

- External documentation links\`\`\`bash

# Install dependencies

### 📚 Examplespnpm install

Comprehensive code samples:

- 8+ ready-to-use examples# Start development server

- Categories: Query, Transaction, Subscription, Hookpnpm dev

- Syntax highlighted code blocks

- One-click copy to clipboard# Build for production

- Filter by categorypnpm build

\`\`\`

## 🔌 Usage

Open your browser to the URL shown in terminal (usually http://localhost:5173)

### Connecting Wallets

## � Pages

```tsx

import ConnectWallet from './components/ConnectWallet'### 🏠 Homepage

Stunning landing page with:

function App() {- Animated gradient backgrounds with Polkadot colors

  return <ConnectWallet />- Hero section with call-to-action

}- Feature showcase with 6 key features

```- Stats section displaying chain metrics

- Smooth animations with Framer Motion

### Accessing Wallet State

### 📊 Dashboard

```tsxReal-time network monitoring:

import { useTypink } from 'typink'- Live block number with animated indicator

- Total token issuance

function MyComponent() {- Validator count and active era

  const {- Connected account balance breakdown

    wallets,- Automatic updates every block

    connectedAccount,- Welcome message with network info

    connectWallet,

    disconnect### 👤 Accounts

  } = useTypink()Complete account management:

  - Grid view of all connected accounts

  return (- Balance details (free, reserved, frozen, nonce)

    <div>- Identicon visual identifiers

      {connectedAccount ? (- Set active account

        <p>Connected: {connectedAccount.address}</p>- Copy address to clipboard

      ) : (- View on Subscan explorer

        <button onClick={() => connectWallet('polkadot-js')}>- Send transfer dialog with:

          Connect  - Recipient input

        </button>  - Amount input with validation

      )}  - Real-time transaction status

    </div>  - Success confirmation

  )

}### 📚 Examples

```Comprehensive code samples:

- 8+ ready-to-use examples

### Fetching Chain Data- Categories: Query, Transaction, Subscription, Hook

- Syntax highlighted code blocks

```tsx- One-click copy to clipboard

import { useQuery } from '@tanstack/react-query'- Filter by category

import { useTypink } from 'typink'- External resource links (Polkadot.js docs, Wiki, Typink, Substrate)



function ChainInfo() {## �🔌 Wallet Integration

  const { api } = useTypink()

  ### Using ConnectWallet

  const { data: blockNumber } = useQuery({

    queryKey: ['blockNumber'],\`\`\`tsx

    queryFn: async () => {import ConnectWallet from './components/ConnectWallet'

      const header = await api.rpc.chain.getHeader()

      return header.number.toNumber()function MyComponent() {

    },  return <ConnectWallet />

    refetchInterval: 6000 // Update every 6 seconds}

  })\`\`\`

  

  return <div>Block: {blockNumber}</div>### Accessing Wallet State

}

```\`\`\`tsx

import { useTypink } from 'typink'

## 🎯 What Makes This Template Special?

function MyComponent() {

### For Developers  const {

- **Zero Configuration** - Clone and start building immediately    wallets,

- **Type-Safe** - Full TypeScript support with proper type definitions    connectedAccount,

- **Best Practices** - Follows React, Polkadot, and accessibility standards    connectWallet,

- **Production Ready** - Optimized build, error handling, loading states    disconnect

- **Well Documented** - Comprehensive comments and examples  } = useTypink()

- **Modern Stack** - Latest versions of all dependencies  

  // Use wallet state...

### For Polkadot Builders}

- **Real Examples** - Actual working code, not placeholders\`\`\`

- **Multi-Wallet** - Support all major Polkadot wallets out of the box

- **Live Data** - Real-time chain data subscriptions## 📦 Components

- **Transaction Ready** - Sign and send transactions with proper error handling

- **Balance Management** - Properly formatted balances with denominationsAll components are fully customizable and follow best practices:

- **Network Agnostic** - Works with Polkadot, Kusama, and parachains

- **Button**: 7 variants (default, gradient, outline, secondary, ghost, link, destructive) with 5 sizes

### For Users- **Card**: Complete suite with CardHeader, CardTitle, CardDescription, CardContent, CardFooter

- **Beautiful UI** - Professional design with Polkadot branding- **Dialog**: Animated modals with backdrop blur and Radix UI primitives

- **Smooth Animations** - Delightful interactions with Framer Motion- **ConnectWallet**: Multi-wallet integration with two-step flow

- **Responsive** - Works perfectly on mobile, tablet, and desktop- **Navigation**: Glassmorphism nav bar with responsive design

- **Accessible** - Built with Radix UI for proper a11y support- **Footer**: Elegant footer with external links

- **Fast** - Vite for instant HMR and optimized builds

## 🎯 What Makes This Template Special?

## 🚢 Deployment

### For Developers

The template is ready to deploy to any static hosting:- **Zero Configuration** - Clone and start building immediately

- **Type-Safe** - Full TypeScript support with proper type definitions

```bash- **Best Practices** - Follows React, Polkadot, and accessibility standards

# Build for production- **Production Ready** - Optimized build, error handling, loading states

pnpm build- **Well Documented** - Comprehensive comments and examples

- **Modern Stack** - Latest versions of all dependencies

# Preview production build locally

pnpm preview### For Polkadot Builders

```- **Real Examples** - Actual working code, not just placeholders

- **Multi-Wallet** - Support all major Polkadot wallets out of the box

**Recommended Hosts:**- **Live Data** - Real-time chain data subscriptions

- [Vercel](https://vercel.com) - Zero config deployment- **Transaction Ready** - Sign and send transactions with proper error handling

- [Netlify](https://netlify.com) - Automatic builds from Git- **Balance Management** - Properly formatted balances with denominations

- [GitHub Pages](https://pages.github.com) - Free hosting for public repos- **Network Agnostic** - Works with Polkadot, Kusama, and parachains

- [Cloudflare Pages](https://pages.cloudflare.com) - Global CDN

### For Users

## 📋 Prerequisites- **Beautiful UI** - Professional design with Polkadot branding

- **Smooth Animations** - Delightful interactions with Framer Motion

- **Node.js** 18+ (recommended: 20+)- **Responsive** - Works perfectly on mobile, tablet, and desktop

- **pnpm** (or npm/yarn)- **Accessible** - Built with Radix UI for proper a11y support

- **Polkadot Wallet Extension** (Polkadot.js, Talisman, SubWallet, etc.)- **Fast** - Vite for instant HMR and optimized builds



## 🤝 Contributing## 🚀 Deployment



Contributions are welcome! Please feel free to submit a Pull Request.The template is ready to deploy to any static hosting:



## 📄 License\`\`\`bash

# Build for production

MIT License - see [LICENSE](LICENSE) file for details.pnpm build



## 🙏 Credits# Preview production build

pnpm preview

Built with amazing open source projects:\`\`\`

- [Polkadot UI Initiative](https://github.com/Polkadot-UI-Initiative/polkadot-ui)

- [Typink](https://github.com/dedotdev/typink)**Recommended Hosts:**

- [Polkadot.js](https://polkadot.js.org/)- [Vercel](https://vercel.com) - Zero config deployment

- [Radix UI](https://www.radix-ui.com/)- [Netlify](https://netlify.com) - Automatic builds from Git

- [Tailwind CSS](https://tailwindcss.com/)- [GitHub Pages](https://pages.github.com) - Free hosting for public repos

- [Framer Motion](https://www.framer.com/motion/)- [Cloudflare Pages](https://pages.cloudflare.com) - Global CDN



---## 📄 License



**Built with ❤️ for the Polkadot ecosystem**MIT License - free to use for any project!


## 🙏 Credits

- [Polkadot UI Initiative](https://github.com/Polkadot-UI-Initiative/polkadot-ui)
- [Typink](https://github.com/dedotdev/typink)
- [Radix UI](https://www.radix-ui.com/)

---

**Built with ❤️ for the Polkadot ecosystem**
