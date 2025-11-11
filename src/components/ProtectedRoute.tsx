import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  element: React.ReactElement;
  authorizedOnly?: boolean;
  walletOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, authorizedOnly = false, walletOnly = false }) => {
  const { isAuthenticated, isAuthorizedWallet, walletAddress, loading } = useAuth();

  console.log('ProtectedRoute:', { authorizedOnly, walletOnly, isAuthenticated, isAuthorizedWallet, walletAddress, loading });

  if (loading) {
    // Loading spinner with Tailwind
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          <span className="text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  // If route requires only a connected wallet, check walletAddress presence
  if (walletOnly) {
    if (!walletAddress) {
      console.log('ProtectedRoute: walletOnly route, no walletAddress, redirecting to /login');
      return <Navigate to="/login" replace />;
    }
    console.log('ProtectedRoute: walletOnly route, walletAddress present, allowing access');
    return element;
  }

  // If route requires authorized wallet only, check both authentication and authorization
  if (authorizedOnly) {
    if (!isAuthenticated) {
      console.log('ProtectedRoute: authorizedOnly route, not authenticated, redirecting to /login');
      return <Navigate to="/login" replace />;
    }
    if (!isAuthorizedWallet) {
      // User is authenticated but not authorized - redirect to home with error
      console.log('ProtectedRoute: authorizedOnly route, authenticated but not authorized, redirecting to / with error');
      return (
        <Navigate
          to="/?error=unauthorized"
          replace
          state={{
            message: "Access denied. Your wallet address is not authorized to access this page."
          }}
        />
      );
    }
    console.log('ProtectedRoute: authorizedOnly route, fully authorized, allowing access');
    return element;
  }

  // For unprotected routes, allow access
  console.log('ProtectedRoute: unprotected route, allowing access');
  return element;
};

export default ProtectedRoute;
