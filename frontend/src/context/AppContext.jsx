// context/AppContext.jsx - Global state management with Context + useReducer
import React, { createContext, useContext, useReducer, useCallback, useMemo } from 'react';
import { appReducer, initialState } from './appReducer';
import { themeReducer, initialThemeState } from './themeReducer';
import { performanceReducer, initialPerformanceState } from './performanceReducer';

// Separate contexts for different concerns
const AppStateContext = createContext();
const AppDispatchContext = createContext();
const ThemeContext = createContext();
const PerformanceContext = createContext();

// Custom hooks for accessing context
export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within AppProvider');
  }
  return context;
};

export const useAppDispatch = () => {
  const context = useContext(AppDispatchContext);
  if (!context) {
    throw new Error('useAppDispatch must be used within AppProvider');
  }
  return context;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within AppProvider');
  }
  return context;
};

export const usePerformance = () => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within AppProvider');
  }
  return context;
};

// Main App Provider Component
export const AppProvider = ({ children }) => {
  // Main app state
  const [appState, appDispatch] = useReducer(appReducer, initialState);
  
  // Theme state
  const [themeState, themeDispatch] = useReducer(themeReducer, initialThemeState);
  
  // Performance state
  const [performanceState, performanceDispatch] = useReducer(performanceReducer, initialPerformanceState);

  // Memoized action creators for app state
  const appActions = useMemo(() => ({
    setActiveTab: (tab) => appDispatch({ type: 'SET_ACTIVE_TAB', payload: tab }),
    setCustomText: (text) => appDispatch({ type: 'SET_CUSTOM_TEXT', payload: text }),
    setTypingInProgress: (inProgress) => appDispatch({ type: 'SET_TYPING_IN_PROGRESS', payload: inProgress }),
    setStudyItems: (items) => appDispatch({ type: 'SET_STUDY_ITEMS', payload: items }),
    addStudyItem: (item) => appDispatch({ type: 'ADD_STUDY_ITEM', payload: item }),
    removeStudyItem: (id) => appDispatch({ type: 'REMOVE_STUDY_ITEM', payload: id }),
    setUserPreferences: (preferences) => appDispatch({ type: 'SET_USER_PREFERENCES', payload: preferences }),
    updateUserPreference: (key, value) => appDispatch({ type: 'UPDATE_USER_PREFERENCE', payload: { key, value } }),
    setError: (error) => appDispatch({ type: 'SET_ERROR', payload: error }),
    clearError: () => appDispatch({ type: 'CLEAR_ERROR' }),
    setLoading: (loading) => appDispatch({ type: 'SET_LOADING', payload: loading })
  }), []);

  // Memoized action creators for theme
  const themeActions = useMemo(() => ({
    toggleDarkMode: () => themeDispatch({ type: 'TOGGLE_DARK_MODE' }),
    setDarkMode: (enabled) => themeDispatch({ type: 'SET_DARK_MODE', payload: enabled }),
    setFontSize: (size) => themeDispatch({ type: 'SET_FONT_SIZE', payload: size }),
    setAnimationsEnabled: (enabled) => themeDispatch({ type: 'SET_ANIMATIONS_ENABLED', payload: enabled }),
    setHighContrast: (enabled) => themeDispatch({ type: 'SET_HIGH_CONTRAST', payload: enabled })
  }), []);

  // Memoized action creators for performance
  const performanceActions = useMemo(() => ({
    recordMetric: (metric) => performanceDispatch({ type: 'RECORD_METRIC', payload: metric }),
    setPerformanceMode: (mode) => performanceDispatch({ type: 'SET_PERFORMANCE_MODE', payload: mode }),
    clearMetrics: () => performanceDispatch({ type: 'CLEAR_METRICS' }),
    updateSettings: (settings) => performanceDispatch({ type: 'UPDATE_SETTINGS', payload: settings })
  }), []);

  // Enhanced app actions with side effects
  const enhancedAppActions = useMemo(() => ({
    ...appActions,
    
    // Load user preferences from localStorage
    loadUserPreferences: useCallback(async () => {
      try {
        const stored = localStorage.getItem('typetutor_preferences');
        if (stored) {
          const preferences = JSON.parse(stored);
          appActions.setUserPreferences(preferences);
          
          // Apply theme preferences
          if (preferences.theme) {
            themeActions.setDarkMode(preferences.theme === 'dark');
          }
          if (preferences.fontSize) {
            themeActions.setFontSize(preferences.fontSize);
          }
          if (preferences.animationsEnabled !== undefined) {
            themeActions.setAnimationsEnabled(preferences.animationsEnabled);
          }
        }
      } catch (error) {
        console.warn('Failed to load user preferences:', error);
      }
    }, [appActions, themeActions]),

    // Save user preferences to localStorage
    saveUserPreferences: useCallback(async (preferences) => {
      try {
        localStorage.setItem('typetutor_preferences', JSON.stringify(preferences));
        appActions.setUserPreferences(preferences);
      } catch (error) {
        console.warn('Failed to save user preferences:', error);
        appActions.setError('Failed to save preferences');
      }
    }, [appActions]),

    // Handle errors with user feedback
    handleError: useCallback((error, context = '') => {
      console.error(`Error in ${context}:`, error);
      appActions.setError({
        message: error.message || 'An unexpected error occurred',
        context,
        timestamp: new Date().toISOString(),
        stack: error.stack
      });
    }, [appActions]),

    // Navigate with performance tracking
    navigateToTab: useCallback((tab) => {
      const startTime = performance.now();
      appActions.setActiveTab(tab);
      
      // Record navigation performance
      requestAnimationFrame(() => {
        const duration = performance.now() - startTime;
        performanceActions.recordMetric({
          type: 'navigation',
          tab,
          duration,
          timestamp: Date.now()
        });
      });
    }, [appActions, performanceActions])
  }), [appActions, themeActions, performanceActions]);

  // Memoized combined state for performance
  const combinedState = useMemo(() => ({
    app: appState,
    theme: themeState,
    performance: performanceState
  }), [appState, themeState, performanceState]);

  // Memoized combined actions
  const combinedActions = useMemo(() => ({
    app: enhancedAppActions,
    theme: themeActions,
    performance: performanceActions
  }), [enhancedAppActions, themeActions, performanceActions]);

  return (
    <AppStateContext.Provider value={combinedState}>
      <AppDispatchContext.Provider value={combinedActions}>
        <ThemeContext.Provider value={{ state: themeState, actions: themeActions }}>
          <PerformanceContext.Provider value={{ state: performanceState, actions: performanceActions }}>
            {children}
          </PerformanceContext.Provider>
        </ThemeContext.Provider>
      </AppDispatchContext.Provider>
    </AppStateContext.Provider>
  );
};

