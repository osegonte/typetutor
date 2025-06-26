import React from 'react';

const DebuggingPanel = ({ darkMode }) => {
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className={`p-6 rounded-lg border ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}>
      <h2 className="text-xl font-bold mb-4">Debug Panel</h2>
      <p className="text-sm text-gray-500">Development mode active</p>
    </div>
  );
};

export default DebuggingPanel;
