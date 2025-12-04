import React from 'react';
import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import BacktesterPage from './pages/BacktesterPage';
import BotsPage from './pages/BotsPage';
import Counter from './pages/Counter';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import PortfolioPage from './pages/PortfolioPage';
import ReportsPage from './pages/ReportsPage';
import SourdoughRecipes from './pages/SourdoughRecipes';
import StakingPage from './pages/StakingPage';
import ThermostatPage from './pages/ThermostatPage';
import WatchlistPage from './pages/WatchlistPage';

import { SIWSProvider } from '@shawncoe/siws-auth/react';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { MetaMaskProvider } from './providers/MetaMaskProvider';
import { WalletAuthProvider } from './providers/WalletAuthProvider';

import './index.css';

const RouteLogger: React.FC = () => {
  const location = useLocation();
  return null;
};

const App: React.FC = () => {
  return (
    <SIWSProvider
      config={{
        defaultNetwork: "polkadot",
        autoFetchIdentity: true,
      }}
      autoConnect={false}
    >
      <MetaMaskProvider>
        <WalletAuthProvider>
          <AuthProvider>
            <ThemeProvider>
            <Router
              future={{
                v7_relativeSplatPath: true,
                v7_startTransition: true
              }}
            >
              <RouteLogger />
              <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                <NavBar />
                <div className="pt-16"> {/* Add padding-top to account for fixed navbar */}
                  <Routes>
                    <Route path="/" element={<HomePage />} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/reports" element={<ProtectedRoute element={<ReportsPage />} authorizedOnly={true} />} />
                    <Route path="/staking" element={<ProtectedRoute element={<StakingPage />} walletOnly={true} />} />
                    <Route path="/watchlist" element={<ProtectedRoute element={<WatchlistPage />} walletOnly={true} />} />
                    <Route path="/portfolio" element={<ProtectedRoute element={<PortfolioPage />} walletOnly={true} />} />
                    <Route path="/bots" element={<ProtectedRoute element={<BotsPage />} authorizedOnly={true} />} />
                    <Route path="/backtester" element={<ProtectedRoute element={<BacktesterPage />} authorizedOnly={true} />} />
                    <Route path="/thermostat" element={<ProtectedRoute element={<ThermostatPage />} authorizedOnly={true} />} />
                    <Route path="/counter" element={<Counter />} />
                    <Route path="/sourdough" element={<SourdoughRecipes />} />
                  </Routes>
                </div>
              </div>
            </Router>
          </ThemeProvider>
        </AuthProvider>
      </WalletAuthProvider>
    </MetaMaskProvider>
  </SIWSProvider>
  );
};

export default App;
