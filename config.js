// config.js
import { Platform } from 'react-native';

const API_BASE_URL = __DEV__
  ? Platform.OS === 'android'
    ? 'http://10.0.2.2:5000/api'  // Android emulator
    : 'http://192.168.1.196:5000/api' // iOS simulator or real device
  : 'https://your-production-domain.com/api';

// Correct URL verification
export const verifyApiUrl = async () => {
  console.log('🔗 API Base URL:', API_BASE_URL);
  console.log('📋 Example endpoints:');
  console.log('   Health:', `${API_BASE_URL}/health`); // ✅ Fixed: /api/health
  console.log('   Auth:', `${API_BASE_URL}/auth/signin`);
  console.log('   Dashboard:', `${API_BASE_URL}/dashboard/stats`);
  
  try {
    // Test the connection to the correct health endpoint
    const healthUrl = `${API_BASE_URL}/health`; // ✅ This is now correct
    console.log('🩺 Testing connection to:', healthUrl);
    
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API server is reachable and healthy:', data);
      return true;
    } else {
      console.log('❌ API server responded with:', response.status);
      console.log('💡 The server is running but the health endpoint might be missing');
      return false;
    }
  } catch (error) {
    console.log('❌ Cannot reach API server:', error.message);
    console.log('💡 Troubleshooting steps:');
    console.log('   1. Make sure Flask server is running: python app.py');
    console.log('   2. Check if the IP address 192.168.1.196 is correct');
    console.log('   3. Ensure both devices are on the same WiFi network');
    console.log('   4. For iOS Simulator, try: http://localhost:5000/api');
    return false;
  }
};

export default API_BASE_URL;