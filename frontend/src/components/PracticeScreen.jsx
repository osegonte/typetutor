import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RotateCcw, Pause, Play, Target, Clock, Zap, AlertCircle } from 'lucide-react';
import { saveStats } from '../services/api';

const PracticeScreen = ({ darkMode, setActiveTab, customText }) => {
  // Core state
  const [currentText, setCurrentText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  // Performance metrics
  const [startTime, setStartTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [errors, setErrors] = useState(0);
  
  // Session state
  const [sessionStats, setSessionStats] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);
  
  // Refs
  const inputRef = useRef(null);
  const intervalRef = useRef(null);

  // Initialize text
  useEffect(() => {
    if (customText && customText.trim()) {
      setCurrentText(customText.trim());
    } else {
      setCurrentText(`The quick brown fox jumps over the lazy dog. This sentence contains every letter of the alphabet and is commonly used for typing practice. Regular practice with varied content helps improve both speed and accuracy in typing skills.`);
    }
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [customText]);

  // Timer
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

  // Calculate metrics
  useEffect(() => {
    if (timeElapsed > 0 && userInput.length > 0) {
      const wordsTyped = userInput.length / 5;
      const minutesElapsed = timeElapsed / 60;
      const currentWpm = Math.round(wordsTyped / minutesElapsed);
      setWpm(currentWpm);

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

  // Handle input
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    
    if (!isActive && value.length === 1) {
      setIsActive(true);
      setStartTime(Date.now());
    }

    if (value.length <= currentText.length) {
      setUserInput(value);
      setCurrentIndex(value.length);

      let errorCount = 0;
      for (let i = 0; i < value.length; i++) {
        if (i < currentText.length && value[i] !== currentText[i]) {
          errorCount++;
        }
      }
      setErrors(errorCount);

      if (value.length === currentText.length) {
        completeSession(value);
      }
    }
  }, [currentText, isActive]);

  // Complete session
  const completeSession = useCallback(async (finalInput) => {
    setIsComplete(true);
    setIsActive(false);
    
    const endTime = Date.now();
    const totalTime = (endTime - startTime) / 1000;
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
      completedAt: new Date().toISOString()
    };

    setSessionStats(stats);

    try {
      await saveStats({
        wpm: finalWpm,
        accuracy: finalAccuracy,
        duration: Math.round(totalTime),
        errors: errors,
        mode: 'practice',
        completedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save session stats:', error);
    }

    setShowCompletion(true);
  }, [startTime, errors, currentText]);

  // Reset session
  const resetSession = useCallback(() => {
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
    setSessionStats(null);
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Toggle pause
  const togglePause = useCallback(() => {
    setIsPaused(!isPaused);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [isPaused]);

  // Keyboard shortcuts
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

  // Character styling
  const getCharacterStyle = (index) => {
    if (index < userInput.length) {
      return userInput[index] === currentText[index] 
        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200';
    }
    if (index === currentIndex) {
      return 'bg-blue-100 dark:bg-blue-900 border-l-2 border-blue-500';
    }
    return 'text-gray-700 dark:text-gray-300';
  };

  // Format time
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (currentIndex / currentText.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            darkMode 
              ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
          }`}
        >
          <ArrowLeft size={18} />
          <span>Back</span>
        </button>

        <div className="flex items-center space-x-3">
          <button
            onClick={togglePause}
            disabled={!isActive || isComplete}
            className={`p-2 rounded-lg transition-colors ${
              isActive && !isComplete
                ? darkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                : 'opacity-50 cursor-not-allowed'
            }`}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          
          <button
            onClick={resetSession}
            className={`p-2 rounded-lg transition-colors ${
              darkMode 
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
                : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            }`}
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard 
          darkMode={darkMode} 
          icon={<Zap size={16} />} 
          label="WPM" 
          value={wpm} 
        />
        <StatCard 
          darkMode={darkMode} 
          icon={<Target size={16} />} 
          label="Accuracy" 
          value={`${accuracy}%`} 
        />
        <StatCard 
          darkMode={darkMode} 
          icon={<Clock size={16} />} 
          label="Time" 
          value={formatTime(timeElapsed)} 
        />
        <StatCard 
          darkMode={darkMode} 
          icon={<AlertCircle size={16} />} 
          label="Errors" 
          value={errors} 
        />
      </div>

      {/* Progress */}
      <div className={`rounded-xl border p-4 ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-gray-500">
            {currentIndex} / {currentText.length} characters
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-purple-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Text Display */}
      <div className={`rounded-xl border p-6 ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <div className="text-lg leading-relaxed font-mono">
          {currentText.split('').map((char, index) => (
            <span
              key={index}
              className={`${getCharacterStyle(index)} ${char === ' ' ? 'mx-1' : ''} transition-colors`}
            >
              {char === ' ' ? '\u00A0' : char}
            </span>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className={`rounded-xl border p-4 ${
        darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
      }`}>
        <textarea
          ref={inputRef}
          value={userInput}
          onChange={handleInputChange}
          disabled={isPaused || isComplete}
          placeholder={
            isComplete ? "Session completed!" : 
            isPaused ? "Session paused" :
            "Start typing..."
          }
          className={`w-full h-32 p-4 rounded-lg resize-none font-mono text-lg border-0 focus:outline-none transition-colors ${
            darkMode 
              ? 'bg-gray-800 text-gray-100 placeholder-gray-500' 
              : 'bg-gray-50 text-gray-900 placeholder-gray-400'
          } ${isPaused || isComplete ? 'opacity-50' : ''}`}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
      </div>

      {/* Completion Modal */}
      {showCompletion && sessionStats && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`rounded-xl p-6 max-w-md w-full mx-4 ${
            darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
          }`}>
            <div className="text-center">
              <div className="text-3xl mb-3">🎉</div>
              <h3 className="text-xl font-semibold mb-4">Well Done!</h3>
              
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span>Speed:</span>
                  <span className="font-medium text-purple-600">{sessionStats.wpm} WPM</span>
                </div>
                <div className="flex justify-between">
                  <span>Accuracy:</span>
                  <span className="font-medium text-green-600">{sessionStats.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Time:</span>
                  <span className="font-medium">{formatTime(sessionStats.timeElapsed)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Errors:</span>
                  <span className="font-medium text-red-600">{sessionStats.errors}</span>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={resetSession}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                >
                  Try Again
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors font-medium ${
                    darkMode 
                      ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  View Stats
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Help */}
      <div className="text-center text-sm text-gray-500">
        Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">ESC</kbd> to pause • 
        <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs ml-1">⌘R</kbd> to restart
      </div>
    </div>
  );
};

// Clean Stat Card Component
const StatCard = ({ darkMode, icon, label, value }) => (
  <div className={`rounded-xl border p-4 ${
    darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
  }`}>
    <div className="flex items-center space-x-2 mb-1">
      <div className="text-gray-500">
        {icon}
      </div>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
    </div>
    <div className="text-2xl font-semibold">{value}</div>
  </div>
);

export default PracticeScreen;