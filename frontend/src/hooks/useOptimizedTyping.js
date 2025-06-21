// hooks/useOptimizedTyping.js - High-performance typing engine with advanced features
import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { debounce, throttle } from 'lodash';

export const useOptimizedTyping = (text, options = {}) => {
  const {
    enableBackspace = true,
    highlightErrors = true,
    trackPerformance = true,
    maxHistorySize = 1000
  } = options;

  // Core state with optimized updates
  const [userInput, setUserInput] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState(new Set());
  const [isComplete, setIsComplete] = useState(false);

  // Performance tracking
  const performanceRef = useRef({
    keystrokes: [],
    startTime: null,
    lastKeystroke: null
  });

  // Memoized text analysis
  const textAnalysis = useMemo(() => {
    if (!text) return { wordBoundaries: [], difficulty: 'easy', estimatedTime: 0 };

    const words = text.split(/\s+/);
    const wordBoundaries = [];
    let currentPos = 0;

    words.forEach((word, index) => {
      const start = currentPos;
      const end = currentPos + word.length - 1;
      wordBoundaries.push({ word, start, end, index });
      currentPos = end + 2; // +1 for word length, +1 for space
    });

    // Calculate difficulty based on various factors
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const specialChars = (text.match(/[^a-zA-Z0-9\s]/g) || []).length / text.length;
    const numbers = (text.match(/\d/g) || []).length / text.length;
    
    let difficultyScore = 0;
    if (avgWordLength > 6) difficultyScore += 2;
    if (specialChars > 0.1) difficultyScore += 2;
    if (numbers > 0.1) difficultyScore += 1;

    const difficulty = difficultyScore >= 4 ? 'hard' : difficultyScore >= 2 ? 'medium' : 'easy';
    const estimatedTime = Math.ceil(text.length / (40 * 5 / 60)); // Based on 40 WPM average

    return { wordBoundaries, difficulty, estimatedTime, avgWordLength, specialChars, numbers };
  }, [text]);

  // Optimized input processing with debouncing for expensive operations
  const processInput = useCallback((value, metadata = {}) => {
    const { timestamp = performance.now() } = metadata;
    
    // Track performance
    if (trackPerformance) {
      const perf = performanceRef.current;
      if (!perf.startTime && value.length === 1) {
        perf.startTime = timestamp;
      }
      
      if (perf.lastKeystroke) {
        const keystrokeData = {
          char: value[value.length - 1],
          timestamp,
          interval: timestamp - perf.lastKeystroke,
          index: value.length - 1,
          correct: value.length <= text.length && value[value.length - 1] === text[value.length - 1]
        };
        
        perf.keystrokes.push(keystrokeData);
        
        // Limit history size for memory efficiency
        if (perf.keystrokes.length > maxHistorySize) {
          perf.keystrokes = perf.keystrokes.slice(-maxHistorySize / 2);
        }
      }
      perf.lastKeystroke = timestamp;
    }

    // Prevent input beyond text length unless backspace is enabled
    if (!enableBackspace && value.length > text.length) {
      return false;
    }

    // Handle backspace
    if (value.length < userInput.length) {
      if (!enableBackspace) return false;
      
      setErrors(prev => {
        const newErrors = new Set(prev);
        newErrors.delete(value.length);
        return newErrors;
      });
    }

    // Process new characters
    if (value.length > userInput.length) {
      const newCharIndex = userInput.length;
      const typedChar = value[newCharIndex];
      const expectedChar = text[newCharIndex];
      const correct = typedChar === expectedChar;
      
      if (!correct && highlightErrors) {
        setErrors(prev => new Set([...prev, newCharIndex]));
      }
    }

    setUserInput(value);
    setCurrentIndex(value.length);

    // Check completion
    const complete = value.length === text.length;
    if (complete && !isComplete) {
      setIsComplete(true);
    }

    return {
      isComplete: complete,
      accuracy: calculateAccuracy(value),
      wpm: calculateWPM(value, timestamp),
      errors: errors.size
    };
  }, [text, userInput, errors, isComplete, enableBackspace, highlightErrors, trackPerformance, maxHistorySize]);

  // Optimized accuracy calculation
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

  // Optimized WPM calculation with caching
  const calculateWPM = useCallback((input = userInput, currentTime = performance.now()) => {
    const perf = performanceRef.current;
    if (!perf.startTime || input.length === 0) return 0;
    
    const timeElapsed = (currentTime - perf.startTime) / 1000 / 60; // in minutes
    const wordsTyped = input.length / 5; // Standard: 5 characters = 1 word
    
    return timeElapsed > 0 ? Math.round(wordsTyped / timeElapsed) : 0;
  }, [userInput]);

  // Character styling with memoization
  const getCharacterStyle = useCallback((index) => {
    if (index < userInput.length) {
      return errors.has(index) ? 'error' : 'correct';
    }
    return index === currentIndex ? 'current' : 'pending';
  }, [userInput.length, errors, currentIndex]);

  // Advanced analytics
  const getAnalytics = useCallback(() => {
    const perf = performanceRef.current;
    const accuracy = calculateAccuracy();
    const wpm = calculateWPM();
    
    // Calculate consistency (lower variance = higher consistency)
    const intervals = perf.keystrokes.map(k => k.interval).filter(i => i > 0);
    const avgInterval = intervals.reduce((sum, i) => sum + i, 0) / intervals.length || 0;
    const variance = intervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / intervals.length || 0;
    const consistency = avgInterval > 0 ? Math.max(0, 100 - (Math.sqrt(variance) / avgInterval) * 100) : 100;

    // Error analysis
    const errorsByChar = {};
    errors.forEach(index => {
      const char = text[index];
      errorsByChar[char] = (errorsByChar[char] || 0) + 1;
    });

    // Speed over time
    const speedHistory = [];
    for (let i = 10; i < perf.keystrokes.length; i += 10) {
      const chunk = perf.keystrokes.slice(i - 10, i);
      const chunkTime = (chunk[chunk.length - 1].timestamp - chunk[0].timestamp) / 1000 / 60;
      const chunkWpm = chunkTime > 0 ? Math.round((chunk.length / 5) / chunkTime) : 0;
      speedHistory.push(chunkWpm);
    }

    return {
      wpm,
      accuracy,
      consistency: Math.round(consistency),
      errorCount: errors.size,
      totalKeystrokes: perf.keystrokes.length,
      errorsByChar,
      speedHistory,
      averageKeystrokeTime: avgInterval,
      textAnalysis,
      progress: (currentIndex / text.length) * 100
    };
  }, [calculateAccuracy, calculateWPM, errors, currentIndex, text, textAnalysis]);

  // Reset function
  const reset = useCallback(() => {
    setUserInput('');
    setCurrentIndex(0);
    setErrors(new Set());
    setIsComplete(false);
    performanceRef.current = {
      keystrokes: [],
      startTime: null,
      lastKeystroke: null
    };
  }, []);

  return {
    // State
    userInput,
    currentIndex,
    errors: Array.from(errors),
    isComplete,
    
    // Methods
    processInput,
    reset,
    getCharacterStyle,
    calculateAccuracy,
    calculateWPM,
    getAnalytics,
    
    // Computed values
    progress: (currentIndex / text.length) * 100,
    textAnalysis,
    
    // Performance data
    performanceData: performanceRef.current
  };
};

