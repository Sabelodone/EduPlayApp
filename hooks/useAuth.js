// hooks/useAuth.js
import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { logFirebaseError } from '../utils/firebaseErrors';

export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        setUser(user);
        setLoading(false);
        setError(null);
      },
      (error) => {
        logFirebaseError(error, 'auth-state-change');
        setError(error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      logFirebaseError(error, 'logout');
      throw error;
    }
  };

  return {
    user,
    loading,
    error,
    logout,
    isAuthenticated: !!user
  };
};