// utils/performanceMonitor.js - Advanced performance monitoring for TypeTutor
import { debounce, throttle } from 'lodash';

class PerformanceMonitor {
  constructor(options = {}) {
    this.isEnabled = options.enabled !== false;
    this.sampleRate = options.sampleRate || 0.1; // 10% sampling
    this.maxSamples = options.maxSamples || 1000;
    this.thresholds = {
      keystrokeLatency: options.keystrokeLatencyThreshold || 50, // ms
      renderTime: options.renderTimeThreshold || 16, // ms (60fps)
      memoryUsage: options.memoryUsageThreshold || 50, // MB
      ...options.thresholds
    };
    
    this.metrics = {
      keystrokes: [],
      renders: [],
      apiCalls: [],
      memoryUsage: [],
      errors: []
    };
    
    this.isRecording = false;
    this.sessionStartTime = null;
    this.lastKeystrokeTime = null;
    
    // Bind methods
    this.startRecording = this.startRecording.bind(this);
    this.stopRecording = this.stopRecording.bind(this);
    this.recordKeystroke = this.recordKeystroke.bind(this);
    this.recordRender = this.recordRender.bind(this);
    this.recordApiCall = this.recordApiCall.bind(this);
    this.recordError = this.recordError.bind(this);
    
    // Throttled methods for high-frequency events
    this.recordMemoryUsage = throttle(this._recordMemoryUsage.bind(this), 5000); // Every 5 seconds
    this.reportPerformanceIssue = debounce(this._reportPerformanceIssue.bind(this), 1000);
    
    this.initializeMonitoring();
  }
  
