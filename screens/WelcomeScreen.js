import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
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

    // Check if user is already logged in
    checkUserAuth();
  }, []);

  const checkUserAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (token) {
        // User is logged in, navigate to home
        setTimeout(() => {
          navigation.navigate('HomeScreen');
        }, 1000);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
    }
  };

  const handleGuestAccess = async () => {
    try {
      // Set guest flag in storage
      await AsyncStorage.setItem('is_guest', 'true');
      // Navigate to home screen
      navigation.navigate('HomeScreen');
    } catch (error) {
      console.error('Error setting guest access:', error);
      // Fallback navigation
      navigation.navigate('HomeScreen');
    }
  };

  return (
    <LinearGradient
      colors={['#0A7C72', '#0fbfae', '#F5E27A']}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Ionicons name="sparkles" size={isSmallDevice ? 28 : 32} color="#FFFFFF" />
              <Text style={[styles.logo, isSmallDevice && styles.logoSmall]}>EduPlay</Text>
            </View>
            <Text style={[styles.slogan, isSmallDevice && styles.sloganSmall]}>
              Learn. Play. Grow.
            </Text>
          </View>

          {/* Main Content */}
          <View style={styles.mainContent}>
            <View style={[styles.featureCard, isSmallDevice && styles.featureCardSmall]}>
              <Ionicons 
                name="game-controller" 
                size={isSmallDevice ? 40 : 48} 
                color="#0A7C72" 
              />
              <Text style={[styles.featureTitle, isSmallDevice && styles.featureTitleSmall]}>
                Interactive Games
              </Text>
              <Text style={[styles.featureDescription, isSmallDevice && styles.featureDescriptionSmall]}>
                Engaging educational games powered by AI that make learning fun and personalized
              </Text>
            </View>

            <View style={[styles.featureCard, isSmallDevice && styles.featureCardSmall]}>
              <Ionicons 
                name="school" 
                size={isSmallDevice ? 40 : 48} 
                color="#0A7C72" 
              />
              <Text style={[styles.featureTitle, isSmallDevice && styles.featureTitleSmall]}>
                CAPS Aligned
              </Text>
              <Text style={[styles.featureDescription, isSmallDevice && styles.featureDescriptionSmall]}>
                Curriculum-aligned content for Grades 10-12 in Mathematics, English, Sciences and more
              </Text>
            </View>

            <View style={[styles.featureCard, isSmallDevice && styles.featureCardSmall]}>
              <Ionicons 
                name="trophy" 
                size={isSmallDevice ? 40 : 48} 
                color="#0A7C72" 
              />
              <Text style={[styles.featureTitle, isSmallDevice && styles.featureTitleSmall]}>
                Earn Rewards
              </Text>
              <Text style={[styles.featureDescription, isSmallDevice && styles.featureDescriptionSmall]}>
                Collect badges, achievements, and track your progress as you learn
              </Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionContainer}>
            <TouchableOpacity
              style={[styles.primaryButton, isSmallDevice && styles.buttonSmall]}
              onPress={() => navigation.navigate('SignInScreen')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#0A7C72', '#0fbfae']}
                style={styles.buttonGradient}
              >
                <Text style={[styles.primaryButtonText, isSmallDevice && styles.buttonTextSmall]}>
                  Sign In
                </Text>
                <Ionicons name="log-in" size={isSmallDevice ? 18 : 20} color="#FFFFFF" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, isSmallDevice && styles.buttonSmall]}
              onPress={() => navigation.navigate('SignUpScreen')}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#FFFFFF', '#F8F9FA']}
                style={styles.secondaryButtonGradient}
              >
                <Text style={[styles.secondaryButtonText, isSmallDevice && styles.buttonTextSmall]}>
                  Create Account
                </Text>
                <Ionicons name="person-add" size={isSmallDevice ? 18 : 20} color="#0A7C72" />
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={handleGuestAccess}
              activeOpacity={0.7}
            >
              <Text style={[styles.tertiaryButtonText, isSmallDevice && styles.tertiaryTextSmall]}>
                Continue as Guest
              </Text>
              <Ionicons name="play-circle" size={isSmallDevice ? 18 : 20} color="#0A7C72" />
            </TouchableOpacity>

            {/* Additional Info */}
            <View style={styles.infoContainer}>
              <Text style={styles.infoText}>
                Guest access provides limited features. Sign up for full access to all games, progress tracking, and personalized learning.
              </Text>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: height * 0.08,
    marginBottom: 20,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  logoSmall: {
    fontSize: 28,
  },
  slogan: {
    fontSize: 18,
    color: '#FFFFFF',
    opacity: 0.9,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  sloganSmall: {
    fontSize: 16,
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
    marginBottom: 40,
  },
  featureCard: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
    marginVertical: 8,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  featureCardSmall: {
    padding: 20,
    marginVertical: 6,
    borderRadius: 16,
  },
  featureTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0A7C72',
    marginTop: 12,
    marginBottom: 8,
    textAlign: 'center',
  },
  featureTitleSmall: {
    fontSize: 18,
    marginTop: 10,
    marginBottom: 6,
  },
  featureDescription: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  featureDescriptionSmall: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 5,
  },
  actionContainer: {
    width: '100%',
    paddingBottom: 20,
  },
  primaryButton: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#0A7C72',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonSmall: {
    marginBottom: 10,
    borderRadius: 12,
  },
  buttonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  secondaryButton: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(10, 124, 114, 0.1)',
  },
  secondaryButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#0A7C72',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
  },
  buttonTextSmall: {
    fontSize: 16,
  },
  tertiaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  tertiaryButtonText: {
    color: '#0A7C72',
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
    textShadowColor: 'rgba(255, 255, 255, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  tertiaryTextSmall: {
    fontSize: 15,
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
  },
  infoText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});