// hooks/useVirtualizedText.js - Virtual scrolling for large texts
export const useVirtualizedText = (text, options = {}) => {
  const {
    windowSize = 200, // Characters visible at once
    currentIndex = 0,
    buffer = 50 // Extra characters for smooth scrolling
  } = options;

  const virtualizedData = useMemo(() => {
    if (!text || text.length <= windowSize) {
      return {
        visibleText: text,
        startIndex: 0,
        endIndex: text.length - 1,
        isVirtualized: false
      };
    }

    // Calculate visible window
    const halfWindow = Math.floor(windowSize / 2);
    const startIndex = Math.max(0, currentIndex - halfWindow - buffer);
    const endIndex = Math.min(text.length - 1, currentIndex + halfWindow + buffer);
    
    const visibleText = text.slice(startIndex, endIndex + 1);
    
    return {
      visibleText,
      startIndex,
      endIndex,
      isVirtualized: true,
      totalLength: text.length
    };
  }, [text, currentIndex, windowSize, buffer]);

  return virtualizedData;
};

// hooks/useOptimizedStats.js - High-performance statistics tracking
export const useOptimizedStats = (options = {}) => {
  const {
    updateInterval = 1000, // Update every second
    enablePredictions = true,
    trackTrends = true
  } = options;

  const [sessionData, setSessionData] = useState({
    startTime: null,
    endTime: null,
    isActive: false,
    isPaused: false
  });

  const [metrics, setMetrics] = useState({
    wpm: 0,
    accuracy: 100,
    consistency: 100,
    timeElapsed: 0,
    predictedFinalWpm: 0,
    trend: 'stable'
  });

  const [history, setHistory] = useState([]);
  const intervalRef = useRef(null);
  const trendsRef = useRef({ wpmHistory: [], accuracyHistory: [] });

  // Throttled metrics update for performance
  const updateMetrics = useCallback(throttle((typingData, textLength) => {
    if (!sessionData.isActive || sessionData.isPaused) return;

    const now = performance.now();
    const timeElapsed = sessionData.startTime ? (now - sessionData.startTime) / 1000 : 0;
    const timeElapsedMinutes = timeElapsed / 60;

    const {
      inputLength = 0,
      errorCount = 0,
      accuracy = 100,
      consistency = 100
    } = typingData;

    let wpm = 0;
    let predictedFinalWpm = 0;

    if (timeElapsedMinutes > 0 && inputLength > 0) {
      const wordsTyped = inputLength / 5;
      wpm = Math.round(wordsTyped / timeElapsedMinutes);

      // Predict final WPM based on current performance
      if (enablePredictions && inputLength > 10) {
        const progressRatio = inputLength / textLength;
        const currentEfficiency = accuracy / 100;
        predictedFinalWpm = Math.round(wpm * currentEfficiency * (1 + (1 - progressRatio) * 0.1));
      }
    }

    // Calculate trend
    let trend = 'stable';
    if (trackTrends) {
      const trends = trendsRef.current;
      trends.wpmHistory.push(wpm);
      trends.accuracyHistory.push(accuracy);

      // Keep only last 10 data points for trend calculation
      if (trends.wpmHistory.length > 10) {
        trends.wpmHistory = trends.wmpHistory.slice(-10);
        trends.accuracyHistory = trends.accuracyHistory.slice(-10);
      }

      // Calculate trend based on recent data
      if (trends.wpmHistory.length >= 3) {
        const recent = trends.wmpHistory.slice(-3);
        const average = recent.reduce((sum, val) => sum + val, 0) / recent.length;
        const lastValue = recent[recent.length - 1];
        
        if (lastValue > average * 1.05) trend = 'improving';
        else if (lastValue < average * 0.95) trend = 'declining';
      }
    }

    const newMetrics = {
      wpm,
      accuracy,
      consistency,
      timeElapsed: Math.round(timeElapsed),
      predictedFinalWpm,
      trend
    };

    setMetrics(newMetrics);

    // Add to history for detailed analytics
    if (Math.round(timeElapsed) % 5 === 0) { // Every 5 seconds
      setHistory(prev => [...prev.slice(-20), { // Keep last 20 entries
        ...newMetrics,
        timestamp: now,
        progress: (inputLength / textLength) * 100
      }]);
    }
  }, updateInterval), [sessionData, enablePredictions, trackTrends, updateInterval]);

  // Session control methods
  const startSession = useCallback(() => {
    const now = performance.now();
    setSessionData({
      startTime: now,
      endTime: null,
      isActive: true,
      isPaused: false
    });
    setMetrics(prev => ({ ...prev, timeElapsed: 0 }));
    setHistory([]);
    trendsRef.current = { wpmHistory: [], accuracyHistory: [] };
  }, []);

  const endSession = useCallback(() => {
    setSessionData(prev => ({
      ...prev,
      endTime: performance.now(),
      isActive: false,
      isPaused: false
    }));
  }, []);

  const togglePause = useCallback(() => {
    setSessionData(prev => ({
      ...prev,
      isPaused: !prev.isPaused
    }));
  }, []);

  const reset = useCallback(() => {
    setSessionData({
      startTime: null,
      endTime: null,
      isActive: false,
      isPaused: false
    });
    setMetrics({
      wpm: 0,
      accuracy: 100,
      consistency: 100,
      timeElapsed: 0,
      predictedFinalWpm: 0,
      trend: 'stable'
    });
    setHistory([]);
    trendsRef.current = { wmpHistory: [], accuracyHistory: [] };
  }, []);

  // Get comprehensive session summary
  const getSessionSummary = useCallback(() => {
    if (!sessionData.startTime) return null;

    const endTime = sessionData.endTime || performance.now();
    const totalDuration = (endTime - sessionData.startTime) / 1000;

    // Calculate performance trends
    const performanceTrends = {
      wpmTrend: 0,
      accuracyTrend: 0,
      consistencyTrend: 0
    };

    if (history.length >= 2) {
      const firstHalf = history.slice(0, Math.floor(history.length / 2));
      const secondHalf = history.slice(Math.floor(history.length / 2));

      const avgFirst = {
        wpm: firstHalf.reduce((sum, h) => sum + h.wpm, 0) / firstHalf.length,
        accuracy: firstHalf.reduce((sum, h) => sum + h.accuracy, 0) / firstHalf.length
      };

      const avgSecond = {
        wpm: secondHalf.reduce((sum, h) => sum + h.wpm, 0) / secondHalf.length,
        accuracy: secondHalf.reduce((sum, h) => sum + h.accuracy, 0) / secondHalf.length
      };

      performanceTrends.wmpTrend = avgSecond.wpm - avgFirst.wpm;
      performanceTrends.accuracyTrend = avgSecond.accuracy - avgFirst.accuracy;
    }

    return {
      ...metrics,
      totalDuration: Math.round(totalDuration),
      performanceTrends,
      history,
      peakWpm: Math.max(...history.map(h => h.wpm), metrics.wmp),
      averageWpm: history.length > 0 ? 
        Math.round(history.reduce((sum, h) => sum + h.wpm, 0) / history.length) : 
        metrics.wpm
    };
  }, [sessionData, metrics, history]);

  // Format time helper
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
    isActive: sessionData.isActive,
    isPaused: sessionData.isPaused,
    startTime: sessionData.startTime,
    endTime: sessionData.endTime,

    // Metrics
    ...metrics,
    formattedTime: formatTime(metrics.timeElapsed),

    // Methods
    updateMetrics,
    getSessionSummary,
    
    // Data
    history,
    hasHistory: history.length > 0
  };
};

