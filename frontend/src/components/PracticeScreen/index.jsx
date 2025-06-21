// components/PracticeScreen/index.jsx - Optimized version with performance improvements
import React, { memo, useMemo, useCallback, lazy, Suspense } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
import { useTypingEngine } from '../../hooks/useTypingEngine';
import { useSessionStats } from '../../hooks/useSessionStats';
import { useKeyboardHandler } from '../../hooks/useKeyboardHandler';
import { useSoundEffects } from '../../hooks/useSoundEffects';
import { usePerformanceMonitor } from '../../utils/performanceMonitor';
import { TextRenderer } from './components/TextRenderer';
import { StatsPanel } from './components/StatsPanel';
import { ProgressBar } from './components/ProgressBar';
import { InputArea } from './components/InputArea';
import { NavigationHeader } from './components/NavigationHeader';

// Lazy load heavy components
const CompletionModal = lazy(() => import('./components/CompletionModal'));
const DebugPanel = lazy(() => import('./components/DebugPanel'));

// Memoized sub-components for better performance
const MemoizedStatsPanel = memo(StatsPanel);
const MemoizedProgressBar = memo(ProgressBar);
const MemoizedTextRenderer = memo(TextRenderer);
const MemoizedInputArea = memo(InputArea);

// Error fallback component
const ErrorFallback = ({ error, resetErrorBoundary }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
    <div className="text-red-500 text-xl mb-4">⚠️ Something went wrong</div>
    <p className="text-gray-600 dark:text-gray-400 mb-4">
      {error.message || 'An unexpected error occurred'}
    </p>
    <button
      onClick={resetErrorBoundary}
      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
    >
      Try Again
    </button>
  </div>
);

// Loading component for Suspense
const LoadingSpinner = ({ message = "Loading..." }) => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mr-3"></div>
    <span>{message}</span>
  </div>
);

