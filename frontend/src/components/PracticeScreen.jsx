// PracticeScreen.jsx - Complete typing practice implementation
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RotateCcw, Pause, Play, Target, Clock, Zap, AlertCircle } from 'lucide-react';
import { saveStats } from '../services/api';

const PracticeScreen = ({ darkMode, setActiveTab, customText }) => {
  // Core typing state
  const [currentText, setCurrentText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Performance metrics
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [errors, setErrors] = useState(0);
  const [totalCharacters, setTotalCharacters] = useState(0);
  
  // Session state
  const [isComplete, setIsComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState(null);
  
  // Refs
  const inputRef = useRef(null);
  const intervalRef = useRef(null);

  // Initialize text content
  useEffect(() => {
    if (customText && customText.trim()) {
      setCurrentText(customText.trim());
    } else {
      // Fallback text for testing
      setCurrentText(`The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for typing practice. Regular practice with varied content helps improve both speed and accuracy in typing skills.`);
    }
    
    // Focus input when component mounts
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [customText]);

  // Timer functionality
  useEffect(() => {
    if (isActive && !isPaused && !isComplete) {
      intervalRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isActive, isPaused, isComplete]);

  // Calculate WPM and accuracy in real-time
  useEffect(() => {
    if (timeElapsed > 0 && userInput.length > 0) {
      // Calculate WPM (words per minute)
      const wordsTyped = userInput.length / 5; // Standard: 5 characters = 1 word
      const minutesElapsed = timeElapsed / 60;
      const currentWpm = Math.round(wordsTyped / minutesElapsed);
      setWpm(currentWpm);

      // Calculate accuracy
      let correctChars = 0;
      for (let i = 0; i < userInput.length; i++) {
        if (i < currentText.length && userInput[i] === currentText[i]) {
          correctChars++;
        }
      }
      const currentAccuracy = userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;
      setAccuracy(currentAccuracy);
    }
  }, [userInput, timeElapsed, currentText]);

  // Handle typing input
  const handleInputChange = useCallback((e) => {
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
      setTotalCharacters(value.length);

      // Count errors
      let errorCount = 0;
      for (let i = 0; i < value.length; i++) {
        if (i < currentText.length && value[i] !== currentText[i]) {
          errorCount++;
        }
      }
      setErrors(errorCount);

      // Check if completed
      if (value.length === currentText.length) {
        completeSession(value);
      }
    }
  }, [currentText, isActive]);

  // Complete typing session
  const completeSession = useCallback(async (finalInput) => {
    setIsComplete(true);
    setIsActive(false);
    
    // Calculate final stats
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000; // in seconds
    const finalWpm = Math.round((finalInput.length / 5) / (totalTime / 60));
    
    let correctChars = 0;
    for (let i = 0; i < finalInput.length; i++) {
      if (finalInput[i] === currentText[i]) {
        correctChars++;
      }
    }
    const finalAccuracy = Math.round((correctChars / finalInput.length) * 100);

    const stats = {
      wpm: finalWpm,
      accuracy: finalAccuracy,
      timeElapsed: Math.round(totalTime),
      errors: errors,
      totalCharacters: finalInput.length,
      completedAt: new Date().toISOString(),
      textPreview: currentText.substring(0, 50) + '...'
    };

    setSessionStats(stats);

    // Save to backend
    try {
      await saveStats({
        wpm: finalWpm,
        accuracy: finalAccuracy,
        duration: Math.round(totalTime),
        errors: errors,
        mode: 'custom_text',
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save session stats:', error);
    }
  }, [startTime, errors, currentText]);

  // Reset session
  const resetSession = useCallback(() => {
    setUserInput('');
    setCurrentIndex(0);
    setIsActive(false);
    setIsPaused(false);
    setIsComplete(false);
    setStartTime(null);
    setWpm(0);
    setAccuracy(100);
    setTimeElapsed(0);
    setErrors(0);
    setTotalCharacters(0);
    setSessionStats(null);
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Pause/resume session
  const togglePause = useCallback(() => {
    setIsPaused(!isPaused);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [isPaused]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isActive) {
          togglePause();
        }
      } else if (e.ctrlKey && e.key === 'r') {
        e.preventDefault();
        resetSession();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, togglePause, resetSession]);

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Get character styling
  const getCharacterStyle = (index) => {
    if (index < userInput.length) {
      return userInput[index] === currentText[index] 
        ? 'bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200'
        : 'bg-red-200 dark:bg-red-800 text-red-800 dark:text-red-200';
    }
    if (index === currentIndex) {
      return 'bg-blue-200 dark:bg-blue-800 animate-pulse';
    }
    return 'text-gray-600 dark:text-gray-400';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-md ${
            darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          <ArrowLeft size={20} />
          <span>Back to Home</span>
        </button>

        <div className="flex items-center space-x-2">
          <button
            onClick={togglePause}
            disabled={!isActive || isComplete}
            className={`p-2 rounded-md ${
              isActive && !isComplete
                ? darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            {isPaused ? <Play size={20} /> : <Pause size={20} />}
          </button>
          
          <button
            onClick={resetSession}
            className={`p-2 rounded-md ${
              darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard darkMode={darkMode} icon={<Zap size={16} />} label="WPM" value={wpm} />
        <StatCard darkMode={darkMode} icon={<Target size={16} />} label="Accuracy" value={`${accuracy}%`} />
        <StatCard darkMode={darkMode} icon={<Clock size={16} />} label="Time" value={formatTime(timeElapsed)} />
        <StatCard darkMode={darkMode} icon={<AlertCircle size={16} />} label="Errors" value={errors} />
      </div>

      {/* Text Display */}
      <div className={`rounded-lg border p-6 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="text-lg leading-relaxed font-mono break-words">
          {currentText.split('').map((char, index) => (
            <span
              key={index}
              className={`${getCharacterStyle(index)} ${char === ' ' ? 'mx-1' : ''}`}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </div>
      </div>

      {/* Input Area */}
      <div className={`rounded-lg border p-4 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <textarea
          ref={inputRef}
          value={userInput}
          onChange={handleInputChange}
          disabled={isPaused || isComplete}
          placeholder={isComplete ? "Session completed!" : "Start typing here..."}
          className={`w-full h-32 p-4 rounded-md resize-none font-mono text-lg ${
            darkMode 
              ? 'bg-gray-800 text-gray-200 border-gray-700 focus:border-purple-500' 
              : 'bg-gray-50 text-gray-800 border-gray-300 focus:border-purple-500'
          } border-2 focus:outline-none transition-colors ${
            isPaused ? 'opacity-50' : ''
          }`}
        />
        
        {isPaused && (
          <div className="text-center mt-2 text-yellow-600 dark:text-yellow-400">
            <Clock size={16} className="inline mr-1" />
            Session paused - Press ESC or click play to resume
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className={`rounded-lg border p-4 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-gray-500">
            {currentIndex} / {currentText.length} characters
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-purple-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentIndex / currentText.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Completion Modal */}
      {isComplete && sessionStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-lg p-6 max-w-md w-full mx-4 ${
            darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
          }`}>
            <h3 className="text-xl font-bold text-center mb-4">🎉 Session Complete!</h3>
            
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span>Words Per Minute:</span>
                <span className="font-bold text-purple-600">{sessionStats.wpm} WPM</span>
              </div>
              <div className="flex justify-between">
                <span>Accuracy:</span>
                <span className="font-bold text-green-600">{sessionStats.accuracy}%</span>
              </div>
              <div className="flex justify-between">
                <span>Time:</span>
                <span className="font-bold">{formatTime(sessionStats.timeElapsed)}</span>
              </div>
              <div className="flex justify-between">
                <span>Errors:</span>
                <span className="font-bold text-red-600">{sessionStats.errors}</span>
              </div>
              <div className="flex justify-between">
                <span>Characters:</span>
                <span className="font-bold">{sessionStats.totalCharacters}</span>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={resetSession}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => setActiveTab('stats')}
                className={`flex-1 px-4 py-2 rounded-md transition-colors ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                View Stats
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className={`text-sm text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        <p>Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">ESC</kbd> to pause/resume • 
        Press <kbd className="px-1 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs">Ctrl+R</kbd> to restart</p>
      </div>
    </div>
  );
};

// Stat Card Component
const StatCard = ({ darkMode, icon, label, value }) => (
  <div className={`rounded-lg border p-4 ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
    <div className="flex items-center space-x-2 mb-1">
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
    <div className="text-2xl font-bold">{value}</div>
  </div>
);

export default PracticeScreen;