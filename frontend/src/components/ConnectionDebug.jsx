// Add this to your frontend temporarily for debugging
// frontend/src/components/ConnectionDebug.jsx

import React, { useState, useEffect } from 'react';

const ConnectionDebug = () => {
  const [debugInfo, setDebugInfo] = useState({});
  const [testing, setTesting] = useState(false);

  const testConnection = async () => {
    setTesting(true);
    const results = {};

    // Test environment variables
    results.envVars = {
      VITE_API_URL: import.meta.env.VITE_API_URL,
      VITE_APP_TITLE: import.meta.env.VITE_APP_TITLE,
      VITE_ENVIRONMENT: import.meta.env.VITE_ENVIRONMENT,
      MODE: import.meta.env.MODE,
      DEV: import.meta.env.DEV,
      PROD: import.meta.env.PROD
    };

    // Test direct health endpoint
    const apiUrl = import.meta.env.VITE_API_URL || 'https://typetutor-production.up.railway.app/api';
    
    try {
      console.log('Testing:', `${apiUrl}/health`);
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });
      
      results.healthCheck = {
        status: response.status,
        ok: response.ok,
        data: await response.json()
      };
    } catch (error) {
      results.healthCheck = {
        error: error.message,
        name: error.name,
        stack: error.stack
      };
    }

    // Test auth health
    try {
      const response = await fetch(`${apiUrl}/auth/health`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });
      
      results.authCheck = {
        status: response.status,
        ok: response.ok,
        data: await response.json()
      };
    } catch (error) {
      results.authCheck = {
        error: error.message
      };
    }

    // Test browser info
    results.browserInfo = {
      userAgent: navigator.userAgent,
      url: window.location.href,
      origin: window.location.origin,
      protocol: window.location.protocol,
      cookiesEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine
    };

    setDebugInfo(results);
    setTesting(false);
  };

  useEffect(() => {
    testConnection();
  }, []);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(JSON.stringify(debugInfo, null, 2));
    alert('Debug info copied to clipboard!');
  };

  if (process.env.NODE_ENV === 'production') {
    return null; // Don't show in production
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.9)',
      color: 'white',
      padding: '20px',
      overflow: 'auto',
      zIndex: 9999,
      fontFamily: 'monospace',
      fontSize: '12px'
    }}>
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2>🐛 TypeTutor Connection Debug</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <button onClick={testConnection} disabled={testing} style={{
            padding: '10px 20px',
            marginRight: '10px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            {testing ? 'Testing...' : 'Retest Connection'}
          </button>
          
          <button onClick={copyToClipboard} style={{
            padding: '10px 20px',
            backgroundColor: '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}>
            Copy Debug Info
          </button>
        </div>

        <pre style={{
          backgroundColor: '#1a1a1a',
          padding: '15px',
          borderRadius: '4px',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {JSON.stringify(debugInfo, null, 2)}
        </pre>

        <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#333', borderRadius: '4px' }}>
          <h3>Quick Fixes:</h3>
          <ul>
            <li>✅ VITE_API_URL should be: https://typetutor-production.up.railway.app/api</li>
            <li>✅ Health check should return status 200</li>
            <li>✅ Auth check might return 404 (that's OK)</li>
            <li>❌ If health check fails, backend is down</li>
            <li>❌ If CORS error, backend CORS config issue</li>
          </ul>
          
          <p style={{ marginTop: '15px', color: '#ffc107' }}>
            <strong>Next Steps:</strong> Copy this debug info and share it for detailed troubleshooting.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionDebug;