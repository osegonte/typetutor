// Enhanced Timer Debug Helper for TypeTutor PracticeScreen
// Add this to: frontend/src/utils/timerDebugHelper.js

import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debug utility specifically designed for TypeTutor timer issues
 */
class TypeTutorTimerDebugger {
  constructor() {
    this.logs = [];
    this.enabled = process.env.NODE_ENV === 'development';
    this.sessionData = null;
  }

  log(message, data = null) {
    if (!this.enabled) return;
    
    const timestamp = new Date().toISOString();
    const perfTime = performance.now();
    const logEntry = {
      timestamp,
      perfTime,
      message,
      data: data ? JSON.parse(JSON.stringify(data)) : null
    };
    
    this.logs.push(logEntry);
    console.log(`[TimerDebug] ${timestamp}: ${message}`, data || '');
  }

  startSession() {
    this.sessionData = {
      startTime: Date.now(),
      startTimestamp: new Date().toISOString(),
      events: []
    };
    this.log('Session started', { startTime: this.sessionData.startTime });
  }

  validateTimerStates(states) {
    if (!this.enabled) return;

    const { startTime, isActive, timeElapsed, currentEndTime } = states;
    
    this.log('Timer state validation', {
      startTime,
      isActive,
      timeElapsed,
      currentEndTime,
      startTimeType: typeof startTime,
      isStartTimeValid: startTime && !isNaN(startTime),
      calculatedDuration: currentEndTime && startTime ? (currentEndTime - startTime) / 1000 : 'Cannot calculate'
    });

    // Critical issue checks
    if (!startTime && isActive) {
      console.error('🚨 CRITICAL: Session is active but startTime is null!');
      return false;
    }
    
    if (startTime && isNaN(startTime)) {
      console.error('🚨 CRITICAL: startTime is NaN!');
      return false;
    }
    
    if (currentEndTime && startTime && currentEndTime < startTime) {
      console.error('🚨 CRITICAL: endTime is before startTime!');
      return false;
    }

    return true;
  }

  validateSessionCompletion(sessionData) {
    if (!this.enabled) return true;

    this.log('Validating session completion data', sessionData);

    const issues = [];
    
    // Check duration
    if (sessionData.duration === 0) {
      issues.push('🚨 CRITICAL: Duration is 0 - timer calculation failed');
    }
    
    if (sessionData.duration < 0) {
      issues.push('🚨 CRITICAL: Duration is negative');
    }
    
    if (isNaN(sessionData.duration)) {
      issues.push('🚨 CRITICAL: Duration is NaN');
    }

    // Check timeElapsed consistency
    if (sessionData.timeElapsed !== Math.round(sessionData.duration)) {
      issues.push(`⚠️ WARNING: timeElapsed (${sessionData.timeElapsed}) != rounded duration (${Math.round(sessionData.duration)})`);
    }
    
    // Check WPM
    if (sessionData.wpm === 0) {
      issues.push('⚠️ WARNING: WPM is 0');
    }
    
    // Check accuracy
    if (sessionData.accuracy === 0) {
      issues.push('⚠️ WARNING: Accuracy is 0');
    }

    if (issues.length > 0) {
      console.error('🚨 SESSION COMPLETION ISSUES:');
      issues.forEach(issue => console.error(`   ${issue}`));
      
      this.log('Session completion issues', { issues, sessionData });
      return false;
    }
    
    console.log('✅ Session completion data looks good:', sessionData);
    return true;
  }

  calculateDurationSafely(startTime, endTime) {
    if (!this.enabled) return (endTime - startTime) / 1000;

    this.log('Safe duration calculation', {
      startTime,
      endTime,
      startTimeType: typeof startTime,
      endTimeType: typeof endTime,
      difference: endTime - startTime,
      durationSeconds: (endTime - startTime) / 1000
    });

    // Validate inputs
    if (!startTime) {
      console.error('🚨 Cannot calculate duration: startTime is null/undefined');
      return 1; // Return minimum 1 second
    }
    
    if (!endTime) {
      console.error('🚨 Cannot calculate duration: endTime is null/undefined');
      return 1;
    }
    
    if (isNaN(startTime) || isNaN(endTime)) {
      console.error('🚨 Cannot calculate duration: NaN values detected');
      return 1;
    }
    
    const duration = (endTime - startTime) / 1000;
    
    if (duration <= 0) {
      console.error('🚨 Duration calculation resulted in', duration, 'seconds');
      console.error('🔍 Debug info:', { startTime, endTime, diff: endTime - startTime });
      return 1;
    }
    
    return Math.max(duration, 0.1); // Ensure minimum duration
  }

