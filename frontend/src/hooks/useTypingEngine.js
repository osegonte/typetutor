// hooks/useTypingEngine.js - Advanced typing engine with comprehensive features
import { useState, useCallback, useMemo, useRef } from 'react';

export const useTypingEngine = (text, options = {}) => {
  const {
    enableBackspace = true,
    enableCorrection = true,
    highlightErrors = true,
    trackDetailedStats = true
  } = options;

  // Core state
  const [userInput, setUserInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState(new Set());
  const [corrections, setCorrections] = useState([]);
  const [keystrokes, setKeystrokes] = useState([]);
  
  // Advanced tracking
  const [characterStats, setCharacterStats] = useState({});
  const [wordBoundaries, setWordBoundaries] = useState([]);
  const [currentWord, setCurrentWord] = useState(0);
  const lastInputRef = useRef('');

  // Initialize word boundaries
  useMemo(() => {
    if (!text) return;
    
    const boundaries = [];
    let wordStart = 0;
    let inWord = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const isWordChar = /\w/.test(char);
      
      if (isWordChar && !inWord) {
        wordStart = i;
        inWord = true;
      } else if (!isWordChar && inWord) {
        boundaries.push({ start: wordStart, end: i - 1, word: text.slice(wordStart, i) });
        inWord = false;
      }
    }
    
    // Handle case where text ends with a word
    if (inWord) {
      boundaries.push({ start: wordStart, end: text.length - 1, word: text.slice(wordStart) });
    }
    
    setWordBoundaries(boundaries);
  }, [text]);

  // Track character-level statistics
  const updateCharacterStats = useCallback((char, isCorrect, timeMs) => {
    setCharacterStats(prev => ({
      ...prev,
      [char]: {
        total: (prev[char]?.total || 0) + 1,
        correct: (prev[char]?.correct || 0) + (isCorrect ? 1 : 0),
        avgTime: prev[char]?.avgTime 
          ? ((prev[char].avgTime * (prev[char].total - 1)) + timeMs) / prev[char].total
          : timeMs
      }
    }));
  }, []);

  // Process user input with advanced tracking
  const processInput = useCallback((value, inputMetadata = {}) => {
    const { timestamp = Date.now(), inputMethod = 'keyboard' } = inputMetadata;
    
    // Prevent input beyond text length unless backspace is enabled
    if (!enableBackspace && value.length > text.length) {
      return false;
    }

    // Handle backspace
    if (value.length < userInput.length) {
      if (!enableBackspace) return false;
      
      const deletedIndex = value.length;
      setErrors(prev => {
        const newErrors = new Set(prev);
        newErrors.delete(deletedIndex);
        return newErrors;
      });
      
      // Track correction
      if (userInput[deletedIndex] !== text[deletedIndex]) {
        setCorrections(prev => [...prev, {
          index: deletedIndex,
          originalChar: text[deletedIndex],
          typedChar: userInput[deletedIndex],
          timestamp
        }]);
      }
    }

    // Process new characters
    if (value.length > userInput.length) {
      const newCharIndex = userInput.length;
      const typedChar = value[newCharIndex];
      const expectedChar = text[newCharIndex];
      const isCorrect = typedChar === expectedChar;
      
      // Track keystroke
      const keystroke = {
        index: newCharIndex,
        char: typedChar,
        expected: expectedChar,
        correct: isCorrect,
        timestamp,
        inputMethod,
        timeSinceLastKey: lastInputRef.current ? timestamp - lastInputRef.current : 0
      };
      
      setKeystrokes(prev => [...prev, keystroke]);
      lastInputRef.current = timestamp;
      
      // Update character stats
      updateCharacterStats(typedChar, isCorrect, keystroke.timeSinceLastKey);
      
      // Track errors
      if (!isCorrect) {
        setErrors(prev => new Set([...prev, newCharIndex]));
      }
      
      // Update current word
      const currentWordIndex = wordBoundaries.findIndex(
        boundary => newCharIndex >= boundary.start && newCharIndex <= boundary.end
      );
      if (currentWordIndex !== -1 && currentWordIndex !== currentWord) {
        setCurrentWord(currentWordIndex);
      }
    }

    setUserInput(value);
    setCurrentIndex(value.length);
    
    // Check completion
    const isComplete = value.length === text.length;
    return { isComplete, errors: errors.size, accuracy: calculateAccuracy(value) };
  }, [text, userInput, errors, currentWord, wordBoundaries, enableBackspace, updateCharacterStats]);

  // Calculate real-time accuracy
  const calculateAccuracy = useCallback((input = userInput) => {
    if (input.length === 0) return 100;
    
    let correct = 0;
    for (let i = 0; i < input.length; i++) {
      if (i < text.length && input[i] === text[i]) {
        correct++;
      }
    }
    
    return Math.round((correct / input.length) * 100);
  }, [text, userInput]);

  // Get typing speed metrics
  const getSpeedMetrics = useCallback(() => {
    if (keystrokes.length < 2) return { wpm: 0, cpm: 0, averageSpeed: 0 };
    
    const firstKeystroke = keystrokes[0];
    const lastKeystroke = keystrokes[keystrokes.length - 1];
    const totalTimeMs = lastKeystroke.timestamp - firstKeystroke.timestamp;
    const totalTimeMin = totalTimeMs / 60000;
    
    if (totalTimeMin === 0) return { wpm: 0, cpm: 0, averageSpeed: 0 };
    
    const characters = userInput.length;
    const words = characters / 5; // Standard: 5 characters = 1 word
    
    const wpm = Math.round(words / totalTimeMin);
    const cpm = Math.round(characters / totalTimeMin);
    const averageSpeed = keystrokes.reduce((sum, k) => sum + k.timeSinceLastKey, 0) / keystrokes.length;
    
    return { wpm, cpm, averageSpeed };
  }, [keystrokes, userInput]);

  // Get detailed analytics
  const getDetailedAnalytics = useCallback(() => {
    const speedMetrics = getSpeedMetrics();
    const accuracy = calculateAccuracy();
    
    // Calculate burst speed (speed over last 10 keystrokes)
    const recentKeystrokes = keystrokes.slice(-10);
    let burstSpeed = 0;
    if (recentKeystrokes.length > 1) {
      const burstTimeMs = recentKeystrokes[recentKeystrokes.length - 1].timestamp - recentKeystrokes[0].timestamp;
      const burstTimeMin = burstTimeMs / 60000;
      if (burstTimeMin > 0) {
        burstSpeed = Math.round((recentKeystrokes.length / 5) / burstTimeMin);
      }
    }
    
    // Error analysis
    const errorsByChar = {};
    errors.forEach(index => {
      const char = text[index];
      errorsByChar[char] = (errorsByChar[char] || 0) + 1;
    });
    
    // Word-level analysis
    const wordStats = wordBoundaries.map(boundary => {
      const wordText = boundary.word;
      const wordErrors = Array.from(errors).filter(
        index => index >= boundary.start && index <= boundary.end
      ).length;
      
      return {
        word: wordText,
        accuracy: wordErrors === 0 ? 100 : Math.round(((wordText.length - wordErrors) / wordText.length) * 100),
        errors: wordErrors,
        completed: currentIndex > boundary.end
      };
    });
    
    // Typing rhythm analysis
    const keystrokeTimes = keystrokes.map(k => k.timeSinceLastKey).filter(t => t > 0);
    const avgKeystrokeTime = keystrokeTimes.reduce((sum, time) => sum + time, 0) / keystrokeTimes.length || 0;
    const keystrokeVariance = keystrokeTimes.reduce((sum, time) => sum + Math.pow(time - avgKeystrokeTime, 2), 0) / keystrokeTimes.length || 0;
    const consistency = Math.max(0, 100 - (Math.sqrt(keystrokeVariance) / avgKeystrokeTime) * 100);
    
    return {
      ...speedMetrics,
      accuracy,
      burstSpeed,
      consistency: Math.round(consistency),
      errorsByChar,
      characterStats,
      wordStats,
      corrections: corrections.length,
      totalKeystrokes: keystrokes.length,
      currentWordIndex: currentWord,
      progress: (currentIndex / text.length) * 100
    };
  }, [keystrokes, errors, text, characterStats, wordBoundaries, corrections, currentWord, currentIndex, getSpeedMetrics, calculateAccuracy]);

  // Get character style for display
  const getCharacterStyle = useCallback((index) => {
    if (index < userInput.length) {
      if (errors.has(index)) {
        return 'error';
      }
      return 'correct';
    }
    if (index === currentIndex) {
      return 'current';
    }
    return 'pending';
  }, [userInput, errors, currentIndex]);

  // Reset all state
  const reset = useCallback(() => {
    setUserInput('');
    setCurrentIndex(0);
    setErrors(new Set());
    setCorrections([]);
    setKeystrokes([]);
    setCharacterStats({});
    setCurrentWord(0);
    lastInputRef.current = null;
  }, []);

  // Get problematic characters (for practice recommendations)
  const getProblematicCharacters = useCallback(() => {
    const problemChars = Object.entries(characterStats)
      .filter(([_, stats]) => stats.total >= 3 && (stats.correct / stats.total) < 0.8)
      .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
      .slice(0, 5)
      .map(([char, stats]) => ({
        char,
        accuracy: Math.round((stats.correct / stats.total) * 100),
        attempts: stats.total,
        avgTime: Math.round(stats.avgTime)
      }));
    
    return problemChars;
  }, [characterStats]);

  return {
    // Core state
    userInput,
    currentIndex,
    errors: Array.from(errors),
    isComplete: userInput.length === text.length && errors.size === 0,
    
    // Methods
    processInput,
    reset,
    getCharacterStyle,
    
    // Analytics
    getDetailedAnalytics,
    getSpeedMetrics,
    calculateAccuracy,
    getProblematicCharacters,
    
    // Advanced data
    keystrokes,
    corrections,
    characterStats,
    wordBoundaries,
    currentWord,
    
    // Real-time metrics
    errorCount: errors.size,
    accuracy: calculateAccuracy(),
    progress: (currentIndex / text.length) * 100
  };
};

