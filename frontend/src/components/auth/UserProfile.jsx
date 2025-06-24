import React, { useState } from 'react';
import { User, LogOut, Settings, BarChart3 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const UserProfile = ({ darkMode }) => {
  const { user, logout } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = () => {
    logout();
    setShowDropdown(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all ${
          darkMode 
            ? 'bg-gray-800 hover:bg-gray-700 text-gray-200' 
            : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
        }`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          darkMode ? 'bg-purple-600' : 'bg-purple-600'
        } text-white text-sm font-medium`}>
          {user?.display_name?.[0] || user?.email?.[0] || 'U'}
        </div>
        <span className="text-sm font-medium">
          {user?.display_name || user?.username || 'User'}
        </span>
      </button>

      {showDropdown && (
        <div className={`absolute right-0 top-full mt-2 w-48 rounded-xl border shadow-lg z-50 ${
          darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'
        }`}>
          <div className={`p-3 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <p className="text-sm font-medium">{user?.display_name || user?.username}</p>
            <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {user?.email}
            </p>
          </div>
          
          <div className="p-1">
            <button className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}>
              <User size={16} />
              <span className="text-sm">Profile</span>
            </button>
            <button className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}>
              <BarChart3 size={16} />
              <span className="text-sm">Statistics</span>
            </button>
            <button className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}>
              <Settings size={16} />
              <span className="text-sm">Settings</span>
            </button>
            <hr className={`my-1 ${darkMode ? 'border-gray-800' : 'border-gray-200'}`} />
            <button
              onClick={handleLogout}
              className={`w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors`}
            >
              <LogOut size={16} />
              <span className="text-sm">Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserProfile;