// frontend/src/App.jsx - Enhanced with error catching
import React from 'react';
import TypeTutorApp from './components/TypeTutorApp';

// Simple error boundary component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:');
    console.error('Error:', error);
    console.error('Error Info:', errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          margin: '20px',
          border: '2px solid red',
          borderRadius: '8px',
          backgroundColor: '#fee',
          fontFamily: 'Arial, sans-serif'
        }}>
          <h2 style={{ color: 'red', marginBottom: '10px' }}>
            🚨 Something went wrong with TypeTutor
          </h2>
          <details style={{ marginBottom: '15px' }}>
            <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
              Error Details (click to expand)
            </summary>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '4px',
              overflow: 'auto',
              fontSize: '12px'
            }}>
              {this.state.error?.toString()}
              {this.state.error?.stack}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007cba',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            🔄 Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  console.log("✅ App.jsx loaded and rendering");
  
  // Check if root element exists
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("❌ Root element #root not found in HTML!");
  }

  // Environment check
  console.log("🔧 Environment:", {
    NODE_ENV: process.env.NODE_ENV,
    VITE_API_URL: import.meta.env.VITE_API_URL,
    isDevelopment: import.meta.env.DEV,
    isProduction: import.meta.env.PROD
  });

  return (
    <ErrorBoundary>
      <TypeTutorApp />
    </ErrorBoundary>
  );
}

export default App;