  initializeMonitoring() {
    if (!this.isEnabled) return;
    
    // Monitor unhandled errors
    window.addEventListener('error', (event) => {
      this.recordError('javascript_error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });
    
    // Monitor unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordError('unhandled_promise_rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });
    
    // Monitor performance using Performance Observer if available
    if ('PerformanceObserver' in window) {
      try {
        // Monitor long tasks
        const longTaskObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.duration > 50) { // Tasks longer than 50ms
              this.recordPerformanceEntry('long_task', {
                duration: entry.duration,
                startTime: entry.startTime,
                name: entry.name
              });
            }
          });
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        
        // Monitor layout shifts
        const layoutShiftObserver = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.value > 0.1) { // Significant layout shift
              this.recordPerformanceEntry('layout_shift', {
                value: entry.value,
                startTime: entry.startTime,
                sources: entry.sources
              });
            }
          });
        });
        layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
      } catch (error) {
        console.warn('Performance Observer not fully supported:', error);
      }
    }
  }
  
  startRecording() {
    if (!this.isEnabled) return;
    
    this.isRecording = true;
    this.sessionStartTime = performance.now();
    this.lastKeystrokeTime = null;
    
    // Clear old metrics
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = [];
    });
    
    console.log('🔍 Performance monitoring started');
  }
  
  stopRecording() {
    if (!this.isEnabled || !this.isRecording) return;
    
    this.isRecording = false;
    const sessionDuration = performance.now() - this.sessionStartTime;
    
    const summary = this.generatePerformanceSummary();
    console.log('📊 Performance monitoring stopped', {
      sessionDuration: Math.round(sessionDuration),
      summary
    });
    
    return summary;
  }
  
  recordKeystroke(char, isCorrect, timestamp = performance.now()) {
    if (!this.isEnabled || !this.isRecording) return;
    if (Math.random() > this.sampleRate) return; // Sampling
    
    const latency = this.lastKeystrokeTime ? timestamp - this.lastKeystrokeTime : 0;
    
    const keystrokeData = {
      char,
      isCorrect,
      timestamp,
      latency,
      sessionTime: timestamp - this.sessionStartTime
    };
    
    this.metrics.keystrokes.push(keystrokeData);
    this.lastKeystrokeTime = timestamp;
    
    // Check for performance issues
    if (latency > this.thresholds.keystrokeLatency) {
      this.reportPerformanceIssue('high_keystroke_latency', {
        latency,
        char,
        threshold: this.thresholds.keystrokeLatency
      });
    }
    
    // Limit memory usage
    if (this.metrics.keystrokes.length > this.maxSamples) {
      this.metrics.keystrokes = this.metrics.keystrokes.slice(-this.maxSamples / 2);
    }
  }
  
  recordRender(componentName, renderTime, timestamp = performance.now()) {
    if (!this.isEnabled || !this.isRecording) return;
    if (Math.random() > this.sampleRate) return;
    
    const renderData = {
      componentName,
      renderTime,
      timestamp,
      sessionTime: timestamp - this.sessionStartTime
    };
    
    this.metrics.renders.push(renderData);
    
    // Check for slow renders
    if (renderTime > this.thresholds.renderTime) {
      this.reportPerformanceIssue('slow_render', {
        componentName,
        renderTime,
        threshold: this.thresholds.renderTime
      });
    }
    
    // Limit memory usage
    if (this.metrics.renders.length > this.maxSamples) {
      this.metrics.renders = this.metrics.renders.slice(-this.maxSamples / 2);
    }
  }
  
  recordApiCall(endpoint, duration, status, timestamp = performance.now()) {
    if (!this.isEnabled || !this.isRecording) return;
    
    const apiCallData = {
      endpoint,
      duration,
      status,
      timestamp,
      sessionTime: timestamp - this.sessionStartTime
    };
    
    this.metrics.apiCalls.push(apiCallData);
    
    // Check for slow API calls
    if (duration > 5000) { // 5 seconds
      this.reportPerformanceIssue('slow_api_call', {
        endpoint,
        duration,
        status
      });
    }
    
    // Limit memory usage
    if (this.metrics.apiCalls.length > this.maxSamples) {
      this.metrics.apiCalls = this.metrics.apiCalls.slice(-this.maxSamples / 2);
    }
  }
  
  _recordMemoryUsage() {
    if (!this.isEnabled || !this.isRecording) return;
    if (!('memory' in performance)) return;
    
    const memoryInfo = performance.memory;
    const usedMB = memoryInfo.usedJSHeapSize / 1024 / 1024;
    
    const memoryData = {
      used: usedMB,
      total: memoryInfo.totalJSHeapSize / 1024 / 1024,
      limit: memoryInfo.jsHeapSizeLimit / 1024 / 1024,
      timestamp: performance.now(),
      sessionTime: performance.now() - this.sessionStartTime
    };
    
    this.metrics.memoryUsage.push(memoryData);
    
    // Check for high memory usage
    if (usedMB > this.thresholds.memoryUsage) {
      this.reportPerformanceIssue('high_memory_usage', {
        usedMB,
        threshold: this.thresholds.memoryUsage
      });
    }
    
    // Limit memory usage tracking (ironic, but necessary)
    if (this.metrics.memoryUsage.length > 100) {
      this.metrics.memoryUsage = this.metrics.memoryUsage.slice(-50);
    }
  }
  
  recordError(type, errorData, timestamp = performance.now()) {
    if (!this.isEnabled) return;
    
    const errorRecord = {
      type,
      data: errorData,
      timestamp,
      sessionTime: this.isRecording ? timestamp - this.sessionStartTime : null,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    this.metrics.errors.push(errorRecord);
    
    // Limit error storage
    if (this.metrics.errors.length > 100) {
      this.metrics.errors = this.metrics.errors.slice(-50);
    }
    
    console.error('🚨 Performance Monitor - Error recorded:', errorRecord);
  }
  
  recordPerformanceEntry(type, data) {
    if (!this.isEnabled || !this.isRecording) return;
    
    // Record in appropriate metric category
    const entry = {
      type,
      data,
      timestamp: performance.now(),
      sessionTime: performance.now() - this.sessionStartTime
    };
    
    if (!this.metrics.performanceEntries) {
      this.metrics.performanceEntries = [];
    }
    
    this.metrics.performanceEntries.push(entry);
    
    // Limit storage
    if (this.metrics.performanceEntries.length > this.maxSamples) {
      this.metrics.performanceEntries = this.metrics.performanceEntries.slice(-this.maxSamples / 2);
    }
  }
  
  _reportPerformanceIssue(type, data) {
    if (!this.isEnabled) return;
    
    console.warn(`⚠️ Performance Issue - ${type}:`, data);
    
    // Could send to analytics service here
    if (window.gtag) {
      window.gtag('event', 'performance_issue', {
        event_category: 'performance',
        event_label: type,
        value: Math.round(data.latency || data.renderTime || data.duration || data.usedMB || 0)
      });
    }
  }
  
  generatePerformanceSummary() {
    if (!this.isEnabled || !this.isRecording) return null;
    
    const summary = {
      sessionDuration: performance.now() - this.sessionStartTime,
      keystrokeMetrics: this.analyzeKeystrokes(),
      renderMetrics: this.analyzeRenders(),
      apiMetrics: this.analyzeApiCalls(),
      memoryMetrics: this.analyzeMemoryUsage(),
      errorCount: this.metrics.errors.length,
      recommendations: this.generateRecommendations()
    };
    
    return summary;
  }
  
  analyzeKeystrokes() {
    const keystrokes = this.metrics.keystrokes;
    if (keystrokes.length === 0) return null;
    
    const latencies = keystrokes.map(k => k.latency).filter(l => l > 0);
    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const p95Latency = this.calculatePercentile(latencies, 95);
    
    return {
      totalKeystrokes: keystrokes.length,
      averageLatency: Math.round(avgLatency * 100) / 100,
      maxLatency: Math.round(maxLatency * 100) / 100,
      p95Latency: Math.round(p95Latency * 100) / 100,
      highLatencyEvents: latencies.filter(l => l > this.thresholds.keystrokeLatency).length
    };
  }
  
  analyzeRenders() {
    const renders = this.metrics.renders;
    if (renders.length === 0) return null;
    
    const renderTimes = renders.map(r => r.renderTime);
    const avgRenderTime = renderTimes.reduce((sum, t) => sum + t, 0) / renderTimes.length;
    const maxRenderTime = Math.max(...renderTimes);
    const slowRenders = renderTimes.filter(t => t > this.thresholds.renderTime).length;
    
    const componentBreakdown = renders.reduce((acc, render) => {
      if (!acc[render.componentName]) {
        acc[render.componentName] = { count: 0, totalTime: 0 };
      }
      acc[render.componentName].count++;
      acc[render.componentName].totalTime += render.renderTime;
      return acc;
    }, {});
    
    return {
      totalRenders: renders.length,
      averageRenderTime: Math.round(avgRenderTime * 100) / 100,
      maxRenderTime: Math.round(maxRenderTime * 100) / 100,
      slowRenders,
      componentBreakdown
    };
  }
  
  analyzeApiCalls() {
    const apiCalls = this.metrics.apiCalls;
    if (apiCalls.length === 0) return null;
    
    const durations = apiCalls.map(call => call.duration);
    const avgDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    
    const statusBreakdown = apiCalls.reduce((acc, call) => {
      const statusGroup = Math.floor(call.status / 100) * 100;
      acc[statusGroup] = (acc[statusGroup] || 0) + 1;
      return acc;
    }, {});
    
    const endpointBreakdown = apiCalls.reduce((acc, call) => {
      if (!acc[call.endpoint]) {
        acc[call.endpoint] = { count: 0, totalDuration: 0, errors: 0 };
      }
      acc[call.endpoint].count++;
      acc[call.endpoint].totalDuration += call.duration;
      if (call.status >= 400) {
        acc[call.endpoint].errors++;
      }
      return acc;
    }, {});
    
    return {
      totalApiCalls: apiCalls.length,
      averageDuration: Math.round(avgDuration),
      maxDuration: Math.round(maxDuration),
      statusBreakdown,
      endpointBreakdown
    };
  }
  
  analyzeMemoryUsage() {
    const memoryData = this.metrics.memoryUsage;
    if (memoryData.length === 0) return null;
    
    const used = memoryData.map(m => m.used);
    const avgUsed = used.reduce((sum, u) => sum + u, 0) / used.length;
    const maxUsed = Math.max(...used);
    const minUsed = Math.min(...used);
    
    return {
      averageUsed: Math.round(avgUsed * 100) / 100,
      maxUsed: Math.round(maxUsed * 100) / 100,
      minUsed: Math.round(minUsed * 100) / 100,
      memoryGrowth: memoryData.length > 1 ? 
        Math.round((used[used.length - 1] - used[0]) * 100) / 100 : 0
    };
  }
  
  generateRecommendations() {
    const recommendations = [];
    
    // Keystroke latency recommendations
    const keystrokeMetrics = this.analyzeKeystrokes();
    if (keystrokeMetrics && keystrokeMetrics.p95Latency > this.thresholds.keystrokeLatency) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: 'High Keystroke Latency Detected',
        description: `95th percentile keystroke latency is ${keystrokeMetrics.p95Latency}ms. Consider optimizing input handling.`,
        actions: [
          'Use React.memo for frequently re-rendering components',
          'Debounce or throttle expensive operations',
          'Check for memory leaks causing garbage collection pauses'
        ]
      });
    }
    
    // Render performance recommendations
    const renderMetrics = this.analyzeRenders();
    if (renderMetrics && renderMetrics.slowRenders > 0) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'Slow Renders Detected',
        description: `${renderMetrics.slowRenders} renders exceeded ${this.thresholds.renderTime}ms threshold.`,
        actions: [
          'Use React.useMemo for expensive calculations',
          'Implement virtualization for long lists',
          'Split large components into smaller ones'
        ]
      });
    }
    
    // Memory recommendations
    const memoryMetrics = this.analyzeMemoryUsage();
    if (memoryMetrics && memoryMetrics.maxUsed > this.thresholds.memoryUsage) {
      recommendations.push({
        type: 'memory',
        priority: 'high',
        title: 'High Memory Usage Detected',
        description: `Peak memory usage reached ${memoryMetrics.maxUsed}MB. Consider optimizing memory usage.`,
        actions: [
          'Clear unused event listeners and intervals',
          'Implement data pagination for large datasets',
          'Use WeakMap/WeakSet for temporary object references'
        ]
      });
    }
    
    // API performance recommendations
    const apiMetrics = this.analyzeApiCalls();
    if (apiMetrics && apiMetrics.averageDuration > 2000) {
      recommendations.push({
        type: 'api',
        priority: 'medium',
        title: 'Slow API Calls Detected',
        description: `Average API response time is ${apiMetrics.averageDuration}ms.`,
        actions: [
          'Implement request caching',
          'Add loading states for better UX',
          'Consider API endpoint optimization'
        ]
      });
    }
    
    // Error recommendations
    if (this.metrics.errors.length > 5) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        title: 'Multiple Errors Detected',
        description: `${this.metrics.errors.length} errors occurred during the session.`,
        actions: [
          'Add more comprehensive error boundaries',
          'Implement better input validation',
          'Add fallback mechanisms for failed operations'
        ]
      });
    }
    
    return recommendations;
  }
  
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sorted[lower];
    }
    
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
  
  // Export performance data for analysis
  exportData() {
    return {
      metrics: this.metrics,
      thresholds: this.thresholds,
      sessionDuration: this.isRecording ? performance.now() - this.sessionStartTime : null,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      }
    };
  }
  
  // Clear all collected data
  clearData() {
    Object.keys(this.metrics).forEach(key => {
      this.metrics[key] = [];
    });
    console.log('🧹 Performance data cleared');
  }
  
  // Get real-time performance status
  getRealtimeStatus() {
    if (!this.isRecording) return null;
    
    const now = performance.now();
    const recentKeystrokes = this.metrics.keystrokes.filter(k => now - k.timestamp < 5000); // Last 5 seconds
    const recentRenders = this.metrics.renders.filter(r => now - r.timestamp < 5000);
    
    return {
      isHealthy: this.isPerformanceHealthy(),
      recentKeystrokeLatency: recentKeystrokes.length > 0 ? 
        recentKeystrokes.reduce((sum, k) => sum + k.latency, 0) / recentKeystrokes.length : 0,
      recentRenderTime: recentRenders.length > 0 ?
        recentRenders.reduce((sum, r) => sum + r.renderTime, 0) / recentRenders.length : 0,
      memoryUsage: 'memory' in performance ? performance.memory.usedJSHeapSize / 1024 / 1024 : null,
      sessionDuration: now - this.sessionStartTime
    };
  }
  
  isPerformanceHealthy() {
    const status = this.getRealtimeStatus();
    if (!status) return true;
    
    return (
      status.recentKeystrokeLatency < this.thresholds.keystrokeLatency &&
      status.recentRenderTime < this.thresholds.renderTime &&
      (status.memoryUsage === null || status.memoryUsage < this.thresholds.memoryUsage)
    );
  }
}