// hooks/useSessionStats.js - Enhanced session statistics tracking
export const useSessionStats = (options = {}) => {
  const {
    autoUpdateInterval = 100,
    trackDetailedMetrics = true,
    enablePredictions = true
  } = options;

  const [sessionData, setSessionData] = useState({
    startTime: null,
    endTime: null,
    pausedTime: 0,
    isPaused: false,
    pauseStart: null
  });

  const [metrics, setMetrics] = useState({
    timeElapsed: 0,
    wpm: 0,
    cpm: 0,
    accuracy: 100,
    consistency: 100,
    burstSpeed: 0,
    predictedFinalWpm: 0,
    estimatedTimeRemaining: 0
  });

  const [history, setHistory] = useState([]);
  const intervalRef = useRef(null);

  // Start session
  const startSession = useCallback(() => {
    const now = Date.now();
    setSessionData(prev => ({
      ...prev,
      startTime: now,
      endTime: null,
      pausedTime: 0,
      isPaused: false,
      pauseStart: null
    }));
    
    setMetrics(prev => ({
      ...prev,
      timeElapsed: 0
    }));
    
    setHistory([]);
  }, []);

  // End session
  const endSession = useCallback(() => {
    setSessionData(prev => ({
      ...prev,
      endTime: Date.now(),
      isPaused: false,
      pauseStart: null
    }));
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Pause/resume session
  const togglePause = useCallback(() => {
    const now = Date.now();
    
    setSessionData(prev => {
      if (prev.isPaused) {
        // Resuming
        const pauseDuration = now - prev.pauseStart;
        return {
          ...prev,
          isPaused: false,
          pauseStart: null,
          pausedTime: prev.pausedTime + pauseDuration
        };
      } else {
        // Pausing
        return {
          ...prev,
          isPaused: true,
          pauseStart: now
        };
      }
    });
  }, []);

  // Update metrics
  const updateMetrics = useCallback((typingData, textLength) => {
    if (!sessionData.startTime || sessionData.isPaused) return;

    const now = Date.now();
    const totalElapsed = now - sessionData.startTime - sessionData.pausedTime;
    const timeElapsedSeconds = totalElapsed / 1000;
    const timeElapsedMinutes = timeElapsedSeconds / 60;

    const {
      inputLength = 0,
      errorCount = 0,
      keystrokes = [],
      burstSpeed = 0,
      consistency = 100
    } = typingData;

    let wpm = 0;
    let cpm = 0;
    let accuracy = 100;
    let predictedFinalWpm = 0;
    let estimatedTimeRemaining = 0;

    if (timeElapsedMinutes > 0) {
      const words = inputLength / 5;
      wpm = Math.round(words / timeElapsedMinutes);
      cpm = Math.round(inputLength / timeElapsedMinutes);
      
      if (inputLength > 0) {
        accuracy = Math.round(((inputLength - errorCount) / inputLength) * 100);
      }

      // Predict final WPM based on current performance
      if (enablePredictions && inputLength > 10) {
        const progressRatio = inputLength / textLength;
        const currentEfficiency = accuracy / 100;
        predictedFinalWpm = Math.round(wpm * currentEfficiency);
        
        if (wpm > 0) {
          const remainingCharacters = textLength - inputLength;
          const remainingWords = remainingCharacters / 5;
          estimatedTimeRemaining = Math.round((remainingWords / wpm) * 60); // in seconds
        }
      }
    }

    const newMetrics = {
      timeElapsed: Math.round(timeElapsedSeconds),
      wpm,
      cpm,
      accuracy,
      consistency: Math.round(consistency),
      burstSpeed,
      predictedFinalWpm,
      estimatedTimeRemaining
    };

    setMetrics(newMetrics);

    // Add to history for trend analysis
    if (trackDetailedMetrics && timeElapsedSeconds % 5 === 0) { // Every 5 seconds
      setHistory(prev => [...prev, {
        ...newMetrics,
        timestamp: now,
        progress: (inputLength / textLength) * 100
      }]);
    }
  }, [sessionData, enablePredictions, trackDetailedMetrics]);

  // Calculate session summary
  const getSessionSummary = useCallback(() => {
    if (!sessionData.startTime) return null;

    const endTime = sessionData.endTime || Date.now();
    const totalDuration = endTime - sessionData.startTime;
    const activeDuration = totalDuration - sessionData.pausedTime;

    // Calculate trends from history
    const trends = {
      wpmTrend: 0,
      accuracyTrend: 0,
      consistencyTrend: 0
    };

    if (history.length >= 2) {
      const firstHalf = history.slice(0, Math.floor(history.length / 2));
      const secondHalf = history.slice(Math.floor(history.length / 2));

      const avgFirst = {
        wpm: firstHalf.reduce((sum, h) => sum + h.wpm, 0) / firstHalf.length,
        accuracy: firstHalf.reduce((sum, h) => sum + h.accuracy, 0) / firstHalf.length,
        consistency: firstHalf.reduce((sum, h) => sum + h.consistency, 0) / firstHalf.length
      };

      const avgSecond = {
        wpm: secondHalf.reduce((sum, h) => sum + h.wpm, 0) / secondHalf.length,
        accuracy: secondHalf.reduce((sum, h) => sum + h.accuracy, 0) / secondHalf.length,
        consistency: secondHalf.reduce((sum, h) => sum + h.consistency, 0) / secondHalf.length
      };

      trends.wpmTrend = avgSecond.wpm - avgFirst.wpm;
      trends.accuracyTrend = avgSecond.accuracy - avgFirst.accuracy;
      trends.consistencyTrend = avgSecond.consistency - avgFirst.consistency;
    }

    return {
      ...metrics,
      totalDuration: Math.round(totalDuration / 1000),
      activeDuration: Math.round(activeDuration / 1000),
      pausedDuration: Math.round(sessionData.pausedTime / 1000),
      trends,
      history,
      peakWpm: Math.max(...history.map(h => h.wpm), metrics.wpm),
      averageWpm: history.length > 0 ? Math.round(history.reduce((sum, h) => sum + h.wpm, 0) / history.length) : metrics.wpm
    };
  }, [sessionData, metrics, history]);

  // Reset all session data
  const reset = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    setSessionData({
      startTime: null,
      endTime: null,
      pausedTime: 0,
      isPaused: false,
      pauseStart: null
    });

    setMetrics({
      timeElapsed: 0,
      wpm: 0,
      cpm: 0,
      accuracy: 100,
      consistency: 100,
      burstSpeed: 0,
      predictedFinalWpm: 0,
      estimatedTimeRemaining: 0
    });

    setHistory([]);
  }, []);

  // Format time display
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    // Session control
    startSession,
    endSession,
    togglePause,
    reset,

    // State
    isActive: !!sessionData.startTime && !sessionData.endTime,
    isPaused: sessionData.isPaused,
    startTime: sessionData.startTime,
    endTime: sessionData.endTime,

    // Metrics
    ...metrics,
    formattedTime: formatTime(metrics.timeElapsed),
    formattedEstimatedTime: formatTime(metrics.estimatedTimeRemaining),

    // Methods
    updateMetrics,
    getSessionSummary,
    
    // Data
    history,
    trends: history.length >= 2
  };
};