// context/appReducer.js - Main application state reducer
export const initialState = {
  activeTab: 'home',
  customText: '',
  typingInProgress: false,
  studyItems: [],
  userPreferences: {
    theme: 'auto',
    fontSize: 'medium',
    soundEnabled: true,
    soundVolume: 0.5,
    showRealTimeStats: true,
    animationsEnabled: true,
    keyboardLayout: 'qwerty',
    practiceMode: 'accuracy',
    autoSaveProgress: true,
    dailyGoal: 30, // minutes
    reminderEnabled: false
  },
  loading: false,
  error: null,
  lastSaveTimestamp: null,
  sessionId: null,
  offlineMode: false
};

export const appReducer = (state, action) => {
  switch (action.type) {
    case 'SET_ACTIVE_TAB':
      return {
        ...state,
        activeTab: action.payload,
        error: null // Clear errors on navigation
      };

    case 'SET_CUSTOM_TEXT':
      return {
        ...state,
        customText: action.payload,
        studyItems: action.payload ? [{
          id: 'custom-text',
          content: action.payload,
          type: 'custom',
          timestamp: Date.now()
        }] : []
      };

    case 'SET_TYPING_IN_PROGRESS':
      return {
        ...state,
        typingInProgress: action.payload,
        sessionId: action.payload ? `session_${Date.now()}` : null
      };

    case 'SET_STUDY_ITEMS':
      return {
        ...state,
        studyItems: action.payload,
        customText: action.payload.length > 0 ? action.payload.map(item => item.content).join('\n\n') : ''
      };

    case 'ADD_STUDY_ITEM':
      return {
        ...state,
        studyItems: [...state.studyItems, { ...action.payload, timestamp: Date.now() }]
      };

    case 'REMOVE_STUDY_ITEM':
      return {
        ...state,
        studyItems: state.studyItems.filter(item => item.id !== action.payload)
      };

    case 'SET_USER_PREFERENCES':
      return {
        ...state,
        userPreferences: { ...state.userPreferences, ...action.payload },
        lastSaveTimestamp: Date.now()
      };

    case 'UPDATE_USER_PREFERENCE':
      return {
        ...state,
        userPreferences: {
          ...state.userPreferences,
          [action.payload.key]: action.payload.value
        },
        lastSaveTimestamp: Date.now()
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        loading: false
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
        error: action.payload ? null : state.error
      };

    case 'SET_OFFLINE_MODE':
      return {
        ...state,
        offlineMode: action.payload
      };

    case 'RESET_STATE':
      return {
        ...initialState,
        userPreferences: state.userPreferences // Preserve user preferences
      };

    default:
      throw new Error(`Unhandled action type: ${action.type}`);
  }
};

