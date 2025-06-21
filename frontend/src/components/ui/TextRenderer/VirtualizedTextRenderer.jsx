// components/ui/TextRenderer/VirtualizedTextRenderer.jsx - High-performance text rendering
import React, { memo, useMemo, useRef, useEffect, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { useVirtualizedText } from '../../../hooks/useOptimizedTyping';
import { useIntersectionObserver } from '../../../hooks/useIntersectionObserver';

const VirtualizedTextRenderer = memo(({
  text,
  currentIndex,
  getCharacterStyle,
  userInput,
  darkMode,
  fontSize = 'medium',
  enableVirtualization = true
}) => {
  const containerRef = useRef(null);
  const { isVisible } = useIntersectionObserver(containerRef, { threshold: 0.1 });

  // Virtualization settings based on text length
  const virtualizationConfig = useMemo(() => {
    const shouldVirtualize = enableVirtualization && text.length > 500;
    
    return {
      enabled: shouldVirtualize,
      chunkSize: shouldVirtualize ? 50 : text.length,
      overscan: 5,
      itemHeight: fontSize === 'large' ? 36 : fontSize === 'small' ? 24 : 30
    };
  }, [enableVirtualization, text.length, fontSize]);

  // Split text into chunks for virtualization
  const textChunks = useMemo(() => {
    if (!virtualizationConfig.enabled) {
      return [{ text, startIndex: 0, endIndex: text.length - 1 }];
    }

    const chunks = [];
    for (let i = 0; i < text.length; i += virtualizationConfig.chunkSize) {
      const chunkText = text.slice(i, i + virtualizationConfig.chunkSize);
      chunks.push({
        text: chunkText,
        startIndex: i,
        endIndex: Math.min(i + virtualizationConfig.chunkSize - 1, text.length - 1)
      });
    }
    return chunks;
  }, [text, virtualizationConfig.enabled, virtualizationConfig.chunkSize]);

  // Find which chunk contains the current cursor
  const activeChunkIndex = useMemo(() => {
    return textChunks.findIndex(chunk => 
      currentIndex >= chunk.startIndex && currentIndex <= chunk.endIndex
    );
  }, [textChunks, currentIndex]);

  // Character component with memoization
  const Character = memo(({ char, index, style, isSpace = false }) => {
    const characterClass = useMemo(() => {
      const baseClasses = 'inline-block transition-all duration-150 px-0.5 py-0.5 rounded';
      const styleClasses = {
        'error': 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-b-2 border-red-500',
        'correct': 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
        'current': 'bg-blue-100 dark:bg-blue-900/50 border-l-2 border-blue-500 animate-pulse',
        'pending': 'text-gray-700 dark:text-gray-300'
      };
      
      return `${baseClasses} ${styleClasses[style] || styleClasses.pending} ${
        isSpace ? 'w-2' : ''
      }`;
    }, [style, isSpace]);

    return (
      <span className={characterClass} data-index={index}>
        {isSpace ? '\u00A0' : char}
      </span>
    );
  });

  // Text chunk component
  const TextChunk = memo(({ chunk, chunkIndex }) => {
    const chunkCharacters = useMemo(() => {
      return chunk.text.split('').map((char, relativeIndex) => {
        const absoluteIndex = chunk.startIndex + relativeIndex;
        const style = getCharacterStyle(absoluteIndex);
        const isSpace = char === ' ';
        
        return (
          <Character
            key={absoluteIndex}
            char={char}
            index={absoluteIndex}
            style={style}
            isSpace={isSpace}
          />
        );
      });
    }, [chunk, getCharacterStyle]);

    return (
      <div className="text-chunk" data-chunk-index={chunkIndex}>
        {chunkCharacters}
      </div>
    );
  });

  // Virtualized row renderer
  const VirtualRow = memo(({ index, style }) => {
    const chunk = textChunks[index];
    
    return (
      <div style={style}>
        <TextChunk chunk={chunk} chunkIndex={index} />
      </div>
    );
  });

  // Scroll to active chunk
  const listRef = useRef(null);
  useEffect(() => {
    if (virtualizationConfig.enabled && listRef.current && activeChunkIndex >= 0) {
      listRef.current.scrollToItem(activeChunkIndex, 'center');
    }
  }, [activeChunkIndex, virtualizationConfig.enabled]);

  // Non-virtualized renderer for smaller texts
  const renderNonVirtualized = useCallback(() => {
    return (
      <div className="text-xl leading-relaxed font-mono tracking-wide p-6 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="break-words whitespace-pre-wrap">
          {text.split('').map((char, index) => (
            <Character
              key={index}
              char={char}
              index={index}
              style={getCharacterStyle(index)}
              isSpace={char === ' '}
            />
          ))}
        </div>
      </div>
    );
  }, [text, getCharacterStyle]);

  // Virtualized renderer for large texts
  const renderVirtualized = useCallback(() => {
    return (
      <div className="text-xl leading-relaxed font-mono tracking-wide p-6 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <List
          ref={listRef}
          height={400}
          itemCount={textChunks.length}
          itemSize={virtualizationConfig.itemHeight}
          overscanCount={virtualizationConfig.overscan}
          className="text-chunks-container"
        >
          {VirtualRow}
        </List>
      </div>
    );
  }, [textChunks.length, virtualizationConfig.itemHeight, virtualizationConfig.overscan]);

  return (
    <div ref={containerRef} className="text-renderer-container">
      {/* Only render when visible for performance */}
      {isVisible && (
        virtualizationConfig.enabled ? renderVirtualized() : renderNonVirtualized()
      )}
    </div>
  );
});

// components/ui/EnhancedStatsPanel.jsx - Advanced statistics display
const EnhancedStatsPanel = memo(({
  darkMode,
  wpm,
  accuracy,
  timeElapsed,
  formattedTime,
  errorCount,
  burstSpeed,
  consistency,
  predictedFinalWpm,
  trend,
  showDetailedStats = false
}) => {
  // Memoized color calculations
  const wpmColor = useMemo(() => {
    if (wpm >= 60) return 'text-green-600 dark:text-green-400';
    if (wpm >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }, [wmp]);

  const accuracyColor = useMemo(() => {
    if (accuracy >= 95) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 85) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }, [accuracy]);

  const consistencyColor = useMemo(() => {
    if (consistency >= 90) return 'text-green-600 dark:text-green-400';
    if (consistency >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }, [consistency]);

  // Trend indicator
  const TrendIndicator = memo(({ trend }) => {
    const trendConfig = {
      'improving': { icon: '📈', color: 'text-green-600', label: 'Improving' },
      'declining': { icon: '📉', color: 'text-red-600', label: 'Needs Focus' },
      'stable': { icon: '➡️', color: 'text-blue-600', label: 'Stable' }
    };

    const config = trendConfig[trend] || trendConfig.stable;

    return (
      <div className={`flex items-center space-x-1 text-sm ${config.color}`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </div>
    );
  });

  // Enhanced stat card with animations
  const StatCard = memo(({ icon, label, value, color, subtitle, trend }) => (
    <div className={`rounded-2xl border p-6 transition-all duration-200 hover:scale-105 ${
      darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-gray-500">
          {icon}
        </div>
        {trend && <TrendIndicator trend={trend} />}
      </div>
      <div className={`text-2xl font-bold mb-1 ${color}`}>{value}</div>
      <div className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  ));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        icon={<Zap size={20} />}
        label="Speed"
        value={`${wpm} WPM`}
        color={wpmColor}
        subtitle={predictedFinalWpm ? `Est. ${predictedFinalWpm} WPM` : undefined}
        trend={trend}
      />
      <StatCard
        icon={<Target size={20} />}
        label="Accuracy"
        value={`${accuracy}%`}
        color={accuracyColor}
      />
      <StatCard
        icon={<Clock size={20} />}
        label="Time"
        value={formattedTime}
        subtitle={timeElapsed > 60 ? `${Math.floor(timeElapsed / 60)}m ${timeElapsed % 60}s` : undefined}
      />
      <StatCard
        icon={<AlertCircle size={20} />}
        label="Errors"
        value={errorCount}
        color={errorCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
      />
      
      {showDetailedStats && (
        <>
          <StatCard
            icon={<TrendingUp size={20} />}
            label="Burst Speed"
            value={`${burstSpeed || 0} WPM`}
            color="text-purple-600 dark:text-purple-400"
            subtitle="Last 10 keys"
          />
          <StatCard
            icon={<Activity size={20} />}
            label="Consistency"
            value={`${consistency || 100}%`}
            color={consistencyColor}
            subtitle="Rhythm stability"
          />
        </>
      )}
    </div>
  );
});

// components/ui/SmartProgressBar.jsx - Intelligent progress visualization
const SmartProgressBar = memo(({
  darkMode,
  progress,
  currentIndex,
  totalLength,
  showMilestones = true,
  showPredictions = true,
  predictedCompletion
}) => {
  // Calculate milestones
  const milestones = useMemo(() => {
    if (!showMilestones) return [];
    
    const milestonePercentages = [25, 50, 75, 90];
    return milestonePercentages.map(percentage => ({
      percentage,
      position: (percentage / 100) * totalLength,
      reached: progress >= percentage,
      label: `${percentage}%`
    }));
  }, [showMilestones, totalLength, progress]);

  // Progress segments for visual variety
  const progressSegments = useMemo(() => {
    const segmentCount = 4;
    const segmentSize = 100 / segmentCount;
    
    return Array.from({ length: segmentCount }, (_, index) => {
      const segmentStart = index * segmentSize;
      const segmentEnd = (index + 1) * segmentSize;
      const segmentProgress = Math.max(0, Math.min(segmentSize, progress - segmentStart));
      
      return {
        index,
        progress: segmentProgress,
        isActive: progress > segmentStart,
        isComplete: progress >= segmentEnd
      };
    });
  }, [progress]);

  return (
    <div className={`rounded-2xl border p-6 ${
      darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'
    }`}>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm font-medium">Progress</span>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500">
            {currentIndex} / {totalLength} characters
          </span>
          <span className="text-sm font-semibold text-purple-600">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
      
      {/* Main progress bar with segments */}
      <div className="relative w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 mb-4">
        {progressSegments.map((segment) => (
          <div
            key={segment.index}
            className="absolute h-4 rounded-full transition-all duration-500 ease-out"
            style={{
              left: `${segment.index * 25}%`,
              width: `${Math.min(25, segment.progress * 25 / 25)}%`,
              background: segment.isComplete 
                ? 'linear-gradient(90deg, #10B981, #059669)'
                : segment.isActive
                  ? `linear-gradient(90deg, #8B5CF6, #7C3AED ${segment.progress}%, transparent ${segment.progress}%)`
                  : 'transparent'
            }}
          />
        ))}
        
        {/* Milestones */}
        {milestones.map((milestone) => (
          <div
            key={milestone.percentage}
            className={`absolute top-0 w-1 h-4 transform -translate-x-0.5 transition-colors duration-300 ${
              milestone.reached 
                ? 'bg-yellow-400' 
                : 'bg-gray-400 dark:bg-gray-600'
            }`}
            style={{ left: `${milestone.percentage}%` }}
            title={`${milestone.percentage}% milestone`}
          />
        ))}
      </div>
      
      {/* Predictions */}
      {showPredictions && predictedCompletion && (
        <div className="text-xs text-gray-500 text-center">
          Estimated completion: {predictedCompletion}
        </div>
      )}
      
      {/* Milestone labels */}
      {showMilestones && (
        <div className="flex justify-between text-xs text-gray-400 mt-2">
          {milestones.map((milestone) => (
            <span
              key={milestone.percentage}
              className={milestone.reached ? 'text-yellow-600 font-semibold' : ''}
            >
              {milestone.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
});

// components/ui/AdaptiveInputArea.jsx - Smart input with accessibility
const AdaptiveInputArea = memo(({
  darkMode,
  value,
  onChange,
  disabled,
  placeholder,
  showVirtualKeyboard = false,
  enableSpellCheck = false,
  autoFocus = true
}) => {
  const inputRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [inputHistory, setInputHistory] = useState([]);

  // Auto-focus management
  useEffect(() => {
    if (autoFocus && inputRef.current && !disabled) {
      inputRef.current.focus();
    }
  }, [autoFocus, disabled]);

  // Handle input changes with history tracking
  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    
    // Track input history for undo functionality
    if (value !== newValue) {
      setInputHistory(prev => [...prev.slice(-10), value]);
    }
    
    onChange(e);
  }, [value, onChange]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    // Undo with Ctrl+Z
    if (e.ctrlKey && e.key === 'z' && inputHistory.length > 0) {
      e.preventDefault();
      const lastValue = inputHistory[inputHistory.length - 1];
      setInputHistory(prev => prev.slice(0, -1));
      // Create synthetic event
      const syntheticEvent = { target: { value: lastValue } };
      onChange(syntheticEvent);
    }
  }, [inputHistory, onChange]);

  return (
    <div className={`rounded-2xl border p-6 ${
      darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200 shadow-sm'
    }`}>
      <div className="mb-3 flex justify-between items-center">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {placeholder}
        </span>
        
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          {inputHistory.length > 0 && (
            <span>Ctrl+Z to undo</span>
          )}
          {isFocused && (
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-1 animate-pulse"></div>
              Active
            </span>
          )}
        </div>
      </div>
      
      <textarea
        ref={inputRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        placeholder={placeholder}
        className={`w-full h-32 p-4 rounded-xl resize-none font-mono text-lg border-0 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all duration-200 ${
          darkMode 
            ? 'bg-gray-800 text-gray-100 placeholder-gray-500' 
            : 'bg-gray-50 text-gray-900 placeholder-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        spellCheck={enableSpellCheck}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        aria-label="Type the text shown above"
        aria-describedby="typing-instructions"
      />
      
      <div id="typing-instructions" className="sr-only">
        Type the text exactly as shown above. Press Escape to pause, Ctrl+R to restart.
      </div>
    </div>
  );
});

export {
  VirtualizedTextRenderer,
  EnhancedStatsPanel,
  SmartProgressBar,
  AdaptiveInputArea
};