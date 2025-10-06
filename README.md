# Polkadot UI Template

A minimal Vite + React template pre-wired with Polkadot extension integration and a small component library.

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

Selected runtime dependencies (installed in this template):

- @polkadot/api
- @polkadot/extension-dapp
- @polkadot/keyring
- @polkadot/react-identicon
- typink
- @tanstack/react-query
- framer-motion
- lucide-react
- react, react-dom (18.2.0)
- react-router-dom
- tailwind-merge
- @radix-ui/react-*

Dev / build deps of note:

- vite (7.x)
- tailwindcss (4.0.0-beta.6)
- @tailwindcss/vite (4.0.0-beta.6)
- typescript
- eslint
- @vitejs/plugin-react

(See `package.json` for exact versions.)

## Pages & components included

- Pages: Homepage, Dashboard, Wallet, Accounts, Components, Examples
- Components: ConnectWallet, AddressDisplay, AccountInfo, NetworkIndicator, BlockNumber, BalanceDisplay, SelectToken, TxButton, TxNotification, AddressInput, AmountInput
- Hooks: useBlockNumber, useBalance, useChainInfo, useStakingInfo, useNonce, useEvents

## Small usage examples

Connect a wallet (component):

```tsx
import ConnectWallet from './components/ConnectWallet'

export default function App() {
  return <ConnectWallet />
}
```

Fetch the current block number (react-query + Typink):

```tsx
import { useQuery } from '@tanstack/react-query'
import { useTypink } from 'typink'

export function BlockInfo() {
  const { api } = useTypink()
  const { data } = useQuery(['blockNumber'], async () => {
    const header = await api.rpc.chain.getHeader()
    return header.number.toNumber()
  }, { refetchInterval: 6000 })

  return <div>Block: {data}</div>
}
```

## Build & deploy

```bash
pnpm build
pnpm preview
```

Recommended deploy targets: Vercel, Netlify, Cloudflare Pages, GitHub Pages.

## Notes

- Node.js 18+ (20+ preferred)  
- pnpm recommended, but npm / yarn are supported  
- Check `package.json` for exact dependency versions

Contributions welcome — open an issue or submit a PR.

## License

MIT — see `LICENSE`.

---

Built with ❤️ for the Polkadot ecosystem
