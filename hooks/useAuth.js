import React, { useState, useEffect, createContext, useContext } from 'react';
import { Alert } from 'react-native';
import AuthService from '../services/auth';
import API_BASE_URL from '../config';

const AuthContext = createContext();

const useAuthLogic = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const storedToken = await AuthService.getAccessToken();
      const storedUserData = await AuthService.getUserData();
      
      console.log('🔐 Auth Check - Token exists:', !!storedToken);
      console.log('🔐 Auth Check - User data exists:', !!storedUserData);

      if (storedToken && storedUserData) {
        setUser(storedUserData);
        setToken(storedToken);
        console.log('✅ User set from storage:', storedUserData.first_name);
      } else {
        console.log('🔐 No valid authentication data found');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.log('❌ Auth check error:', error.message);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const signin = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔐 Attempting signin for:', email);
      
      const result = await AuthService.signIn(email, password);
      
      if (result.access_token) {
        setToken(result.access_token);
        setUser(result.user);
        console.log('✅ Signin successful, user:', result.user);
        return { success: true, user: result.user };
      } else {
        throw new Error(result.error || 'Signin failed');
      }
    } catch (error) {
      console.error('❌ Signin error:', error);
      const errorMessage = error.message || 'Signin failed. Please check your credentials and connection.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Attempting signup for:', userData.email);
      
      const result = await AuthService.signUp(userData);
      
      if (result.access_token) {
        setToken(result.access_token);
        setUser(result.user);
        console.log('✅ Signup successful, user:', result.user);
        return { success: true, user: result.user };
      } else {
        throw new Error(result.error || 'Signup failed');
      }
    } catch (error) {
      console.error('❌ Signup error:', error);
      const errorMessage = error.message || 'Signup failed. Please check your connection and try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await AuthService.logout();
      setToken(null);
      setUser(null);
      setError(null);
      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const forgotPassword = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📧 Forgot password request for:', email);
      
      const result = await AuthService.forgotPassword(email);
      
      if (result.success) {
        console.log('✅ Forgot password request successful');
        return { success: true, message: result.message };
      } else {
        throw new Error(result.error || 'Failed to send reset email');
      }
    } catch (error) {
      console.error('❌ Forgot password error:', error);
      const errorMessage = error.message || 'Failed to send reset email. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 Reset password request');
      
      const result = await AuthService.resetPassword(token, newPassword);
      
      if (result.success) {
        console.log('✅ Password reset successful');
        return { success: true, message: result.message };
      } else {
        throw new Error(result.error || 'Failed to reset password');
      }
    } catch (error) {
      console.error('❌ Reset password error:', error);
      const errorMessage = error.message || 'Failed to reset password. Please try again.';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    setError(null);
  };

  return {
    user,
    loading,
    error,
    token,
    signin,
    signup,
    logout,
    forgotPassword,
    resetPassword,
    clearError,
    isAuthenticated: !!user && !!token,
    checkAuthStatus
  };
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const auth = useAuthLogic();
  
  return (
    <AuthContext.Provider value={auth}>
      {children}
    </AuthContext.Provider>
  );
};