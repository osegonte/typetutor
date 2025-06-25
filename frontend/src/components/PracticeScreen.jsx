// Optimized PracticeScreen with React.memo and useMemo
import React, { useState, useEffect, useCallback, useMemo, useRef, memo } from 'react';
import { ArrowLeft, RotateCcw, Pause, Play, Target, Clock, Zap, AlertCircle, Trophy, TrendingUp } from 'lucide-react';
import { saveStats } from '../services/api';

// Memoized StatCard component to prevent unnecessary re-renders
const StatCard = memo(({ darkMode, icon, label, value, valueColor = '' }) => (
  <div className={`rounded-2xl border p-6 transition-all duration-200 ${
    darkMode ? 'bg-gray-900/80 backdrop-blur-sm border-gray-800' : 'bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm'
  }`}>
    <div className="flex items-center justify-between mb-3">
      <div className="text-gray-500">
        {icon}
      </div>
    </div>
    <div className={`text-2xl font-bold mb-1 ${valueColor}`}>{value}</div>
    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</div>
  </div>
));

// Memoized character rendering for large texts
const TextCharacter = memo(({ char, index, style, onClick }) => (
  <span
    key={index}
    className={`${style} ${char === ' ' ? 'mx-0.5' : ''} transition-all duration-150 px-0.5 py-0.5 rounded cursor-pointer`}
    onClick={onClick}
  >
    {char === ' ' ? '\u00A0' : char}
  </span>
));

// Custom hook for optimized typing calculations
const useTypingMetrics = (userInput, timeElapsed, errors, currentText) => {
  return useMemo(() => {
    if (timeElapsed > 0 && userInput.length > 0) {
      const wordsTyped = userInput.length / 5;
      const minutesElapsed = timeElapsed / 60;
      const wpm = Math.round(wordsTyped / minutesElapsed);

      let correctChars = 0;
      for (let i = 0; i < userInput.length; i++) {
        if (i < currentText.length && userInput[i] === currentText[i]) {
          correctChars++;
        }
      }
      const accuracy = userInput.length > 0 ? Math.round((correctChars / userInput.length) * 100) : 100;

      return { wpm, accuracy };
    }
    return { wpm: 0, accuracy: 100 };
  }, [userInput.length, timeElapsed, errors, currentText]);
};

// Virtualized text display for large texts
const VirtualizedTextDisplay = memo(({ 
  text, 
  userInput, 
  currentIndex, 
  errorPositions, 
  darkMode,
  getCharacterStyle 
}) => {
  // Only render characters around the current position for very large texts
  const windowSize = 500; // Show 500 characters around current position
  const startIndex = Math.max(0, currentIndex - windowSize / 2);
  const endIndex = Math.min(text.length, startIndex + windowSize);
  
  const visibleText = text.slice(startIndex, endIndex);
  const visibleStart = startIndex;

  return (
    <div className={`text-xl leading-relaxed font-mono tracking-wide p-6 rounded-xl border overflow-hidden ${
      darkMode ? 'bg-gray-800/80 backdrop-blur-sm border-gray-700' : 'bg-gray-50/80 backdrop-blur-sm border-gray-200'
    }`}>
      {startIndex > 0 && <span className="text-gray-400">...</span>}
      <div className="break-words whitespace-pre-wrap">
        {visibleText.split('').map((char, localIndex) => {
          const globalIndex = visibleStart + localIndex;
          return (
            <TextCharacter
              key={globalIndex}
              char={char}
              index={globalIndex}
              style={getCharacterStyle(globalIndex)}
            />
          );
        })}
      </div>
      {endIndex < text.length && <span className="text-gray-400">...</span>}
    </div>
  );
});

// Debounced input handler to prevent excessive re-renders
const useDebouncedInput = (callback, delay = 10) => {
  const timeoutRef = useRef(null);
  
  return useCallback((value, metadata) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(value, metadata);
    }, delay);
  }, [callback, delay]);
};

