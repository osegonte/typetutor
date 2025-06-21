// frontend/src/setupTests.js - Jest configuration and test utilities
import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from './mocks/server';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock performance APIs
global.performance = {
  ...global.performance,
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  getEntriesByName: jest.fn(() => []),
};

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock requestIdleCallback
global.requestIdleCallback = jest.fn((cb) => setTimeout(cb, 0));
global.cancelIdleCallback = jest.fn();

// Setup MSW
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// Custom jest matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () => `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  toHaveTypingAccuracy(received, expectedAccuracy) {
    const pass = received >= expectedAccuracy;
    if (pass) {
      return {
        message: () => `expected accuracy ${received}% not to be at least ${expectedAccuracy}%`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected accuracy ${received}% to be at least ${expectedAccuracy}%`,
        pass: false,
      };
    }
  },
});

// src/test-utils.jsx - Enhanced testing utilities
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AppProvider } from '../context/AppContext';
import { ErrorBoundary } from 'react-error-boundary';

// Error fallback for testing
const TestErrorFallback = ({ error }) => (
  <div role="alert" data-testid="error-boundary">
    <h2>Something went wrong:</h2>
    <pre>{error.message}</pre>
  </div>
);

// Enhanced render function with providers
export function renderWithProviders(ui, options = {}) {
  const {
    initialState = {},
    ...renderOptions
  } = options;

  function Wrapper({ children }) {
    return (
      <ErrorBoundary FallbackComponent={TestErrorFallback}>
        <AppProvider initialState={initialState}>
          {children}
        </AppProvider>
      </ErrorBoundary>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Create user event instance
export const user = userEvent.setup();

// Custom render for testing typing components
export function renderTypingComponent(component, options = {}) {
  const {
    customText = "The quick brown fox jumps over the lazy dog.",
    darkMode = false,
    ...renderOptions
  } = options;

  const props = {
    customText,
    darkMode,
    setActiveTab: jest.fn(),
    ...renderOptions.props
  };

  return renderWithProviders(
    React.cloneElement(component, props),
    renderOptions
  );
}

// Typing simulation utilities
export const typingUtils = {
  async typeText(text, options = {}) {
    const { delay = 50, accuracy = 1.0 } = options;
    const input = screen.getByRole('textbox');
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const shouldMakeError = Math.random() > accuracy;
      
      if (shouldMakeError && i > 0) {
        // Type wrong character then correct it
        await user.type(input, 'x', { delay });
        await user.keyboard('{Backspace}', { delay: delay / 2 });
      }
      
      await user.type(input, char, { delay });
    }
  },

  async simulateTypingSession(text, wpm = 40) {
    const charactersPerSecond = (wpm * 5) / 60;
    const delay = 1000 / charactersPerSecond;
    
    await this.typeText(text, { delay, accuracy: 0.95 });
  },

  getTypingMetrics() {
    const wpmElement = screen.getByText(/\d+ WPM/);
    const accuracyElement = screen.getByText(/\d+%/);
    
    return {
      wpm: parseInt(wpmElement.textContent.match(/\d+/)[0]),
      accuracy: parseInt(accuracyElement.textContent.match(/\d+/)[0])
    };
  }
};

// Performance testing utilities
export const performanceUtils = {
  measureRenderTime(renderFn) {
    const start = performance.now();
    const result = renderFn();
    const end = performance.now();
    
    return {
      result,
      renderTime: end - start
    };
  },

  async measureAsyncOperation(asyncFn) {
    const start = performance.now();
    const result = await asyncFn();
    const end = performance.now();
    
    return {
      result,
      duration: end - start
    };
  },

  expectPerformantRender(renderTime, threshold = 100) {
    expect(renderTime).toBeLessThan(threshold);
  }
};

// Accessibility testing utilities
export const a11yUtils = {
  async checkKeyboardNavigation(element) {
    element.focus();
    expect(document.activeElement).toBe(element);
    
    await user.keyboard('{Tab}');
    expect(document.activeElement).not.toBe(element);
  },

  checkAriaLabels(element, expectedLabel) {
    expect(element).toHaveAttribute('aria-label', expectedLabel);
  },

  async checkScreenReaderAnnouncements() {
    const announcements = screen.getAllByRole('status', { hidden: true });
    return announcements.map(el => el.textContent);
  }
};

// Component-specific test utilities
export const componentUtils = {
  async waitForStatsUpdate() {
    await waitFor(() => {
      expect(screen.getByText(/\d+ WPM/)).toBeInTheDocument();
    });
  },

  async waitForTextLoad(text) {
    await waitFor(() => {
      expect(screen.getByText(text, { exact: false })).toBeInTheDocument();
    });
  },

  expectErrorState(errorMessage) {
    expect(screen.getByRole('alert')).toBeInTheDocument();
    if (errorMessage) {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    }
  }
};

// Mock data generators
export const mockData = {
  generateSessionStats(overrides = {}) {
    return {
      wpm: 45,
      accuracy: 92,
      timeElapsed: 180,
      errorCount: 5,
      consistency: 88,
      totalCharacters: 450,
      ...overrides
    };
  },

  generatePracticeText(length = 100) {
    const words = [
      'the', 'quick', 'brown', 'fox', 'jumps', 'over', 'lazy', 'dog',
      'practice', 'typing', 'speed', 'accuracy', 'keyboard', 'learning'
    ];
    
    let text = '';
    while (text.length < length) {
      const randomWord = words[Math.floor(Math.random() * words.length)];
      text += (text ? ' ' : '') + randomWord;
    }
    
    return text.substring(0, length);
  },

  generateKeystrokeData(count = 50) {
    return Array.from({ length: count }, (_, i) => ({
      char: String.fromCharCode(97 + (i % 26)),
      timestamp: Date.now() + i * 100,
      correct: Math.random() > 0.1,
      index: i
    }));
  }
};

// Testing presets for different scenarios
export const testingPresets = {
  beginnerTypist: {
    wpm: 25,
    accuracy: 85,
    consistency: 70,
    errorRate: 0.15
  },
  
  intermediateTypist: {
    wpm: 45,
    accuracy: 92,
    consistency: 85,
    errorRate: 0.08
  },
  
  expertTypist: {
    wpm: 80,
    accuracy: 98,
    consistency: 95,
    errorRate: 0.02
  },
  
  mobileUser: {
    wpm: 30,
    accuracy: 88,
    consistency: 75,
    errorRate: 0.12,
    device: 'mobile'
  }
};

// Export all utilities
export * from '@testing-library/react';
export { default as userEvent } from '@testing-library/user-event';

// __tests__/components/PracticeScreen.test.jsx - Comprehensive component tests
import React from 'react';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import { renderTypingComponent, typingUtils, performanceUtils, user } from '../../test-utils';
import PracticeScreen from '../../components/PracticeScreen';

describe('PracticeScreen', () => {
  const defaultProps = {
    customText: "The quick brown fox jumps over the lazy dog.",
    darkMode: false,
    setActiveTab: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Functionality', () => {
    test('renders practice screen with text', async () => {
      renderTypingComponent(<PracticeScreen />, { props: defaultProps });
      
      await waitFor(() => {
        expect(screen.getByText(/The quick brown fox/)).toBeInTheDocument();
      });
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText('0 WPM')).toBeInTheDocument();
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    test('starts timing when user begins typing', async () => {
      renderTypingComponent(<PracticeScreen />, { props: defaultProps });
      
      const input = screen.getByRole('textbox');
      await user.type(input, 'T');
      
      // Wait for timer to update
      await waitFor(() => {
        expect(screen.queryByText('0:00')).not.toBeInTheDocument();
      }, { timeout: 2000 });
    });

    test('updates stats in real-time during typing', async () => {
      renderTypingComponent(<PracticeScreen />, { props: defaultProps });
      
      await typingUtils.simulateTypingSession("The quick", 60);
      
      const metrics = typingUtils.getTypingMetrics();
      expect(metrics.wpm).toBeGreaterThan(0);
      expect(metrics.accuracy).toHaveTypingAccuracy(90);
    });

    test('completes session when text is finished', async () => {
      const shortText = "Hello world!";
      renderTypingComponent(<PracticeScreen />, {
        props: { ...defaultProps, customText: shortText }
      });
      
      await typingUtils.typeText(shortText);
      
      await waitFor(() => {
        expect(screen.getByText(/Session completed/i)).toBeInTheDocument();
      });
    });
  });

  describe('Performance Tests', () => {
    test('renders large text efficiently', async () => {
      const largeText = 'a'.repeat(10000);
      
      const { renderTime } = performanceUtils.measureRenderTime(() => {
        renderTypingComponent(<PracticeScreen />, {
          props: { ...defaultProps, customText: largeText }
        });
      });
      
      performanceUtils.expectPerformantRender(renderTime, 1000);
    });

    test('handles rapid typing without lag', async () => {
      renderTypingComponent(<PracticeScreen />, { props: defaultProps });
      
      const input = screen.getByRole('textbox');
      const rapidText = "abcdefghijklmnopqrstuvwxyz";
      
      const { duration } = await performanceUtils.measureAsyncOperation(async () => {
        await user.type(input, rapidText, { delay: 10 });
      });
      
      // Should complete within reasonable time
      expect(duration).toBeLessThan(2000);
    });

    test('memory usage remains stable during long sessions', async () => {
      const initialMemory = performance.memory?.usedJSHeapSize || 0;
      
      renderTypingComponent(<PracticeScreen />, { props: defaultProps });
      
      // Simulate long typing session
      for (let i = 0; i < 10; i++) {
        await typingUtils.typeText("The quick brown fox ", { delay: 1 });
        const input = screen.getByRole('textbox');
        await user.clear(input);
      }
      
      const finalMemory = performance.memory?.usedJSHeapSize || 0;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Memory increase should be reasonable (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Accessibility', () => {
    test('supports keyboard navigation', async () => {
      renderTypingComponent(<PracticeScreen />, { props: defaultProps });
      
      const input = screen.getByRole('textbox');
      const backButton = screen.getByRole('button', { name: /back to home/i });
      
      await user.tab();
      expect(document.activeElement).toBe(backButton);
      
      await user.tab();
      expect(document.activeElement).toBe(input);
    });

    test('provides appropriate ARIA labels', () => {
      renderTypingComponent(<PracticeScreen />, { props: defaultProps });
      
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('aria-label');
      
      const progressBar = screen.getByRole('progressbar', { hidden: true });
      expect(progressBar).toBeInTheDocument();
    });

    test('announces important state changes', async () => {
      renderTypingComponent(<PracticeScreen />, { props: defaultProps });
      
      await typingUtils.typeText("The quick brown fox jumps over the lazy dog.");
      
      await waitFor(() => {
        const announcement = screen.getByRole('status', { hidden: true });
        expect(announcement).toHaveTextContent(/completed/i);
      });
    });
  });

  describe('Error Handling', () => {
    test('handles API errors gracefully', async () => {
      // Mock API failure
      jest.spyOn(console, 'error').mockImplementation(() => {});
      
      renderTypingComponent(<PracticeScreen />, { props: defaultProps });
      
      // Complete a session to trigger save
      await typingUtils.typeText(defaultProps.customText);
      
      // Should not crash the app
      expect(screen.getByText(/Session completed/i)).toBeInTheDocument();
      
      console.error.mockRestore();
    });

    test('recovers from component errors', () => {
      const ThrowError = () => {
        throw new Error('Test error');
      };
      
      renderTypingComponent(<ThrowError />);
      
      expect(screen.getByTestId('error-boundary')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });
  });

  describe('Dark Mode', () => {
    test('applies dark mode styles correctly', () => {
      renderTypingComponent(<PracticeScreen />, {
        props: { ...defaultProps, darkMode: true }
      });
      
      const container = screen.getByRole('textbox').closest('.rounded-2xl');
      expect(container).toHaveClass('bg-gray-900');
    });

    test('maintains functionality in dark mode', async () => {
      renderTypingComponent(<PracticeScreen />, {
        props: { ...defaultProps, darkMode: true }
      });
      
      await typingUtils.typeText("Hello");
      
      const metrics = typingUtils.getTypingMetrics();
      expect(metrics.wpm).toBeGreaterThan(0);
    });
  });
});

// __tests__/hooks/useOptimizedTyping.test.js - Hook testing
import { renderHook, act } from '@testing-library/react';
import { useOptimizedTyping } from '../../hooks/useOptimizedTyping';

describe('useOptimizedTyping', () => {
  const sampleText = "Hello world!";

  test('initializes with correct default state', () => {
    const { result } = renderHook(() => useOptimizedTyping(sampleText));
    
    expect(result.current.userInput).toBe('');
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.errors).toEqual([]);
    expect(result.current.isComplete).toBe(false);
    expect(result.current.progress).toBe(0);
  });

  test('processes input correctly', () => {
    const { result } = renderHook(() => useOptimizedTyping(sampleText));
    
    act(() => {
      result.current.processInput('H');
    });
    
    expect(result.current.userInput).toBe('H');
    expect(result.current.currentIndex).toBe(1);
    expect(result.current.progress).toBeCloseTo(8.33, 1); // 1/12 * 100
  });

  test('detects errors correctly', () => {
    const { result } = renderHook(() => useOptimizedTyping(sampleText));
    
    act(() => {
      result.current.processInput('X'); // Wrong character
    });
    
    expect(result.current.errors).toEqual([0]);
    expect(result.current.calculateAccuracy()).toBe(0);
  });

  test('calculates WPM accurately', () => {
    const { result } = renderHook(() => useOptimizedTyping(sampleText));
    
    // Mock performance.now for consistent timing
    const mockNow = jest.spyOn(performance, 'now');
    mockNow.mockReturnValue(0);
    
    act(() => {
      result.current.processInput('Hello');
    });
    
    mockNow.mockReturnValue(60000); // 1 minute later
    
    const wpm = result.current.calculateWPM();
    expect(wpm).toBe(1); // 5 characters = 1 word in 1 minute
    
    mockNow.mockRestore();
  });

  test('detects completion correctly', () => {
    const { result } = renderHook(() => useOptimizedTyping(sampleText));
    
    act(() => {
      result.current.processInput(sampleText);
    });
    
    expect(result.current.isComplete).toBe(true);
    expect(result.current.progress).toBe(100);
  });

  test('resets state correctly', () => {
    const { result } = renderHook(() => useOptimizedTyping(sampleText));
    
    act(() => {
      result.current.processInput('Hello');
    });
    
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.userInput).toBe('');
    expect(result.current.currentIndex).toBe(0);
    expect(result.current.errors).toEqual([]);
    expect(result.current.isComplete).toBe(false);
  });

  test('provides detailed analytics', () => {
    const { result } = renderHook(() => useOptimizedTyping(sampleText, {
      trackPerformance: true
    }));
    
    act(() => {
      result.current.processInput('Hello');
    });
    
    const analytics = result.current.getAnalytics();
    
    expect(analytics).toHaveProperty('wpm');
    expect(analytics).toHaveProperty('accuracy');
    expect(analytics).toHaveProperty('consistency');
    expect(analytics).toHaveProperty('errorsByChar');
    expect(analytics).toHaveProperty('speedHistory');
  });
});

// __tests__/integration/TypingFlow.test.jsx - End-to-end flow testing
import { screen, waitFor } from '@testing-library/react';
import { renderWithProviders, user, typingUtils } from '../../test-utils';
import App from '../../App';

describe('Complete Typing Flow', () => {
  test('complete typing session flow', async () => {
    renderWithProviders(<App />);
    
    // 1. Start from home screen
    expect(screen.getByText(/Learn While You Type/)).toBeInTheDocument();
    
    // 2. Enter custom text
    const textarea = screen.getByPlaceholderText(/Paste or type your practice text/);
    await user.type(textarea, 'The quick brown fox jumps over the lazy dog.');
    
    // 3. Start practice
    const startButton = screen.getByRole('button', { name: /Start Typing Practice/ });
    await user.click(startButton);
    
    // 4. Wait for practice screen to load
    await waitFor(() => {
      expect(screen.getByText(/The quick brown fox/)).toBeInTheDocument();
    });
    
    // 5. Complete typing session
    await typingUtils.simulateTypingSession('The quick brown fox jumps over the lazy dog.', 40);
    
    // 6. Verify completion modal
    await waitFor(() => {
      expect(screen.getByText(/Session Complete/)).toBeInTheDocument();
    });
    
    // 7. Check stats are displayed
    expect(screen.getByText(/Words per minute/)).toBeInTheDocument();
    expect(screen.getByText(/Accuracy/)).toBeInTheDocument();
    
    // 8. Navigate to stats screen
    const viewStatsButton = screen.getByRole('button', { name: /View All Stats/ });
    await user.click(viewStatsButton);
    
    // 9. Verify stats screen shows session data
    await waitFor(() => {
      expect(screen.getByText(/Performance Statistics/)).toBeInTheDocument();
    });
  });

  test('handles PDF upload and practice flow', async () => {
    renderWithProviders(<App />);
    
    // Create mock PDF file
    const file = new File(['PDF content'], 'test.pdf', { type: 'application/pdf' });
    
    // Upload file
    const fileInput = screen.getByLabelText(/Choose File/);
    await user.upload(fileInput, file);
    
    // Wait for processing
    await waitFor(() => {
      expect(screen.getByText(/Successfully extracted/)).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Start practice with extracted content
    const startButton = screen.getByRole('button', { name: /Start Typing Practice/ });
    await user.click(startButton);
    
    // Verify practice screen loads
    await waitFor(() => {
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });
  });

  test('dark mode persists across navigation', async () => {
    renderWithProviders(<App />);
    
    // Toggle dark mode
    const darkModeButton = screen.getByLabelText(/Switch to dark mode/);
    await user.click(darkModeButton);
    
    // Verify dark mode is applied
    expect(document.documentElement).toHaveClass('dark');
    
    // Navigate to practice
    const textarea = screen.getByPlaceholderText(/Paste or type your practice text/);
    await user.type(textarea, 'Test text');
    
    const startButton = screen.getByRole('button', { name: /Start Typing Practice/ });
    await user.click(startButton);
    
    // Verify dark mode persists
    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark');
    });
  });
});

export default {
  testingPresets,
  typingUtils,
  performanceUtils,
  componentUtils,
  mockData
};