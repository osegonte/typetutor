// frontend/src/App.jsx - CORRECTED VERSION
console.log("🟢 App.jsx loading - React confirmed working");

import React from 'react';

console.log("🟢 React imported successfully");

// Test TypeTutorApp import
console.log("🔵 About to import TypeTutorApp...");

// Simple import with error boundary to catch issues
import TypeTutorApp from './components/TypeTutorApp';

console.log("✅ TypeTutorApp imported successfully!");

// Error boundary for runtime errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    console.error("❌ RUNTIME ERROR caught:", error);
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Full error details:', error);
    console.error('🚨 Component stack:', errorInfo.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          backgroundColor: '#ffebee', 
          border: '3px solid red',
          margin: '20px',
          borderRadius: '10px',
          fontFamily: 'Arial'
        }}>
          <h1 style={{ color: 'red' }}>🚨 Found the TypeTutorApp Error!</h1>
          <h2 style={{ color: '#d32f2f' }}>Error: {this.state.error?.message}</h2>
          
          <div style={{ backgroundColor: 'white', padding: '15px', borderRadius: '5px', marginTop: '15px' }}>
            <strong>This is exactly what's wrong:</strong>
            <pre style={{ fontSize: '12px', marginTop: '10px', overflow: 'auto', maxHeight: '300px' }}>
              {this.state.error?.stack}
            </pre>
          </div>
          
          <button 
            onClick={() => {
              const errorText = `TypeTutor Error:\n${this.state.error?.message}\n\nStack:\n${this.state.error?.stack}`;
              navigator.clipboard.writeText(errorText);
              alert('Error details copied to clipboard!');
            }}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#1976d2', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer',
              marginTop: '15px',
              marginRight: '10px'
            }}
          >
            📋 Copy Error Details
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#388e3c', 
              color: 'white', 
              border: 'none', 
              borderRadius: '5px', 
              cursor: 'pointer',
              marginTop: '15px'
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
  console.log("🟢 App function called - about to render TypeTutorApp");
  
  return (
    <div>
      <div style={{ 
        padding: '10px', 
        backgroundColor: 'lightgreen', 
        textAlign: 'center',
        fontFamily: 'Arial',
        fontSize: '14px'
      }}>
        ✅ React Working | ✅ Import Successful | Testing TypeTutorApp Render...
      </div>
      
      <ErrorBoundary>
        <TypeTutorApp />
      </ErrorBoundary>
    </div>
  );
}

console.log("🟢 About to export App");

export default App;