// hooks/useSmartPrefetch.js - Intelligent prefetching for better UX
export const useSmartPrefetch = () => {
  const prefetchedComponents = useRef(new Map());
  const prefetchQueue = useRef([]);

  const prefetchComponent = useCallback(async (componentLoader, priority = 'low') => {
    const key = componentLoader.toString();
    
    if (prefetchedComponents.current.has(key)) {
      return prefetchedComponents.current.get(key);
    }

    const prefetchPromise = componentLoader().then(module => {
      prefetchedComponents.current.set(key, module);
      return module;
    });

    if (priority === 'high') {
      return prefetchPromise;
    } else {
      prefetchQueue.current.push(prefetchPromise);
      
      // Process queue during idle time
      if ('requestIdleCallback' in window) {
        requestIdleCallback(() => {
          const promise = prefetchQueue.current.shift();
          if (promise) promise.catch(console.warn);
        });
      }
    }

    return prefetchPromise;
  }, []);

  // Prefetch based on user behavior
  const prefetchOnHover = useCallback((componentLoader) => {
    return {
      onMouseEnter: () => prefetchComponent(componentLoader, 'high'),
      onFocus: () => prefetchComponent(componentLoader, 'high')
    };
  }, [prefetchComponent]);

  return {
    prefetchComponent,
    prefetchOnHover,
    getPrefetchedComponent: (key) => prefetchedComponents.current.get(key)
  };
};

