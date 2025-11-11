import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import pulseLogo from '../assets/pulse_logo.jpg';
import { useAuth } from '../context/AuthContext';
import { ThemeContext } from '../context/ThemeContext';
import ConnectWallet from './ConnectWallet';

const NavBarComponent: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const { isAuthenticated, walletAddress, isAuthorizedWallet } = useAuth();
  const navigate = useNavigate();

  const publicDropdownRef = useRef<HTMLDivElement | null>(null);
  const privateDropdownRef = useRef<HTMLDivElement | null>(null);
  const [publicOpen, setPublicOpen] = useState(false);
  const [privateOpen, setPrivateOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setIsMenuOpen(!isMenuOpen);
  }, [isMenuOpen]);

  // Navigation items based on authentication status
  const publicItems = useMemo(() => [
    { to: '/', label: 'Home' },
    { to: '/counter', label: 'Counter' },
    { to: '/sourdough', label: 'Personal' },
  ], []);

  // Public client items - available to any connected wallet
  const publicClientItems = useMemo(() => [
    { to: '/staking', label: 'Staking' },
    { to: '/watchlist', label: 'Watchlist' },
    { to: '/portfolio', label: 'Portfolio' },
  ], []);

  // Private client items - only for authorized wallets
  const privateClientItems = useMemo(() => [
    { to: '/reports', label: 'Reports' },
    { to: '/bots', label: 'Bots' },
    { to: '/backtester', label: 'Backtester' },
    { to: '/ranks', label: 'Ranks' },
  ], []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;

      // Check if click is outside public dropdown
      if (publicOpen && publicDropdownRef.current && !publicDropdownRef.current.contains(target)) {
        setPublicOpen(false);
      }

      // Check if click is outside private dropdown
      if (privateOpen && privateDropdownRef.current && !privateDropdownRef.current.contains(target)) {
        setPrivateOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [publicOpen, privateOpen]);

  const onPublicClick = useCallback(() => {
    setPublicOpen(prev => !prev);
    setPrivateOpen(false);
  }, []);

  const onPrivateClick = useCallback(() => {
    setPrivateOpen(prev => !prev);
    setPublicOpen(false);
  }, []);

  const renderPublicClientLinks = () => (
    <div className="py-1">
      {publicClientItems.map(item => (
        <Link
          key={item.to}
          to={item.to}
          className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );

  const renderPrivateClientLinks = () => (
    <div className="py-1">
      {privateClientItems.map(item => (
        <Link
          key={item.to}
          to={item.to}
          onClick={() => {
            setPrivateOpen(false);
          }}
          className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link
              to="/"
              className="flex items-center hover:opacity-80 transition-opacity duration-200"
            >
              <img
                src={pulseLogo}
                alt="Pulse Logo"
                className="h-8 w-auto"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:space-x-4">
            {publicItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
              >
                {item.label}
              </Link>
            ))}

            {/* Public Client Dropdown */}
            {walletAddress && (
              <div className="relative" ref={publicDropdownRef}>
                <button
                  type="button"
                  onClick={onPublicClick}
                  className="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Public
                  <span className="text-xs">▾</span>
                </button>
                {publicOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-3 z-50">
                    <div className="mb-3">
                      <ConnectWallet />
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                      {renderPublicClientLinks()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Private Client Dropdown */}
            {isAuthorizedWallet && (
              <div className="relative" ref={privateDropdownRef}>
                <button
                  type="button"
                  onClick={onPrivateClick}
                  className="flex items-center gap-1 text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
                >
                  Private
                  <span className="text-xs">▾</span>
                </button>
                {privateOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg p-3 z-50">
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                      {renderPrivateClientLinks()}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Wallet Connection */}
            <ConnectWallet />

            {/* Theme Toggle Button */}
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center justify-center text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white border border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 h-10 w-10 rounded-md text-lg transition-colors duration-200"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              <span aria-hidden="true">{theme === 'dark' ? '☀️' : '🌙'}</span>
              <span className="sr-only">Toggle theme</span>
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center">
            <button
              type="button"
              onClick={toggleMenu}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white p-2 rounded-md transition-colors duration-200"
            >
              {isMenuOpen ? (
                <XMarkIcon className="h-6 w-6" />
              ) : (
                <Bars3Icon className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            {publicItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={toggleMenu}
                className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
              >
                {item.label}
              </Link>
            ))}
            {walletAddress && (
              <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-md p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Public</div>
                <div className="px-3 py-2"><ConnectWallet /></div>
                <div className="mt-2 space-y-1">
                  {publicClientItems.map(item => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => {
                        toggleMenu();
                      }}
                      className="block px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
            {isAuthorizedWallet && (
              <div className="mt-2 bg-gray-50 dark:bg-gray-800 rounded-md p-2">
                <div className="px-3 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Private</div>
                <div className="mt-2 space-y-1">
                  {privateClientItems.map(item => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => { toggleMenu(); }}
                      className="block px-3 py-2 rounded-md text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 block w-full text-left px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              {theme === 'dark' ? "☀️ Light Mode" : "🌙 Dark Mode"}
            </button>

            {/* Mobile Wallet Connection */}
            <div className="px-3 py-2">
              <ConnectWallet />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

const NavBar = React.memo(NavBarComponent);

export default NavBar;
