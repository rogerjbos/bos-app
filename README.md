# Polkadot UI Template

A modern, production-ready Vite + React template featuring **20+ official Polkadot UI components**, multi-wallet integration, and everything you need to build beautiful Web3 applications on Polkadot.

## Prerequisites

- Node.js 18+ (20+ recommended)
- pnpm (recommended) or npm / yarn
- A Polkadot wallet extension (Polkadot{.js}, Talisman, SubWallet, etc.) for local testing

## Quick start (pnpm)

1. Clone and install

```bash
git clone https://github.com/paritytech/polkadot-ui-template.git
cd polkadot-ui-template
pnpm install
```

2. Run dev server

```bash
pnpm dev
```

Open http://localhost:5173

## Quick start (yarn)

```bash
git clone https://github.com/paritytech/polkadot-ui-template.git
cd polkadot-ui-template
yarn
yarn dev
```

## What’s already installed

Scripts (in `package.json`):

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint . --ext .ts,.tsx,.js,.jsx"
}
```

## Polkadot UI Components

This template integrates the official **[polkadot-ui](https://github.com/Polkadot-UI-Initiative/polkadot-ui)** component library, giving you access to 20+ production-ready components:

### Wallet & Account Components
- `ConnectWallet` - Multi-wallet connection (Polkadot.js, Talisman, SubWallet, etc.)
- `AddressDisplay` - Display addresses with identicons and formatting
- `AccountInfo` - Show detailed account information
- `RequireAccount` - Conditional rendering based on account connection

### Network Components
- `NetworkIndicator` - Display current network status
- `BlockNumber` - Live block number updates
- `RequireConnection` - Conditional rendering based on connection status

### Balance & Token Components
- `BalanceDisplay` - Format and display token balances
- `SelectToken` - Token selection dropdown (requires: `npx polkadot-ui add select-token`)
- `SelectTokenDialog` - Token selection modal (requires: `npx polkadot-ui add select-token-dialog`)
- `AmountInput` - Input field for token amounts (requires: `npx polkadot-ui add amount-input`)

### Transaction Components
- `TxButton` - Transaction submission button (requires: `npx polkadot-ui add tx-button`)
- `TxNotification` - Transaction status notifications (requires: `npx polkadot-ui add tx-notification`)
- `AddressInput` - Address input with validation (requires: `npx polkadot-ui add address-input`)

### Custom Hooks
- `useBlockNumber` - Subscribe to block number updates
- `useBalance` - Fetch account balances
- `useChainInfo` - Get chain metadata
- `useStakingInfo` - Access staking data
- `useNonce` - Get account nonce
- `useEvents` - Subscribe to chain events

> **Note:** Some components require installation via `npx polkadot-ui add [component-name]`. Visit the [Components Showcase](/components) page to see all available components and installation instructions.

### Installing Additional Components

```bash
# Install a specific component
npx polkadot-ui add select-token

# Install multiple components
npx polkadot-ui add tx-button tx-notification address-input
```

## Tech Stack

**Core Framework:**
- React 18.2 + TypeScript
- Vite 7.x (fast builds & hot reload)
- React Router DOM (routing)

**Polkadot Integration:**
- @polkadot/api - Polkadot.js API
- @polkadot/extension-dapp - Browser extension integration
- @polkadot/keyring - Account management
- @polkadot/react-identicon - Blockchain identicons
- typink - Type-safe wallet connector

**UI & Styling:**
- Tailwind CSS 4.0 (beta) - Utility-first styling
- Framer Motion - Smooth animations
- Radix UI - Accessible components
- lucide-react - Icon library

**State Management:**
- @tanstack/react-query - Async state & caching

**Dev Tools:**
- TypeScript - Type safety
- ESLint - Code linting
- Vite Plugin React - Fast refresh

(See `package.json` for exact versions.)

## Pages Included

- **Homepage** - Elegant landing page showcasing template features
- **Dashboard** - Sample dashboard with network stats and account info
- **Wallet** - Wallet connection and account management
- **Components Showcase** - Interactive preview of all 20+ Polkadot UI components with code examples
- **Examples** - Code patterns and implementation examples

## Features

✨ **20+ Production-Ready Components** - Official Polkadot UI components integrated and ready to use

🔐 **Multi-Wallet Support** - Connect with Polkadot.js, Talisman, SubWallet, and more via typink

⚡ **Lightning Fast** - Vite 7.x for instant dev server and optimized builds

🎨 **Modern Design** - Tailwind CSS 4.0 with custom Polkadot theme and smooth animations

📱 **Fully Responsive** - Works seamlessly on desktop, tablet, and mobile

🔒 **100% TypeScript** - Complete type safety with auto-completion

🚀 **Production Ready** - Optimized for deployment to Vercel, Netlify, Cloudflare Pages, and more

## Usage Examples

### Connect a Wallet

```tsx
import ConnectWallet from './components/ConnectWallet'

export default function App() {
  return (
    <div>
      <h1>My Polkadot App</h1>
      <ConnectWallet />
    </div>
  )
}
```

### Display Account Balance

```tsx
import { BalanceDisplay } from './components/BalanceDisplay'
import { useTypink } from 'typink'

