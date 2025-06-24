import React from 'react';
import { AuthProvider } from './context/AuthContext';
import TypeTutorApp from './components/TypeTutorApp';
import './index.css';

function App() {
  return (
    <AuthProvider>
      <TypeTutorApp />
    </AuthProvider>
  );
}

export default App;