  exportLogs() {
    if (!this.enabled) return;
    
    const debugData = {
      sessionId: Date.now(),
      timestamp: new Date().toISOString(),
      logs: this.logs,
      sessionData: this.sessionData,
      userAgent: navigator.userAgent,
      url: window.location.href,
      viewport: { width: window.innerWidth, height: window.innerHeight }
    };
    
    console.log('📋 Timer Debug Export:', debugData);
    
    // Copy to clipboard for easy sharing
    try {
      navigator.clipboard.writeText(JSON.stringify(debugData, null, 2));
      console.log('📋 Debug data copied to clipboard');
    } catch (err) {
      console.log('📋 Could not copy to clipboard, data logged above');
    }
    
    return debugData;
  }

  clearLogs() {
    this.logs = [];
    this.sessionData = null;
  }
}

// Create global instance
const timerDebugger = new TypeTutorTimerDebugger();

/**
 * Enhanced typing timer hook with comprehensive debugging
 */
export function useEnhancedTypingTimer() {
  const [startTime, setStartTime] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  const intervalRef = useRef(null);

  // Start timer with debugging
  const startTimer = useCallback(() => {
    const now = Date.now();
    timerDebugger.log('Timer starting', { timestamp: now });
    timerDebugger.startSession();
    
    setStartTime(now);
    setIsActive(true);
    setIsPaused(false);
    setTimeElapsed(0);
    
    timerDebugger.log('Timer started successfully', { 
      startTime: now,
      isActive: true 
    });
  }, []);

  // Stop timer with debugging
  const stopTimer = useCallback(() => {
    const endTime = Date.now();
    
    timerDebugger.log('Timer stopping', { 
      endTime,
      startTime,
      isActive 
    });
    
    // Validate timer state before stopping
    timerDebugger.validateTimerStates({
      startTime,
      isActive,
      timeElapsed,
      currentEndTime: endTime
    });
    
    setIsActive(false);
    setIsPaused(false);
    
    timerDebugger.log('Timer stopped', { 
      endTime,
      finalDuration: startTime ? (endTime - startTime) / 1000 : 0
    });
    
    return endTime;
  }, [startTime, isActive, timeElapsed]);

  // Reset timer with debugging
  const resetTimer = useCallback(() => {
    timerDebugger.log('Timer reset');
    
    setStartTime(null);
    setIsActive(false);
    setIsPaused(false);
    setTimeElapsed(0);
    
    // Clear interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    timerDebugger.clearLogs();
  }, []);

  // Pause/unpause timer
  const togglePause = useCallback(() => {
    const newPauseState = !isPaused;
    timerDebugger.log('Timer pause toggled', { 
      wasPaused: isPaused, 
      nowPaused: newPauseState 
    });
    setIsPaused(newPauseState);
  }, [isPaused]);

  // Get current duration safely
  const getCurrentDuration = useCallback(() => {
    if (!startTime) {
      timerDebugger.log('getCurrentDuration called but no startTime');
      return 0;
    }
    
    const now = Date.now();
    return timerDebugger.calculateDurationSafely(startTime, now);
  }, [startTime]);

  // Get complete session data for saving
  const getSessionData = useCallback((finalInput, errors) => {
    const endTime = Date.now();
    const totalTime = timerDebugger.calculateDurationSafely(startTime, endTime);
    
    // Calculate metrics
    const finalWpm = totalTime > 0 ? Math.round((finalInput.length / 5) / (totalTime / 60)) : 0;
    
    let correctChars = 0;
    // This would need the current text to compare against
    // You'll need to pass currentText as a parameter
    const finalAccuracy = finalInput.length > 0 ? Math.round((correctChars / finalInput.length) * 100) : 100;

    const sessionData = {
      wpm: finalWpm,
      accuracy: finalAccuracy,
      duration: Math.round(totalTime), // This is the critical fix!
      timeElapsed: Math.round(totalTime), // Keep consistent
      errors: errors || 0,
      totalCharacters: finalInput.length,
      startTime,
      endTime,
      mode: 'practice',
      timestamp: new Date().toISOString()
    };

    // Validate before returning
    timerDebugger.validateSessionCompletion(sessionData);
    
    return sessionData;
  }, [startTime]);

  // Timer interval effect
  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeElapsed(prev => {
          const newElapsed = prev + 1;
          
          // Validate timer state periodically
          timerDebugger.validateTimerStates({
            startTime,
            isActive,
            timeElapsed: newElapsed,
            currentEndTime: Date.now()
          });
          
          return newElapsed;
        });
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
  }, [isActive, isPaused, startTime]);

  return {
    startTimer,
    stopTimer,
    resetTimer,
    togglePause,
    getCurrentDuration,
    getSessionData, // New method that handles everything safely
    
    // State
    startTime,
    isActive,
    isPaused,
    timeElapsed,
    
    // Debug utilities
    debugger: timerDebugger,
    exportDebugData: () => timerDebugger.exportLogs()
  };
}

