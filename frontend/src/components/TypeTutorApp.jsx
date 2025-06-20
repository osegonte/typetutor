// Complete TypeTutorApp.jsx with working practice functionality
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Moon, Sun, BarChart2, Upload, FileText, ChevronRight, Info, ArrowLeft, RotateCcw, Pause, Play, Target, Clock, Zap, AlertCircle, Trophy, TrendingUp } from 'lucide-react';
import { uploadPDF, processText, getStats, saveStats } from '../services/api';
import DebuggingPanel from './DebuggingPanel';

const TypeTutorApp = () => {
  // App state
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
        
        {/* Debug panel */}
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

// Home Screen Component
const HomeScreen = ({ darkMode, setActiveTab, customText, setCustomText, typingInProgress, setTypingInProgress }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setErrorMessage(null);
    setIsLoading(true);
    setUploadProgress(0);

    try {
      const result = await uploadPDF(file, (progress) => {
        if (progress && typeof progress === 'object' && progress.percentage) {
          setUploadProgress(progress.percentage);
        } else if (typeof progress === 'number') {
          setUploadProgress(progress);
        }
      });

      if (result && result.success) {
        if (result.items && result.items.length > 0) {
          const allContent = result.items.map(item => item.content || '').join('\n\n');
          setCustomText(allContent);
          setUploadProgress(100);
          setTimeout(() => {
            alert(`Successfully extracted ${result.items.length} study items from PDF!`);
          }, 500);
        } else {
          setErrorMessage('No content could be extracted from the PDF.');
        }
      } else {
        setErrorMessage(`Error: ${(result && result.error) || 'Failed to process PDF'}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setErrorMessage(error.message || error.error || 'Network error while uploading file.');
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const handleSubmitText = async () => {
    if (!customText || !customText.trim()) {
      setErrorMessage('Please enter some text to practice with.');
      return;
    }
    
    setErrorMessage(null);
    setIsLoading(true);
    
    try {
      // Try to process text through API
      const result = await processText(customText);
      
      if (result && result.success) {
        console.log('Text processed successfully:', result);
      } else {
        console.warn('Text processing failed:', (result && result.error) || 'Unknown error');
      }
    } catch (error) {
      console.error('Error processing text:', error);
      // Continue anyway since we already have the text locally
    } finally {
      setIsLoading(false);
      // Navigate to practice regardless of API result since we have the text
      setActiveTab('practice');
      setTypingInProgress(true);
    }
  };

  return (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">TypeTutor Study App</h2>
        <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Build your typing speed and accuracy while learning valuable content
        </p>
      </div>

      <div className="flex justify-end">
        <button 
          className={`flex items-center space-x-2 px-4 py-2 rounded-md ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
          onClick={() => setActiveTab('stats')}
        >
          <BarChart2 size={20} />
          <span>View Stats</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Upload Section */}
        <div className={`rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-6 h-72 flex flex-col`}>
          <h3 className="font-semibold text-lg mb-2">Upload Learning Material</h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
            Upload a text or PDF file to practice with
          </p>
          
          <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed rounded-md border-gray-600 m-2 relative">
            {isLoading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center rounded-md">
                <div className="text-white mb-2">Processing...</div>
                {uploadProgress > 0 && (
                  <div className="w-3/4 bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            <Upload className={`${darkMode ? 'text-gray-600' : 'text-gray-400'} mb-2`} size={24} />
            <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-600'} text-center mb-2`}>
              Drag and drop your file here or click to browse
            </p>
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".pdf,.txt"
              onChange={handleFileUpload}
              disabled={isLoading}
            />
            <button 
              className={`text-sm px-4 py-1.5 rounded-md ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} disabled:opacity-50`}
              onClick={() => document.getElementById('file-upload')?.click()}
              disabled={isLoading}
            >
              Browse Files
            </button>
          </div>
          
          {errorMessage && (
            <div className={`mt-2 p-2 text-sm text-red-500 bg-red-100 dark:bg-red-900 dark:text-red-200 rounded-md`}>
              {errorMessage}
            </div>
          )}
        </div>

        {/* Custom Text Section */}
        <div className={`rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-6 h-72 flex flex-col`}>
          <h3 className="font-semibold text-lg mb-2">Custom Text</h3>
          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-2`}>
            Paste or type the text you want to practice
          </p>
          
          <div className="flex-1 flex flex-col">
            <textarea 
              className={`flex-1 p-3 rounded-md resize-none ${darkMode ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-gray-50 text-gray-800 border-gray-300'} border focus:outline-none focus:ring-2 focus:ring-purple-500`}
              placeholder="Paste or type your practice text here..."
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              disabled={isLoading}
            />
            <div className="mt-2 text-xs text-gray-500">
              {customText ? customText.length : 0} characters
            </div>
          </div>
        </div>
      </div>

      {/* Start Button */}
      <div className="flex justify-center mt-6">
        <button 
          className={`px-6 py-3 rounded-md font-medium flex items-center transition-all duration-200 ${
            customText && customText.trim() ? 'bg-purple-600 hover:bg-purple-700 text-white' : 
            darkMode ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          }`}
          disabled={!customText || !customText.trim() || isLoading}
          onClick={handleSubmitText}
        >
          {isLoading ? 'Processing...' : 'Start Typing Practice'}
        </button>
      </div>

      {/* Features Section */}
      <div className={`mt-12 rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-gray-100 border-gray-200'} p-6`}>
        <h3 className="text-lg font-semibold text-center mb-6">Why TypeTutor?</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            darkMode={darkMode}
            title="Learn While Typing"
            description="Practice with study materials to improve retention"
            icon={<FileText size={24} />}
          />
          
          <FeatureCard 
            darkMode={darkMode}
            title="Track Progress"
            description="View detailed stats on typing speed and accuracy"
            icon={<BarChart2 size={24} />}
          />
          
          <FeatureCard 
            darkMode={darkMode}
            title="Build Consistency"
            description="Track daily streaks and practice minutes"
            icon={<ChevronRight size={24} />}
          />
        </div>
      </div>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ darkMode, title, description, icon }) => {
  return (
    <div className="text-center">
      <div className="flex justify-center">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          {icon}
        </div>
      </div>
      <h4 className="font-semibold mt-3 mb-1">{title}</h4>
      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        {description}
      </p>
    </div>
  );
};

// Practice Screen Component (Fixed)
const PracticeScreen = ({ darkMode, setActiveTab, customText }) => {
  // State management
  const [currentText, setCurrentText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [errors, setErrors] = useState(0);
  const [errorPositions, setErrorPositions] = useState(new Set());
  const [sessionStats, setSessionStats] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [personalBest, setPersonalBest] = useState(false);
  
  const inputRef = useRef(null);
  const intervalRef = useRef(null);

  // Initialize text
  useEffect(() => {
    const defaultText = `The art of typing is not just about speed, but about developing a rhythm and flow that becomes second nature. Through consistent practice and attention to proper technique, anyone can develop excellent typing skills. Focus on accuracy first, then speed will naturally follow. Remember to keep your fingers on the home row and use all ten fingers for optimal efficiency.`;
    
    try {
      if (customText && typeof customText === 'string' && customText.trim()) {
        setCurrentText(customText.trim());
      } else {
        setCurrentText(defaultText);
      }
      
      // Focus input when component mounts
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Error setting text:', error);
      setCurrentText(defaultText);
    }
  }, [customText]);

  // Timer management
  useEffect(() => {
    if (isActive && !isPaused && !isComplete) {
      intervalRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, isComplete]);

  // Calculate metrics
  useEffect(() => {
    if (timeElapsed > 0 && userInput && userInput.length > 0) {
      try {
        const wordsTyped = userInput.length / 5;
        const minutesElapsed = timeElapsed / 60;
        const currentWpm = minutesElapsed > 0 ? Math.round(wordsTyped / minutesElapsed) : 0;
        setWpm(currentWpm);

        let correctChars = 0;
        for (let i = 0; i < userInput.length; i++) {
          if (i < currentText.length && userInput[i] === currentText[i]) {
            correctChars++;
          }
        }
        const currentAccuracy = userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;
        setAccuracy(currentAccuracy);
      } catch (error) {
        console.error('Error calculating metrics:', error);
      }
    }
  }, [userInput, timeElapsed, currentText]);

  // Handle input changes
  const handleInputChange = useCallback((e) => {
    try {
      const value = e.target.value;
      
      // Start session on first keystroke
      if (!isActive && value.length === 1) {
        setIsActive(true);
        setStartTime(Date.now());
      }

      // Prevent typing beyond text length
      if (value.length <= currentText.length) {
        setUserInput(value);
        setCurrentIndex(value.length);

        // Calculate errors
        const newErrors = new Set();
        let errorCount = 0;
        
        for (let i = 0; i < value.length; i++) {
          if (i < currentText.length && value[i] !== currentText[i]) {
            newErrors.add(i);
            errorCount++;
          }
        }
        
        setErrorPositions(newErrors);
        setErrors(errorCount);

        // Check completion
        if (value.length === currentText.length) {
          completeSession(value);
        }
      }
    } catch (error) {
      console.error('Error handling input:', error);
    }
  }, [currentText, isActive]);

  // Complete session
  const completeSession = useCallback(async (finalInput) => {
    try {
      setIsComplete(true);
      setIsActive(false);
      
      const endTime = Date.now();
      const totalTime = startTime ? (endTime - startTime) / 1000 : 0;
      const finalWpm = totalTime > 0 ? Math.round((finalInput.length / 5) / (totalTime / 60)) : 0;
      
      let correctChars = 0;
      for (let i = 0; i < finalInput.length; i++) {
        if (i < currentText.length && finalInput[i] === currentText[i]) {
          correctChars++;
        }
      }
      const finalAccuracy = finalInput.length > 0 ? Math.round((correctChars / finalInput.length) * 100) : 100;

      const stats = {
        wpm: finalWpm,
        accuracy: finalAccuracy,
        timeElapsed: Math.round(totalTime),
        errors: errors,
        totalCharacters: finalInput.length,
        charactersPerMinute: totalTime > 0 ? Math.round(finalInput.length / (totalTime / 60)) : 0,
        completedAt: new Date().toISOString()
      };

      setSessionStats(stats);

      // Check for personal best
      try {
        const savedBest = localStorage.getItem('personalBestWpm');
        if (!savedBest || finalWpm > parseInt(savedBest)) {
          localStorage.setItem('personalBestWpm', finalWpm.toString());
          setPersonalBest(true);
        }
      } catch (error) {
        console.error('Error checking personal best:', error);
      }

      // Save stats to backend
      try {
        await saveStats({
          wpm: finalWpm,
          accuracy: finalAccuracy,
          duration: Math.round(totalTime),
          errors: errors,
          mode: 'practice',
          itemType: customText ? 'Custom Text' : 'Default Practice',
          completedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to save session stats:', error);
      }

      setShowCompletion(true);
    } catch (error) {
      console.error('Error completing session:', error);
    }
  }, [startTime, errors, currentText, customText]);

  // Reset session
  const resetSession = useCallback(() => {
    try {
      setUserInput('');
      setCurrentIndex(0);
      setIsActive(false);
      setIsPaused(false);
      setIsComplete(false);
      setShowCompletion(false);
      setStartTime(null);
      setWpm(0);
      setAccuracy(100);
      setTimeElapsed(0);
      setErrors(0);
      setErrorPositions(new Set());
      setSessionStats(null);
      setPersonalBest(false);
      
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Error resetting session:', error);
    }
  }, []);

  // Toggle pause
  const togglePause = useCallback(() => {
    try {
      setIsPaused(!isPaused);
      if (inputRef.current) {
        setTimeout(() => {
          inputRef.current.focus();
        }, 100);
      }
    } catch (error) {
      console.error('Error toggling pause:', error);
    }
  }, [isPaused]);

  // Character styling
  const getCharacterStyle = (index) => {
    try {
      if (index < userInput.length) {
        if (errorPositions.has(index)) {
          return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-b-2 border-red-500';
        }
        return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200';
      }
      if (index === currentIndex) {
        return 'bg-blue-100 dark:bg-blue-900/50 border-l-2 border-blue-500 animate-pulse';
      }
      return 'text-gray-700 dark:text-gray-300';
    } catch (error) {
      console.error('Error getting character style:', error);
      return 'text-gray-700 dark:text-gray-300';
    }
  };

  // Format time
  const formatTime = (seconds) => {
    try {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    } catch (error) {
      console.error('Error formatting time:', error);
      return '0:00';
    }
  };

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      try {
        if (e.key === 'Escape') {
          if (isActive && !isComplete) {
            togglePause();
          }
        } else if (e.ctrlKey && e.key === 'r') {
          e.preventDefault();
          resetSession();
        }
      } catch (error) {
        console.error('Error handling keyboard shortcut:', error);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isActive, isComplete, togglePause, resetSession]);

  const progressPercentage = currentText.length > 0 ? (currentIndex / currentText.length) * 100 : 0;

  if (!currentText) {
    return (
      <div className="max-w-5xl mx-auto space-y-6 px-4">
        <div className="text-center py-12">
          <p className="text-gray-500">Loading practice text...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
            darkMode 
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700' 
              : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm'
          }`}
        >
          <ArrowLeft size={18} />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={togglePause}
            disabled={!isActive || isComplete}
            className={`p-3 rounded-xl transition-all duration-200 ${
              isActive && !isComplete
                ? darkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700' 
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm'
                : 'opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-800'
            }`}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          
          <button
            onClick={resetSession}
            className={`p-3 rounded-xl transition-all duration-200 ${
              darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border border-gray-700' 
                : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 shadow-sm'
            }`}
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard darkMode={darkMode} icon={<Zap size={20} />} label="Speed" value={`${wpm} WPM`} />
        <StatCard darkMode={darkMode} icon={<Target size={20} />} label="Accuracy" value={`${accuracy}%`} />
        <StatCard darkMode={darkMode} icon={<Clock size={20} />} label="Time" value={formatTime(timeElapsed)} />
        <StatCard darkMode={darkMode} icon={<AlertCircle size={20} />} label="Errors" value={errors} />
      </div>

      {/* Progress */}
      <div className={`rounded-2xl border p-6 ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-gray-500">
            {currentIndex} / {currentText.length} characters ({Math.round(progressPercentage)}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
          <div
            className="bg-gradient-to-r from-purple-500 to-purple-600 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Text Display */}
      <div className={`rounded-2xl border p-8 ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="text-xl leading-relaxed font-mono tracking-wide">
          {currentText.split('').map((char, index) => (
            <span
              key={index}
              className={`${getCharacterStyle(index)} ${char === ' ' ? 'mx-0.5' : ''} transition-all duration-150 px-0.5 py-0.5 rounded`}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className={`rounded-2xl border p-6 ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'
      }`}>
        <div className="mb-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {isComplete ? "Session completed!" : 
             isPaused ? "Session paused - Press ESC to resume" :
             isActive ? "Keep typing..." :
             "Start typing to begin"}
          </span>
        </div>
        <textarea
          ref={inputRef}
          value={userInput}
          onChange={handleInputChange}
          disabled={isPaused || isComplete}
          placeholder={
            isComplete ? "Great job! Check your results above." : 
            isPaused ? "Session paused" :
            "Start typing here..."
          }
          className={`w-full h-32 p-4 rounded-xl resize-none font-mono text-lg border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 ${
            darkMode 
              ? 'bg-gray-800 text-gray-100 placeholder-gray-500' 
              : 'bg-gray-50 text-gray-900 placeholder-gray-400'
          } ${isPaused || isComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
        />
      </div>

      {/* Completion Modal */}
      {showCompletion && sessionStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`rounded-2xl p-8 max-w-lg w-full ${
            darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
          } shadow-2xl`}>
            <div className="text-center">
              <div className="text-6xl mb-4">
                {personalBest ? '🏆' : sessionStats.accuracy >= 95 ? '🎉' : sessionStats.accuracy >= 85 ? '👍' : '💪'}
              </div>
              <h3 className="text-2xl font-bold mb-2">
                {personalBest ? 'New Personal Best!' : 'Session Complete!'}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                {personalBest ? 'Congratulations on your new record!' : 'Great job on your typing practice!'}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-center mb-2">
                    <Zap className="text-purple-600" size={24} />
                  </div>
                  <div className="text-2xl font-bold text-purple-600">{sessionStats.wpm}</div>
                  <div className="text-sm text-gray-500">Words per minute</div>
                </div>
                
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-center mb-2">
                    <Target className="text-green-600" size={24} />
                  </div>
                  <div className="text-2xl font-bold text-green-600">{sessionStats.accuracy}%</div>
                  <div className="text-sm text-gray-500">Accuracy</div>
                </div>
                
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-center mb-2">
                    <Clock className="text-blue-600" size={24} />
                  </div>
                  <div className="text-2xl font-bold text-blue-600">{formatTime(sessionStats.timeElapsed)}</div>
                  <div className="text-sm text-gray-500">Time taken</div>
                </div>
                
                <div className={`p-4 rounded-xl ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="text-orange-600" size={24} />
                  </div>
                  <div className="text-2xl font-bold text-orange-600">{sessionStats.charactersPerMinute || 0}</div>
                  <div className="text-sm text-gray-500">Characters/min</div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={resetSession}
                  className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium"
                >
                  Practice Again
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`flex-1 px-6 py-3 rounded-xl transition-colors font-medium ${
                    darkMode 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  View All Stats
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help */}
      <div className="text-center text-sm text-gray-500 space-x-4">
        <span>
          Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">ESC</kbd> to pause
        </span>
        <span>
          <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+R</kbd> to restart
        </span>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ darkMode, icon, label, value, valueColor = '' }) => (
  <div className={`rounded-2xl border p-6 transition-all duration-200 ${
    darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'
  }`}>
    <div className="flex items-center justify-between mb-3">
      <div className="text-gray-500">
        {icon}
      </div>
    </div>
    <div className={`text-2xl font-bold mb-1 ${valueColor}`}>{value}</div>
    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</div>
  </div>
);

// Stats Screen Component
const StatsScreen = ({ darkMode, setActiveTab }) => {
  const [stats, setStats] = useState({
    averageWpm: 0,
    accuracy: 0,
    practiceMinutes: 0,
    currentStreak: 0,
    totalSessions: 0,
    recentSessions: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await getStats();
        if (data) {
          setStats({
            averageWpm: data.averageWpm || 0,
            accuracy: data.accuracy || 0,
            practiceMinutes: data.practiceMinutes || 0,
            currentStreak: data.currentStreak || 0,
            totalSessions: data.totalSessions || 0,
            recentSessions: data.recentSessions || []
          });
        }
      } catch (error) {
        console.error('Error fetching stats:', error);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-bold">Performance Statistics</h2>
        <button 
          className={`px-4 py-2 rounded-md transition-colors ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
          onClick={() => setActiveTab('home')}
        >
          Back to Home
        </button>
      </div>
      
      <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-8`}>
        Track your typing progress over time
      </p>
      
      {error && (
        <div className={`p-4 mb-6 rounded-md ${darkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800'}`}>
          {error}
        </div>
      )}
      
      {loading ? (
        <div className={`p-8 text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
          <p className="mt-2">Loading your statistics...</p>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard 
              darkMode={darkMode} 
              label="Average WPM" 
              value={stats.averageWpm} 
              icon={<BarChart2 size={20} />} 
            />
            <StatCard 
              darkMode={darkMode} 
              label="Accuracy" 
              value={`${stats.accuracy}%`} 
              icon={<Target size={20} />} 
            />
            <StatCard 
              darkMode={darkMode} 
              label="Practice Time" 
              value={`${stats.practiceMinutes} mins`} 
              icon={<Clock size={20} />} 
            />
            <StatCard 
              darkMode={darkMode} 
              label="Current Streak" 
              value={`${stats.currentStreak} days`} 
              icon={<Trophy size={20} />} 
            />
          </div>
          
          {/* Recent Sessions */}
          <div className={`rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'} p-6`}>
            <h3 className="font-semibold text-lg mb-4">Recent Sessions</h3>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-4`}>Your last 5 typing practice sessions</p>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`text-left text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    <th className="pb-2 pr-4">Date</th>
                    <th className="pb-2 pr-4">Duration</th>
                    <th className="pb-2 pr-4">WPM</th>
                    <th className="pb-2 pr-4">Accuracy</th>
                    <th className="pb-2">Mode</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentSessions && stats.recentSessions.length > 0 ? (
                    stats.recentSessions.slice(0, 5).map((session, index) => (
                      <tr key={index} className={`border-t ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
                        <td className="py-2 pr-4">
                          {session.date ? (
                            typeof session.date === 'string' && session.date.includes('T') 
                              ? new Date(session.date).toLocaleDateString() 
                              : session.date
                          ) : 'N/A'}
                        </td>
                        <td className="py-2 pr-4">{session.duration || 'N/A'}</td>
                        <td className="py-2 pr-4">{session.wpm || 0}</td>
                        <td className="py-2 pr-4">{session.accuracy || 0}%</td>
                        <td className="py-2">{session.mode || 'Practice'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center">
                        <div className="text-center">
                          <div className="text-4xl mb-2">📊</div>
                          <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                            No sessions recorded yet
                          </p>
                          <p className={`text-xs mt-1 ${darkMode ? 'text-gray-600' : 'text-gray-500'}`}>
                            Complete some typing practice to see your stats here
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default TypeTutorApp;