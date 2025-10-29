import React, { useState, useEffect, useRef } from 'react'; // Added useRef
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

const { width, height } = Dimensions.get('window');
const isSmallDevice = height < 700;

export default function SignInScreen() {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({}); // Added for error handling
  
  // FIX: Use useRef for animated values to prevent recreation on re-render
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]); // Added dependency

  // Store tokens in AsyncStorage
  const storeTokens = async (accessToken, refreshToken) => {
    try {
      await AsyncStorage.setItem('access_token', accessToken);
      await AsyncStorage.setItem('refresh_token', refreshToken);
    } catch (error) {
      console.error('Error storing tokens:', error);
    }
  };

  // FIX: Added proper form validation function
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
    // FIX: Use validation function instead of inline checks
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store tokens
        await storeTokens(data.access_token, data.refresh_token);
        
        console.log('User signed in:', data.user?.id);
        
        // FIX: Ensure loading state is reset before navigation
        setIsLoading(false);
        
        // Navigate to HomeScreen
        navigation.navigate('HomeScreen');
        
      } else {
        setIsLoading(false);
        let errorMessage = 'Failed to sign in. Please try again.';
        
        // Handle specific error cases
        if (data.error) {
          errorMessage = data.error;
        }
        
        Alert.alert('Sign In Failed', errorMessage);
      }
      
    } catch (error) {
      setIsLoading(false);
      console.error('Sign in error:', error);
      
      let errorMessage = 'Network error. Please check your connection and try again.';
      
      if (error.message.includes('Network request failed')) {
        errorMessage = 'Cannot connect to server. Please check if your backend is running.';
      }
      
      Alert.alert('Sign In Failed', errorMessage);
    }
  };

  const handleSocialSignIn = async (provider) => {
    Alert.alert('Coming Soon', `${provider} sign-in will be available soon!`);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // FIX: Improved forgot password with better error handling
  const handleForgotPassword = () => {
    if (!email) {
      Alert.alert('Email Required', 'Please enter your email address first.');
      // FIX: Set email error
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

              if (response.ok) {
                Alert.alert('Success', data.message || 'Password reset email sent! Check your inbox.');
              } else {
                Alert.alert('Error', data.error || 'Failed to send reset email. Please try again.');
              }
            } catch (error) {
              console.error('Forgot password error:', error);
              Alert.alert('Error', 'Network error. Please try again.');
            }
          },
        },
      ]
    );
  };

  // FIX: Clear errors when user starts typing
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

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={['#0A7C72', '#0fbfae', '#F5E27A']}
        style={styles.container}
      >
        {/* Background Bubbles */}
        <View style={styles.bubbleContainer}>
          <View style={[styles.bubble, styles.bubble1]} />
          <View style={[styles.bubble, styles.bubble2]} />
          <View style={[styles.bubble, styles.bubble3]} />
        </View>

        <KeyboardAvoidingView
          style={styles.keyboardAvoid}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false} // FIX: Added for better UX
          >
            <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
              
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity 
                  style={styles.backButton}
                  onPress={() => navigation.goBack()}
                >
                  <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
                  <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
                <Text style={[styles.title, isSmallDevice && styles.titleSmall]}>Welcome Back</Text>
                <Text style={[styles.subtitle, isSmallDevice && styles.subtitleSmall]}>
                  Sign in to continue your learning journey
                </Text>
              </View>

              {/* Form Card */}
              <View style={[styles.formCard, isSmallDevice && styles.formCardSmall]}>
                
                {/* Email Input */}
                <View style={styles.inputWrapper}>
                  <View style={[styles.inputContainer, errors.email && styles.inputError]}>
                    <Ionicons name="mail-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      placeholder="Email address"
                      placeholderTextColor="#8E8E93"
                      value={email}
                      onChangeText={handleEmailChange} // FIX: Use new handler
                      style={styles.input}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      autoComplete="email"
                      returnKeyType="next"
                      editable={!isLoading}
                    />
                  </View>
                  {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
                </View>

                {/* Password Input */}
                <View style={styles.inputWrapper}>
                  <View style={[styles.inputContainer, errors.password && styles.inputError]}>
                    <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
                    <TextInput
                      placeholder="Password"
                      placeholderTextColor="#8E8E93"
                      value={password}
                      onChangeText={handlePasswordChange} // FIX: Use new handler
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
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color="#8E8E93" 
                      />
                    </TouchableOpacity>
                  </View>
                  {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
                </View>

                {/* Forgot Password */}
                <TouchableOpacity 
                  style={styles.forgotPassword}
                  onPress={handleForgotPassword}
                  disabled={isLoading}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>

                {/* Sign In Button */}
                <TouchableOpacity 
                  style={[styles.signInButton, isLoading && styles.signInButtonDisabled]}
                  onPress={handleSignIn}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={['#0A7C72', '#0fbfae']}
                    style={styles.signInGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {isLoading ? (
                      <Ionicons name="refresh" size={20} color="#FFFFFF" />
                    ) : (
                      <>
                        <Text style={styles.signInButtonText}>Sign In</Text>
                        <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or continue with</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Social Sign In */}
              <View style={styles.socialContainer}>
                <TouchableOpacity 
                  style={[styles.socialButton, isLoading && styles.socialButtonDisabled]}
                  onPress={() => handleSocialSignIn('apple')}
                  disabled={isLoading}
                >
                  <Ionicons name="logo-apple" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.socialButton, isLoading && styles.socialButtonDisabled]}
                  onPress={() => handleSocialSignIn('google')}
                  disabled={isLoading}
                >
                  <Ionicons name="logo-google" size={24} color="#FFFFFF" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.socialButton, isLoading && styles.socialButtonDisabled]}
                  onPress={() => handleSocialSignIn('facebook')}
                  disabled={isLoading}
                >
                  <Ionicons name="logo-facebook" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              {/* Sign Up Option */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Don't have an account? </Text>
                <TouchableOpacity 
                  onPress={() => navigation.navigate('SignUpScreen')}
                  disabled={isLoading}
                >
                  <Text style={[styles.signUpLink, isLoading && styles.signUpLinkDisabled]}>Sign Up</Text>
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
  },
  container: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  bubbleContainer: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  bubble: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 100,
  },
  bubble1: {
    width: 80,
    height: 80,
    top: '10%',
    right: '15%',
  },
  bubble2: {
    width: 60,
    height: 60,
    bottom: '25%',
    left: '10%',
  },
  bubble3: {
    width: 100,
    height: 100,
    bottom: '10%',
    right: '20%',
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
    paddingVertical: 8,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  titleSmall: {
    fontSize: 30,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitleSmall: {
    fontSize: 14,
  },
  formCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 25,
    padding: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 30,
  },
  formCardSmall: {
    padding: 24,
    borderRadius: 20,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 15,
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  inputError: {
    borderColor: '#FF6B6B',
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
    fontWeight: '500',
  },
  errorText: {
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 25,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  signInButton: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#0A7C72',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInGradient: {
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginRight: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 25,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  dividerText: {
    marginHorizontal: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: 30,
  },
  socialButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  socialButtonDisabled: {
    opacity: 0.5,
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  signUpText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  signUpLink: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  signUpLinkDisabled: {
    opacity: 0.5,
  },
});