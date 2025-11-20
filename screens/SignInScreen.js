import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import API_BASE_URL from '../config';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

export default function SignInScreen() {
  const navigation = useNavigation();
  const { signin, loading: authLoading } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  
  // Enhanced animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideUpAnim = useRef(new Animated.Value(30)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Staggered animations for better visual appeal
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideUpAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      })
    ]).start();
  }, [fadeAnim, slideUpAnim, scaleAnim]);

  const validateForm = () => {
    const newErrors = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

const handleSignIn = async () => {
  if (!validateForm()) {
    return;
  }

  setIsLoading(true);
  console.log('🔐 Attempting signin for:', email);
  
  try {
    const result = await signin(email.toLowerCase().trim(), password);
    
    if (result.success) {
      console.log('✅ User signed in successfully:', result.user);
      // Navigation will be handled automatically by auth state
    } else {
      console.log('❌ Signin failed:', result.error);
      
      // More specific error messages
      let errorMessage = result.error;
      if (result.error.includes('Invalid email or password')) {
        errorMessage = 'The email or password you entered is incorrect. Please try again.';
      } else if (result.error.includes('network') || result.error.includes('connection')) {
        errorMessage = 'Network error. Please check your connection and try again.';
      }
      
      Alert.alert('Sign In Failed', errorMessage);
    }
    
  } catch (error) {
    console.error('❌ Sign in error:', error);
    Alert.alert('Sign In Failed', 'An unexpected error occurred. Please try again.');
  } finally {
    setIsLoading(false);
  }
};

  const handleSocialSignIn = async (provider) => {
    Alert.alert('Coming Soon', `${provider} sign-in will be available soon!`);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address first.');
      setErrors(prev => ({ ...prev, email: 'Email is required for password reset' }));
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      return;
    }

    Alert.alert(
      'Reset Password',
      `Send password reset instructions to ${email}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Send',
          onPress: async () => {
            try {
              setIsLoading(true);
              console.log('📤 Sending forgot password request for:', email);
              
              const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  email: email.toLowerCase().trim()
                }),
              });

              const data = await response.json();
              console.log('📥 Forgot password response:', data);

              if (response.ok) {
                Alert.alert(
                  'Check Your Email', 
                  data.message || 'If an account with that email exists, we\'ve sent password reset instructions.',
                  [{ text: 'OK', style: 'default' }]
                );
              } else {
                Alert.alert('Error', data.error || 'Failed to send reset email. Please try again.');
              }
            } catch (error) {
              console.error('❌ Forgot password error:', error);
              Alert.alert('Error', 'Network error. Please try again.');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleEmailChange = (text) => {
    setEmail(text);
    if (errors.email) {
      setErrors(prev => ({ ...prev, email: '' }));
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleQuickTest = async () => {
    // Quick test with the existing user
    console.log('🧪 Running quick signin test...');
    await handleSignIn();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#0A7C72', '#0fbfae', '#F5E27A']}
        style={styles.container}
      >
        {/* Enhanced Background Bubbles */}
        <View style={styles.bubbleContainer}>
          <Animated.View style={[styles.bubble, styles.bubble1, { opacity: fadeAnim }]} />
          <Animated.View style={[styles.bubble, styles.bubble2, { opacity: fadeAnim }]} />
          <Animated.View style={[styles.bubble, styles.bubble3, { opacity: fadeAnim }]} />
          <Animated.View style={[styles.bubble, styles.bubble4, { opacity: fadeAnim }]} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={[
              styles.content, 
              { 
                opacity: fadeAnim,
                transform: [
                  { translateY: slideUpAnim },
                  { scale: scaleAnim }
                ]
              }
            ]}>
              
              {/* Enhanced Header */}
              <View style={styles.header}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                  activeOpacity={0.7}
                  disabled={isLoading}
                >
                  <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, isSmallDevice && styles.titleSmall]}>
                  Welcome Back! 👋
                </Text>
                <Text style={[styles.subtitle, isSmallDevice && styles.subtitleSmall]}>
                  Sign in to continue your learning journey
                </Text>
                
                {/* Quick Test Button - Remove in production */}
                {__DEV__ && (
                  <TouchableOpacity 
                    style={styles.testButton}
                    onPress={handleQuickTest}
                    disabled={isLoading}
                  >
                    <Text style={styles.testButtonText}>Quick Test Sign In</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Enhanced Form Card */}
              <Animated.View style={[
                styles.formCard, 
                isSmallDevice && styles.formCardSmall,
                {
                  transform: [{ scale: scaleAnim }]
                }
              ]}>
                
                {/* Email Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Email Address</Text>
                  <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                    <Ionicons name="mail-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      placeholder="Enter your email"
                      placeholderTextColor="#8E8E93"
                      value={email}
                      onChangeText={handleEmailChange}
                      style={styles.input}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      returnKeyType="next"
                      editable={!isLoading}
                    />
                  </View>
                  {errors.email ? (
                    <View style={styles.errorContainer}>
                      <Ionicons name="warning-outline" size={14} color="#FF6B6B" />
                      <Text style={styles.errorText}>{errors.email}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Password Input */}
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputLabel}>Password</Text>
                  <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                    <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      placeholder="Enter your password"
                      placeholderTextColor="#8E8E93"
                      value={password}
                      onChangeText={handlePasswordChange}
                      secureTextEntry={!showPassword}
                      style={styles.input}
                      autoComplete="password"
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="done"
                      onSubmitEditing={handleSignIn}
                      editable={!isLoading}
                    />
                    <TouchableOpacity 
                      onPress={togglePasswordVisibility}
                      disabled={isLoading}
                      style={styles.eyeButton}
                      activeOpacity={0.7}
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color="#8E8E93" 
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.password ? (
                    <View style={styles.errorContainer}>
                      <Ionicons name="warning-outline" size={14} color="#FF6B6B" />
                      <Text style={styles.errorText}>{errors.password}</Text>
                    </View>
                  ) : null}
                </View>

                {/* Forgot Password */}
                <TouchableOpacity 
                  style={styles.forgotPassword}
                  onPress={handleForgotPassword}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>

                {/* Enhanced Sign In Button */}
                <TouchableOpacity 
                  style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
                  onPress={handleSignIn}
                  disabled={isLoading}
                  activeOpacity={0.9}
                >
                  <LinearGradient
                    colors={isLoading ? ['#8E8E93', '#8E8E93'] : ['#0A7C72', '#0fbfae']}
                    style={styles.signInGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {isLoading ? (
                      <View style={styles.loadingContainer}>
                        <Ionicons name="refresh" size={20} color="#FFFFFF" style={styles.loadingIcon} />
                        <Text style={styles.signInButtonText}>Signing In...</Text>
                      </View>
                    ) : (
                      <View style={styles.buttonContent}>
                        <Text style={styles.signInButtonText}>Sign In</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>

              {/* Enhanced Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Enhanced Social Sign In */}
              <View style={styles.socialContainer}>
                {['apple', 'google', 'facebook'].map((provider, index) => (
                  <Animated.View
                    key={provider}
                    style={{
                      opacity: fadeAnim,
                      transform: [{
                        translateY: slideUpAnim.interpolate({
                          inputRange: [0, 30],
                          outputRange: [0, 10 * (index + 1)]
                        })
                      }]
                    }}
                  >
                    <TouchableOpacity 
                      style={[styles.socialButton, isLoading && styles.socialButtonDisabled]}
                      onPress={() => handleSocialSignIn(provider)}
                      disabled={isLoading}
                      activeOpacity={0.8}
                    >
                      <Ionicons 
                        name={`logo-${provider}`} 
                        size={24} 
                        color="#FFFFFF" 
                      />
                    </TouchableOpacity>
                  </Animated.View>
                ))}
              </View>

              {/* Enhanced Sign Up Option */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don't have an account? </Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('SignUpScreen')}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.signUpLink, isLoading && styles.signUpLinkDisabled]}>
                    Sign Up
                  </Text>
                </TouchableOpacity>
              </View>

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0A7C72',
  },
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
    justifyContent: 'center',
  },
  bubbleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 100,
  },
  bubble1: {
    width: 120,
    height: 120,
    top: '5%',
    right: '10%',
  },
  bubble2: {
    width: 80,
    height: 80,
    bottom: '20%',
    left: '5%',
  },
  bubble3: {
    width: 60,
    height: 60,
    top: '15%',
    left: '20%',
  },
  bubble4: {
    width: 90,
    height: 90,
    bottom: '10%',
    right: '25%',
  },
  header: {
    marginBottom: 40,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 4,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  titleSmall: {
    fontSize: 30,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
    lineHeight: 22,
  },
  subtitleSmall: {
    fontSize: 14,
  },
  testButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 28,
    padding: 32,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.25,
    shadowRadius: 25,
    elevation: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  formCardSmall: {
    padding: 24,
    borderRadius: 24,
  },
  inputWrapper: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0A7C72',
    marginBottom: 8,
    marginLeft: 4,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 18,
    height: 58,
    borderWidth: 2,
    borderColor: 'rgba(10, 124, 114, 0.1)',
    shadowColor: '#0A7C72',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  inputError: {
    borderColor: '#FF6B6B',
    backgroundColor: '#FFF5F5',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
  },
  eyeButton: {
    padding: 4,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: 4,
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 6,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 28,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: '#0A7C72',
    fontSize: 15,
    fontWeight: '600',
  },
  signInButton: {
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#0A7C72',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  signInButtonDisabled: {
    opacity: 0.7,
  },
  signInGradient: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingIcon: {
    marginRight: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 30,
  },
  dividerLine: {
    flex: 1,
    height: 1.5,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 30,
  },
  socialButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 10,
  },
  signUpText: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  signUpLink: {
    fontSize: 15,
    color: '#FFFFFF',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  signUpLinkDisabled: {
    opacity: 0.5,
  },
});