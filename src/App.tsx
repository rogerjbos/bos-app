import React from 'react';
import { Route, BrowserRouter as Router, Routes } from 'react-router-dom';
import NavBar from './components/NavBar';
import ProtectedRoute from './components/ProtectedRoute';
import Ranks from './components/Ranks';
import BacktesterPage from './pages/BacktesterPage';
import BotsPage from './pages/BotsPage';
import Counter from './pages/Counter';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import PortfolioPage from './pages/PortfolioPage';
import ReportsPage from './pages/ReportsPage';
import SourdoughRecipes from './pages/SourdoughRecipes';
import StakingPage from './pages/StakingPage';
import WatchlistPage from './pages/WatchlistPage';

import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import './index.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router
          future={{
            v7_relativeSplatPath: true,
            v7_startTransition: true
          }}
        >
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <NavBar />
            <div className="pt-16"> {/* Add padding-top to account for fixed navbar */}
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reports" element={<ProtectedRoute element={<ReportsPage />} />} />
                <Route path="/staking" element={<ProtectedRoute element={<StakingPage />} />} />
                <Route path="/watchlist" element={<ProtectedRoute element={<WatchlistPage />} />} />
                <Route path="/portfolio" element={<ProtectedRoute element={<PortfolioPage />} />} />
                <Route path="/bots" element={<ProtectedRoute element={<BotsPage />} />} />
                <Route path="/backtester" element={<ProtectedRoute element={<BacktesterPage />} />} />
                <Route path="/ranks" element={<ProtectedRoute element={<Ranks />} />} />
                <Route path="/counter" element={<Counter />} />
                <Route path="/sourdough" element={<SourdoughRecipes />} />
              </Routes>
            </div>
          </div>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