// React hook for performance monitoring
export const usePerformanceMonitor = (options = {}) => {
  const monitorRef = useRef(null);
  const [performanceStatus, setPerformanceStatus] = useState(null);
  
  useEffect(() => {
    monitorRef.current = new PerformanceMonitor(options);
    
    // Update status periodically
    const statusInterval = setInterval(() => {
      const status = monitorRef.current.getRealtimeStatus();
      setPerformanceStatus(status);
    }, 1000);
    
    return () => {
      clearInterval(statusInterval);
      if (monitorRef.current) {
        monitorRef.current.stopRecording();
      }
    };
  }, []);
  
  const startMonitoring = useCallback(() => {
    monitorRef.current?.startRecording();
  }, []);
  
  const stopMonitoring = useCallback(() => {
    return monitorRef.current?.stopRecording();
  }, []);
  
  const recordKeystroke = useCallback((char, isCorrect) => {
    monitorRef.current?.recordKeystroke(char, isCorrect);
  }, []);
  
  const recordRender = useCallback((componentName, renderTime) => {
    monitorRef.current?.recordRender(componentName, renderTime);
  }, []);
  
  const exportData = useCallback(() => {
    return monitorRef.current?.exportData();
  }, []);
  
  return {
    startMonitoring,
    stopMonitoring,
    recordKeystroke,
    recordRender,
    exportData,
    performanceStatus,
    isHealthy: performanceStatus?.isHealthy ?? true
  };
};

