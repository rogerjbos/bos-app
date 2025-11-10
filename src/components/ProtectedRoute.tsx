import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  element: React.ReactElement;
  authorizedOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ element, authorizedOnly = false }) => {
  const { isAuthenticated, isAuthorizedWallet, loading } = useAuth();

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

  // If route requires authorized wallet only, check both authentication and authorization
  if (authorizedOnly) {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    if (!isAuthorizedWallet) {
      // User is authenticated but not authorized - redirect to home with error
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
    return element;
  }

  // Standard authentication check
  return isAuthenticated ? element : <Navigate to="/login" replace />;
};

export default ProtectedRoute;
