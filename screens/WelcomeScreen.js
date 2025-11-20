import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

export default function WelcomeScreen() {
  const navigation = useNavigation();
  const fadeAnim = new Animated.Value(0);

  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      console.log('🔐 Auth Check - Token:', token ? 'Exists' : 'None');
      
      if (token) {
        // Validate token with backend
        const isValid = await validateToken(token);
        if (isValid) {
          setTimeout(() => {
            navigation.navigate('HomeScreen');
          }, 1000);
        } else {
          // Invalid token, clear it
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('user_data');
        }
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const validateToken = async (token) => {
    try {
      const response = await fetch('http://192.168.1.196:5000/api/auth/validate', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      return response.ok;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  };

const handleGuestAccess = async () => {
  try {
    await AsyncStorage.setItem('is_guest', 'true');
    console.log('🎮 Continuing as guest');
    
    // Use navigation to go to HomeScreen
    navigation.navigate('HomeScreen');
  } catch (error) {
    console.error('Error setting guest access:', error);
    Alert.alert('Error', 'Failed to continue as guest');
  }
};
  const handleSignIn = () => {
    console.log('📱 Navigating to SignInScreen');
    navigation.navigate('SignInScreen');
  };

  const handleSignUp = () => {
    console.log('📱 Navigating to SignUpScreen');
    navigation.navigate('SignUpScreen');
  };

  return (
    <LinearGradient
      colors={['#0A7C72', '#0fbfae']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logo}>
              <Ionicons name="school" size={40} color="#FFFFFF" />
            </View>
            <Text style={styles.appName}>EduLearn</Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <Text style={[styles.welcomeTitle, isSmallDevice && styles.welcomeTitleSmall]}>
              Welcome to EduLearn
            </Text>
            <Text style={[styles.welcomeSubtitle, isSmallDevice && styles.welcomeSubtitleSmall]}>
              Discover your potential through personalized learning experiences
            </Text>

            {/* Feature Icons */}
            <View style={styles.features}>
              <View style={styles.featureItem}>
                <Ionicons name="book" size={24} color="#FFFFFF" />
                <Text style={styles.featureText}>Courses</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="bar-chart" size={24} color="#FFFFFF" />
                <Text style={styles.featureText}>Progress</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="trophy" size={24} color="#FFFFFF" />
                <Text style={styles.featureText}>Achievements</Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, isSmallDevice && styles.buttonSmall]}
              onPress={handleSignIn}
              activeOpacity={0.8}
            >
              <Text style={[styles.primaryButtonText, isSmallDevice && styles.buttonTextSmall]}>
                Sign In
              </Text>
              <Ionicons name="log-in" size={isSmallDevice ? 18 : 20} color="#0A7C72" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, isSmallDevice && styles.buttonSmall]}
              onPress={handleSignUp}
              activeOpacity={0.8}
            >
              <Text style={[styles.secondaryButtonText, isSmallDevice && styles.buttonTextSmall]}>
                Create Account
              </Text>
              <Ionicons name="person-add" size={isSmallDevice ? 18 : 20} color="#FFFFFF" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={handleGuestAccess}
              activeOpacity={0.7}
            >
              <Text style={[styles.tertiaryButtonText, isSmallDevice && styles.tertiaryTextSmall]}>
                Continue as Guest
              </Text>
              <Ionicons name="arrow-forward" size={isSmallDevice ? 16 : 18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  safeArea: { 
    flex: 1 
  },
  content: { 
    flex: 1, 
    paddingHorizontal: 32, 
    justifyContent: 'space-between',
    paddingVertical: 40 
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.08,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: '300',
    color: '#FFFFFF',
    letterSpacing: 1,
  },
  mainContent: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center',
  },
  welcomeTitle: { 
    fontSize: 28, 
    fontWeight: '300', 
    color: '#FFFFFF', 
    textAlign: 'center',
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  welcomeTitleSmall: { 
    fontSize: 24 
  },
  welcomeSubtitle: { 
    fontSize: 16, 
    color: '#FFFFFF', 
    textAlign: 'center',
    opacity: 0.9,
    lineHeight: 22,
    paddingHorizontal: 20,
    marginBottom: 40,
    fontWeight: '300',
  },
  welcomeSubtitleSmall: { 
    fontSize: 14,
    lineHeight: 20 
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 30,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 8,
    fontWeight: '300',
  },
  actionContainer: { 
    width: '100%',
    marginBottom: 30 
  },
  primaryButton: { 
    backgroundColor: '#FFFFFF',
    borderRadius: 12, 
    marginBottom: 12, 
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  buttonSmall: { 
    marginBottom: 10, 
    paddingVertical: 14,
  },
  primaryButtonText: { 
    color: '#0A7C72', 
    fontSize: 16, 
    fontWeight: '600', 
    marginRight: 8 
  },
  secondaryButton: { 
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12, 
    marginBottom: 12, 
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  secondaryButtonText: { 
    color: '#FFFFFF', 
    fontSize: 16, 
    fontWeight: '600', 
    marginRight: 8 
  },
  buttonTextSmall: { 
    fontSize: 15 
  },
  tertiaryButton: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 16 
  },
  tertiaryButtonText: { 
    color: '#FFFFFF', 
    fontSize: 14, 
    fontWeight: '400', 
    marginRight: 8,
    opacity: 0.9,
  },
  tertiaryTextSmall: { 
    fontSize: 13 
  }
});