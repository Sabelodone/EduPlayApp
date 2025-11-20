import apiService from './apiService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthService = {
  async signIn(email, password) {
    try {
      console.log('🔐 AuthService: Signing in...');
      const result = await apiService.signIn(email, password);
      console.log('✅ AuthService: Sign in successful');
      return result;
    } catch (error) {
      console.error('❌ AuthService: Sign in failed:', error);
      throw error;
    }
  },

  async signUp(userData) {
    try {
      console.log('🚀 AuthService: Signing up...');
      const result = await apiService.signUp(userData);
      console.log('✅ AuthService: Sign up successful');
      return result;
    } catch (error) {
      console.error('❌ AuthService: Sign up failed:', error);
      throw error;
    }
  },

  async logout() {
    try {
      console.log('🚪 AuthService: Logging out...');
      const result = await apiService.logout();
      await this.clearTokens();
      console.log('✅ AuthService: Logout successful');
      return result;
    } catch (error) {
      console.error('❌ AuthService: Logout failed:', error);
      await this.clearTokens();
      throw error;
    }
  },

  async refreshToken() {
    try {
      console.log('🔄 AuthService: Refreshing token...');
      const result = await apiService.refreshToken();
      if (result.access_token) {
        await AsyncStorage.setItem('access_token', result.access_token);
      }
      console.log('✅ AuthService: Token refresh successful');
      return result;
    } catch (error) {
      console.error('❌ AuthService: Token refresh failed:', error);
      throw error;
    }
  },

  async forgotPassword(email) {
    try {
      console.log('📧 AuthService: Forgot password request...');
      const result = await apiService.forgotPassword(email);
      console.log('✅ AuthService: Forgot password request successful');
      return result;
    } catch (error) {
      console.error('❌ AuthService: Forgot password failed:', error);
      throw error;
    }
  },

  async resetPassword(token, newPassword) {
    try {
      console.log('🔄 AuthService: Resetting password...');
      const result = await apiService.resetPassword(token, newPassword);
      console.log('✅ AuthService: Password reset successful');
      return result;
    } catch (error) {
      console.error('❌ AuthService: Password reset failed:', error);
      throw error;
    }
  },

  async validateResetToken(token) {
    try {
      console.log('🔍 AuthService: Validating reset token...');
      const result = await apiService.validateResetToken(token);
      console.log('✅ AuthService: Token validation successful');
      return result;
    } catch (error) {
      console.error('❌ AuthService: Token validation failed:', error);
      throw error;
    }
  },

  async storeTokens(accessToken, refreshToken, userData) {
    try {
      await AsyncStorage.multiSet([
        ['access_token', accessToken],
        ['refresh_token', refreshToken],
        ['user_data', JSON.stringify(userData)]
      ]);
      console.log('✅ AuthService: Tokens stored successfully');
    } catch (error) {
      console.error('❌ AuthService: Error storing tokens:', error);
      throw error;
    }
  },

  async getAccessToken() {
    try {
      return await AsyncStorage.getItem('access_token');
    } catch (error) {
      console.error('❌ AuthService: Error getting access token:', error);
      return null;
    }
  },

  async getRefreshToken() {
    try {
      return await AsyncStorage.getItem('refresh_token');
    } catch (error) {
      console.error('❌ AuthService: Error getting refresh token:', error);
      return null;
    }
  },

  async getUserData() {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      return userData ? JSON.parse(userData) : null;
    } catch (error) {
      console.error('❌ AuthService: Error getting user data:', error);
      return null;
    }
  },

  async clearTokens() {
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
      console.log('✅ AuthService: Tokens cleared successfully');
    } catch (error) {
      console.error('❌ AuthService: Error clearing tokens:', error);
      throw error;
    }
  },

  async isAuthenticated() {
    try {
      const token = await this.getAccessToken();
      return !!token;
    } catch (error) {
      console.error('❌ AuthService: Error checking authentication:', error);
      return false;
    }
  }
};

export default AuthService;