// hooks/useKeyboardHandler.js - Advanced keyboard input handling
export const useKeyboardHandler = (handlers, options = {}) => {
  const {
    preventDefault = true,
    captureAllKeys = false,
    enableShortcuts = true,
    disabled = false
  } = options;

  const {
    onInput,
    onPause,
    onReset,
    onEscape,
    onEnter,
    onTab,
    onSpace,
    onBackspace,
    onDelete,
    onArrowKey,
    onSpecialKey
  } = handlers;

  useEffect(() => {
    if (disabled) return;

    const handleKeyDown = (e) => {
      // Handle special keys
      if (enableShortcuts) {
        if (e.key === 'Escape') {
          preventDefault && e.preventDefault();
          onEscape?.() || onPause?.();
          return;
        }

        if (e.ctrlKey || e.metaKey) {
          switch (e.key.toLowerCase()) {
            case 'r':
              preventDefault && e.preventDefault();
              onReset?.();
              return;
            case 'p':
              preventDefault && e.preventDefault();
              onPause?.();
              return;
            case 'enter':
              preventDefault && e.preventDefault();
              onEnter?.();
              return;
          }
        }
      }

      // Handle navigation keys
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        if (onArrowKey) {
          preventDefault && e.preventDefault();
          onArrowKey(e.key, e);
        }
        return;
      }

      // Handle function keys
      if (e.key.startsWith('F') && e.key.length > 1) {
        if (onSpecialKey) {
          preventDefault && e.preventDefault();
          onSpecialKey(e.key, e);
        }
        return;
      }

      // Handle other special keys
      switch (e.key) {
        case 'Tab':
          if (onTab) {
            preventDefault && e.preventDefault();
            onTab(e);
          }
          break;
        case 'Enter':
          if (onEnter) {
            preventDefault && e.preventDefault();
            onEnter(e);
          }
          break;
        case 'Backspace':
          onBackspace?.(e);
          break;
        case 'Delete':
          if (onDelete) {
            preventDefault && e.preventDefault();
            onDelete(e);
          }
          break;
        case ' ':
          onSpace?.(e);
          break;
        default:
          if (captureAllKeys && onInput) {
            onInput(e);
          }
      }
    };

    const handleKeyPress = (e) => {
      if (disabled) return;
      
      // Handle regular character input
      if (!e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
        onInput?.(e);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keypress', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keypress', handleKeyPress);
    };
  }, [handlers, disabled, preventDefault, captureAllKeys, enableShortcuts]);
};