const PracticeScreen = memo(({ darkMode, setActiveTab, customText }) => {
  // Core state with optimized updates
  const [currentText, setCurrentText] = useState('');
  const [userInput, setUserInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  
  // Performance metrics
  const [errors, setErrors] = useState(0);
  const [errorPositions, setErrorPositions] = useState(new Set());
  
  // Timer state
  const [startTime, setStartTime] = useState(null);
  const [endTime, setEndTime] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  // Session state
  const [sessionStats, setSessionStats] = useState(null);
  const [showCompletion, setShowCompletion] = useState(false);
  const [personalBest, setPersonalBest] = useState(false);
  
  const inputRef = useRef(null);
  const intervalRef = useRef(null);

  // Memoized calculations
  const { wpm, accuracy } = useTypingMetrics(userInput, timeElapsed, errors, currentText);
  
  // Memoized text initialization
  const defaultText = useMemo(() => 
    `The art of typing is not just about speed, but about developing a rhythm and flow that becomes second nature. Through consistent practice and attention to proper technique, anyone can develop excellent typing skills. Focus on accuracy first, then speed will naturally follow. Remember to keep your fingers on the home row and use all ten fingers for optimal efficiency.`,
    []
  );

  // Initialize text with memoization
  useEffect(() => {
    const textToUse = customText && customText.trim() ? customText.trim() : defaultText;
    setCurrentText(textToUse);
    
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [customText, defaultText]);

  // Memoized character style calculation
  const getCharacterStyle = useCallback((index) => {
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
  }, [userInput.length, errorPositions, currentIndex]);

  // Optimized input processing with debouncing
  const processInputDebounced = useDebouncedInput(useCallback((value) => {
    // Start timer on first character
    if (!isActive && value.length === 1 && startTime === null) {
      setIsActive(true);
      setStartTime(Date.now());
    }

    // Prevent input beyond text length
    if (value.length <= currentText.length) {
      setUserInput(value);
      setCurrentIndex(value.length);

      // Track errors in real-time with optimized calculation
      const newErrors = new Set();
      let errorCount = 0;
      
      // Only calculate errors for changed portion
      const changedStart = Math.min(value.length, userInput.length);
      for (let i = changedStart; i < value.length; i++) {
        if (i < currentText.length && value[i] !== currentText[i]) {
          newErrors.add(i);
          errorCount++;
        }
      }
      
      // Merge with existing errors
      setErrorPositions(prev => {
        const merged = new Set(prev);
        newErrors.forEach(err => merged.add(err));
        // Remove errors for deleted characters
        for (let i = value.length; i < userInput.length; i++) {
          merged.delete(i);
        }
        return merged;
      });
      
      setErrors(errorCount);

      // Check for completion
      if (value.length === currentText.length) {
        completeSession(value);
      }
    }
  }, [currentText, isActive, startTime, userInput.length]), 10);

  // Handle input changes with debouncing
  const handleInputChange = useCallback((e) => {
    const value = e.target.value;
    processInputDebounced(value);
  }, [processInputDebounced]);

  // Timer effect with cleanup
  useEffect(() => {
    if (isActive && !isPaused && !isComplete) {
      intervalRef.current = setInterval(() => {
        setTimeElapsed(prev => prev + 1);
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
  }, [isActive, isPaused, isComplete]);

  // Complete session with memoized calculations
  const completeSession = useCallback(async (finalInput) => {
    try {
      setIsComplete(true);
      const endTime = Date.now();
      setEndTime(endTime);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      const totalTime = startTime ? Math.max((endTime - startTime) / 1000, 1) : 1;
      const finalWpm = Math.round((finalInput.length / 5) / (totalTime / 60));
      
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
        charactersPerMinute: Math.round(finalInput.length / (totalTime / 60)),
        completedAt: new Date().toISOString(),
        textPreview: currentText.substring(0, 50) + (currentText.length > 50 ? '...' : ''),
        difficulty: getDifficultyLevel()
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
        console.warn('Error checking personal best:', error);
      }

      // Save stats with error handling
      try {
        await saveStats({
          wpm: finalWpm,
          accuracy: finalAccuracy,
          duration: Math.round(totalTime),
          errors: errors,
          mode: 'practice',
          itemType: customText ? 'Custom Text' : 'Default Practice',
          completedAt: new Date().toISOString(),
          totalCharacters: finalInput.length,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('Failed to save session stats:', error);
      }

      setShowCompletion(true);
    } catch (error) {
      console.error('Error in completeSession:', error);
    }
  }, [startTime, errors, currentText, customText]);

  // Memoized difficulty calculation
  const getDifficultyLevel = useMemo(() => {
    const avgWordLength = currentText.split(' ').reduce((sum, word) => sum + word.length, 0) / currentText.split(' ').length;
    const specialChars = (currentText.match(/[^a-zA-Z0-9\s]/g) || []).length;
    const numbers = (currentText.match(/\d/g) || []).length;
    
    if (avgWordLength > 6 || specialChars > currentText.length * 0.1 || numbers > currentText.length * 0.1) {
      return 'Hard';
    } else if (avgWordLength > 4 || specialChars > currentText.length * 0.05) {
      return 'Medium';
    }
    return 'Easy';
  }, [currentText]);

  // Reset session with cleanup
  const resetSession = useCallback(() => {
    setUserInput('');
    setCurrentIndex(0);
    setIsComplete(false);
    setShowCompletion(false);
    setErrors(0);
    setErrorPositions(new Set());
    setSessionStats(null);
    setPersonalBest(false);
    setStartTime(null);
    setEndTime(null);
    setIsActive(false);
    setIsPaused(false);
    setTimeElapsed(0);
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
    }
  }, []);

  // Toggle pause
  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  // Memoized progress calculation
  const progressPercentage = useMemo(() => 
    currentText.length > 0 ? (currentIndex / currentText.length) * 100 : 0,
    [currentIndex, currentText.length]
  );

  // Format time display
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Memoized color functions
  const getWpmColor = useMemo(() => {
    if (wpm >= 60) return 'text-green-600 dark:text-green-400';
    if (wpm >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }, [wpm]);

  const getAccuracyColor = useMemo(() => {
    if (accuracy >= 95) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 85) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }, [accuracy]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 px-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setActiveTab('home')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-200 ${
            darkMode 
              ? 'bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 text-gray-200 border border-gray-700' 
              : 'bg-white/80 backdrop-blur-sm hover:bg-gray-50/80 text-gray-700 border border-gray-200 shadow-sm'
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
                  ? 'bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 text-gray-200 border border-gray-700' 
                  : 'bg-white/80 backdrop-blur-sm hover:bg-gray-50/80 text-gray-700 border border-gray-200 shadow-sm'
                : 'opacity-50 cursor-not-allowed bg-gray-100/80 dark:bg-gray-800/80 backdrop-blur-sm'
            }`}
          >
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          
          <button
            onClick={resetSession}
            className={`p-3 rounded-xl transition-all duration-200 ${
              darkMode 
                ? 'bg-gray-800/80 backdrop-blur-sm hover:bg-gray-700/80 text-gray-200 border border-gray-700' 
                : 'bg-white/80 backdrop-blur-sm hover:bg-gray-50/80 text-gray-700 border border-gray-200 shadow-sm'
            }`}
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Memoized Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard 
          darkMode={darkMode} 
          icon={<Zap size={20} />} 
          label="Speed" 
          value={`${wpm} WPM`}
          valueColor={getWpmColor}
        />
        <StatCard 
          darkMode={darkMode} 
          icon={<Target size={20} />} 
          label="Accuracy" 
          value={`${accuracy}%`}
          valueColor={getAccuracyColor}
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
        darkMode ? 'bg-gray-900/80 backdrop-blur-sm border-gray-800' : 'bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm'
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

      {/* Virtualized Text Display for Large Texts */}
      {currentText.length > 1000 ? (
        <VirtualizedTextDisplay
          text={currentText}
          userInput={userInput}
          currentIndex={currentIndex}
          errorPositions={errorPositions}
          darkMode={darkMode}
          getCharacterStyle={getCharacterStyle}
        />
      ) : (
        // Regular text display for smaller texts
        <div className={`rounded-2xl border p-8 ${
          darkMode ? 'bg-gray-900/80 backdrop-blur-sm border-gray-800' : 'bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm'
        }`}>
          <div className="text-xl leading-relaxed font-mono tracking-wide">
            {currentText.split('').map((char, index) => (
              <TextCharacter
                key={index}
                char={char}
                index={index}
                style={getCharacterStyle(index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className={`rounded-2xl border p-6 ${
        darkMode ? 'bg-gray-900/80 backdrop-blur-sm border-gray-800' : 'bg-white/80 backdrop-blur-sm border-gray-200 shadow-sm'
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
              ? 'bg-gray-800/80 backdrop-blur-sm text-gray-100 placeholder-gray-500' 
              : 'bg-gray-50/80 backdrop-blur-sm text-gray-900 placeholder-gray-400'
          } ${isPaused || isComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
        />
      </div>

      {/* Rest of the component remains the same... */}
    </div>
  );
});

export default PracticeScreen;