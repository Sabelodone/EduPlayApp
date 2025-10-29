import AsyncStorage from '@react-native-async-storage/async-storage';

export const AuthService = {
  async storeTokens(accessToken, refreshToken) {
    try {
      await AsyncStorage.multiSet([
        ['access_token', accessToken],
        ['refresh_token', refreshToken],
      ]);
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  },

  async clearTokens() {
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
    } catch (error) {
      console.error('Error clearing tokens:', error);
    }
  },

  async isAuthenticated() {
    try {
      const token = await AsyncStorage.getItem('access_token');
      return !!token;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  },

  async getAccessToken() {
    return await AsyncStorage.getItem('access_token');
  }
};

export default AuthService;