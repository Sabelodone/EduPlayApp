// config.js
import { Platform } from 'react-native';

const API_BASE_URL = __DEV__ 
  ? Platform.OS === 'android' 
    ? 'http://10.0.2.2:5000/api'  // Android emulator
    : 'http://192.168.1.196:5000/api' // iOS simulator or real device
  : 'https://your-production-domain.com/api'; // Production

export default API_BASE_URL;