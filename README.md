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

### Production
```bash
~/scripts/manage_node_server.sh restart
~/scripts/run_data_api_server.sh restart
```

## Wallet Authentication

The app integrates wallet-based SSO authentication supporting:

- **MetaMask**: Ethereum wallet authentication
- **Polkadot**: Substrate-based wallet authentication

### How Authentication Works

1. **Connect Wallet**: Connect your MetaMask or Polkadot wallet
2. **Generate Challenge**: Click "Auth" to request an authentication challenge
3. **Sign Message**: Sign the challenge message in your wallet
4. **Verify & Authenticate**: Receive JWT tokens for API access

### Testing Authentication

1. Start the API server with authentication:
   ```bash
   ~/scripts/run_data_api_server.sh restart
   ```

2. Start the frontend:
   ```bash
   pnpm run dev
   ```

3. Open browser to `https://localhost:5173`

4. Connect your MetaMask wallet

5. Click the "Auth" button next to the connected wallet

6. Sign the authentication message in MetaMask

7. You should see "Authenticated" status with your wallet info

### API Endpoints

Authentication endpoints are now integrated into the Python API server:

- `GET /auth/health` - Authentication service health check
- `POST /auth/challenge` - Generate authentication challenge
- `POST /auth/verify` - Verify wallet signature and authenticate
- `POST /auth/refresh` - Refresh access token

### Environment Variables

Create a `.env` file for custom configuration:

```env
JWT_SECRET=your-super-secret-jwt-key
JWT_ISSUER=http://localhost:3001
JWT_AUDIENCE=bos-app
SESSION_SECRET=your-session-secret
VITE_API_TOKEN=your-backend-api-token
```

## Project Structure

```
bos-app/
├── src/
│   ├── components/
│   │   ├── ConnectMetaMask.tsx    # MetaMask connection + auth
│   │   ├── ConnectWallet.tsx      # Polkadot wallet connection
│   │   ├── AuthStatus.tsx         # Authentication status display
│   │   └── ...
│   ├── hooks/
│   │   ├── useWalletAuth.ts       # Authentication logic
│   │   └── ...
│   ├── providers/
│   │   ├── WalletAuthProvider.tsx # Auth context provider
│   │   └── ...
│   └── ...
├── server.cjs                     # Production Express server
├── vite.config.mjs               # Vite config with proxy setup
└── package.json
```

**Note**: Wallet authentication is now handled by the Python API server at `/python_home/data-api-server` rather than the Express server.

## Backend Services

- **Frontend**: Vite dev server (port 5173)
- **API Backend**: Python FastAPI server with integrated wallet authentication (port 4000)
- **Production**: Full stack server (port 3000)

#### Notes
cd ~/node_home/bos-app
cd ~/python_home/data-api-server

~/scripts/run_data_api_server.sh restart
~/scripts/manage_node_server.sh restart
