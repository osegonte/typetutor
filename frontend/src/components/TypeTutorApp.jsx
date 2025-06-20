
import React, { useState, useEffect, useCallback } from 'react';
import { Moon, Sun, BarChart2, Upload, FileText, ChevronRight, Info } from 'lucide-react';
import { uploadPDF, processText, getStats } from '../services/api';
import DebuggingPanel from './DebuggingPanel';
import PracticeScreen from './PracticeScreen';

const TypeTutorApp = () => {
  // App state
  const [darkMode, setDarkMode] = useState(() => {
    // Initialize dark mode from localStorage or system preference
    const savedMode = localStorage.getItem('darkMode');
    if (savedMode !== null) {
      return savedMode === 'true';
    }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [activeTab, setActiveTab] = useState('home');
  const [isDebugMode, setIsDebugMode] = useState(false);

  // User content state
  const [studyItems, setStudyItems] = useState([]);
  const [customText, setCustomText] = useState('');
  const [typingInProgress, setTypingInProgress] = useState(false);
  
  // Save dark mode preference when it changes
  useEffect(() => {
    localStorage.setItem('darkMode', darkMode.toString());
    // Update document class for Tailwind dark mode
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  // Toggle debug mode with a keyboard shortcut (Ctrl+Shift+D)
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

  // Create a memoized function to handle tab switching
  // This ensures we don't lose data when switching between tabs
  const switchTab = useCallback((tab) => {
    setActiveTab(tab);
  }, []);

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'bg-gray-950 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`px-6 py-4 flex justify-between items-center ${darkMode ? 'bg-gray-900' : 'bg-white'} border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className="flex items-center">
          <h1 className="text-xl font-bold">TypeTutor <span className="text-sm font-normal text-gray-500">Study Edition</span></h1>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            onClick={toggleDarkMode}
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button 
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            aria-label="Show information"
          >
            <Info size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-8 max-w-6xl">
        {activeTab === 'home' && (
          <HomeScreen 
            darkMode={darkMode} 
            setActiveTab={switchTab} 
            customText={customText}
            setCustomText={setCustomText}
            typingInProgress={typingInProgress}
            setTypingInProgress={setTypingInProgress}
          />
        )}
        {activeTab === 'practice' && (
          <PracticeScreen 
            darkMode={darkMode} 
            setActiveTab={switchTab}
            customText={customText}
          />
        )}
        {activeTab === 'stats' && (
          <StatsScreen darkMode={darkMode} setActiveTab={switchTab} />
        )}
        
        {/* Debug panel - only shown in debug mode */}
        {isDebugMode && (
          <div className="mt-8 border-t pt-8">
            <DebuggingPanel darkMode={darkMode} />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`py-4 px-6 text-center text-sm ${darkMode ? 'bg-gray-900 text-gray-400' : 'bg-white text-gray-500'} border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        TypeTutor Study Edition • Designed for maximum comfort and learning efficiency
        <span className="ml-2 text-xs opacity-50">Press Ctrl+Shift+D for debug mode</span>
      </footer>
    </div>
  );
};

// Keep all the existing components (HomeScreen, StatsScreen, etc.) below this point
// ... [rest of your existing code]
