import React, { useState, useEffect } from 'react';

const DebuggingPanel = ({ darkMode }) => {
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statsData, setStatsData] = useState(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState(null);

  const fetchDebugInfo = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/debug-info');
      const data = await response.json();
      setDebugInfo(data);
    } catch (error) {
      console.error('Error fetching debug info:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatsDebug = async () => {
    try {
      setLoading(true);
      const response = await fetch('http://localhost:5000/api/debug-stats');
      const data = await response.json();
      setStatsData(data);
    } catch (error) {
      console.error('Error fetching stats debug info:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResetStats = async () => {
    if (window.confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
      try {
        setResetLoading(true);
        const result = await resetStats();
        setResetResult(result);
        // Also refresh the stats debug data
        await fetchStatsDebug();
      } catch (error) {
        console.error('Error resetting stats:', error);
        setResetResult({ error: error.message });
      } finally {
        setResetLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchDebugInfo();
    fetchStatsDebug();
  }, []);

  return (
    <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <h2 className="text-xl font-bold mb-4">TypeTutor Debugging Panel</h2>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Application Diagnostics</h3>
          <button 
            className={`px-3 py-1 rounded-md text-sm ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={fetchDebugInfo}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        {debugInfo ? (
          <div className={`p-4 rounded-md overflow-auto ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(debugInfo, null, 2)}
            </pre>
          </div>
        ) : (
          <div className={`p-4 rounded-md ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {loading ? 'Loading debug information...' : 'Click Refresh to load debug information'}
            </p>
          </div>
        )}
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Statistics Diagnostics</h3>
          <button 
            className={`px-3 py-1 rounded-md text-sm ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'}`}
            onClick={fetchStatsDebug}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
        
        {statsData ? (
          <div className={`p-4 rounded-md overflow-auto ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <pre className="text-sm whitespace-pre-wrap">
              {JSON.stringify(statsData, null, 2)}
            </pre>
          </div>
        ) : (
          <div className={`p-4 rounded-md ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
            <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {loading ? 'Loading stats debug information...' : 'Click Refresh to load stats debug information'}
            </p>
          </div>
        )}
      </div>
      
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Stats Management</h3>
        <button 
          className={`px-4 py-2 rounded-md ${
            darkMode ? 'bg-red-900 hover:bg-red-800 text-red-100' : 'bg-red-100 hover:bg-red-200 text-red-800'
          }`}
          onClick={handleResetStats}
          disabled={resetLoading}
        >
          {resetLoading ? 'Resetting...' : 'Reset All Statistics'}
        </button>
        
        {resetResult && (
          <div className={`mt-2 p-3 rounded-md ${
            resetResult.success 
              ? (darkMode ? 'bg-green-900 text-green-100' : 'bg-green-100 text-green-800')
              : (darkMode ? 'bg-red-900 text-red-100' : 'bg-red-100 text-red-800')
          }`}>
            {resetResult.success 
              ? 'Statistics reset successfully' 
              : `Error: ${resetResult.error || 'Unknown error'}`}
          </div>
        )}
      </div>
      
      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
        This panel is for development and debugging purposes only.
      </p>
    </div>
  );
};

export default DebuggingPanel;