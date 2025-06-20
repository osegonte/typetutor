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