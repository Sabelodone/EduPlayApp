// utils/firebaseErrors.js
export const getFirebaseErrorMessage = (error) => {
  const errorCode = error.code;
  
  const errorMessages = {
    // Authentication Errors
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password. Please try again.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/too-many-requests': 'Too many attempts. Please try again later.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    
    // Firestore Errors
    'permission-denied': 'You do not have permission to perform this action.',
    'unavailable': 'Service is temporarily unavailable. Please try again.',
    'deadline-exceeded': 'Request timed out. Please try again.',
    
    // Storage Errors
    'storage/unauthorized': 'You are not authorized to perform this action.',
    'storage/canceled': 'Operation was canceled.',
    'storage/unknown': 'An unknown error occurred.',
  };

  return errorMessages[errorCode] || error.message || 'An unexpected error occurred.';
};

export const logFirebaseError = (error, context) => {
  console.error(`🔥 Firebase Error [${context}]:`, {
    code: error.code,
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
};