// hooks/useSoundEffects.js - Enhanced audio feedback system
export const useSoundEffects = (options = {}) => {
  const {
    enabled: initialEnabled = true,
    volume = 0.3,
    enableKeyboardSounds = true,
    enableNotificationSounds = true,
    enableAmbientSounds = false
  } = options;

  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem('typingSoundEnabled');
    return saved !== null ? saved === 'true' : initialEnabled;
  });

  const [soundVolume, setSoundVolume] = useState(() => {
    const saved = localStorage.getItem('typingSoundVolume');
    return saved !== null ? parseFloat(saved) : volume;
  });

  const audioContextRef = useRef(null);
  const soundCacheRef = useRef({});

  // Initialize audio context
  const initAudio = useCallback(() => {
    if (!soundEnabled || audioContextRef.current) return;
    
    try {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context not supported:', error);
    }
  }, [soundEnabled]);

  // Create oscillator-based sound
  const createSound = useCallback((frequency, duration = 0.1, type = 'sine') => {
    if (!audioContextRef.current || !soundEnabled) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    oscillator.frequency.setValueAtTime(frequency, audioContextRef.current.currentTime);
    oscillator.type = type;

    gainNode.gain.setValueAtTime(soundVolume, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + duration);

    oscillator.start(audioContextRef.current.currentTime);
    oscillator.stop(audioContextRef.current.currentTime + duration);
  }, [soundEnabled, soundVolume]);

  // Play typing sounds
  const playKeySound = useCallback((isCorrect = true, char = '') => {
    if (!enableKeyboardSounds || !soundEnabled) return;

    initAudio();

    let frequency = 800; // Default frequency
    
    // Different frequencies for different character types
    if (char) {
      if (/[aeiou]/i.test(char)) frequency = 880; // Vowels - higher
      else if (/[bcdfghjklmnpqrstvwxyz]/i.test(char)) frequency = 660; // Consonants - lower
      else if (/\d/.test(char)) frequency = 1100; // Numbers - highest
      else if (/[.,;:!?]/.test(char)) frequency = 550; // Punctuation - lowest
      else frequency = 770; // Other characters
    }

    // Adjust for correctness
    if (!isCorrect) {
      frequency = 300; // Much lower for errors
    }

    createSound(frequency, 0.05, isCorrect ? 'sine' : 'square');
  }, [enableKeyboardSounds, soundEnabled, initAudio, createSound]);

  // Play completion sound
  const playCompletionSound = useCallback(() => {
    if (!enableNotificationSounds || !soundEnabled) return;

    initAudio();

    // Play a pleasant chord progression
    const chord = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
    
    chord.forEach((freq, index) => {
      setTimeout(() => {
        createSound(freq, 0.6, 'sine');
      }, index * 150);
    });
  }, [enableNotificationSounds, soundEnabled, initAudio, createSound]);

  // Play error sound
  const playErrorSound = useCallback(() => {
    if (!enableNotificationSounds || !soundEnabled) return;

    initAudio();
    createSound(200, 0.3, 'sawtooth');
  }, [enableNotificationSounds, soundEnabled, initAudio, createSound]);

  // Play notification sound
  const playNotificationSound = useCallback((type = 'info') => {
    if (!enableNotificationSounds || !soundEnabled) return;

    initAudio();

    const frequencies = {
      info: [800, 1000],
      warning: [600, 400],
      success: [800, 1200, 1000],
      error: [400, 300]
    };

    const freqs = frequencies[type] || frequencies.info;
    
    freqs.forEach((freq, index) => {
      setTimeout(() => {
        createSound(freq, 0.2, 'sine');
      }, index * 100);
    });
  }, [enableNotificationSounds, soundEnabled, initAudio, createSound]);

  // Toggle sound
  const toggleSound = useCallback(() => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem('typingSoundEnabled', newState.toString());
    
    if (newState) {
      playNotificationSound('info');
    }
  }, [soundEnabled, playNotificationSound]);

  // Set volume
  const setVolume = useCallback((newVolume) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setSoundVolume(clampedVolume);
    localStorage.setItem('typingSoundVolume', clampedVolume.toString());
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (soundEnabled) {
      initAudio();
    }
  }, [soundEnabled, initAudio]);

  return {
    soundEnabled,
    soundVolume,
    toggleSound,
    setVolume,
    playKeySound,
    playCompletionSound,
    playErrorSound,
    playNotificationSound,
    
    // Advanced options
    enableKeyboardSounds,
    enableNotificationSounds,
    enableAmbientSounds
  };
};