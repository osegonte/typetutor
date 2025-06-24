import React, { useState } from 'react';
import { X } from 'lucide-react';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';

const AuthModal = ({ isOpen, onClose, darkMode, initialMode = 'login' }) => {
  const [mode, setMode] = useState(initialMode);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto ${
        darkMode ? 'bg-gray-900 border border-gray-800' : 'bg-white border border-gray-200'
      } shadow-2xl`}>
        <div className="sticky top-0 flex justify-between items-center p-6 border-b ${
          darkMode ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'
        }">
          <h2 className="text-xl font-bold">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </h2>
          <button
            onClick={onClose}
            className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {mode === 'login' ? (
            <LoginForm
              darkMode={darkMode}
              onSwitchToRegister={() => setMode('register')}
              onClose={onClose}
            />
          ) : (
            <RegisterForm
              darkMode={darkMode}
              onSwitchToLogin={() => setMode('login')}
              onClose={onClose}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;