// src/hooks/usePerformanceMonitor.js - Performance monitoring for TypeTutor
import { useState, useEffect, useRef, useCallback } from 'react';

export const usePerformanceMonitor = (options = {}) => {
  const {
    enabled = process.env.NODE_ENV === 'development',
    sampleRate = 0.1, // 10% sampling in production
    maxMetrics = 100,
    thresholds = {
      keystrokeLatency: 50, // ms
      renderTime: 16, // ms (60fps)
      wpmCalculation: 10, // ms
    }
  } = options;

  const [metrics, setMetrics] = useState({
    keystrokes: [],
    renders: [],
    calculations: [],
    memoryUsage: []
  });
  
  const [performanceStatus, setPerformanceStatus] = useState({
    isHealthy: true,
    avgKeystrokeLatency: 0,
    avgRenderTime: 0,
    memoryTrend: 'stable'
  });

  const lastKeystrokeTime = useRef(null);
  const isRecording = useRef(false);

  // Start monitoring
  const startMonitoring = useCallback(() => {
    if (!enabled) return;
    
    isRecording.current = true;
    console.log('🔍 Performance monitoring started');
    
    // Clear old metrics
    setMetrics({
      keystrokes: [],
      renders: [],
      calculations: [],
      memoryUsage: []
    });
  }, [enabled]);

  // Stop monitoring
  const stopMonitoring = useCallback(() => {
    if (!enabled) return;
    
    isRecording.current = false;
    console.log('📊 Performance monitoring stopped');
    
    return generateReport();
  }, [enabled]);

  // Record keystroke performance
  const recordKeystroke = useCallback((char, isCorrect = true) => {
    if (!enabled || !isRecording.current) return;
    if (Math.random() > sampleRate) return; // Sampling

    const now = performance.now();
    const latency = lastKeystrokeTime.current ? now - lastKeystrokeTime.current : 0;
    
    const keystrokeData = {
      char,
      isCorrect,
      latency,
      timestamp: now
    };

    setMetrics(prev => ({
      ...prev,
      keystrokes: [...prev.keystrokes.slice(-maxMetrics), keystrokeData]
    }));

    lastKeystrokeTime.current = now;

    // Check for performance issues
    if (latency > thresholds.keystrokeLatency) {
      console.warn(`⚠️ High keystroke latency: ${latency.toFixed(2)}ms for '${char}'`);
    }
  }, [enabled, sampleRate, maxMetrics, thresholds.keystrokeLatency]);

  // Record render performance
  const recordRender = useCallback((componentName, renderTime) => {
    if (!enabled || !isRecording.current) return;
    if (Math.random() > sampleRate) return;

    const renderData = {
      componentName,
      renderTime,
      timestamp: performance.now()
    };

    setMetrics(prev => ({
      ...prev,
      renders: [...prev.renders.slice(-maxMetrics), renderData]
    }));

    if (renderTime > thresholds.renderTime) {
      console.warn(`⚠️ Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
    }
  }, [enabled, sampleRate, maxMetrics, thresholds.renderTime]);

  // Record calculation performance (WPM, accuracy, etc.)
  const recordCalculation = useCallback((type, duration, inputSize = 0) => {
    if (!enabled || !isRecording.current) return;

    const calculationData = {
      type,
      duration,
      inputSize,
      timestamp: performance.now()
    };

    setMetrics(prev => ({
      ...prev,
      calculations: [...prev.calculations.slice(-maxMetrics), calculationData]
    }));

    if (duration > thresholds.wpmCalculation) {
      console.warn(`⚠️ Slow calculation: ${type} took ${duration.toFixed(2)}ms`);
    }
  }, [enabled, maxMetrics, thresholds.wpmCalculation]);

  // Record memory usage
  const recordMemoryUsage = useCallback(() => {
    if (!enabled || !isRecording.current) return;
    if (!('memory' in performance)) return;

    const memoryInfo = performance.memory;
    const memoryData = {
      used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024), // MB
      total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024), // MB
      timestamp: performance.now()
    };

    setMetrics(prev => ({
      ...prev,
      memoryUsage: [...prev.memoryUsage.slice(-20), memoryData] // Keep fewer memory samples
    }));
  }, [enabled]);

  // Generate performance report
  const generateReport = useCallback(() => {
    if (!enabled) return null;

    const report = {
      keystrokeMetrics: analyzeKeystrokes(metrics.keystrokes),
      renderMetrics: analyzeRenders(metrics.renders),
      calculationMetrics: analyzeCalculations(metrics.calculations),
      memoryMetrics: analyzeMemory(metrics.memoryUsage),
      recommendations: generateRecommendations(metrics)
    };

    console.log('📊 Performance Report:', report);
    return report;
  }, [enabled, metrics]);

  // Analyze keystroke performance
  const analyzeKeystrokes = useCallback((keystrokes) => {
    if (keystrokes.length === 0) return null;

    const latencies = keystrokes.map(k => k.latency).filter(l => l > 0);
    const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const p95Latency = calculatePercentile(latencies, 95);

    return {
      totalKeystrokes: keystrokes.length,
      avgLatency: Math.round(avgLatency * 100) / 100,
      maxLatency: Math.round(maxLatency * 100) / 100,
      p95Latency: Math.round(p95Latency * 100) / 100,
      slowKeystrokes: latencies.filter(l => l > thresholds.keystrokeLatency).length
    };
  }, [thresholds.keystrokeLatency]);

  // Analyze render performance
  const analyzeRenders = useCallback((renders) => {
    if (renders.length === 0) return null;

    const renderTimes = renders.map(r => r.renderTime);
    const avgRenderTime = renderTimes.reduce((sum, t) => sum + t, 0) / renderTimes.length;
    const maxRenderTime = Math.max(...renderTimes);

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
      avgRenderTime: Math.round(avgRenderTime * 100) / 100,
      maxRenderTime: Math.round(maxRenderTime * 100) / 100,
      slowRenders: renderTimes.filter(t => t > thresholds.renderTime).length,
      componentBreakdown
    };
  }, [thresholds.renderTime]);

  // Analyze calculation performance
  const analyzeCalculations = useCallback((calculations) => {
    if (calculations.length === 0) return null;

    const calcsByType = calculations.reduce((acc, calc) => {
      if (!acc[calc.type]) {
        acc[calc.type] = { count: 0, totalTime: 0, maxTime: 0 };
      }
      acc[calc.type].count++;
      acc[calc.type].totalTime += calc.duration;
      acc[calc.type].maxTime = Math.max(acc[calc.type].maxTime, calc.duration);
      return acc;
    }, {});

    return calcsByType;
  }, []);

  // Analyze memory usage
  const analyzeMemory = useCallback((memoryData) => {
    if (memoryData.length === 0) return null;

    const usedMemory = memoryData.map(m => m.used);
    const avgUsed = usedMemory.reduce((sum, u) => sum + u, 0) / usedMemory.length;
    const maxUsed = Math.max(...usedMemory);
    const trend = memoryData.length > 1 ? 
      (usedMemory[usedMemory.length - 1] - usedMemory[0] > 5 ? 'increasing' : 'stable') : 'stable';

    return {
      avgUsed: Math.round(avgUsed),
      maxUsed,
      trend,
      samples: memoryData.length
    };
  }, []);

  // Generate performance recommendations
  const generateRecommendations = useCallback((metrics) => {
    const recommendations = [];

    const keystrokeAnalysis = analyzeKeystrokes(metrics.keystrokes);
    if (keystrokeAnalysis && keystrokeAnalysis.p95Latency > thresholds.keystrokeLatency) {
      recommendations.push({
        type: 'keystroke',
        priority: 'high',
        title: 'High Input Latency',
        description: `95th percentile keystroke latency is ${keystrokeAnalysis.p95Latency}ms`,
        actions: ['Debounce expensive operations', 'Optimize input handlers', 'Check for memory leaks']
      });
    }

    const renderAnalysis = analyzeRenders(metrics.renders);
    if (renderAnalysis && renderAnalysis.slowRenders > 0) {
      recommendations.push({
        type: 'render',
        priority: 'medium',
        title: 'Slow Component Renders',
        description: `${renderAnalysis.slowRenders} renders exceeded ${thresholds.renderTime}ms`,
        actions: ['Use React.memo', 'Optimize re-renders', 'Split large components']
      });
    }

    const memoryAnalysis = analyzeMemory(metrics.memoryUsage);
    if (memoryAnalysis && memoryAnalysis.trend === 'increasing') {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        title: 'Memory Usage Increasing',
        description: 'Memory usage is trending upward during the session',
        actions: ['Check for memory leaks', 'Clear unused references', 'Optimize data structures']
      });
    }

    return recommendations;
  }, [analyzeKeystrokes, analyzeRenders, analyzeMemory, thresholds]);

  // Calculate percentile
  const calculatePercentile = (values, percentile) => {
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) return sorted[lower];
    
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  };

  // Update performance status periodically
  useEffect(() => {
    if (!enabled || !isRecording.current) return;

    const interval = setInterval(() => {
      const keystrokeAnalysis = analyzeKeystrokes(metrics.keystrokes);
      const renderAnalysis = analyzeRenders(metrics.renders);
      const memoryAnalysis = analyzeMemory(metrics.memoryUsage);

      setPerformanceStatus({
        isHealthy: (
          (!keystrokeAnalysis || keystrokeAnalysis.avgLatency < thresholds.keystrokeLatency) &&
          (!renderAnalysis || renderAnalysis.avgRenderTime < thresholds.renderTime) &&
          (!memoryAnalysis || memoryAnalysis.trend !== 'increasing')
        ),
        avgKeystrokeLatency: keystrokeAnalysis?.avgLatency || 0,
        avgRenderTime: renderAnalysis?.avgRenderTime || 0,
        memoryTrend: memoryAnalysis?.trend || 'stable'
      });

      // Record memory usage periodically
      recordMemoryUsage();
    }, 5000); // Every 5 seconds

    return () => clearInterval(interval);
  }, [enabled, metrics, analyzeKeystrokes, analyzeRenders, analyzeMemory, thresholds, recordMemoryUsage]);

  return {
    // Control methods
    startMonitoring,
    stopMonitoring,
    
    // Recording methods
    recordKeystroke,
    recordRender,
    recordCalculation,
    recordMemoryUsage,
    
    // Analysis methods
    generateReport,
    
    // Current status
    performanceStatus,
    isRecording: isRecording.current,
    
    // Raw metrics (for advanced users)
    metrics: enabled ? metrics : null,
  };
};

// Higher-order component to wrap components with performance monitoring
export const withPerformanceMonitoring = (WrappedComponent, componentName) => {
  return React.forwardRef((props, ref) => {
    const startTime = performance.now();
    
    useEffect(() => {
      const renderTime = performance.now() - startTime;
      
      // Report render time to global performance monitor
      if (window.performanceMonitor?.recordRender) {
        window.performanceMonitor.recordRender(componentName, renderTime);
      }
    });
    
    return <WrappedComponent {...props} ref={ref} />;
  });
};

export default usePerformanceMonitor;