// Higher-order component for performance monitoring
export const withPerformanceMonitoring = (WrappedComponent, componentName) => {
  return React.forwardRef((props, ref) => {
    const renderStartTime = performance.now();
    
    useEffect(() => {
      const renderTime = performance.now() - renderStartTime;
      
      // Report render time to global performance monitor if available
      if (window.performanceMonitor) {
        window.performanceMonitor.recordRender(componentName, renderTime);
      }
    });
    
    return <WrappedComponent {...props} ref={ref} />;
  });
};

// Utility functions for performance optimization
export const optimizationUtils = {
  // Debounce function with immediate option
  debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        timeout = null;
        if (!immediate) func(...args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func(...args);
    };
  },
  
  // Throttle function with trailing option
  throttle(func, limit, trailing = true) {
    let inThrottle;
    let lastFunc;
    let lastRan;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        lastRan = Date.now();
        inThrottle = true;
      } else {
        if (trailing) {
          clearTimeout(lastFunc);
          lastFunc = setTimeout(() => {
            if ((Date.now() - lastRan) >= limit) {
              func.apply(this, args);
              lastRan = Date.now();
            }
          }, limit - (Date.now() - lastRan));
        }
      }
    };
  },
  
  // Memoization with expiry
  memoizeWithExpiry(func, ttl = 5 * 60 * 1000) { // 5 minutes default
    const cache = new Map();
    
    return function memoized(...args) {
      const key = JSON.stringify(args);
      const cached = cache.get(key);
      
      if (cached && Date.now() - cached.timestamp < ttl) {
        return cached.value;
      }
      
      const value = func.apply(this, args);
      cache.set(key, { value, timestamp: Date.now() });
      
      // Clean up expired entries periodically
      if (cache.size > 100) {
        const now = Date.now();
        for (const [k, v] of cache.entries()) {
          if (now - v.timestamp >= ttl) {
            cache.delete(k);
          }
        }
      }
      
      return value;
    };
  },
  
  // Lazy loading helper
  createLazyLoader(importFunc, fallback = null) {
    let componentPromise = null;
    let component = null;
    
    return {
      load() {
        if (component) return Promise.resolve(component);
        if (componentPromise) return componentPromise;
        
        componentPromise = importFunc().then(module => {
          component = module.default || module;
          return component;
        });
        
        return componentPromise;
      },
      
      isLoaded() {
        return component !== null;
      },
      
      getFallback() {
        return fallback;
      }
    };
  },
  
  // Virtual scrolling helper
  calculateVisibleRange(scrollTop, itemHeight, containerHeight, totalItems, buffer = 5) {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    const endIndex = Math.min(
      totalItems - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + buffer
    );
    
    return { startIndex, endIndex, visibleCount: endIndex - startIndex + 1 };
  },
  
  // Memory cleanup helper
  createCleanupManager() {
    const cleanupTasks = [];
    
    return {
      add(task) {
        cleanupTasks.push(task);
      },
      
      cleanup() {
        cleanupTasks.forEach(task => {
          try {
            task();
          } catch (error) {
            console.warn('Cleanup task failed:', error);
          }
        });
        cleanupTasks.length = 0;
      },
      
      addEventListener(element, event, handler, options) {
        element.addEventListener(event, handler, options);
        this.add(() => element.removeEventListener(event, handler, options));
      },
      
      addInterval(callback, delay) {
        const intervalId = setInterval(callback, delay);
        this.add(() => clearInterval(intervalId));
        return intervalId;
      },
      
      addTimeout(callback, delay) {
        const timeoutId = setTimeout(callback, delay);
        this.add(() => clearTimeout(timeoutId));
        return timeoutId;
      }
    };
  }
};