export function MyBalance() {
  const { accounts } = useTypink()
  const address = accounts[0]?.address

  return address ? (
    <BalanceDisplay address={address} />
  ) : (
    <p>Please connect your wallet</p>
  )
}
```

### Show Current Block Number

```tsx
import { BlockNumber } from './components/BlockNumber'

export function NetworkStatus() {
  return (
    <div>
      <h2>Network Status</h2>
      <BlockNumber />
    </div>
  )
}
```

### Use Custom Hooks

```tsx
import { useBlockNumber } from './hooks/useBlockNumber'
import { useBalance } from './hooks/useBalance'

export function Dashboard() {
  const { data: blockNumber } = useBlockNumber()
  const { data: balance } = useBalance('5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY')

  return (
    <div>
      <p>Current Block: {blockNumber}</p>
      <p>Balance: {balance?.free.toString()}</p>
    </div>
  )
}
```

### Explore More

Visit the `/components` page in your running app to see interactive examples of all 20+ components with live code previews!

## Build & Deploy

### Build for Production

```bash
pnpm build
```

This creates an optimized production build in the `dist/` folder.

### Preview Production Build Locally

```bash
pnpm preview
```

### Deploy

This template works seamlessly with modern hosting platforms:

**Vercel** (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

**Netlify**
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

**Cloudflare Pages**
- Connect your GitHub repo
- Build command: `pnpm build`
- Output directory: `dist`

**GitHub Pages**
```bash
# Install gh-pages
pnpm add -D gh-pages

# Add to package.json scripts:
# "deploy": "pnpm build && gh-pages -d dist"

pnpm deploy
```

### Environment Variables

Create a `.env` file for environment-specific configuration:

```env
VITE_DEFAULT_CHAIN=polkadot
VITE_WS_ENDPOINT=wss://rpc.polkadot.io
```

Access in your code:
```tsx
const endpoint = import.meta.env.VITE_WS_ENDPOINT
```

## Project Structure

```
polkadot-ui-template/
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ConnectWallet.tsx
│   │   ├── AddressDisplay.tsx
│   │   ├── BalanceDisplay.tsx
│   │   └── ...
│   ├── hooks/            # Custom React hooks
│   │   ├── useBlockNumber.ts
│   │   ├── useBalance.ts
│   │   └── ...
│   ├── pages/            # Page components
│   │   ├── Homepage.tsx
│   │   ├── Dashboard.tsx
│   │   ├── ComponentsShowcase.tsx
│   │   └── ...
│   ├── styles/           # Global styles & Tailwind
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── public/               # Static assets
├── vite.config.mjs       # Vite configuration
├── tailwind.config.ts    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies & scripts
```

## Customization

### Change Chain/Network

Edit your connection provider to target different networks:

```tsx
// In your provider setup
const endpoint = 'wss://westend-rpc.polkadot.io' // Westend testnet
// or
const endpoint = 'wss://kusama-rpc.polkadot.io' // Kusama
```

### Customize Theme

The template uses Tailwind CSS with custom Polkadot colors. Edit `src/styles/index.css`:

```css
@theme {
  --color-polkadot-pink: #e6007a;
  --color-polkadot-cyan: #00b2ff;
  --color-polkadot-violet: #6d3aee;
  --color-polkadot-lime: #56f39a;
}
```

### Add New Components

Install official Polkadot UI components:

```bash
# Browse available components at:
# https://github.com/Polkadot-UI-Initiative/polkadot-ui

npx polkadot-ui add [component-name]
```

## Troubleshooting

**Wallet extension not detected?**
- Make sure you have a Polkadot wallet extension installed (Polkadot.js, Talisman, or SubWallet)
- Check that the extension is enabled for your site
- Refresh the page after installing the extension

**Build errors?**
- Clear node_modules and reinstall: `rm -rf node_modules pnpm-lock.yaml && pnpm install`
- Check Node.js version: `node --version` (should be 18+)
- Update dependencies: `pnpm update`

**TypeScript errors?**
- Run type checking: `pnpm tsc --noEmit`
- Check `tsconfig.json` configuration
- Ensure all dependencies are properly installed

## Resources

- **Polkadot UI Components**: https://github.com/Polkadot-UI-Initiative/polkadot-ui
- **Polkadot.js API Docs**: https://polkadot.js.org/docs/
- **Typink Documentation**: https://github.com/open-web3-stack/typink
- **Polkadot Developer Hub**: https://wiki.polkadot.network/docs/build-index
- **Substrate Docs**: https://docs.substrate.io/

## Contributing

Contributions are welcome! Please feel free to:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support

- **Issues**: Open an issue on [GitHub](https://github.com/paritytech/polkadot-ui-template/issues)
- **Discussions**: Join the [Polkadot Forum](https://forum.polkadot.network/)
- **Discord**: [Polkadot Discord](https://discord.gg/polkadot)

## License

MIT — see `LICENSE`.

---

Built with ❤️ for the Polkadot ecosystem by [Parity Technologies](https://www.parity.io/)
