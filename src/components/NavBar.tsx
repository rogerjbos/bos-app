import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import pulseLogo from '../assets/pulse_logo.jpg';
import { ThemeContext } from '../context/ThemeContext';
import ConnectMetaMask from './ConnectMetaMask';

const NavBar: React.FC = () => {
  const { theme, toggleTheme } = useContext(ThemeContext);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

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
            <Link
              to="/"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Home
            </Link>
            <Link
              to="/reports"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Reports
            </Link>
            <Link
              to="/staking"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Staking
            </Link>
            <Link
              to="/watchlist"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Watchlist
            </Link>
            <Link
              to="/bots"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Bots
            </Link>
            <Link
              to="/ranks"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Ranks
            </Link>
            <Link
              to="/counter"
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200"
            >
              Counter
            </Link>

            {/* Wallet Connection */}
            <ConnectMetaMask />

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
            <Link
              to="/"
              onClick={toggleMenu}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              Home
            </Link>
            <Link
              to="/reports"
              onClick={toggleMenu}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              Reports
            </Link>
            <Link
              to="/staking"
              onClick={toggleMenu}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              Staking
            </Link>
            <Link
              to="/watchlist"
              onClick={toggleMenu}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              Watchlist
            </Link>
            <Link
              to="/bots"
              onClick={toggleMenu}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              Bots
            </Link>
            <Link
              to="/ranks"
              onClick={toggleMenu}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              Ranks
            </Link>
            <Link
              to="/counter"
              onClick={toggleMenu}
              className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700 block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200"
            >
              Counter
            </Link>

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
              <ConnectMetaMask />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default NavBar;
