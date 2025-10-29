// firebase.js
import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';

// Get config directly from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Validate configuration
const validateConfig = (config) => {
  const required = [
    'apiKey',
    'authDomain', 
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ];

  const missing = required.filter(key => !config[key]);
  if (missing.length > 0) {
    console.warn(`Missing Firebase environment variables: ${missing.join(', ')}`);
    console.warn('Please check your .env file');
    return false;
  }

  return true;
};

// Check if configuration is valid
const isConfigValid = validateConfig(firebaseConfig);

// Initialize Firebase only if config is valid
let app, auth, db, storage;

if (isConfigValid) {
  try {
    app = initializeApp(firebaseConfig);

    // Initialize Auth with persistence
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(ReactNativeAsyncStorage)
    });

    // Initialize Firestore
    db = getFirestore(app);

    // Enable offline persistence (optional)
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (err.code === 'unimplemented') {
        console.warn('The current browser does not support all of the features required to enable persistence.');
      }
    });

    // Initialize Storage
    storage = getStorage(app);

    console.log('🔥 Firebase initialized successfully');
    console.log('📊 Project:', firebaseConfig.projectId);
    
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    // Create fallback empty objects to prevent app crashes
    app = {};
    auth = {};
    db = {};
    storage = {};
  }
} else {
  console.warn('⚠️ Firebase not initialized due to missing configuration');
  // Create fallback empty objects
  app = {};
  auth = {};
  db = {};
  storage = {};
}

// Export services (will be empty objects if initialization failed)
export { auth, db, storage, app };
export default app;