// context/themeReducer.js - Theme-specific state management
export const initialThemeState = {
  darkMode: false,
  fontSize: 'medium', // small, medium, large
  animationsEnabled: true,
  highContrast: false,
  reducedMotion: false,
  colorScheme: 'purple', // purple, blue, green, red
  customColors: null
};

export const themeReducer = (state, action) => {
  switch (action.type) {
    case 'TOGGLE_DARK_MODE':
      return {
        ...state,
        darkMode: !state.darkMode
      };

    case 'SET_DARK_MODE':
      return {
        ...state,
        darkMode: action.payload
      };

    case 'SET_FONT_SIZE':
      return {
        ...state,
        fontSize: action.payload
      };

    case 'SET_ANIMATIONS_ENABLED':
      return {
        ...state,
        animationsEnabled: action.payload
      };

    case 'SET_HIGH_CONTRAST':
      return {
        ...state,
        highContrast: action.payload
      };

    case 'SET_REDUCED_MOTION':
      return {
        ...state,
        reducedMotion: action.payload
      };

    case 'SET_COLOR_SCHEME':
      return {
        ...state,
        colorScheme: action.payload,
        customColors: null // Reset custom colors when using preset
      };

    case 'SET_CUSTOM_COLORS':
      return {
        ...state,
        customColors: action.payload,
        colorScheme: 'custom'
      };

    case 'RESET_THEME':
      return initialThemeState;

    default:
      throw new Error(`Unhandled theme action type: ${action.type}`);
  }
};

// context/performanceReducer.js - Performance monitoring state
export const initialPerformanceState = {
  metrics: [],
  mode: 'auto', // auto, performance, quality
  settings: {
    enableAnimations: true,
    enableVirtualization: true,
    maxHistorySize: 1000,
    enablePrefetching: true,
    enableServiceWorker: true
  },
  thresholds: {
    slowNavigation: 500, // ms
    slowRender: 100, // ms
    slowAnimation: 16 // ms (60fps)
  },
  lastOptimization: null
};

export const performanceReducer = (state, action) => {
  switch (action.type) {
    case 'RECORD_METRIC':
      const newMetrics = [...state.metrics, {
        ...action.payload,
        id: `${action.payload.type}_${Date.now()}`
      }];
      
      // Keep only last 100 metrics for memory efficiency
      return {
        ...state,
        metrics: newMetrics.slice(-100)
      };

    case 'SET_PERFORMANCE_MODE':
      let newSettings = { ...state.settings };
      
      switch (action.payload) {
        case 'performance':
          newSettings = {
            ...newSettings,
            enableAnimations: false,
            enableVirtualization: true,
            maxHistorySize: 500,
            enablePrefetching: false
          };
          break;
        case 'quality':
          newSettings = {
            ...newSettings,
            enableAnimations: true,
            enableVirtualization: false,
            maxHistorySize: 2000,
            enablePrefetching: true
          };
          break;
        case 'auto':
        default:
          // Auto mode will be handled by performance monitoring
          break;
      }
      
      return {
        ...state,
        mode: action.payload,
        settings: newSettings,
        lastOptimization: Date.now()
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload }
      };

    case 'CLEAR_METRICS':
      return {
        ...state,
        metrics: []
      };

    case 'UPDATE_THRESHOLDS':
      return {
        ...state,
        thresholds: { ...state.thresholds, ...action.payload }
      };

    default:
      throw new Error(`Unhandled performance action type: ${action.type}`);
  }
};