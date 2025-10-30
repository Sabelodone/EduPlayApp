// config.js
import { Platform } from 'react-native';

const API_BASE_URL = __DEV__ 
  ? Platform.OS === 'android' 
    ? 'http://10.0.2.2:5000'  // ✅ Android emulator - no /api
    : 'http://192.168.1.196:5000' // ✅ iOS simulator or real device - no /api
  : 'https://your-production-domain.com'; // ✅ Production - no /api

// Optional: Add a helper to verify the URL is correct
export const verifyApiUrl = () => {
  console.log('🔗 API Base URL:', API_BASE_URL);
  console.log('📝 Example endpoints:');
  console.log('   Auth:', `${API_BASE_URL}/auth/signin`);
  console.log('   Dashboard:', `${API_BASE_URL}/api/dashboard/stats`);
  console.log('   Lessons:', `${API_BASE_URL}/lessons/`);
  console.log('   Games:', `${API_BASE_URL}/games/`);
};

export default API_BASE_URL;