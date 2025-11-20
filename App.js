// App.js
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, ActivityIndicator } from 'react-native';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { API_BASE_URL, verifyApiUrl } from './config';

// Import all screens
import WelcomeScreen from './screens/WelcomeScreen';
import SignInScreen from './screens/SignInScreen';
import SignUpScreen from './screens/SignUpScreen';
import StudentDashboardScreen from './screens/StudentDashboardScreen';
import HomeScreen from './screens/HomeScreen';
import GamesScreen from './screens/GamesScreen';
import LessonsScreen from './screens/LessonsScreen';
import ChallengesScreen from './screens/ChallengesScreen';
import ProgressScreen from './screens/ProgressScreen';
import ProfileScreen from './screens/ProfileScreen';
import QuizScreen from './screens/QuizScreen';

const Stack = createStackNavigator();

function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0A7C72' }}>
      <View style={{ 
        width: 80, 
        height: 80, 
        borderRadius: 40, 
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20
      }}>
        <Text style={{ fontSize: 32, color: '#FFFFFF' }}>🎓</Text>
      </View>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#FFFFFF', marginBottom: 10 }}>EduPlay</Text>
      <Text style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', marginBottom: 30 }}>Loading your learning journey...</Text>
      <ActivityIndicator size="large" color="#FFFFFF" />
    </View>
  );
}

function AppNavigator() {
  const { user, loading } = useAuth();

  console.log('🔄 App Navigator - Auth State:', { 
    user: user ? `${user.first_name} ${user.last_name}` : 'No user', 
    loading 
  });

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        gestureEnabled: true,
        cardStyle: { backgroundColor: 'white' }
      }}
    >
      {user ? (
        // User is signed in - show main app screens
        <>
          <Stack.Screen name="HomeScreen" component={HomeScreen} />
          <Stack.Screen name="StudentDashboardScreen" component={StudentDashboardScreen} />
          <Stack.Screen name="GamesScreen" component={GamesScreen} />
          <Stack.Screen name="LessonsScreen" component={LessonsScreen} />
          <Stack.Screen name="ChallengesScreen" component={ChallengesScreen} />
          <Stack.Screen name="ProgressScreen" component={ProgressScreen} />
          <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
          <Stack.Screen name="QuizScreen" component={QuizScreen} />
        </>
      ) : (
        // User is not signed in - show auth screens
        <>
          <Stack.Screen name="WelcomeScreen" component={WelcomeScreen} />
          <Stack.Screen name="SignInScreen" component={SignInScreen} />
          <Stack.Screen name="SignUpScreen" component={SignUpScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  useEffect(() => {
    verifyApiUrl();
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer>
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}