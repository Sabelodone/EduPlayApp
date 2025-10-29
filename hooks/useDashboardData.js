import { useState, useEffect } from 'react';

// EMPTY DATA STRUCTURES
const EMPTY_USER_DATA = {
  name: '',
  grade: '',
  points: 0,
  streak: 0,
  level: '',
  avatarInitials: '',
  nextLevelPoints: 0
};

const EMPTY_QUICK_STATS = [];

export const useDashboardData = () => {
  // EMPTY INITIAL STATE
  const [userData, setUserData] = useState(EMPTY_USER_DATA);
  const [quickStats, setQuickStats] = useState(EMPTY_QUICK_STATS);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingChallenges, setUpcomingChallenges] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Load initial data - IMPLEMENT YOUR DATA FETCHING HERE
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // TODO: IMPLEMENT YOUR DATA FETCHING LOGIC
      // Example:
      // const userData = await fetchUserData();
      // setUserData(userData);
      
      // For now, keep everything empty
      setRefreshing(false);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  const updateUserData = (newData) => {
    setUserData(prev => ({ ...prev, ...newData }));
  };

  const completeActivity = (activityId) => {
    // Implement activity completion logic
    setRecentActivity(prev => 
      prev.map(activity => 
        activity.id === activityId 
          ? { ...activity, completed: true }
          : activity
      )
    );
  };

  // Function to initialize with external data
  const initializeWithData = (data) => {
    if (data.userData) setUserData(data.userData);
    if (data.quickStats) setQuickStats(data.quickStats);
    if (data.recentActivity) setRecentActivity(data.recentActivity);
    if (data.upcomingChallenges) setUpcomingChallenges(data.upcomingChallenges);
    if (data.achievements) setAchievements(data.achievements);
  };

  return {
    // Data (all empty by default)
    userData,
    quickStats,
    recentActivity,
    upcomingChallenges,
    achievements,
    
    // State
    refreshing,
    
    // Actions
    onRefresh,
    updateUserData,
    completeActivity,
    loadDashboardData,
    initializeWithData
  };
};