// hooks/useOptimizedAnimations.js - Performance-optimized animations
export const useOptimizedAnimations = (options = {}) => {
  const {
    reduceMotion = false,
    enableGPUAcceleration = true,
    maxConcurrentAnimations = 3
  } = options;

  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const activeAnimations = useRef(new Set());

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches || reduceMotion);
    
    const handleChange = (e) => setPrefersReducedMotion(e.matches || reduceMotion);
    mediaQuery.addEventListener('change', handleChange);
    
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [reduceMotion]);

  const createOptimizedAnimation = useCallback((element, keyframes, options = {}) => {
    if (prefersReducedMotion) {
      // Skip animation but apply final state
      const finalKeyframe = keyframes[keyframes.length - 1];
      Object.assign(element.style, finalKeyframe);
      return Promise.resolve();
    }

    // Limit concurrent animations
    if (activeAnimations.current.size >= maxConcurrentAnimations) {
      const oldestAnimation = activeAnimations.current.values().next().value;
      oldestAnimation?.cancel();
    }

    const animationOptions = {
      duration: 300,
      easing: 'ease-out',
      fill: 'forwards',
      ...options
    };

    // Add GPU acceleration if enabled
    if (enableGPUAcceleration && !keyframes.some(kf => 'transform' in kf)) {
      keyframes = keyframes.map(kf => ({ ...kf, transform: kf.transform || 'translateZ(0)' }));
    }

    const animation = element.animate(keyframes, animationOptions);
    activeAnimations.current.add(animation);

    animation.addEventListener('finish', () => {
      activeAnimations.current.delete(animation);
    });

    animation.addEventListener('cancel', () => {
      activeAnimations.current.delete(animation);
    });

    return animation.finished;
  }, [prefersReducedMotion, enableGPUAcceleration, maxConcurrentAnimations]);

  const fadeIn = useCallback((element, duration = 300) => {
    return createOptimizedAnimation(element, [
      { opacity: 0, transform: 'translateY(10px)' },
      { opacity: 1, transform: 'translateY(0)' }
    ], { duration });
  }, [createOptimizedAnimation]);

  const slideIn = useCallback((element, direction = 'left', duration = 300) => {
    const transforms = {
      left: ['translateX(-100%)', 'translateX(0)'],
      right: ['translateX(100%)', 'translateX(0)'],
      up: ['translateY(-100%)', 'translateY(0)'],
      down: ['translateY(100%)', 'translateY(0)']
    };

    return createOptimizedAnimation(element, [
      { transform: transforms[direction][0], opacity: 0 },
      { transform: transforms[direction][1], opacity: 1 }
    ], { duration });
  }, [createOptimizedAnimation]);

  const pulse = useCallback((element, intensity = 1.05, duration = 600) => {
    return createOptimizedAnimation(element, [
      { transform: 'scale(1)' },
      { transform: `scale(${intensity})` },
      { transform: 'scale(1)' }
    ], { duration, iterations: 1 });
  }, [createOptimizedAnimation]);

  return {
    prefersReducedMotion,
    createOptimizedAnimation,
    fadeIn,
    slideIn,
    pulse,
    cancelAllAnimations: () => {
      activeAnimations.current.forEach(animation => animation.cancel());
      activeAnimations.current.clear();
    }
  };
};

export default {
  useOptimizedTyping,
  useVirtualizedText,
  useOptimizedStats,
  useSmartPrefetch,
  useOptimizedAnimations
};