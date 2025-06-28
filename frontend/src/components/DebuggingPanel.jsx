import React, { useState, useEffect } from 'react';
import { checkHealth, uploadPDF } from '../services/api';

const DebugPanel = ({ darkMode }) => {
  const [healthData, setHealthData] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const [uploadTest, setUploadTest] = useState(null);
  const [loading, setLoading] = useState(false);

  // Test health endpoint
  const testHealth = async () => {
    setLoading(true);
    setHealthError(null);
    
    try {
      const data = await checkHealth();
      setHealthData(data);
      console.log('Health test successful:', data);
    } catch (error) {
      setHealthError(error.message);
      console.error('Health test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Test PDF upload with a dummy file
  const testPDFUpload = async () => {
    setLoading(true);
    setUploadTest(null);
    
    try {
      // Create a test PDF file (minimal PDF content)
      const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
>>
endobj

xref
0 4
0000000000 65535 f 
0000000010 00000 n 
0000000079 00000 n 
0000000173 00000 n 
trailer
<<
/Size 4
/Root 1 0 R
>>
startxref
301
%%EOF`;

      const blob = new Blob([pdfContent], { type: 'application/pdf' });
      const testFile = new File([blob], 'test.pdf', { type: 'application/pdf' });
      
      console.log('Testing PDF upload with file:', testFile);
      
      const result = await uploadPDF(testFile, (progress) => {
        console.log('Upload progress:', progress);
      });
      
      setUploadTest({ success: true, result });
      console.log('PDF upload test successful:', result);
      
    } catch (error) {
      setUploadTest({ success: false, error: error.message });
      console.error('PDF upload test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-test health on component mount
  useEffect(() => {
    testHealth();
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <h2 className="text-xl font-bold mb-4 flex items-center">
        🔧 CORS & API Debug Panel
        {loading && <span className="ml-2 animate-spin">⚙️</span>}
      </h2>
      
      {/* API Base URL */}
      <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
        <strong>API Base URL:</strong> {import.meta.env.VITE_API_URL || 'http://localhost:5001/api'}
      </div>

      {/* Health Test */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Health Check</h3>
          <button 
            onClick={testHealth}
            disabled={loading}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Test Health
          </button>
        </div>
        
        {healthError && (
          <div className="p-3 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded mb-2">
            <strong>❌ Health Check Failed:</strong> {healthError}
          </div>
        )}
        
        {healthData && (
          <div className="p-3 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded">
            <strong>✅ Health Check Passed</strong>
            <details className="mt-2">
              <summary className="cursor-pointer font-medium">CORS Debug Info</summary>
              <pre className="mt-2 text-xs overflow-auto">
                {JSON.stringify(healthData.cors_debug || {}, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>

      {/* PDF Upload Test */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">PDF Upload Test</h3>
          <button 
            onClick={testPDFUpload}
            disabled={loading}
            className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
          >
            Test PDF Upload
          </button>
        </div>
        
        {uploadTest && (
          <div className={`p-3 rounded ${
            uploadTest.success 
              ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300' 
              : 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-300'
          }`}>
            <strong>{uploadTest.success ? '✅' : '❌'} PDF Upload {uploadTest.success ? 'Passed' : 'Failed'}</strong>
            {uploadTest.error && <div className="mt-1">Error: {uploadTest.error}</div>}
            {uploadTest.result && (
              <details className="mt-2">
                <summary className="cursor-pointer font-medium">Upload Result</summary>
                <pre className="mt-2 text-xs overflow-auto">
                  {JSON.stringify(uploadTest.result, null, 2)}
                </pre>
              </details>
            )}
          </div>
        )}
      </div>

      {/* Browser Info */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold mb-2">Browser Info</h3>
        <div className={`p-3 rounded text-sm ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
          <div><strong>Origin:</strong> {window.location.origin}</div>
          <div><strong>User Agent:</strong> {navigator.userAgent.substring(0, 100)}...</div>
          <div><strong>CORS Support:</strong> {typeof fetch !== 'undefined' ? '✅' : '❌'}</div>
        </div>
      </div>

      {/* Quick Fix Suggestions */}
      <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded">
        <h4 className="font-semibold mb-2">🔧 Quick Troubleshooting</h4>
        <ul className="text-sm space-y-1">
          <li>1. Backend running on port 5001? Check terminal</li>
          <li>2. Frontend on localhost:5173? Check URL bar</li>
          <li>3. CORS origin matches? Check health check CORS debug</li>
          <li>4. PyPDF2 installed? Run: pip install PyPDF2</li>
          <li>5. Browser blocking? Check DevTools Network tab</li>
        </ul>
      </div>

      {/* Manual Test Instructions */}
      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
        <h4 className="font-semibold mb-2">🧪 Manual Tests</h4>
        <div className="text-sm space-y-2">
          <div>
            <strong>Terminal Test:</strong>
            <code className="block mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded">
              curl http://localhost:5001/api/health
            </code>
          </div>
          <div>
            <strong>Browser Test:</strong>
            <code className="block mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded">
              Open DevTools → Network → Try PDF upload → Check failed requests
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DebugPanel;