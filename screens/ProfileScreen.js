// screens/ProfileScreen.js
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Animated,
  Easing,
  Switch,
  Modal,
  Platform,
  RefreshControl
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LayoutWithNavigation } from '../components/LayoutWithNavigation';
import NetInfo from '@react-native-community/netinfo';
import API_BASE_URL from '../config';

const { width, height } = Dimensions.get('window');

// Validation utilities
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const sanitizeInput = (input) => {
  return input?.trim().replace(/[<>]/g, '') || '';
};

const ProfileScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [userData, setUserData] = useState(null); // Start as null instead of empty object
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeStat, setActiveStat] = useState('overview');
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [achievements, setAchievements] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [studyStats, setStudyStats] = useState({
    totalStudyTime: 0,
    completedLessons: 0,
    gamesPlayed: 0,
    quizzesCompleted: 0
  });
  const [operationLoading, setOperationLoading] = useState({
    saving: false,
    uploading: false,
    fetching: false
  });
  const [isOnline, setIsOnline] = useState(true);
  const [retryCount, setRetryCount] = useState(0);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Network connection listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  // Fetch data with retry logic
  useEffect(() => {
    fetchUserData();
    startAnimations();
  }, []);

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Safe user data accessors
  const getUserName = useCallback(() => {
    if (!userData) return 'User';
    return userData.name || `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'User';
  }, [userData]);

  const getUserEmail = useCallback(() => {
    if (!userData) return '';
    return userData.email || '';
  }, [userData]);

  const getUserGrade = useCallback(() => {
    if (!userData) return '';
    return userData.grade || userData.profile?.grade_level || '';
  }, [userData]);

  const getUserSchool = useCallback(() => {
    if (!userData) return '';
    return userData.school || userData.profile?.school || '';
  }, [userData]);

  const getUserBio = useCallback(() => {
    if (!userData) return 'Tell us about yourself...';
    return userData.bio || userData.profile?.bio || 'Tell us about yourself...';
  }, [userData]);

  const getUserAvatar = useCallback(() => {
    if (!userData) return '';
    return userData.avatar || userData.profile?.avatar_url || '';
  }, [userData]);

  const getUserPreferences = useCallback(() => {
    if (!userData) return { notifications: true, darkMode: false, privateProfile: false };
    return userData.preferences || { notifications: true, darkMode: false, privateProfile: false };
  }, [userData]);

  const getUserPoints = useCallback(() => {
    if (!userData) return 0;
    return userData.points || 0;
  }, [userData]);

  const getUserLevel = useCallback(() => {
    if (!userData) return 'Beginner';
    return userData.level || 'Beginner';
  }, [userData]);

  const getUserStreak = useCallback(() => {
    if (!userData) return 0;
    return userData.streak || 0;
  }, [userData]);

  // API utility functions
  const getAuthHeaders = async () => {
    const token = await AsyncStorage.getItem('access_token');
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  };

  const handleApiError = (error, defaultMessage = 'An error occurred') => {
    console.error('API Error:', error);
    if (error.message === 'Token expired' || error.message === 'Invalid token') {
      Alert.alert('Session Expired', 'Please log in again.');
      navigation.reset({ 
        index: 0, 
        routes: [{ name: 'SignIn' }] 
      });
      return;
    }
    throw new Error(error.message || defaultMessage);
  };

  const fetchUserData = async (retry = false) => {
    if (!isOnline && !retry) {
      Alert.alert('Offline', 'You are currently offline. Some features may be limited.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setOperationLoading(prev => ({ ...prev, fetching: true }));
      
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
        headers: headers,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      // Transform backend data to match frontend structure
      const transformedData = {
        ...data,
        avatar: data.profile?.avatar_url || '',
        name: `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User',
        email: data.email || '',
        grade: data.profile?.grade_level || '',
        school: data.profile?.school || '',
        joinDate: data.created_at?.split('T')[0] || new Date().toISOString().split('T')[0],
        level: 'Beginner',
        points: 0,
        streak: 0,
        bio: data.profile?.bio || 'Tell us about yourself...',
        socialLinks: data.profile?.social_links || { instagram: '', twitter: '' },
        preferences: data.preferences || { notifications: true, darkMode: false, privateProfile: false },
      };

      setUserData(transformedData);
      
      // Fetch additional data
      await Promise.all([
        fetchAchievements(),
        fetchStudyStats(),
        fetchRecentActivity()
      ]);
      
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching user data:', error);
      
      if (retryCount < 3) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchUserData(true), 2000 * retryCount);
      } else {
        Alert.alert(
          'Connection Error', 
          'Failed to load profile data. Please check if your backend is running on 127.0.0.1:5000',
          [{ text: 'Retry', onPress: () => {
            setRetryCount(0);
            fetchUserData();
          }}]
        );
      }
    } finally {
      setLoading(false);
      setOperationLoading(prev => ({ ...prev, fetching: false }));
    }
  };

  const fetchAchievements = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/achievements`, {
        method: 'GET',
        headers: headers,
      });

      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements || []);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const fetchStudyStats = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/study-stats`, {
        method: 'GET',
        headers: headers,
      });

      if (response.ok) {
        const data = await response.json();
        setStudyStats({
          totalStudyTime: data.total_study_time || 0,
          completedLessons: data.completed_lessons || 0,
          gamesPlayed: data.games_played || 0,
          quizzesCompleted: data.quizzes_completed || 0
        });
      }
    } catch (error) {
      console.error('Error fetching study stats:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/recent-activity`, {
        method: 'GET',
        headers: headers,
      });

      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activities || []);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };

  // Safe input change handler
  const handleInputChange = (field, value) => {
    if (!userData) return;
    
    setUserData(prev => {
      if (!prev) return null;
      
      if (field.includes('.')) {
        const [parent, child] = field.split('.');
        return {
          ...prev,
          [parent]: {
            ...prev[parent],
            [child]: value
          }
        };
      }
      
      return {
        ...prev,
        [field]: value
      };
    });
  };

  // Image handling
  const pickImage = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot change profile picture while offline.');
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        maxWidth: 500,
        maxHeight: 500,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const fileInfo = await FileSystem.getInfoAsync(result.assets[0].uri);
        if (fileInfo.size > 5 * 1024 * 1024) {
          Alert.alert('File Too Large', 'Please select an image smaller than 5MB.');
          return;
        }

        await uploadImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadImage = async (uri) => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot upload image while offline.');
      return;
    }

    try {
      setUploading(true);
      setOperationLoading(prev => ({ ...prev, uploading: true }));
      
      const formData = new FormData();
      formData.append('avatar', {
        uri: uri,
        type: 'image/jpeg',
        name: 'avatar.jpg',
      });

      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/profile/avatar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      
      setUserData(prev => {
        if (!prev) return null;
        return { 
          ...prev, 
          avatar: data.avatar_url 
        };
      });

      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Upload Failed', 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
      setOperationLoading(prev => ({ ...prev, uploading: false }));
    }
  };

  const handleSaveProfile = async () => {
    if (!isOnline) {
      Alert.alert('Offline', 'Cannot save changes while offline.');
      return;
    }

    if (!userData || !getUserName().trim()) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return;
    }

    if (getUserEmail() && !isValidEmail(getUserEmail())) {
      Alert.alert('Validation Error', 'Please enter a valid email address.');
      return;
    }

    try {
      setOperationLoading(prev => ({ ...prev, saving: true }));
      
      const headers = await getAuthHeaders();
      
      const nameParts = getUserName().trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const updateData = {
        first_name: sanitizeInput(firstName),
        last_name: sanitizeInput(lastName),
        email: sanitizeInput(getUserEmail()),
        profile: {
          grade_level: sanitizeInput(getUserGrade()),
          school: sanitizeInput(getUserSchool()),
          bio: sanitizeInput(getUserBio()),
          social_links: {
            instagram: sanitizeInput(userData?.socialLinks?.instagram || ''),
            twitter: sanitizeInput(userData?.socialLinks?.twitter || '')
          }
        }
      };

      const response = await fetch(`${API_BASE_URL}/profile`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status}`);
      }

      const data = await response.json();
      
      Alert.alert('Success', 'Your profile has been updated successfully.');
      setEditing(false);
      
      fetchUserData();
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Save Failed', 'Failed to save profile data. Please try again.');
    } finally {
      setOperationLoading(prev => ({ ...prev, saving: false }));
    }
  };

  const handlePreferenceChange = async (key, value) => {
    try {
      const updatedPreferences = { ...getUserPreferences(), [key]: value };
      
      setUserData(prev => {
        if (!prev) return null;
        return { ...prev, preferences: updatedPreferences };
      });
      
      const headers = await getAuthHeaders();
      const response = await fetch(`${API_BASE_URL}/profile/preferences`, {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({ preferences: updatedPreferences }),
      });

      if (!response.ok) {
        console.error('Failed to update preferences on server');
        // Revert on error
        setUserData(prev => {
          if (!prev) return null;
          return { ...prev, preferences: getUserPreferences() };
        });
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      // Revert on error
      setUserData(prev => {
        if (!prev) return null;
        return { ...prev, preferences: getUserPreferences() };
      });
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            try {
              const headers = await getAuthHeaders();
              await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: headers,
              });
              
              await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
              
              navigation.reset({ 
                index: 0, 
                routes: [{ name: 'WelcomeScreen' }] 
              });
            } catch (error) {
              console.error('Error signing out:', error);
              await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
              navigation.reset({ 
                index: 0, 
                routes: [{ name: 'WelcomeScreen' }] 
              });
            }
          },
        },
      ]
    );
  };

  const navigateToScreen = useCallback((screenName, params = {}) => {
    navigation.navigate(screenName, params);
  }, [navigation]);

  const handleQuickAction = useCallback((action) => {
    switch (action) {
      case 'progress':
        navigateToScreen('ProgressScreen');
        break;
      case 'achievements':
        setActiveStat('achievements');
        break;
      case 'games':
        navigateToScreen('GamesScreen');
        break;
      case 'lessons':
        navigateToScreen('LessonsScreen');
        break;
      case 'challenges':
        navigateToScreen('ChallengesScreen');
        break;
      case 'quiz':
        navigateToScreen('QuizScreen');
        break;
      case 'analytics':
        Alert.alert('Analytics', 'Detailed analytics feature coming soon!');
        break;
      case 'share':
        Alert.alert('Share', 'Share your progress with friends!');
        break;
      default:
        break;
    }
  }, [navigateToScreen]);

  const getDefaultAvatar = useCallback(() => {
    const name = getUserName();
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6a11cb&color=fff&size=150&bold=true`;
  }, [getUserName]);

  const levelProgress = useMemo(() => {
    const levels = { Beginner: 0, Intermediate: 1000, Advanced: 2500, Expert: 5000 };
    return Math.min((getUserPoints() / (levels[getUserLevel()] || 1)) * 100, 100);
  }, [getUserPoints, getUserLevel]);

  const getActivityIcon = useCallback((type) => {
    const icons = {
      lesson: 'book',
      game: 'game-controller',
      quiz: 'help-circle',
      challenge: 'trophy',
      achievement: 'medal'
    };
    return icons[type] || 'checkmark-circle';
  }, []);

  // Safe render functions
  const renderAnimatedHeader = () => (
    <View style={styles.header}>
      <LinearGradient 
        colors={['#6a11cb', '#2575fc', '#2af598']} 
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.headerContent}>
          <View style={styles.avatarSection}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarWrapper}>
                <Image 
                  source={{ uri: getUserAvatar() || getDefaultAvatar() }} 
                  style={styles.avatar}
                  onError={() => console.log('Avatar load failed')}
                />
                {uploading && (
                  <View style={styles.avatarOverlay}>
                    <ActivityIndicator size="small" color="#fff" />
                  </View>
                )}
              </View>
              <TouchableOpacity 
                style={[styles.editAvatarButton, !isOnline && styles.disabledButton]} 
                onPress={pickImage}
                disabled={uploading || !isOnline}
              >
                <Ionicons name="camera" size={16} color="#6a11cb" />
              </TouchableOpacity>
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>{getUserLevel()}</Text>
              </View>
            </View>
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName} numberOfLines={1}>
              {getUserName()}
            </Text>
            <Text style={styles.userBio} numberOfLines={2}>
              {getUserBio()}
            </Text>
            <View style={styles.userDetails}>
              <Text style={styles.userDetail}>{getUserGrade()}</Text>
              <Text style={styles.userDetail}>•</Text>
              <Text style={styles.userDetail}>{getUserSchool()}</Text>
              {!isOnline && (
                <>
                  <Text style={styles.userDetail}>•</Text>
                  <Text style={[styles.userDetail, styles.offlineText]}>Offline</Text>
                </>
              )}
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity 
              style={styles.settingsButton}
              onPress={() => setShowSettingsModal(true)}
            >
              <Ionicons name="settings" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Level Progress</Text>
            <Text style={styles.progressPoints}>{getUserPoints()} XP</Text>
          </View>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${levelProgress}%` }
              ]} 
            />
          </View>
        </View>
      </LinearGradient>
    </View>
  );

  // ... rest of your render functions remain the same, but use the safe accessors

  // Update the settings modal form inputs to use safe accessors
  const renderSettingsModal = () => (
    <Modal
      visible={showSettingsModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowSettingsModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Profile Settings</Text>
          <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.modalContent}>
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>Personal Information</Text>
            
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Full Name</Text>
              <TextInput
                style={styles.formInput}
                value={getUserName()}
                onChangeText={(value) => handleInputChange('name', value)}
                placeholder="Enter your full name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Email</Text>
              <TextInput
                style={styles.formInput}
                value={getUserEmail()}
                onChangeText={(value) => handleInputChange('email', value)}
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Grade Level</Text>
              <TextInput
                style={styles.formInput}
                value={getUserGrade()}
                onChangeText={(value) => handleInputChange('grade', value)}
                placeholder="Enter your grade"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>School</Text>
              <TextInput
                style={styles.formInput}
                value={getUserSchool()}
                onChangeText={(value) => handleInputChange('school', value)}
                placeholder="Enter your school"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Bio</Text>
              <TextInput
                style={[styles.formInput, styles.bioTextArea]}
                value={getUserBio()}
                onChangeText={(value) => handleInputChange('bio', value)}
                placeholder="Tell us about yourself..."
                multiline
                numberOfLines={3}
              />
            </View>
          </View>

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>Preferences</Text>
            
            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="notifications" size={20} color="#333" />
                <Text style={styles.settingText}>Push Notifications</Text>
              </View>
              <Switch
                value={getUserPreferences().notifications}
                onValueChange={(value) => handlePreferenceChange('notifications', value)}
                trackColor={{ false: '#f0f0f0', true: '#6a11cb' }}
                thumbColor={getUserPreferences().notifications ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="moon" size={20} color="#333" />
                <Text style={styles.settingText}>Dark Mode</Text>
              </View>
              <Switch
                value={getUserPreferences().darkMode}
                onValueChange={(value) => handlePreferenceChange('darkMode', value)}
                trackColor={{ false: '#f0f0f0', true: '#6a11cb' }}
                thumbColor={getUserPreferences().darkMode ? '#fff' : '#f4f3f4'}
              />
            </View>

            <View style={styles.settingItem}>
              <View style={styles.settingInfo}>
                <Ionicons name="lock-closed" size={20} color="#333" />
                <Text style={styles.settingText}>Private Profile</Text>
              </View>
              <Switch
                value={getUserPreferences().privateProfile}
                onValueChange={(value) => handlePreferenceChange('privateProfile', value)}
                trackColor={{ false: '#f0f0f0', true: '#6a11cb' }}
                thumbColor={getUserPreferences().privateProfile ? '#fff' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* ... rest of modal content */}
        </ScrollView>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.loadingScreen}>
        <ActivityIndicator size="large" color="#6a11cb" />
        <Text style={styles.loadingScreenText}>Loading your profile...</Text>
      </View>
    );
  }

  if (!userData) {
    return (
      <View style={styles.loadingScreen}>
        <Text style={styles.loadingScreenText}>Unable to load profile data</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchUserData}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <LayoutWithNavigation navigation={navigation} activeTab={activeTab}>
      <View style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={operationLoading.fetching}
              onRefresh={fetchUserData}
              colors={['#6a11cb']}
              tintColor="#6a11cb"
            />
          }
        >
          {renderAnimatedHeader()}
          {renderStatsCard()}
          {renderQuickActions()}
          <View style={styles.bottomSpace} />
        </ScrollView>

        {renderSettingsModal()}
      </View>
    </LayoutWithNavigation>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F8F9FA' 
  },
  scrollContent: {
    flexGrow: 1,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  loadingScreenText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    height: 300,
  },
  headerGradient: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  avatarSection: {
    marginRight: 15,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'white',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'white',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  disabledButton: {
    opacity: 0.5,
  },
  levelBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  levelText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
    marginRight: 10,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  userBio: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
    marginBottom: 8,
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  userDetail: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginRight: 8,
  },
  offlineText: {
    color: '#ff6b6b',
    fontWeight: 'bold',
  },
  headerActions: {
    alignSelf: 'flex-start',
  },
  settingsButton: {
    padding: 8,
  },
  progressSection: {
    marginTop: 10,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  progressPoints: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 3,
  },
  statsCard: {
    backgroundColor: 'white',
    margin: 16,
    marginTop: -40,
    padding: 20,
    borderRadius: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    minHeight: 300,
  },
  statsTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
  },
  statTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeStatTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  statTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  activeStatTabText: {
    color: '#6a11cb',
  },
  statsContent: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
  },
  studyStats: {
    marginTop: 10,
  },
  studyStatsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  studyStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  studyStat: {
    alignItems: 'center',
    flex: 1,
  },
  studyStatValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 4,
  },
  studyStatLabel: {
    fontSize: 10,
    color: '#666',
    marginTop: 2,
    textAlign: 'center',
  },
  achievementsContent: {
    flex: 1,
  },
  achievementsList: {
    maxHeight: 200,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
  },
  achievementIcon: {
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  achievementDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  achievementDate: {
    fontSize: 10,
    color: '#999',
  },
  activityContent: {
    flex: 1,
  },
  activityList: {
    maxHeight: 200,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 8,
  },
  activityIcon: {
    marginRight: 12,
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 2,
  },
  activityDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  activityTime: {
    fontSize: 10,
    color: '#999',
  },
  activityPoints: {
    backgroundColor: '#6a11cb',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  pointsText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptySection: {
    alignItems: 'center',
    padding: 40,
  },
  emptySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySectionText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  ctaButton: {
    backgroundColor: '#6a11cb',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  ctaButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  quickAction: {
    alignItems: 'center',
  },
  quickActionIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  disabledGradient: {
    opacity: 0.5,
  },
  disabledQuickAction: {
    opacity: 0.5,
  },
  disabledText: {
    color: '#999',
  },
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'white',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  formLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  formInput: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  bioTextArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  saveButton: {
    backgroundColor: '#6a11cb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButton: {
    backgroundColor: '#ff6b6b',
    flexDirection: 'row',
    gap: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    color: '#333',
  },
  dataActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 12,
  },
  dataActionText: {
    fontSize: 16,
    color: '#6a11cb',
    fontWeight: '600',
  },
  bottomSpace: {
    height: 20,
  },
});

export default ProfileScreen;