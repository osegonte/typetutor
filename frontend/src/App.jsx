// Replace your current App.jsx with this debug version
// frontend/src/App.jsx

import React from 'react';

// Import our debug components
import DeepErrorBoundary from './debug/DeepErrorBoundary';
import ProgressiveLoader from './debug/ProgressiveLoader';
import ImportTester from './debug/ImportTester';
import ComponentIsolator from './debug/ComponentIsolator';

// Debug mode selector
const DebugApp = () => {
  const [debugMode, setDebugMode] = React.useState('progressive'); // Start with progressive

  const debugModes = [
    { id: 'progressive', name: 'Progressive Loading', component: ProgressiveLoader },
    { id: 'imports', name: 'Import Testing', component: ImportTester },
    { id: 'isolation', name: 'Component Isolation', component: ComponentIsolator },
    { id: 'original', name: 'Original TypeTutorApp', component: null }
  ];

  const CurrentDebugComponent = debugModes.find(mode => mode.id === debugMode)?.component;

  const renderOriginalApp = () => {
    try {
      const TypeTutorApp = require('./components/TypeTutorApp').default;
      return <TypeTutorApp />;
    } catch (error) {
      return (
        <div style={{ padding: '20px', backgroundColor: '#fee', border: '2px solid red' }}>
          <h2>❌ Original App Failed to Load</h2>
          <p><strong>Error:</strong> {error.message}</p>
          <p>This is exactly what we need to fix! Switch to other debug modes to investigate.</p>
          <pre style={{ fontSize: '12px', overflow: 'auto' }}>{error.stack}</pre>
        </div>
      );
    }
  };

  return (
    <DeepErrorBoundary>
      <div style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Debug Mode Selector */}
        <div style={{ 
          backgroundColor: '#e3f2fd', 
          padding: '15px', 
          borderBottom: '2px solid #1976d2',
          position: 'sticky',
          top: 0,
          zIndex: 1000
        }}>
          <h2 style={{ margin: '0 0 10px 0', color: '#1565c0' }}>
            🔧 TypeTutor Debug Dashboard
          </h2>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {debugModes.map(mode => (
              <button
                key={mode.id}
                onClick={() => setDebugMode(mode.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '6px',
                  border: debugMode === mode.id ? '2px solid #1976d2' : '1px solid #ccc',
                  backgroundColor: debugMode === mode.id ? '#1976d2' : 'white',
                  color: debugMode === mode.id ? 'white' : '#333',
                  cursor: 'pointer',
                  fontWeight: debugMode === mode.id ? 'bold' : 'normal'
                }}
              >
                {mode.name}
              </button>
            ))}
          </div>
          <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#666' }}>
            🎯 <strong>Goal:</strong> Find and fix the cause of the blank page. Start with "Progressive Loading" and work through each mode.
          </p>
        </div>

        {/* Debug Content */}
        <div style={{ padding: '20px' }}>
          {debugMode === 'original' ? (
            renderOriginalApp()
          ) : CurrentDebugComponent ? (
            <CurrentDebugComponent />
          ) : (
            <div>Debug mode not found</div>
          )}
        </div>

        {/* Debug Instructions */}
        <div style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '20px', 
          margin: '20px',
          borderRadius: '10px',
          border: '1px solid #ddd'
        }}>
          <h3>📋 Debug Instructions</h3>
          <ol>
            <li><strong>Progressive Loading:</strong> Watches the loading process step by step to find where it fails</li>
            <li><strong>Import Testing:</strong> Tests each import individually to find the problematic module</li>
            <li><strong>Component Isolation:</strong> Tests TypeTutorApp features one by one</li>
            <li><strong>Original TypeTutorApp:</strong> Tries to load the original app (this should fail initially)</li>
          </ol>
          <p><strong>💡 Strategy:</strong> Run through modes 1-3 to identify the issue, then fix it and test with mode 4.</p>
        </div>
      </div>
    </DeepErrorBoundary>
  );
};

// Simple fallback component to test React basics
const ReactBasicsTest = () => {
  const [count, setCount] = React.useState(0);
  
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>✅ React Basics Test Passed</h1>
      <p>React is working properly</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{ padding: '10px 20px', fontSize: '16px' }}
      >
        Counter: {count}
      </button>
      <p style={{ marginTop: '20px', color: '#666' }}>
        If you can see this and the counter works, React itself is fine. 
        The problem is in the TypeTutorApp component.
      </p>
    </div>
  );
};

// Main App Component with Ultimate Error Catching
const App = () => {
  const [useDebugMode, setUseDebugMode] = React.useState(true);

  // Catch any errors that happen before our error boundary
  React.useEffect(() => {
    const handleError = (event) => {
      console.error('🚨 Global error caught:', event.error);
      console.error('🚨 Error details:', {
        message: event.error?.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    };

    const handleUnhandledRejection = (event) => {
      console.error('🚨 Unhandled promise rejection:', event.reason);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  if (useDebugMode) {
    return (
      <div>
        <DeepErrorBoundary>
          <DebugApp />
        </DeepErrorBoundary>
        
        <div style={{ 
          position: 'fixed', 
          bottom: '20px', 
          right: '20px', 
          backgroundColor: '#fff',
          border: '2px solid #ccc',
          borderRadius: '10px',
          padding: '10px',
          boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={() => setUseDebugMode(false)}
            style={{
              padding: '5px 10px',
              backgroundColor: '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🧪➡️📱 Switch to Basic Test
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <DeepErrorBoundary>
        <ReactBasicsTest />
      </DeepErrorBoundary>
      
      <div style={{ 
        position: 'fixed', 
        bottom: '20px', 
        right: '20px', 
        backgroundColor: '#fff',
        border: '2px solid #ccc',
        borderRadius: '10px',
        padding: '10px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }}>
        <button
          onClick={() => setUseDebugMode(true)}
          style={{
            padding: '5px 10px',
            backgroundColor: '#2196f3',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer'
          }}
        >
          📱➡️🧪 Switch to Debug Mode
        </button>
      </div>
    </div>
  );
};

export default App;