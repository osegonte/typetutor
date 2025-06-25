// src/components/LazyComponents.jsx - Lazy loading implementation
import React, { Suspense, lazy } from 'react';

// Lazy load heavy components
const PracticeScreen = lazy(() => import('./PracticeScreen'));
const StatsScreen = lazy(() => import('./StatsScreen'));
const AuthModal = lazy(() => import('./auth/AuthModal'));
const DebuggingPanel = lazy(() => import('./DebuggingPanel'));

// Enhanced loading components with better UX
const LoadingSpinner = ({ darkMode, message = "Loading..." }) => (
  <div className={`flex items-center justify-center min-h-[400px] ${
    darkMode ? 'text-gray-300' : 'text-gray-600'
  }`}>
    <div className="text-center space-y-4">
      <div className="relative">
        <div className="w-12 h-12 border-4 border-purple-200 dark:border-gray-700 rounded-full animate-spin"></div>
        <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
      </div>
      <p className="text-sm font-medium">{message}</p>
    </div>
  </div>
);

const ComponentLoadingFallback = ({ darkMode, componentName }) => (
  <LoadingSpinner 
    darkMode={darkMode} 
    message={`Loading ${componentName}...`} 
  />
);

// Error boundary for lazy loaded components
class LazyLoadErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Lazy load error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className={`p-6 rounded-xl border ${
          this.props.darkMode 
            ? 'bg-red-900/20 border-red-800 text-red-200' 
            : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <h3 className="font-semibold mb-2">Something went wrong</h3>
          <p className="text-sm mb-4">Failed to load component. Please try refreshing the page.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper components with error boundaries and loading states
export const LazyPracticeScreen = ({ darkMode, ...props }) => (
  <LazyLoadErrorBoundary darkMode={darkMode}>
    <Suspense fallback={<ComponentLoadingFallback darkMode={darkMode} componentName="Practice" />}>
      <PracticeScreen darkMode={darkMode} {...props} />
    </Suspense>
  </LazyLoadErrorBoundary>
);

export const LazyStatsScreen = ({ darkMode, ...props }) => (
  <LazyLoadErrorBoundary darkMode={darkMode}>
    <Suspense fallback={<ComponentLoadingFallback darkMode={darkMode} componentName="Statistics" />}>
      <StatsScreen darkMode={darkMode} {...props} />
    </Suspense>
  </LazyLoadErrorBoundary>
);

export const LazyAuthModal = ({ darkMode, ...props }) => (
  <LazyLoadErrorBoundary darkMode={darkMode}>
    <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <LoadingSpinner darkMode={darkMode} message="Loading authentication..." />
    </div>}>
      <AuthModal darkMode={darkMode} {...props} />
    </Suspense>
  </LazyLoadErrorBoundary>
);

export const LazyDebuggingPanel = ({ darkMode, ...props }) => (
  <LazyLoadErrorBoundary darkMode={darkMode}>
    <Suspense fallback={<ComponentLoadingFallback darkMode={darkMode} componentName="Debug Panel" />}>
      <DebuggingPanel darkMode={darkMode} {...props} />
    </Suspense>
  </LazyLoadErrorBoundary>
);

// Preloading utilities for better UX
export const preloadComponent = (componentLoader) => {
  if (typeof window !== 'undefined') {
    // Preload on interaction or after initial load
    const link = document.createElement('link');
    link.rel = 'prefetch';
    document.head.appendChild(link);
    
    // Actually trigger the dynamic import
    componentLoader().catch(console.warn);
  }
};

// Preload components on hover or focus
export const usePreloadOnHover = (componentLoader) => {
  return {
    onMouseEnter: () => preloadComponent(componentLoader),
    onFocus: () => preloadComponent(componentLoader),
  };
};

// Hook for progressive loading
export const useProgressiveLoading = () => {
  React.useEffect(() => {
    // Preload heavy components after initial render
    const timeouts = [
      setTimeout(() => preloadComponent(() => import('./PracticeScreen')), 1000),
      setTimeout(() => preloadComponent(() => import('./StatsScreen')), 2000),
      setTimeout(() => preloadComponent(() => import('./auth/AuthModal')), 3000),
    ];

    return () => timeouts.forEach(clearTimeout);
  }, []);
};

// src/components/OptimizedApp.jsx - Updated main app with lazy loading
import React, { useState, useEffect } from 'react';
import { LazyPracticeScreen, LazyStatsScreen, LazyAuthModal, LazyDebuggingPanel, useProgressiveLoading } from './LazyComponents';

// Aurora component - keep this loaded immediately as it's part of the initial UI
const Aurora = React.lazy(() => 
  import('./Aurora').catch(() => ({ default: () => null })) // Graceful fallback
);

const OptimizedTypeToolApp = () => {
  const [darkMode, setDarkMode] = useState(() => {
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  
  const [activeTab, setActiveTab] = useState('home');
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [customText, setCustomText] = useState('');
  const [typingInProgress, setTypingInProgress] = useState(false);

  // Progressive loading
  useProgressiveLoading();

  // Save dark mode preference
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Debug mode toggle
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        setIsDebugMode(!isDebugMode);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDebugMode]);

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Aurora Background - Lazy loaded with fallback */}
      <Suspense fallback={null}>
        <Aurora 
          colorStops={["#241593", "#3CCDD7", "#916BD6"]}
          amplitude={1.8}
          blend={1.0}
          speed={2.5}
        />
      </Suspense>
      
      {/* Header */}
      <header className={`px-6 py-4 flex justify-between items-center ${darkMode ? 'bg-gray-900/80 backdrop-blur-sm' : 'bg-white/80 backdrop-blur-sm'} border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'} relative z-10`}>
        <div className="flex items-center">
          <h1 className="text-xl font-bold">TypeTutor <span className="text-sm font-normal text-gray-500">Study Edition</span></h1>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleDarkMode}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      {/* Main Content with Lazy Loading */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl relative z-10">
        {activeTab === 'home' && (
          <HomeScreen 
            darkMode={darkMode} 
            setActiveTab={setActiveTab} 
            customText={customText}
            setCustomText={setCustomText}
            typingInProgress={typingInProgress}
            setTypingInProgress={setTypingInProgress}
          />
        )}
        
        {activeTab === 'practice' && (
          <LazyPracticeScreen 
            darkMode={darkMode} 
            setActiveTab={setActiveTab}
            customText={customText}
          />
        )}
        
        {activeTab === 'stats' && (
          <LazyStatsScreen 
            darkMode={darkMode} 
            setActiveTab={setActiveTab} 
          />
        )}
        
        {/* Debug panel - only load when needed */}
        {isDebugMode && (
          <div className="mt-8 border-t pt-8">
            <LazyDebuggingPanel darkMode={darkMode} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`py-4 px-6 text-center text-sm ${darkMode ? 'bg-gray-900/80 backdrop-blur-sm text-gray-400' : 'bg-white/80 backdrop-blur-sm text-gray-500'} border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'} relative z-10`}>
        TypeTutor Study Edition • Designed for maximum comfort and learning efficiency
        <span className="ml-2 text-xs opacity-50">Press Ctrl+Shift+D for debug mode</span>
      </footer>
    </div>
  );
};

export default OptimizedTypeToolApp;