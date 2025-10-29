import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ScrollView, 
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

// Simplified data as requested
const GRADES = ['Grade 10', 'Grade 11', 'Grade 12'];

const SUBJECTS = [
  'Mathematics',
  'Physical Sciences', 
  'Accounting',
  'English'
];

export default function SignUpScreen() {
  const navigation = useNavigation();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    
    // Step 2: Educational Info
    gradeLevel: '',
    school: '',
    customSchool: '',
    preferredLanguage: 'English',
    subjects: [],
    
    // Step 3: Guardian Info
    isMinor: true,
    guardianName: '',
    guardianEmail: '',
    guardianPhone: '',
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubjectToggle = (subject) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }));
  };

  const validateStep1 = () => {
    if (!formData.fullName.trim()) {
      Alert.alert('Error', 'Please enter your full name');
      return false;
    }
    if (!formData.email || !/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return false;
    }
    if (formData.password.length < 6) {
      Alert.alert('Error', 'Password should be at least 6 characters');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return false;
    }
    return true;
  };

  const validateStep2 = () => {
    if (!formData.gradeLevel) {
      Alert.alert('Error', 'Please select your grade level');
      return false;
    }
    if (!formData.school && !formData.customSchool) {
      Alert.alert('Error', 'Please select or enter your school');
      return false;
    }
    if (formData.subjects.length === 0) {
      Alert.alert('Error', 'Please select at least one subject');
      return false;
    }
    return true;
  };

  const nextStep = () => {
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    setCurrentStep(prev => prev + 1);
  };

  const prevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSocialSignUp = async (provider) => {
    Alert.alert('Coming Soon', `${provider} sign-up will be available soon!`);
  };

  const completeRegistration = async () => {
    if (formData.isMinor && (!formData.guardianName || !formData.guardianEmail)) {
      Alert.alert('Error', 'Please provide guardian information');
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_BASE_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          gradeLevel: formData.gradeLevel,
          school: formData.school || formData.customSchool,
          preferredLanguage: formData.preferredLanguage,
          subjects: formData.subjects,
          isMinor: formData.isMinor,
          guardianName: formData.guardianName.trim(),
          guardianEmail: formData.guardianEmail.toLowerCase().trim(),
          guardianPhone: formData.guardianPhone.trim(),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store tokens
        await AsyncStorage.setItem('access_token', data.access_token);
        await AsyncStorage.setItem('refresh_token', data.refresh_token);
        
        console.log('User registered:', data.user.id);
        
        Alert.alert(
          'Welcome!', 
          'Your account has been created successfully!',
          [{ 
            text: 'Start Learning', 
            onPress: () => navigation.navigate('HomeScreen') 
          }]
        );
        
      } else {
        let errorMessage = 'Failed to create account. Please try again.';
        
        if (data.error) {
          errorMessage = data.error;
        } else if (data.message) {
          errorMessage = data.message;
        }
        
        Alert.alert('Sign Up Failed', errorMessage);
      }
      
    } catch (error) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Network error. Please check your connection and try again.';
      
      if (error.message.includes('Network request failed')) {
        errorMessage = 'Cannot connect to server. Please check if your backend is running.';
      }
      
      Alert.alert('Sign Up Failed', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Basic Information</Text>
      <Text style={styles.stepSubtitle}>Let's get to know you better</Text>

      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
        <TextInput
          placeholder="Full Name"
          placeholderTextColor="#8E8E93"
          value={formData.fullName}
          onChangeText={(value) => handleInputChange('fullName', value)}
          style={styles.input}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
        <TextInput
          placeholder="Email address"
          placeholderTextColor="#8E8E93"
          value={formData.email}
          onChangeText={(value) => handleInputChange('email', value)}
          style={styles.input}
          autoCapitalize="none"
          keyboardType="email-address"
          autoComplete="email"
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
        <TextInput
          placeholder="Password"
          placeholderTextColor="#8E8E93"
          value={formData.password}
          onChangeText={(value) => handleInputChange('password', value)}
          secureTextEntry
          style={styles.input}
          autoComplete="password"
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="lock-closed-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
        <TextInput
          placeholder="Confirm Password"
          placeholderTextColor="#8E8E93"
          value={formData.confirmPassword}
          onChangeText={(value) => handleInputChange('confirmPassword', value)}
          secureTextEntry
          style={styles.input}
          autoComplete="password"
        />
      </View>

      <View style={styles.socialContainer}>
        <Text style={styles.socialText}>Or sign up with</Text>
        <View style={styles.socialButtons}>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialSignUp('google')}
            disabled={isLoading}
          >
            <Ionicons name="logo-google" size={20} color="#0A7C72" />
            <Text style={styles.socialButtonText}>Google</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.socialButton}
            onPress={() => handleSocialSignUp('facebook')}
            disabled={isLoading}
          >
            <Ionicons name="logo-facebook" size={20} color="#0A7C72" />
            <Text style={styles.socialButtonText}>Facebook</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Educational Profile</Text>
      <Text style={styles.stepSubtitle}>Help us personalize your learning experience</Text>

      {/* Grade Level */}
      <TouchableOpacity 
        style={styles.selectInput}
        onPress={() => setShowGradeModal(true)}
        disabled={isLoading}
      >
        <Text style={formData.gradeLevel ? styles.selectText : styles.selectPlaceholder}>
          {formData.gradeLevel || 'Select Grade Level'}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#8E8E93" />
      </TouchableOpacity>

      {/* School Selection */}
      <TouchableOpacity 
        style={styles.selectInput}
        onPress={() => setShowSchoolModal(true)}
        disabled={isLoading}
      >
        <Text style={formData.school ? styles.selectText : styles.selectPlaceholder}>
          {formData.school || 'Select School'}
        </Text>
        <Ionicons name="chevron-down" size={20} color="#8E8E93" />
      </TouchableOpacity>

      {/* Custom School Input */}
      {!formData.school && (
        <View style={styles.inputContainer}>
          <Ionicons name="business-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
          <TextInput
            placeholder="Enter your school name"
            placeholderTextColor="#8E8E93"
            value={formData.customSchool}
            onChangeText={(value) => handleInputChange('customSchool', value)}
            style={styles.input}
            editable={!isLoading}
          />
        </View>
      )}

      {/* Preferred Language - Fixed to English */}
      <View style={styles.languageContainer}>
        <Text style={styles.languageLabel}>Preferred Language</Text>
        <View style={styles.languageValue}>
          <Text style={styles.languageText}>English</Text>
          <Ionicons name="checkmark-circle" size={20} color="#0A7C72" />
        </View>
      </View>

      {/* Subjects */}
      <View style={styles.subjectsContainer}>
        <Text style={styles.sectionTitle}>Subjects of Interest</Text>
        <Text style={styles.sectionSubtitle}>Select all that apply</Text>
        <View style={styles.subjectsGrid}>
          {SUBJECTS.map((subject) => (
            <TouchableOpacity
              key={subject}
              style={[
                styles.subjectChip,
                formData.subjects.includes(subject) && styles.subjectChipSelected
              ]}
              onPress={() => handleSubjectToggle(subject)}
              disabled={isLoading}
            >
              <Text style={[
                styles.subjectChipText,
                formData.subjects.includes(subject) && styles.subjectChipTextSelected
              ]}>
                {subject}
              </Text>
              {formData.subjects.includes(subject) && (
                <Ionicons name="checkmark" size={16} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Guardian Information</Text>
      <Text style={styles.stepSubtitle}>
        Since you're in high school, we need parent/guardian contact details
      </Text>

      <View style={styles.guardianNote}>
        <Ionicons name="information-circle" size={20} color="#0A7C72" />
        <Text style={styles.guardianNoteText}>
          Required for students under 18 years old
        </Text>
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="person-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
        <TextInput
          placeholder="Guardian Full Name *"
          placeholderTextColor="#8E8E93"
          value={formData.guardianName}
          onChangeText={(value) => handleInputChange('guardianName', value)}
          style={styles.input}
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="mail-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
        <TextInput
          placeholder="Guardian Email *"
          placeholderTextColor="#8E8E93"
          value={formData.guardianEmail}
          onChangeText={(value) => handleInputChange('guardianEmail', value)}
          style={styles.input}
          keyboardType="email-address"
          autoComplete="email"
          editable={!isLoading}
        />
      </View>

      <View style={styles.inputContainer}>
        <Ionicons name="call-outline" size={20} color="#8E8E93" style={styles.inputIcon} />
        <TextInput
          placeholder="Guardian Phone (Optional)"
          placeholderTextColor="#8E8E93"
          value={formData.guardianPhone}
          onChangeText={(value) => handleInputChange('guardianPhone', value)}
          style={styles.input}
          keyboardType="phone-pad"
          editable={!isLoading}
        />
      </View>

      <View style={styles.termsContainer}>
        <Text style={styles.termsText}>
          By creating an account, you agree to our{' '}
          <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
          <Text style={styles.termsLink}>Privacy Policy</Text>
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={currentStep === 1 ? () => navigation.goBack() : prevStep}
              disabled={isLoading}
            >
              <Ionicons name="chevron-back" size={24} color="#0A7C72" />
            </TouchableOpacity>
            
            <View style={styles.progressContainer}>
              <Text style={styles.stepIndicator}>Step {currentStep} of 3</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(currentStep / 3) * 100}%` }]} />
              </View>
            </View>
          </View>

          {/* Current Step */}
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}

          {/* Navigation Buttons */}
          <View style={[
            styles.navigationContainer, 
            { justifyContent: currentStep === 1 ? 'flex-end' : 'space-between' }
          ]}>
            {currentStep > 1 && (
              <TouchableOpacity 
                style={styles.backNavButton} 
                onPress={prevStep}
                disabled={isLoading}
              >
                <Text style={styles.backNavButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            
            {currentStep < 3 ? (
              <TouchableOpacity 
                style={styles.nextButton} 
                onPress={nextStep}
                disabled={isLoading}
              >
                <Text style={styles.nextButtonText}>Continue</Text>
                <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                style={[styles.signUpButton, isLoading && styles.signUpButtonDisabled]}
                onPress={completeRegistration}
                disabled={isLoading}
              >
                <LinearGradient
                  colors={['#0A7C72', '#0fbfae']}
                  style={styles.signUpGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <>
                      <Text style={styles.signUpButtonText}>Complete Registration</Text>
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          {/* Grade Level Modal */}
          <Modal
            visible={showGradeModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowGradeModal(false)}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Grade Level</Text>
                <TouchableOpacity onPress={() => setShowGradeModal(false)}>
                  <Ionicons name="close" size={24} color="#0A7C72" />
                </TouchableOpacity>
              </View>

              <FlatList
                data={GRADES}
                keyExtractor={(item) => item}
                renderItem={({ item }) => (
                  <TouchableOpacity 
                    style={styles.modalItem}
                    onPress={() => {
                      handleInputChange('gradeLevel', item);
                      setShowGradeModal(false);
                    }}
                  >
                    <Text style={styles.modalItemText}>{item}</Text>
                    {formData.gradeLevel === item && (
                      <Ionicons name="checkmark" size={20} color="#0A7C72" />
                    )}
                  </TouchableOpacity>
                )}
              />
            </SafeAreaView>
          </Modal>

          {/* School Modal */}
          <Modal
            visible={showSchoolModal}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => setShowSchoolModal(false)}
          >
            <SafeAreaView style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select School Type</Text>
                <TouchableOpacity onPress={() => setShowSchoolModal(false)}>
                  <Ionicons name="close" size={24} color="#0A7C72" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  handleInputChange('school', 'Public High School');
                  setShowSchoolModal(false);
                }}
              >
                <Text style={styles.modalItemText}>Public High School</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  handleInputChange('school', 'Private High School');
                  setShowSchoolModal(false);
                }}
              >
                <Text style={styles.modalItemText}>Private High School</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.modalItem}
                onPress={() => {
                  handleInputChange('school', 'International School');
                  setShowSchoolModal(false);
                }}
              >
                <Text style={styles.modalItemText}>International School</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalItem, styles.customSchoolItem]}
                onPress={() => {
                  handleInputChange('school', '');
                  setShowSchoolModal(false);
                }}
              >
                <Ionicons name="add" size={20} color="#0A7C72" />
                <Text style={styles.customSchoolText}>Enter Custom School</Text>
              </TouchableOpacity>
            </SafeAreaView>
          </Modal>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  header: {
    marginTop: 40,
    marginBottom: 30,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  progressContainer: {
    marginBottom: 10,
  },
  stepIndicator: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#F2F2F7',
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0A7C72',
    borderRadius: 2,
  },
  stepContainer: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0A7C72',
    marginBottom: 8,
  },
  stepSubtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginBottom: 30,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000000',
  },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  selectText: {
    fontSize: 16,
    color: '#000000',
  },
  selectPlaceholder: {
    fontSize: 16,
    color: '#8E8E93',
  },
  languageContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  languageLabel: {
    fontSize: 16,
    color: '#8E8E93',
  },
  languageValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  languageText: {
    fontSize: 16,
    color: '#0A7C72',
    fontWeight: '600',
  },
  socialContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  socialText: {
    textAlign: 'center',
    color: '#8E8E93',
    marginBottom: 16,
  },
  socialButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 8,
  },
  socialButtonText: {
    color: '#0A7C72',
    fontWeight: '600',
  },
  subjectsContainer: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0A7C72',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  subjectsGrid: {
    gap: 12,
  },
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F2F2F7',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  subjectChipSelected: {
    backgroundColor: '#0A7C72',
    borderColor: '#0A7C72',
  },
  subjectChipText: {
    color: '#8E8E93',
    fontSize: 16,
    fontWeight: '500',
  },
  subjectChipTextSelected: {
    color: '#FFFFFF',
  },
  guardianNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5F4',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  guardianNoteText: {
    flex: 1,
    color: '#0A7C72',
    fontSize: 14,
    fontWeight: '500',
  },
  termsContainer: {
    marginTop: 20,
    marginBottom: 24,
  },
  termsText: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#0A7C72',
    fontWeight: '500',
  },
  navigationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
  },
  backNavButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backNavButtonText: {
    color: '#0A7C72',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A7C72',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  signUpButton: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#0A7C72',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  signUpButtonDisabled: {
    opacity: 0.6,
  },
  signUpGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  signUpButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  modalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  modalItemText: {
    fontSize: 16,
    color: '#000000',
  },
  customSchoolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 0,
  },
  customSchoolText: {
    fontSize: 16,
    color: '#0A7C72',
    fontWeight: '500',
  },
});