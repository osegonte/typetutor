// Simplified PracticeScreen.jsx - Quick fix for blank page
// This removes the complex timer imports that were causing the issue

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, RotateCcw, Pause, Play, Target, Clock, Zap, AlertCircle, Trophy, TrendingUp } from 'lucide-react';
import { saveStats } from '../services/api';

const PracticeScreen = ({ darkMode, setActiveTab, customText }) => {
  // Core state
  const [currentText, setCurrentText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  // Performance metrics
  const [wpm, setWpm] = useState(0);
  const [accuracy, setAccuracy] = useState(100);
  const [errors, setErrors] = useState(0);
  const [errorPositions, setErrorPositions] = useState(new Set());
  
  // Timer state - SIMPLIFIED VERSION
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  // Session state
  const [sessionStats, setSessionStats] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [personalBest, setPersonalBest] = useState(false);
  
  // Refs
  const inputRef = useRef(null);
  const intervalRef = useRef(null);

  // Initialize text
  useEffect(() => {
    const defaultText = `The art of typing is not just about speed, but about developing a rhythm and flow that becomes second nature. Through consistent practice and attention to proper technique, anyone can develop excellent typing skills. Focus on accuracy first, then speed will naturally follow. Remember to keep your fingers on the home row and use all ten fingers for optimal efficiency.`;
    
    if (customText && customText.trim()) {
      setCurrentText(customText.trim());
    } else {
      setCurrentText(defaultText);
    }
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [customText]);

  // Timer effect - SIMPLIFIED VERSION
  useEffect(() => {
    if (isActive && !isPaused && startTime) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsed = Math.round((now - startTime) / 1000);
        setTimeElapsed(elapsed);
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, startTime]);

  // Calculate real-time metrics
  useEffect(() => {
    if (timeElapsed > 0 && userInput.length > 0) {
      const wordsTyped = userInput.length / 5;
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

  // SIMPLIFIED timer functions
  const startTimer = useCallback(() => {
    const now = Date.now();
    console.log('⏱️ Starting timer at:', now);
    
    setStartTime(now);
    setEndTime(null);
    setIsActive(true);
    setIsPaused(false);
    setTimeElapsed(0);
  }, []);

  const stopTimer = useCallback(() => {
    const now = Date.now();
    console.log('⏱️ Stopping timer at:', now, 'Start was:', startTime);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setEndTime(now);
    setIsActive(false);
    setIsPaused(false);
    
    // Calculate final duration
    const finalDuration = startTime ? Math.max((now - startTime) / 1000, 1) : 1; // Minimum 1 second
    setTimeElapsed(Math.round(finalDuration));
    
    console.log('⏱️ Final duration:', finalDuration, 'seconds');
    return finalDuration;
  }, [startTime]);

  const togglePause = useCallback(() => {
    if (isActive) {
      setIsPaused(prev => !prev);
    }
  }, [isActive]);

  const resetTimer = useCallback(() => {
    console.log('⏱️ Resetting timer');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setStartTime(null);
    setEndTime(null);
    setIsActive(false);
    setIsPaused(false);
    setTimeElapsed(0);
  }, []);

  // Handle input with real-time validation
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    
    // Start timer on first character
    if (!isActive && value.length === 1 && startTime === null) {
      console.log('🔥 First character typed, starting timer');
      startTimer();
    }

    // Prevent input beyond text length
    if (value.length <= currentText.length) {
      setUserInput(value);
      setCurrentIndex(value.length);

      // Track errors in real-time
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

      // Check for completion
      if (value.length === currentText.length) {
        completeSession(value);
      }
    }
  }, [currentText, isActive, startTime, startTimer]);

  // Complete session - SIMPLIFIED VERSION
  const completeSession = useCallback(async (finalInput) => {
    try {
      console.log('🏁 Session completion started');
      
      setIsComplete(true);
      
      // Stop timer and get duration
      const duration = stopTimer();
      
      // Calculate final metrics
      const finalWpm = duration > 0 ? Math.round((finalInput.length / 5) / (duration / 60)) : 0;
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
        timeElapsed: Math.round(duration),
        errors: errors,
        totalCharacters: finalInput.length,
        charactersPerMinute: duration > 0 ? Math.round(finalInput.length / (duration / 60)) : 0,
        completedAt: new Date().toISOString(),
        textPreview: currentText.substring(0, 50) + (currentText.length > 50 ? '...' : ''),
        difficulty: getDifficultyLevel()
      };

      setSessionStats(stats);

      // Check for personal best
      const savedBest = localStorage.getItem('personalBestWpm');
      if (!savedBest || finalWpm > parseInt(savedBest)) {
        localStorage.setItem('personalBestWpm', finalWpm.toString());
        setPersonalBest(true);
      }

      try {
        // Save stats to backend
        await saveStats({
          wpm: finalWpm,
          accuracy: finalAccuracy,
          duration: Math.round(duration), // This should now always be >= 1
          errors: errors,
          mode: 'practice',
          itemType: customText ? 'Custom Text' : 'Default Practice',
          completedAt: new Date().toISOString(),
          totalCharacters: finalInput.length,
          timestamp: new Date().toISOString()
        });
        
        console.log('✅ Stats saved successfully');
      } catch (error) {
        console.error('❌ Failed to save session stats:', error);
      }

      setShowCompletion(true);
    } catch (error) {
      console.error('❌ Error in completeSession:', error);
    }
  }, [stopTimer, errors, currentText, customText]);

  // Get difficulty level based on text characteristics
  const getDifficultyLevel = () => {
    const avgWordLength = currentText.split(' ').reduce((sum, word) => sum + word.length, 0) / currentText.split(' ').length;
    const specialChars = (currentText.match(/[^a-zA-Z0-9\s]/g) || []).length;
    const numbers = (currentText.match(/\d/g) || []).length;
    
    if (avgWordLength > 6 || specialChars > currentText.length * 0.1 || numbers > currentText.length * 0.1) {
      return 'Hard';
    } else if (avgWordLength > 4 || specialChars > currentText.length * 0.05) {
      return 'Medium';
    }
    return 'Easy';
  };

  // Reset session
  const resetSession = useCallback(() => {
    console.log('🔄 Session reset initiated');
    
    setUserInput('');
    setCurrentIndex(0);
    setIsComplete(false);
    setShowCompletion(false);
    setWpm(0);
    setAccuracy(100);
    setErrors(0);
    setErrorPositions(new Set());
    setSessionStats(null);
    setPersonalBest(false);
    
    resetTimer();
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [resetTimer]);

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

  // Character styling for visual feedback
  const getCharacterStyle = (index) => {
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
  };

  // Format time display
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate progress
  const progressPercentage = (currentIndex / currentText.length) * 100;

  // WPM color coding
  const getWpmColor = () => {
    if (wpm >= 60) return 'text-green-600 dark:text-green-400';
    if (wpm >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  // Accuracy color coding
  const getAccuracyColor = () => {
    if (accuracy >= 95) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 85) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4">
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className={`rounded-lg border p-3 text-sm ${
          darkMode ? 'bg-gray-900 border-gray-700 text-gray-300' : 'bg-yellow-50 border-yellow-200 text-gray-700'
        }`}>
          <div className="font-semibold mb-1">🔧 Debug Info:</div>
          <div className="space-y-1 text-xs font-mono">
            <div>Timer: {startTime ? '✅ Started' : '❌ Not started'} | Active: {isActive ? '✅' : '❌'} | Duration: {timeElapsed}s</div>
            <div>Characters: {userInput.length}/{currentText.length} | Errors: {errors}</div>
          </div>
        </div>
      )}

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

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          darkMode={darkMode} 
          icon={<Zap size={20} />} 
          label="Speed" 
          value={`${wpm} WPM`}
          valueColor={getWpmColor()}
        />
        <StatCard 
          darkMode={darkMode} 
          icon={<Target size={20} />} 
          label="Accuracy" 
          value={`${accuracy}%`}
          valueColor={getAccuracyColor()}
        />
        <StatCard 
          darkMode={darkMode} 
          icon={<Clock size={20} />} 
          label="Time" 
          value={formatTime(timeElapsed)} 
        />
        <StatCard 
          darkMode={darkMode} 
          icon={<AlertCircle size={20} />} 
          label="Errors" 
          value={errors}
          valueColor={errors > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
        />
      </div>

      {/* Progress Bar */}
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

      {/* Input Area */}
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
                  <div className="text-2xl font-bold text-orange-600">{sessionStats.charactersPerMinute}</div>
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

      {/* Keyboard Shortcuts Help */}
      <div className="text-center text-sm text-gray-500 space-x-4">
        <span>
          Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">ESC</kbd> to pause
        </span>
        <span>
          <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">⌘R</kbd> to restart
        </span>
      </div>
    </div>
  );
};

// Enhanced Stat Card Component
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

export default PracticeScreen;