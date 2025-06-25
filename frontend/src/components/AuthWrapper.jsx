import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import TypeTutorApp from './TypeTutorApp';
import AuthModal from './auth/AuthModal';
import { User, LogIn } from 'lucide-react';

// Auth Header Component - separate from your TypeTutorApp
const AuthHeader = ({ darkMode, toggleDarkMode }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login');

  const handleAuthClick = (mode) => {
    setAuthMode(mode);
    setShowAuthModal(true);
  };

  return (
    <>
      {/* Auth Status Bar - appears above your existing app */}
      <div className={`px-6 py-3 border-b ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} relative z-20`}>
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-4">
            {isAuthenticated && user && (
              <div className={`px-3 py-1 rounded-full text-xs ${darkMode ? 'bg-green-900/20 text-green-400 border border-green-800' : 'bg-green-100 text-green-700 border border-green-200'}`}>
                ✅ Signed in as {user.display_name || user.username || user.email}
              </div>
            )}
            {!isAuthenticated && (
              <div className={`px-3 py-1 rounded-full text-xs ${darkMode ? 'bg-blue-900/20 text-blue-400 border border-blue-800' : 'bg-blue-100 text-blue-700 border border-blue-200'}`}>
                👤 Guest Mode - Sign up to save progress
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {!loading && !isAuthenticated && (
              <>
                <button
                  onClick={() => handleAuthClick('login')}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                    darkMode 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300'
                  }`}
                >
                  <LogIn size={14} />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => handleAuthClick('register')}
                  className="flex items-center space-x-2 px-3 py-1.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm"
                >
                  <User size={14} />
                  <span>Sign Up</span>
                </button>
              </>
            )}
            
            {isAuthenticated && (
              <UserProfileDropdown darkMode={darkMode} />
            )}
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        darkMode={darkMode}
        initialMode={authMode}
      />
    </>
  );
};

// Simple User Profile Dropdown
const UserProfileDropdown = ({ darkMode }) => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-all text-sm ${
          darkMode 
            ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        <div className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center">
          {user?.display_name?.[0] || user?.email?.[0] || 'U'}
        </div>
        <span>{user?.display_name || user?.username || 'User'}</span>
      </button>

      {showDropdown && (
        <div className={`absolute right-0 top-full mt-2 w-48 rounded-lg border shadow-lg z-50 ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className={`p-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <p className="text-sm font-medium">{user?.display_name || user?.username}</p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {user?.email}
            </p>
          </div>
          
          <div className="p-1">
            <button
              onClick={() => {
                logout();
                setShowDropdown(false);
              }}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors text-sm`}
            >
              <LogIn size={14} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Main Auth Wrapper Component
const AuthWrapperContent = () => {
  // This detects dark mode from your existing TypeTutorApp
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Listen for dark mode changes from TypeTutorApp
  React.useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');
      setDarkMode(isDark);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-gray-50'}`}>
      {/* Auth Header - sits above your app */}
      <AuthHeader darkMode={darkMode} />
      
      {/* Your Existing TypeTutorApp - COMPLETELY UNCHANGED */}
      <TypeTutorApp />
    </div>
  );
};

// Export with AuthProvider wrapper
const AuthWrapper = () => {
  return (
    <AuthProvider>
      <AuthWrapperContent />
    </AuthProvider>
  );
};

export default AuthWrapper;