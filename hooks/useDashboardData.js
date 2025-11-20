import React, { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { dashboardApi } from '../api/dashboard';
import { useAuth } from './useAuth';

// Default empty structures for new users
const EMPTY_USER_DATA = {
  name: '',
  grade: '',
  points: 0,
  streak: 0,
  level: '1',
  avatarInitials: '',
  nextLevelPoints: 100
};

const EMPTY_QUICK_STATS = [
  {
    id: '1', 
    title: 'Challenges Completed', 
    value: '0', 
    subtitle: 'Total', 
    change: '+0%', 
    gradient: ['#4ECDC4', '#44A08D'],
    icon: 'trophy',
    iconType: 'Ionicons',
    suffix: ''
  },
  {
    id: '2', 
    title: 'Current Level', 
    value: '1', 
    subtitle: 'Level', 
    change: '+0', 
    gradient: ['#FFD166', '#FFB347'],
    icon: 'star',
    iconType: 'Ionicons',
    suffix: ''
  },
  {
    id: '3', 
    title: 'Learning Points', 
    value: '0', 
    subtitle: 'Total', 
    change: '+0', 
    gradient: ['#FF6B6B', '#EE5A52'],
    icon: 'flash',
    iconType: 'Ionicons',
    suffix: ''
  },
  {
    id: '4', 
    title: 'Recent Activity', 
    value: '0', 
    subtitle: 'This week', 
    change: '+0%', 
    gradient: ['#6A7FDB', '#5A6FC8'],
    icon: 'activity',
    iconType: 'Ionicons',
    suffix: ''
  }
];

export const useDashboardData = () => {
  const [userData, setUserData] = useState(EMPTY_USER_DATA);
  const [quickStats, setQuickStats] = useState(EMPTY_QUICK_STATS);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingChallenges, setUpcomingChallenges] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { user, isAuthenticated, refreshToken } = useAuth();

  // Enhanced data loading with error handling
  useEffect(() => {
    if (isAuthenticated && user) {
      loadDashboardData();
    } else if (!isAuthenticated) {
      setLoading(false);
      setError('Please sign in to view dashboard');
    }
  }, [isAuthenticated, user]);

  const loadDashboardData = async (showRetry = false) => {
    if (!isAuthenticated) {
      setError('Authentication required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Initialize with user data from auth
      initializeWithUserData();

      // Fetch dashboard data with error handling
      await fetchDashboardData();
      
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      
      // Handle token refresh errors specifically
      if (error.message.includes('Token') || error.message.includes('401')) {
        setError('Session expired. Please refresh.');
        if (showRetry) {
          Alert.alert(
            'Session Expired',
            'Your session has expired. Would you like to refresh?',
            [
              { text: 'Cancel', style: 'cancel' },
              { 
                text: 'Refresh', 
                onPress: async () => {
                  try {
                    await refreshToken();
                    await loadDashboardData();
                  } catch (refreshError) {
                    setError('Please login again');
                  }
                }
              }
            ]
          );
        }
      } else if (error.message.includes('Network')) {
        setError('Network error. Please check your connection.');
      } else {
        setError('Failed to load dashboard data.');
      }
      
      // Even if backend fails, we still have user data from auth
      initializeWithUserData();
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [statsResponse, activitiesResponse, challengesResponse, achievementsResponse] = await Promise.all([
        dashboardApi.getStats().catch(handleApiError('stats')),
        dashboardApi.getRecentActivity(10).catch(handleApiError('activities')),
        dashboardApi.getUpcomingChallenges().catch(handleApiError('challenges')),
        dashboardApi.getAchievements().catch(handleApiError('achievements'))
      ]);

      // Process backend data
      processBackendData(statsResponse, activitiesResponse, challengesResponse, achievementsResponse);
    } catch (error) {
      throw error;
    }
  };

  const handleApiError = (endpoint) => (error) => {
    console.warn(`⚠️ ${endpoint} API error:`, error.message);
    // Return empty data for this endpoint
    return { [endpoint]: [] };
  };

  // Initialize with user data from authentication
  const initializeWithUserData = () => {
    if (user) {
      const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim();
      const grade = user.profile?.grade_level || '10';
      
      const userProfile = {
        name: fullName || user.email?.split('@')[0] || 'Student',
        grade: grade,
        points: user.points || 0,
        streak: user.streak || 0,
        level: user.level || '1',
        avatarInitials: getInitials(fullName || user.email || 'S'),
        nextLevelPoints: calculateNextLevelPoints(user.points || 0, user.level || '1')
      };
      setUserData(userProfile);
    }
  };

  // Process backend API responses
  const processBackendData = (statsResponse, activitiesResponse, challengesResponse, achievementsResponse) => {
    // Handle stats
    if (statsResponse.stats && statsResponse.stats.length > 0) {
      setQuickStats(statsResponse.stats);
      
      // Update user data with points from stats
      const pointsStat = statsResponse.stats.find(stat => stat.title === 'Learning Points');
      const levelStat = statsResponse.stats.find(stat => stat.title === 'Current Level');
      
      if (pointsStat || levelStat) {
        setUserData(prev => ({
          ...prev,
          points: pointsStat ? parseInt(pointsStat.value) : prev.points,
          level: levelStat ? levelStat.value : prev.level,
          nextLevelPoints: calculateNextLevelPoints(
            pointsStat ? parseInt(pointsStat.value) : prev.points,
            levelStat ? levelStat.value : prev.level
          )
        }));
      }
    }

    // Handle activities
    if (activitiesResponse.activities) {
      setRecentActivity(activitiesResponse.activities);
    }

    // Handle challenges
    if (challengesResponse.challenges) {
      setUpcomingChallenges(challengesResponse.challenges);
    }

    // Handle achievements
    if (achievementsResponse.achievements) {
      setAchievements(achievementsResponse.achievements);
    }
  };

  const completeActivity = async (activityId, activityType) => {
    try {
      const response = await dashboardApi.completeActivity({
        activity_id: activityId,
        activity_type: activityType
      });

      if (response.message) {
        // Update local state
        setRecentActivity(prev => 
          prev.map(activity => 
            activity.id === activityId 
              ? { ...activity, completed: true }
              : activity
          )
        );

        // Refresh data to get updated points
        await loadDashboardData();
        
        return { success: true, points: response.points_earned || 10 };
      }
      
      return { success: false };
    } catch (error) {
      console.error('❌ Error completing activity:', error);
      Alert.alert('Error', 'Failed to complete activity');
      return { success: false };
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData(true); // Pass true to show retry options for auth errors
  };

  const updateUserData = (newData) => {
    setUserData(prev => ({ ...prev, ...newData }));
  };

  const retryLoad = () => {
    loadDashboardData(true);
  };

  return {
    // Data
    userData,
    quickStats,
    recentActivity,
    upcomingChallenges,
    achievements,
    
    // State
    refreshing,
    loading,
    error,
    isAuthenticated,
    
    // Actions
    onRefresh,
    updateUserData,
    completeActivity,
    loadDashboardData: retryLoad,
    refetch: retryLoad
  };
};

// Helper functions
const calculateNextLevelPoints = (points, level) => {
  const currentLevel = parseInt(level) || 1;
  const levelBase = currentLevel * 100;
  return Math.max(levelBase - points, 0);
};

const getInitials = (name) => {
  if (!name) return 'S';
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};