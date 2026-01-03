# bos-app

A personal website with wallet-based authentication using MetaMask and Polkadot wallets.

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm
- MetaMask browser extension (for Ethereum authentication)
- Polkadot.js extension (for Polkadot authentication)

### Installation
```bash
cd ~/node_home/bos-app
pnpm install
```

### Development Servers

The app requires two servers to run during development:

1. **Frontend (Vite)**: `pnpm run dev` - Runs on port 5173
2. **API Server**: Python FastAPI server with integrated wallet authentication - Runs on port 4000

#### Option 1: Run servers separately
```bash
# Terminal 1 - API server with authentication
~/scripts/run_data_api_server.sh restart

# Terminal 2 - Frontend
pnpm run dev
```

#### Option 2: Run both servers together
```bash
# Start API server first
~/scripts/run_data_api_server.sh restart

# Then start frontend
pnpm run dev
```

### Production Deployment

```bash
~/scripts/manage_node_server.sh restart
~/scripts/run_data_api_server.sh restart
```

## Wallet Authentication

The app supports two authentication systems working together:

### SIWS Authentication (Primary for Wallets)
- **Library**: @shawncoe/siws-auth for Substrate-based wallets
- **Wallets**: Polkadot.js extension
- **Usage**: Wallet connection and user identity
- **Features**: Sign-In With Substrate protocol, persistent sessions

### JWT Authentication (API Access)
- **Backend**: Python FastAPI server with JWT tokens
- **Usage**: API authentication for TradingConfig and other components
- **Features**: Challenge-response authentication, automatic token refresh
- **Storage**: JWT tokens in localStorage (`accessToken`, `refreshToken`)

### How Authentication Works

1. **Connect Wallet**: Connect your Polkadot wallet (SIWS) or MetaMask (placeholder)
2. **SIWS Auth**: Polkadot wallets authenticate via Sign-In With Substrate
3. **Auto-Refresh**: JWT tokens are automatically refreshed when expired

### Current Implementation Status

- ✅ **Polkadot SIWS**: Fully implemented in ConnectWallet component
- ✅ **API JWT**: Active in TradingConfig, Portfolio, and other components
- ✅ **Token Management**: Automatic refresh and localStorage persistence

### API Endpoints

Authentication endpoints are integrated into the Python API server:

- `GET /auth/health` - Authentication service health check

### Components Using Authentication

- **ConnectWallet**: SIWS authentication for Polkadot wallets
- **AuthStatus**: JWT-based user status display
- **TradingConfig**: JWT tokens for API calls
- **Portfolio**: JWT tokens for API calls
- **Ranks**: Static API key authentication

### Token Management

- **Storage**: JWT tokens stored in localStorage (`accessToken`, `refreshToken`)
- **Expiration**: Access tokens expire in 1 hour, refresh tokens last longer
- **Auto-refresh**: Automatic token refresh on API calls
- **Security**: Tokens are validated on both client and server

## Project Structure

```
bos-app/
├── src/
│   ├── components/
│   │   ├── ConnectMetaMask.tsx    # MetaMask wallet connection (placeholder auth)
│   │   ├── ConnectWallet.tsx      # Polkadot wallet connection + SIWS auth
│   │   ├── AuthStatus.tsx         # JWT-based authentication status display
│   │   └── ...
│   ├── context/
│   │   ├── AuthContext.tsx        # SIWS authentication context (Polkadot)
│   │   └── ...
│   ├── hooks/
│   │   ├── useWalletAuth.ts       # JWT-based authentication logic
│   │   └── ...
│   ├── providers/
│   │   ├── WalletAuthProvider.tsx # JWT auth context provider
│   │   ├── MetaMaskProvider.tsx   # MetaMask wallet provider
│   │   └── ...
│   └── ...
├── server.cjs                     # Production Express server
├── vite.config.mjs               # Vite config with proxy setup
└── package.json
```

**Note**: The app uses dual authentication systems:
- **SIWS**: For Polkadot wallet authentication and identity
- **JWT**: For API access tokens in TradingConfig, Portfolio, and other components

## Backend Services

- **Frontend**: Vite dev server (port 5173)
- **API Backend**: Python FastAPI server with JWT authentication (port 4000)
- **Authentication**: Dual system - SIWS for wallets, JWT for API access

### Authentication Architecture

**SIWS System (Wallet Authentication)**:
- Sign-In With Substrate protocol
- Polkadot.js extension integration
- Used for wallet connection and user identity

**JWT System (API Access)**:
- Challenge-response authentication
- Stateless JWT tokens with automatic refresh
- Used by TradingConfig, Portfolio, and other components for API calls

#### Notes
cd ~/node_home/bos-app
cd ~/python_home/data-api-server
cd ~/rust_home/rig_buy_sell
kill $(lsof -ti:5173)
~/scripts/run_data_api_server.sh restart
~/scripts/manage_node_server.sh restart
