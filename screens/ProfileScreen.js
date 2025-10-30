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

// Token management utility
const refreshAuthToken = async () => {
  try {
    const refreshToken = await AsyncStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      await AsyncStorage.setItem('access_token', data.access_token);
      if (data.refresh_token) {
        await AsyncStorage.setItem('refresh_token', data.refresh_token);
      }
      return data.access_token;
    } else {
      throw new Error('Token refresh failed');
    }
  } catch (error) {
    console.error('Token refresh error:', error);
    throw error;
  }
};

const getValidAuthHeaders = async () => {
  try {
    let token = await AsyncStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('No access token available');
    }
    
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    };
  } catch (error) {
    console.error('Failed to get valid auth headers:', error);
    throw new Error('Authentication required');
  }
};

const makeAuthenticatedRequest = async (url, options = {}) => {
  try {
    let headers = await getValidAuthHeaders();
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    // If token is expired, try to refresh and retry
    if (response.status === 401) {
      console.log('Token expired, attempting refresh...');
      const newToken = await refreshAuthToken();
      
      // Retry with new token
      const retryResponse = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${newToken}`,
        },
      });

      if (retryResponse.ok) {
        return retryResponse;
      } else {
        throw new Error('Authentication failed after refresh');
      }
    }

    return response;
  } catch (error) {
    console.error('Authenticated request failed:', error);
    throw error;
  }
};

const ProfileScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [userData, setUserData] = useState(null);
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
  const [authError, setAuthError] = useState(false);

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
    return userData.grade_level || userData.grade || '';
  }, [userData]);

  const getUserSchool = useCallback(() => {
    if (!userData) return '';
    return userData.school || '';
  }, [userData]);

  const getUserBio = useCallback(() => {
    if (!userData) return 'Tell us about yourself...';
    return userData.bio || 'Tell us about yourself...';
  }, [userData]);

  const getUserAvatar = useCallback(() => {
    if (!userData) return '';
    return userData.avatar_url || userData.profile_picture || userData.avatar || '';
  }, [userData]);

  const getUserPreferences = useCallback(() => {
    if (!userData) return { notifications: true, darkMode: false, privateProfile: false };
    return userData.preferences || { notifications: true, darkMode: false, privateProfile: false };
  }, [userData]);

  const getUserPoints = useCallback(() => {
    if (!userData) return 0;
    return userData.points || userData.total_points || 0;
  }, [userData]);

  const getUserLevel = useCallback(() => {
    if (!userData) return 'Beginner';
    return userData.level || 'Beginner';
  }, [userData]);

  const getUserStreak = useCallback(() => {
    if (!userData) return 0;
    return userData.streak_days || userData.streak || 0;
  }, [userData]);

  const fetchUserData = async (retry = false) => {
    if (!isOnline && !retry) {
      Alert.alert('Offline', 'You are currently offline. Some features may be limited.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setOperationLoading(prev => ({ ...prev, fetching: true }));
      setAuthError(false);
      
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/auth/me`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const userDataResponse = await response.json();
      console.log('User data received:', userDataResponse);

      // Transform backend data to match frontend structure
      const transformedData = {
        ...userDataResponse.user,
        name: `${userDataResponse.user?.first_name || ''} ${userDataResponse.user?.last_name || ''}`.trim() || 'User',
        email: userDataResponse.user?.email || '',
        avatar_url: userDataResponse.user?.profile_picture || userDataResponse.user?.avatar_url || '',
        grade_level: userDataResponse.user?.grade_level || '',
        school: userDataResponse.user?.school || '',
        bio: userDataResponse.user?.bio || 'Tell us about yourself...',
        points: userDataResponse.user?.points || userDataResponse.user?.total_points || 0,
        level: userDataResponse.user?.level || 'Beginner',
        streak_days: userDataResponse.user?.streak_days || userDataResponse.user?.streak || 0,
        join_date: userDataResponse.user?.created_at?.split('T')[0] || userDataResponse.user?.join_date || new Date().toISOString().split('T')[0],
        preferences: userDataResponse.user?.preferences || { notifications: true, darkMode: false, privateProfile: false }
      };

      setUserData(transformedData);
      
      // Fetch additional data from respective endpoints
      await Promise.all([
        fetchAchievements(),
        fetchStudyStats(),
        fetchRecentActivity()
      ]);
      
      setRetryCount(0);
    } catch (error) {
      console.error('Error fetching user data:', error);
      
      if (error.message.includes('Authentication') || error.message.includes('401') || error.message.includes('token')) {
        setAuthError(true);
        await AsyncStorage.multiRemove(['access_token', 'refresh_token']);
        return;
      }
      
      if (retryCount < 2) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => fetchUserData(true), 2000 * retryCount);
      } else {
        Alert.alert(
          'Connection Error', 
          'Failed to load profile data. Please check your connection.',
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
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/progress/achievements`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements || data.data || []);
      } else {
        console.log('Achievements endpoint not available');
        setAchievements([]);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
      setAchievements([]);
    }
  };

  const fetchStudyStats = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/progress/stats`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setStudyStats({
          totalStudyTime: data.total_study_time || data.study_time || 0,
          completedLessons: data.completed_lessons || data.lessons_completed || 0,
          gamesPlayed: data.games_played || 0,
          quizzesCompleted: data.quizzes_completed || 0
        });
      } else {
        console.log('Stats endpoint not available');
        setStudyStats({
          totalStudyTime: 0,
          completedLessons: 0,
          gamesPlayed: 0,
          quizzesCompleted: 0
        });
      }
    } catch (error) {
      console.error('Error fetching study stats:', error);
      setStudyStats({
        totalStudyTime: 0,
        completedLessons: 0,
        gamesPlayed: 0,
        quizzesCompleted: 0
      });
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/dashboard/recent-activity`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        setRecentActivity(data.activities || data.recent_activity || []);
      } else {
        console.log('Recent activity endpoint not available');
        setRecentActivity([]);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      setRecentActivity([]);
    }
  };

  // Safe input change handler
  const handleInputChange = (field, value) => {
    if (!userData) return;
    
    setUserData(prev => {
      if (!prev) return null;
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
      
      const token = await AsyncStorage.getItem('access_token');
      if (!token) {
        throw new Error('No authentication token');
      }
      
      const formData = new FormData();
      formData.append('profile_picture', {
        uri: uri,
        type: 'image/jpeg',
        name: 'profile_picture.jpg',
      });

      const response = await fetch(`${API_BASE_URL}/profile/upload-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.status === 401) {
        // Token expired, refresh and retry
        const newToken = await refreshAuthToken();
        const retryResponse = await fetch(`${API_BASE_URL}/profile/upload-picture`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${newToken}`,
          },
          body: formData,
        });

        if (!retryResponse.ok) {
          throw new Error(`Upload failed: ${retryResponse.status}`);
        }

        const data = await retryResponse.json();
        handleUploadSuccess(data);
      } else if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      } else {
        const data = await response.json();
        handleUploadSuccess(data);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      if (error.message.includes('Authentication') || error.message.includes('401')) {
        Alert.alert('Session Expired', 'Please sign in again to upload images.');
      } else {
        Alert.alert('Upload Failed', 'Failed to upload profile picture. Please try again.');
      }
    } finally {
      setUploading(false);
      setOperationLoading(prev => ({ ...prev, uploading: false }));
    }
  };

  const handleUploadSuccess = (data) => {
    setUserData(prev => {
      if (!prev) return null;
      return { 
        ...prev, 
        avatar_url: data.profile_picture_url || data.avatar_url || data.image_url 
      };
    });
    Alert.alert('Success', 'Profile picture updated successfully!');
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
      
      const nameParts = getUserName().trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      const updateData = {
        first_name: sanitizeInput(firstName),
        last_name: sanitizeInput(lastName),
        email: sanitizeInput(getUserEmail()),
        grade_level: sanitizeInput(getUserGrade()),
        school: sanitizeInput(getUserSchool()),
        bio: sanitizeInput(getUserBio())
      };

      const response = await makeAuthenticatedRequest(`${API_BASE_URL}/profile/update`, {
        method: 'PUT',
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Update failed: ${response.status}`);
      }

      const data = await response.json();
      
      Alert.alert('Success', 'Your profile has been updated successfully.');
      setEditing(false);
      
      fetchUserData();
    } catch (error) {
      console.error('Error saving profile:', error);
      if (error.message.includes('Authentication') || error.message.includes('401')) {
        Alert.alert('Session Expired', 'Please sign in again to save changes.');
      } else {
        Alert.alert('Save Failed', error.message || 'Failed to save profile data. Please try again.');
      }
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
      
      if (isOnline) {
        await makeAuthenticatedRequest(`${API_BASE_URL}/profile/preferences`, {
          method: 'PUT',
          body: JSON.stringify({ preferences: updatedPreferences }),
        });
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      setUserData(prev => {
        if (!prev) return null;
        return { ...prev, preferences: getUserPreferences() };
      });
    }
  };

  const handleLogout = async () => {
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
              await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
              navigation.reset({ 
                index: 0, 
                routes: [{ name: 'WelcomeScreen' }] 
              });
            } catch (error) {
              console.error('Error signing out:', error);
              await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
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

  // Render functions
  const renderOfflineBanner = () => (
    !isOnline && (
      <View style={styles.offlineBanner}>
        <Ionicons name="cloud-offline" size={16} color="#fff" />
        <Text style={styles.offlineBannerText}>You're offline - some features limited</Text>
      </View>
    )
  );

  const renderAnimatedHeader = () => (
    <View style={styles.header}>
      <LinearGradient 
        colors={['#6a11cb', '#2575fc', '#2af598']} 
        style={styles.headerGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {renderOfflineBanner()}
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

  const renderStatsCard = () => (
    <Animated.View 
      style={[
        styles.statsCard,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <View style={styles.statsTabs}>
        {['overview', 'achievements', 'activity'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.statTab,
              activeStat === tab && styles.activeStatTab
            ]}
            onPress={() => setActiveStat(tab)}
          >
            <Text style={[
              styles.statTabText,
              activeStat === tab && styles.activeStatTabText
            ]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.statsContent}>
        {activeStat === 'overview' && renderOverviewStats()}
        {activeStat === 'achievements' && renderAchievements()}
        {activeStat === 'activity' && renderRecentActivity()}
      </View>
    </Animated.View>
  );

  const renderOverviewStats = () => (
    <View>
      <View style={styles.statsGrid}>
        <View style={styles.statItem}>
          <LinearGradient
            colors={['#6a11cb', '#2575fc']}
            style={styles.statIcon}
          >
            <Ionicons name="time" size={24} color="white" />
          </LinearGradient>
          <Text style={styles.statValue}>{studyStats.totalStudyTime}h</Text>
          <Text style={styles.statLabel}>Study Time</Text>
        </View>
        
        <View style={styles.statItem}>
          <LinearGradient
            colors={['#2af598', '#009efd']}
            style={styles.statIcon}
          >
            <Ionicons name="trophy" size={24} color="white" />
          </LinearGradient>
          <Text style={styles.statValue}>{getUserStreak()}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        
        <View style={styles.statItem}>
          <LinearGradient
            colors={['#ff6b6b', '#ffa726']}
            style={styles.statIcon}
          >
            <Ionicons name="game-controller" size={24} color="white" />
          </LinearGradient>
          <Text style={styles.statValue}>{studyStats.gamesPlayed}</Text>
          <Text style={styles.statLabel}>Games</Text>
        </View>
      </View>

      <View style={styles.studyStats}>
        <Text style={styles.studyStatsTitle}>Learning Progress</Text>
        <View style={styles.studyStatsGrid}>
          <View style={styles.studyStat}>
            <Ionicons name="book" size={24} color="#6a11cb" />
            <Text style={styles.studyStatValue}>{studyStats.completedLessons}</Text>
            <Text style={styles.studyStatLabel}>Lessons</Text>
          </View>
          
          <View style={styles.studyStat}>
            <Ionicons name="help-circle" size={24} color="#2575fc" />
            <Text style={styles.studyStatValue}>{studyStats.quizzesCompleted}</Text>
            <Text style={styles.studyStatLabel}>Quizzes</Text>
          </View>
          
          <View style={styles.studyStat}>
            <Ionicons name="star" size={24} color="#2af598" />
            <Text style={styles.studyStatValue}>{achievements.length}</Text>
            <Text style={styles.studyStatLabel}>Achievements</Text>
          </View>
        </View>
      </View>
    </View>
  );

  const renderAchievements = () => (
    <View style={styles.achievementsContent}>
      {achievements.length > 0 ? (
        <ScrollView style={styles.achievementsList}>
          {achievements.map((achievement, index) => (
            <View key={index} style={styles.achievementItem}>
              <View style={styles.achievementIcon}>
                <Ionicons name="medal" size={24} color="#FFD700" />
              </View>
              <View style={styles.achievementInfo}>
                <Text style={styles.achievementTitle}>{achievement.name}</Text>
                <Text style={styles.achievementDescription}>{achievement.description}</Text>
                <Text style={styles.achievementDate}>Earned {achievement.earned_date}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptySection}>
          <Ionicons name="trophy-outline" size={64} color="#ccc" />
          <Text style={styles.emptySectionTitle}>No Achievements Yet</Text>
          <Text style={styles.emptySectionText}>
            Complete lessons and games to earn achievements!
          </Text>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => handleQuickAction('games')}
          >
            <Text style={styles.ctaButtonText}>Start Learning</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderRecentActivity = () => (
    <View style={styles.activityContent}>
      {recentActivity.length > 0 ? (
        <ScrollView style={styles.activityList}>
          {recentActivity.map((activity, index) => (
            <View key={index} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name={getActivityIcon(activity.type)} size={20} color="#6a11cb" />
              </View>
              <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{activity.title}</Text>
                <Text style={styles.activityDescription}>{activity.description}</Text>
                <Text style={styles.activityTime}>{activity.timestamp}</Text>
              </View>
              {activity.points && (
                <View style={styles.activityPoints}>
                  <Text style={styles.pointsText}>+{activity.points} XP</Text>
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptySection}>
          <Ionicons name="time-outline" size={64} color="#ccc" />
          <Text style={styles.emptySectionTitle}>No Recent Activity</Text>
          <Text style={styles.emptySectionText}>
            Your learning activities will appear here
          </Text>
          <TouchableOpacity 
            style={styles.ctaButton}
            onPress={() => handleQuickAction('lessons')}
          >
            <Text style={styles.ctaButtonText}>Start Learning</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderQuickActions = () => (
    <View style={styles.quickActions}>
      {[
        { icon: 'trending-up', label: 'Progress', action: 'progress' },
        { icon: 'trophy', label: 'Achievements', action: 'achievements' },
        { icon: 'game-controller', label: 'Games', action: 'games' },
        { icon: 'book', label: 'Lessons', action: 'lessons' },
        { icon: 'flag', label: 'Challenges', action: 'challenges' }
      ].map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.quickAction}
          onPress={() => handleQuickAction(item.action)}
          disabled={!isOnline && ['games', 'lessons', 'challenges'].includes(item.action)}
        >
          <LinearGradient
            colors={['#6a11cb', '#2575fc']}
            style={[
              styles.quickActionIcon,
              !isOnline && ['games', 'lessons', 'challenges'].includes(item.action) && styles.disabledGradient
            ]}
          >
            <Ionicons name={item.icon} size={20} color="white" />
          </LinearGradient>
          <Text style={[
            styles.quickActionText,
            !isOnline && ['games', 'lessons', 'challenges'].includes(item.action) && styles.disabledText
          ]}>
            {item.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

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
                onChangeText={(value) => handleInputChange('grade_level', value)}
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

          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>Account</Text>
            
            <TouchableOpacity 
              style={[styles.dataActionButton, !isOnline && styles.disabledButton]}
              onPress={() => Alert.alert('Export Data', 'This feature will export all your learning data.')}
              disabled={!isOnline}
            >
              <Ionicons name="download" size={20} color="#6a11cb" />
              <Text style={styles.dataActionText}>Export Learning Data</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.dataActionButton, !isOnline && styles.disabledButton]}
              onPress={() => Alert.alert('Delete Account', 'This will permanently delete your account and all data.')}
              disabled={!isOnline}
            >
              <Ionicons name="trash" size={20} color="#ff6b6b" />
              <Text style={[styles.dataActionText, { color: '#ff6b6b' }]}>Delete Account</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.saveButton, styles.logoutButton]}
              onPress={handleLogout}
            >
              <Ionicons name="log-out" size={20} color="white" />
              <Text style={styles.saveButtonText}>Log Out</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <View style={styles.modalFooter}>
          <TouchableOpacity 
            style={[styles.saveButton, operationLoading.saving && styles.disabledButton]}
            onPress={handleSaveProfile}
            disabled={operationLoading.saving}
          >
            {operationLoading.saving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  // Auth error screen
  if (authError) {
    return (
      <LayoutWithNavigation navigation={navigation} activeTab={activeTab}>
        <View style={styles.authErrorContainer}>
          <Ionicons name="lock-closed" size={64} color="#6a11cb" />
          <Text style={styles.authErrorTitle}>Session Expired</Text>
          <Text style={styles.authErrorText}>
            Your session has expired. Please sign in again to continue.
          </Text>
          <TouchableOpacity 
            style={styles.authErrorButton}
            onPress={() => navigation.navigate('SignInScreen')}
          >
            <Text style={styles.authErrorButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </LayoutWithNavigation>
    );
  }

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
  scrollView: {
    flex: 1,
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
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#6a11cb',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  authErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  authErrorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginTop: 20,
    marginBottom: 12,
  },
  authErrorText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 30,
  },
  authErrorButton: {
    backgroundColor: '#6a11cb',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 12,
  },
  authErrorButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
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
  saveButton: {
    backgroundColor: '#6a11cb',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
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
  bottomSpace: {
    height: 20,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.9)',
    padding: 8,
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
    borderRadius: 8,
    marginHorizontal: 10,
  },
  offlineBannerText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default ProfileScreen;