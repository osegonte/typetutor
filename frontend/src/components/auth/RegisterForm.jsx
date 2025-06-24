 import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, User, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const RegisterForm = ({ darkMode, onSwitchToLogin, onClose }) => {
  const { register, loading, error, clearError } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    acceptTerms: false
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formErrors, setFormErrors] = useState({});

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email';
    }
    
    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
      errors.password = 'Password must contain uppercase, lowercase, and number';
    }
    
    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.acceptTerms) {
      errors.acceptTerms = 'Please accept the terms and conditions';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    clearError();
    
    if (!validateForm()) return;

    const result = await register(formData.email, formData.password, formData.displayName);
    
    if (result.success) {
      onClose();
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear field error when user starts typing
    if (formErrors[name]) {
      setFormErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Create Account</h2>
        <p className={`mt-2 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Join TypeTutor to track your progress
        </p>
      </div>

      {error && (
        <div className={`p-4 rounded-xl border ${
          darkMode ? 'bg-red-900/20 border-red-800 text-red-200' : 'bg-red-50 border-red-200 text-red-700'
        }`}>
          <p className="text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-gray-100' 
                  : 'bg-white border-gray-300 text-gray-900'
              } ${formErrors.email ? 'border-red-500' : ''}`}
              placeholder="Enter your email"
              disabled={loading}
            />
          </div>
          {formErrors.email && (
            <p className="mt-1 text-sm text-red-500">{formErrors.email}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Display Name (Optional)
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              name="displayName"
              value={formData.displayName}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-4 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-gray-100' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Choose a display name"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type={showPassword ? 'text' : 'password'}
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-10 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-gray-100' 
                  : 'bg-white border-gray-300 text-gray-900'
              } ${formErrors.password ? 'border-red-500' : ''}`}
              placeholder="Create a password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {formErrors.password && (
            <p className="mt-1 text-sm text-red-500">{formErrors.password}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`w-full pl-10 pr-10 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-gray-100' 
                  : 'bg-white border-gray-300 text-gray-900'
              } ${formErrors.confirmPassword ? 'border-red-500' : ''}`}
              placeholder="Confirm your password"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {formErrors.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">{formErrors.confirmPassword}</p>
          )}
        </div>

        <div>
          <label className="flex items-start">
            <input
              type="checkbox"
              name="acceptTerms"
              checked={formData.acceptTerms}
              onChange={handleInputChange}
              className="mt-0.5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="ml-2 text-sm">
              I agree to the{' '}
              <button type="button" className="text-purple-600 hover:text-purple-700">
                Terms of Service
              </button>{' '}
              and{' '}
              <button type="button" className="text-purple-600 hover:text-purple-700">
                Privacy Policy
              </button>
            </span>
          </label>
          {formErrors.acceptTerms && (
            <p className="mt-1 text-sm text-red-500">{formErrors.acceptTerms}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-purple-600 text-white rounded-xl hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <UserPlus size={18} />
              <span>Create Account</span>
            </>
          )}
        </button>
      </form>

      <div className="text-center">
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          Already have an account?{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-purple-600 hover:text-purple-700 font-medium"
          >
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
};

export default RegisterForm;