/**
 * Enhanced saveStats function with comprehensive debugging
 */
export async function saveStatsWithDebug(sessionData) {
  // Validate session data before sending
  const isValid = timerDebugger.validateSessionCompletion(sessionData);
  
  if (!isValid && timerDebugger.enabled) {
    console.error('🚨 Session data validation failed. Check console for details.');
    
    // Show user-friendly debug info in development
    if (process.env.NODE_ENV === 'development') {
      const debugData = timerDebugger.exportLogs();
      alert('Session data validation failed. Debug data logged to console and copied to clipboard.');
    }
  }

  try {
    timerDebugger.log('Sending session data to backend', sessionData);
    
    // Use your existing API call
    const response = await fetch('/api/save-stats', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(sessionData)
    });
    
    const result = await response.json();
    
    timerDebugger.log('Backend response received', result);
    
    if (result.success) {
      timerDebugger.log('Session saved successfully');
    } else {
      timerDebugger.log('Session save failed', result);
    }
    
    return result;
  } catch (error) {
    timerDebugger.log('Error saving session', { 
      error: error.message, 
      sessionData 
    });
    throw error;
  }
}

/**
 * Debug panel component for real-time monitoring
 */
export function TimerDebugPanel({ timerState, darkMode = false }) {
  if (process.env.NODE_ENV !== 'development') return null;

  const { startTime, isActive, timeElapsed, getCurrentDuration } = timerState;
  const currentDuration = getCurrentDuration ? getCurrentDuration() : 0;

  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: darkMode ? 'rgba(17,24,39,0.95)' : 'rgba(255,255,255,0.95)',
      color: darkMode ? '#e5e7eb' : '#374151',
      padding: '12px',
      borderRadius: '8px',
      fontSize: '12px',
      fontFamily: 'Monaco, "Lucida Console", monospace',
      zIndex: 9999,
      border: `1px solid ${darkMode ? '#374151' : '#d1d5db'}`,
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
      minWidth: '200px'
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>🐛 Timer Debug</div>
      
      <div style={{ marginBottom: '4px' }}>
        <strong>Active:</strong> {isActive ? '✅ Yes' : '❌ No'}
      </div>
      
      <div style={{ marginBottom: '4px' }}>
        <strong>Start Time:</strong> {startTime ? 
          `✅ ${new Date(startTime).toLocaleTimeString()}` : 
          '❌ Not Set'
        }
      </div>
      
      <div style={{ marginBottom: '4px' }}>
        <strong>Elapsed:</strong> {timeElapsed}s
      </div>
      
      <div style={{ marginBottom: '4px' }}>
        <strong>Duration:</strong> {currentDuration?.toFixed(1) || 0}s
      </div>
      
      <div style={{ marginBottom: '8px' }}>
        <strong>Status:</strong> {
          !startTime && isActive ? '🚨 ERROR' :
          startTime && isActive && currentDuration > 0 ? '✅ OK' :
          '⏸️ Inactive'
        }
      </div>
      
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => timerDebugger.exportLogs()}
          style={{ 
            fontSize: '10px', 
            padding: '4px 8px',
            background: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Export Logs
        </button>
        <button 
          onClick={() => timerDebugger.clearLogs()}
          style={{ 
            fontSize: '10px', 
            padding: '4px 8px',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear
        </button>
      </div>
      
      {(!startTime && isActive) && (
        <div style={{ 
          marginTop: '8px', 
          padding: '4px', 
          background: '#fef2f2', 
          color: '#dc2626', 
          borderRadius: '4px',
          fontSize: '10px'
        }}>
          ⚠️ Timer is active but startTime is null!
        </div>
      )}
    </div>
  );
}

export { timerDebugger };
// frontend/src/utils/timerDebugHelper.js
// Quick fix for missing timer debug helper

export const debugTimer = {
  log: (message, data = null) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Timer Debug] ${message}`, data || '');
    }
  },
  
  validateDuration: (startTime, endTime) => {
    if (!startTime || !endTime) return 1;
    const duration = (endTime - startTime) / 1000;
    return Math.max(duration, 0.1); // Minimum 0.1 seconds
  },
  
  calculateSafeDuration: (startTime, endTime) => {
    if (!startTime) {
      console.warn('Timer: startTime is null, using fallback duration');
      return 1;
    }
    
    if (!endTime) {
      endTime = Date.now();
    }
    
    const duration = (endTime - startTime) / 1000;
    
    if (duration <= 0) {
      console.warn('Timer: Invalid duration calculated, using fallback');
      return 1;
    }
    
    return Math.round(duration);
  }
};

// Export individual functions for compatibility
export const validateDuration = debugTimer.validateDuration;
export const calculateSafeDuration = debugTimer.calculateSafeDuration;

export default debugTimer;
export default timerDebugger;