import React from 'react';
import { useAuth } from '../../context/AuthContext';

const ProtectedRoute = ({ children, fallback = null, requireAuth = true }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return fallback;
  }

  if (!requireAuth && isAuthenticated) {
    return fallback;
  }

  return children;
};

export default ProtectedRoute;