// Performance testing utilities
export const performanceTesting = {
  // Measure component render time
  measureRenderTime(component, props = {}, iterations = 100) {
    const times = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      
      // This would need to be adapted for actual React rendering
      // In practice, you'd use React testing utilities
      const element = React.createElement(component, props);
      
      const end = performance.now();
      times.push(end - start);
    }
    
    return {
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      p95: this.calculatePercentile(times, 95),
      times
    };
  },
  
  // Measure typing performance
  simulateTypingLoad(duration = 10000, wpm = 60) {
    const targetCps = (wpm * 5) / 60; // characters per second
    const interval = 1000 / targetCps;
    
    return new Promise((resolve) => {
      const startTime = performance.now();
      const measurements = [];
      let lastTime = startTime;
      
      const intervalId = setInterval(() => {
        const now = performance.now();
        const timeSinceStart = now - startTime;
        const timeSinceLast = now - lastTime;
        
        measurements.push({
          timestamp: now,
          interval: timeSinceLast,
          accuracy: Math.random() > 0.1 // 90% accuracy simulation
        });
        
        lastTime = now;
        
        if (timeSinceStart >= duration) {
          clearInterval(intervalId);
          resolve({
            duration: timeSinceStart,
            measurements,
            averageInterval: measurements.reduce((sum, m) => sum + m.interval, 0) / measurements.length,
            accuracy: measurements.filter(m => m.accuracy).length / measurements.length
          });
        }
      }, interval);
    });
  },
  
  calculatePercentile(values, percentile) {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sorted[lower];
    }
    
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }
};

// Export singleton instance for global use
export const globalPerformanceMonitor = new PerformanceMonitor({
  enabled: process.env.NODE_ENV === 'development',
  sampleRate: 0.1
});

// Make it globally accessible
if (typeof window !== 'undefined') {
  window.performanceMonitor = globalPerformanceMonitor;
}

export default PerformanceMonitor;