const PracticeScreen = ({ darkMode, setActiveTab, customText }) => {
  // Performance monitoring
  const { startMonitoring, stopMonitoring, recordKeystroke } = usePerformanceMonitor();

  // Initialize typing engine with optimized options
  const typingEngine = useTypingEngine(customText, {
    enableBackspace: true,
    highlightErrors: true,
    trackDetailedStats: true
  });

  // Session statistics with performance tracking
  const sessionStats = useSessionStats({
    trackDetailedMetrics: true,
    enablePredictions: true
  });

  // Sound effects with optimized settings
  const soundEffects = useSoundEffects({
    volume: 0.3,
    enableKeyboardSounds: true,
    enableNotificationSounds: true
  });

  // Optimized keyboard handling
  const keyboardHandlers = useMemo(() => ({
    onInput: (e) => {
      const result = typingEngine.processInput(e.target.value, {
        timestamp: performance.now(),
        inputMethod: 'keyboard'
      });
      
      // Record performance metrics
      recordKeystroke(e.key, result?.isCorrect ?? true);
      
      // Play sound feedback
      soundEffects.playKeySound(result?.isCorrect, e.key);
      
      // Update session stats
      sessionStats.updateMetrics({
        inputLength: e.target.value.length,
        errorCount: typingEngine.errorCount,
        burstSpeed: result?.burstSpeed || 0
      }, customText.length);
      
      return result;
    },
    onPause: () => sessionStats.togglePause(),
    onReset: () => {
      typingEngine.reset();
      sessionStats.reset();
      stopMonitoring();
    },
    onEscape: () => sessionStats.togglePause()
  }), [typingEngine, sessionStats, soundEffects, recordKeystroke, customText.length, stopMonitoring]);

  useKeyboardHandler(keyboardHandlers, {
    preventDefault: true,
    enableShortcuts: true,
    disabled: typingEngine.isComplete || sessionStats.isPaused
  });

  // Start monitoring when component mounts
  React.useEffect(() => {
    startMonitoring();
    sessionStats.startSession();
    
    return () => {
      stopMonitoring();
    };
  }, [startMonitoring, stopMonitoring, sessionStats]);

  // Memoized completion handler
  const handleCompletion = useCallback(async () => {
    const finalStats = sessionStats.getSessionSummary();
    const analytics = typingEngine.getDetailedAnalytics();
    
    try {
      // Save to backend
      await saveStats({
        ...finalStats,
        detailedAnalytics: analytics,
        timestamp: new Date().toISOString()
      });
      
      soundEffects.playCompletionSound();
    } catch (error) {
      console.error('Failed to save session:', error);
      soundEffects.playErrorSound();
    }
  }, [sessionStats, typingEngine, soundEffects]);

  // Handle completion
  React.useEffect(() => {
    if (typingEngine.isComplete && !sessionStats.isComplete) {
      sessionStats.endSession();
      handleCompletion();
    }
  }, [typingEngine.isComplete, sessionStats.isComplete, handleCompletion]);

  // Memoized computed values
  const computedValues = useMemo(() => {
    const metrics = typingEngine.getSpeedMetrics();
    const progress = (typingEngine.currentIndex / customText.length) * 100;
    
    return {
      wpm: metrics.wpm,
      accuracy: typingEngine.accuracy,
      progress,
      timeElapsed: sessionStats.timeElapsed,
      formattedTime: sessionStats.formattedTime,
      isActive: sessionStats.isActive,
      isPaused: sessionStats.isPaused
    };
  }, [
    typingEngine.currentIndex,
    typingEngine.accuracy,
    customText.length,
    sessionStats.timeElapsed,
    sessionStats.formattedTime,
    sessionStats.isActive,
    sessionStats.isPaused
  ]);

  // Memoized style getter
  const getCharacterStyle = useCallback((index) => {
    return typingEngine.getCharacterStyle(index);
  }, [typingEngine.userInput, typingEngine.errors]);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('PracticeScreen Error:', error, errorInfo);
      }}
    >
      <div className="max-w-5xl mx-auto space-y-6 px-4">
        {/* Navigation Header */}
        <NavigationHeader
          darkMode={darkMode}
          onBack={() => setActiveTab('home')}
          onPause={keyboardHandlers.onPause}
          onReset={keyboardHandlers.onReset}
          isActive={computedValues.isActive}
          isPaused={computedValues.isPaused}
          isComplete={typingEngine.isComplete}
        />

        {/* Statistics Panel */}
        <MemoizedStatsPanel
          darkMode={darkMode}
          wpm={computedValues.wpm}
          accuracy={computedValues.accuracy}
          timeElapsed={computedValues.timeElapsed}
          formattedTime={computedValues.formattedTime}
          errorCount={typingEngine.errorCount}
          burstSpeed={sessionStats.burstSpeed}
          consistency={sessionStats.consistency}
        />

        {/* Progress Bar */}
        <MemoizedProgressBar
          darkMode={darkMode}
          progress={computedValues.progress}
          currentIndex={typingEngine.currentIndex}
          totalLength={customText.length}
        />

        {/* Text Renderer with Virtual Scrolling */}
        <MemoizedTextRenderer
          darkMode={darkMode}
          text={customText}
          currentIndex={typingEngine.currentIndex}
          getCharacterStyle={getCharacterStyle}
          userInput={typingEngine.userInput}
        />

        {/* Input Area */}
        <MemoizedInputArea
          darkMode={darkMode}
          value={typingEngine.userInput}
          onChange={keyboardHandlers.onInput}
          disabled={typingEngine.isComplete || computedValues.isPaused}
          placeholder={getInputPlaceholder(computedValues)}
        />

        {/* Completion Modal - Lazy Loaded */}
        {typingEngine.isComplete && (
          <Suspense fallback={<LoadingSpinner message="Loading results..." />}>
            <CompletionModal
              darkMode={darkMode}
              stats={sessionStats.getSessionSummary()}
              analytics={typingEngine.getDetailedAnalytics()}
              onRestart={keyboardHandlers.onReset}
              onViewStats={() => setActiveTab('stats')}
            />
          </Suspense>
        )}

        {/* Debug Panel - Development Only */}
        {process.env.NODE_ENV === 'development' && (
          <Suspense fallback={null}>
            <DebugPanel
              darkMode={darkMode}
              typingState={typingEngine}
              sessionState={sessionStats}
              performanceData={exportPerformanceData()}
            />
          </Suspense>
        )}

        {/* Keyboard Shortcuts Help */}
        <KeyboardShortcutsHelp darkMode={darkMode} />
      </div>
    </ErrorBoundary>
  );
};

// Helper function for input placeholder
const getInputPlaceholder = (values) => {
  if (values.isComplete) return "Session completed! Great job!";
  if (values.isPaused) return "Session paused - Press ESC to resume";
  if (values.isActive) return "Keep typing...";
  return "Start typing to begin";
};

// Keyboard shortcuts help component
const KeyboardShortcutsHelp = memo(({ darkMode }) => (
  <div className={`text-center text-sm space-x-4 ${
    darkMode ? 'text-gray-400' : 'text-gray-500'
  }`}>
    <span>
      Press <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">ESC</kbd> to pause
    </span>
    <span>
      <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs">⌘R</kbd> to restart
    </span>
  </div>
));

export default memo(PracticeScreen);