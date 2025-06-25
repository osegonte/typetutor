import React, { useState, useEffect } from 'react';

const ConnectionDebug = () => {
  const [testResults, setTestResults] = useState({});
  const [testing, setTesting] = useState(false);

  const testConnections = async () => {
    setTesting(true);
    const results = {};
    
    const apiUrl = import.meta.env.VITE_API_URL || 'https://typetutor-production.up.railway.app/api';
    
    // Test 1: Health check
    try {
      const response = await fetch(`${apiUrl}/health`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });
      results.health = {
        status: response.status,
        ok: response.ok,
        data: await response.json()
      };
    } catch (error) {
      results.health = { error: error.message };
    }
    
    // Test 2: Auth health
    try {
      const response = await fetch(`${apiUrl}/auth/health`, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit'
      });
      results.authHealth = {
        status: response.status,
        ok: response.ok,
        data: await response.json()
      };
    } catch (error) {
      results.authHealth = { error: error.message };
    }
    
    // Test 3: Environment
    results.environment = {
      VITE_API_URL: import.meta.env.VITE_API_URL,
      NODE_ENV: import.meta.env.NODE_ENV,
      MODE: import.meta.env.MODE,
      PROD: import.meta.env.PROD,
      url: window.location.href,
      origin: window.location.origin
    };
    
    setTestResults(results);
    setTesting(false);
  };

  useEffect(() => {
    testConnections();
  }, []);

  if (import.meta.env.MODE === 'production') return null;

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
      fontFamily: 'monospace'
    }}>
      <h2>🔧 Production Debug Panel</h2>
      <button 
        onClick={testConnections} 
        disabled={testing}
        style={{ padding: '10px', marginBottom: '20px', backgroundColor: '#007bff', color: 'white', border: 'none' }}
      >
        {testing ? 'Testing...' : 'Test Connections'}
      </button>
      
      <pre style={{ fontSize: '12px', whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(testResults, null, 2)}
      </pre>
      
      <div style={{ marginTop: '20px', padding: '10px', backgroundColor: '#333' }}>
        <h3>Quick Fixes:</h3>
        <ul>
          <li>✅ API URL: {import.meta.env.VITE_API_URL || 'NOT SET'}</li>
          <li>✅ Environment: {import.meta.env.MODE}</li>
          <li>✅ Health check should return 200</li>
          <li>✅ Look for CORS errors in Network tab</li>
        </ul>
      </div>
    </div>
  );
};

export default ConnectionDebug;