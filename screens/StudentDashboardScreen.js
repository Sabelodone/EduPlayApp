import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  RefreshControl,
  Alert,
  ActivityIndicator
} from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';

import { DASHBOARD_CONFIG, QUICK_ACTIONS } from '../components/dashboardConfig';
import { HeaderSection } from '../components/HeaderSection';
import { StatsGrid } from '../components/StatsGrid';
import { QuickActions } from '../components/QuickActions';
import { ActivityList } from '../components/ActivityList';
import { UpcomingChallenges } from '../components/UpcomingChallenges';
import { AchievementBadges } from '../components/AchievementBadges';
import { LayoutWithNavigation } from '../components/LayoutWithNavigation';
import { useDashboardData } from '../hooks/useDashboardData';
import { useAuth } from '../hooks/useAuth';

const { width } = Dimensions.get('window');

const StudentDashboardScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Use the dashboard data hook - this handles all data fetching automatically
  const {
    userData,
    quickStats,
    recentActivity,
    upcomingChallenges,
    achievements,
    refreshing,
    loading,
    error,
    onRefresh,
    loadDashboardData
  } = useDashboardData();

  const { user, logout } = useAuth();

  useEffect(() => {
    console.log('🔄 Dashboard mounted - Auth user:', user);
    console.log('📊 Dashboard data state:', { 
      userData, 
      quickStatsCount: quickStats.length,
      recentActivityCount: recentActivity.length,
      upcomingChallengesCount: upcomingChallenges.length,
      achievementsCount: achievements.length,
      loading,
      error 
    });
  }, [userData, quickStats, recentActivity, upcomingChallenges, achievements, loading, error]);

  // Handle errors from the hook
  useEffect(() => {
    if (error) {
      console.log('❌ Dashboard error:', error);
      if (error.includes('Please sign in')) {
        Alert.alert(
          'Session Expired',
          'Please sign in again',
          [{ text: 'OK', onPress: () => navigation.navigate('SignInScreen') }]
        );
      }
    }
  }, [error]);

  const handleActionPress = (action) => {
    console.log('🎯 Action pressed:', action.title);
    
    if (action.screen) {
      const validScreens = [
        'GamesScreen', 
        'LessonsScreen', 
        'ChallengesScreen', 
        'ProgressScreen', 
        'ProfileScreen',
        'QuizScreen',
        'HomeScreen',
        'StudentDashboardScreen'
      ];
      
      if (validScreens.includes(action.screen)) {
        // Update active tab if needed
        if (action.screen === 'ProfileScreen') {
          setActiveTab('profile');
        } else if (action.screen === 'GamesScreen') {
          setActiveTab('games');
        } else if (action.screen === 'ProgressScreen') {
          setActiveTab('progress');
        }
        
        navigation.navigate(action.screen);
      } else {
        Alert.alert('Coming Soon', `${action.title} feature coming soon!`);
      }
    } else {
      Alert.alert('Coming Soon', `${action.title} feature coming soon!`);
    }
  };

  const handleCompleteActivity = async (activityId, activityType) => {
    try {
      // You can implement this later when you have activity completion logic
      Alert.alert('Activity Completed', 'Great job! Points added to your profile.');
    } catch (error) {
      console.error('Error completing activity:', error);
      Alert.alert('Error', 'Failed to complete activity');
    }
  };

  // FIXED: Enhanced empty state component with proper if-else logic
  const renderEmptyState = (section, customMessage = null) => {
    let message = customMessage;
    
    if (!message) {
      if (section === 'Statistics') {
        message = 'Complete some activities to see your learning statistics';
      } else if (section === 'Achievements') {
        message = 'Earn achievements by completing lessons, games, and challenges';
      } else if (section === 'Activities') {
        message = 'Your recent learning activities will appear here';
      } else if (section === 'Challenges') {
        message = 'Join exciting challenges to test your skills and earn rewards';
      } else {
        message = `No ${section.toLowerCase()} available yet`;
      }
    }

    return (
      <View style={styles.emptySection}>
        <Text style={styles.emptySectionTitle}>No {section} Yet</Text>
        <Text style={styles.emptySectionText}>
          {message}
        </Text>
        {section === 'Activities' && (
          <TouchableOpacity 
            style={styles.getStartedButton}
            onPress={() => navigation.navigate('GamesScreen')}
          >
            <Text style={styles.getStartedButtonText}>Start Learning</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Enhanced loading state
  if (loading) {
    return (
      <LayoutWithNavigation activeTab={activeTab} navigation={navigation}>
        <RNSafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A7C72" />
            <Text style={styles.loadingText}>Loading your dashboard...</Text>
            <Text style={styles.loadingSubtext}>
              {user ? `Welcome back, ${user.first_name || user.name || 'Student'}!` : 'Getting everything ready...'}
            </Text>
          </View>
        </RNSafeAreaView>
      </LayoutWithNavigation>
    );
  }

  // Get display name from either auth user or dashboard user data
  const displayName = user?.first_name || userData?.name || user?.name || '';

  return (
    <LayoutWithNavigation activeTab={activeTab} navigation={navigation}>
      <RNSafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Header Section with real user data */}
        <HeaderSection 
          userData={{
            ...userData,
            // Fallback to auth user data if dashboard data is not available yet
            name: displayName,
            grade: userData?.grade || user?.profile?.grade_level || '10',
            points: userData?.points || 0,
            level: userData?.level || '1',
            avatarInitials: userData?.avatarInitials || (displayName ? getInitials(displayName) : 'S')
          }}
          onNotificationPress={() => Alert.alert('Notifications', 'You have no new notifications')}
          onProfilePress={() => {
            setActiveTab('profile');
            navigation.navigate('ProfileScreen');
          }}
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
              colors={['#0A7C72']}
              tintColor="#0A7C72"
            />
          }
        >
          {/* Welcome Section with personalized greeting */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>
              Welcome back{displayName ? `, ${displayName}` : ''}! 👋
            </Text>
            <Text style={styles.welcomeSubtitle}>
              {userData?.level ? `Level ${userData.level} Learner` : 'Ready to continue your learning journey?'}
            </Text>
            {userData?.points !== undefined && (
              <View style={styles.pointsBadge}>
                <Text style={styles.pointsText}>{userData.points} points</Text>
              </View>
            )}
          </View>

          {/* Quick Stats Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Learning Overview</Text>
            {quickStats && quickStats.length > 0 ? (
              <StatsGrid stats={quickStats} />
            ) : (
              renderEmptyState('Statistics')
            )}
          </View>

          {/* Quick Actions Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Access</Text>
            <QuickActions 
              actions={QUICK_ACTIONS}
              onActionPress={handleActionPress}
            />
          </View>

          {/* Recent Activity Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {recentActivity.length > 0 && (
                <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Activity History feature coming soon!')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            {recentActivity && recentActivity.length > 0 ? (
              <ActivityList 
                activities={recentActivity}
                onActivityPress={handleCompleteActivity}
              />
            ) : (
              renderEmptyState('Activities', 'Start playing games or complete lessons to see your activity here!')
            )}
          </View>

          {/* Achievements Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              {achievements.length > 0 && (
                <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Achievements gallery coming soon!')}>
                  <Text style={styles.seeAllText}>View All</Text>
                </TouchableOpacity>
              )}
            </View>
            {achievements && achievements.length > 0 ? (
              <AchievementBadges 
                achievements={achievements}
                onPress={(achievement) => Alert.alert(achievement.name, achievement.description)}
              />
            ) : (
              renderEmptyState('Achievements')
            )}
          </View>

          {/* Upcoming Challenges Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Challenges</Text>
              {upcomingChallenges.length > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate('ChallengesScreen')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            {upcomingChallenges && upcomingChallenges.length > 0 ? (
              <UpcomingChallenges 
                challenges={upcomingChallenges}
                onJoinPress={(challengeId) => {
                  const challenge = upcomingChallenges.find(c => c.id === challengeId);
                  Alert.alert(
                    'Join Challenge', 
                    `Join "${challenge?.title}"?`, 
                    [
                      { text: 'Cancel', style: 'cancel' },
                      { text: 'Join', onPress: () => navigation.navigate('ChallengesScreen') }
                    ]
                  );
                }}
              />
            ) : (
              renderEmptyState('Challenges')
            )}
          </View>

          {/* Motivational Section */}
          <View style={styles.motivationalSection}>
            <Text style={styles.motivationalTitle}>Keep Going! 🚀</Text>
            <Text style={styles.motivationalText}>
              {userData?.points > 0 
                ? `You've earned ${userData.points} points so far! Every lesson completed brings you closer to your goals.`
                : "Every lesson completed brings you closer to your goals. You're doing great!"
              }
            </Text>
            <TouchableOpacity 
              style={styles.motivationalButton}
              onPress={() => navigation.navigate('GamesScreen')}
            >
              <Text style={styles.motivationalButtonText}>Continue Learning</Text>
            </TouchableOpacity>
          </View>

          {/* Debug info - remove in production */}
          {__DEV__ && (
            <View style={styles.debugSection}>
              <Text style={styles.debugTitle}>Debug Info</Text>
              <Text style={styles.debugText}>User: {displayName || 'No name'}</Text>
              <Text style={styles.debugText}>Grade: {userData?.grade || 'Not set'}</Text>
              <Text style={styles.debugText}>Points: {userData?.points || 0}</Text>
              <Text style={styles.debugText}>Level: {userData?.level || '1'}</Text>
            </View>
          )}
        </ScrollView>
      </RNSafeAreaView>
    </LayoutWithNavigation>
  );
};

// Helper function to get initials
const getInitials = (name) => {
  if (!name) return 'S';
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .substring(0, 2);
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
  },
  welcomeSection: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
    margin: 20,
    marginBottom: 0,
    borderRadius: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: '#718096',
    lineHeight: 22,
    marginBottom: 12,
  },
  pointsBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#0A7C72',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pointsText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  section: {
    padding: 20,
    paddingTop: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  seeAllText: {
    color: '#0A7C72',
    fontSize: 14,
    fontWeight: '600',
  },
  emptySection: {
    backgroundColor: 'white',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  emptySectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  emptySectionText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  getStartedButton: {
    backgroundColor: '#0A7C72',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  getStartedButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  motivationalSection: {
    backgroundColor: 'rgba(10, 124, 114, 0.1)',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0A7C72',
    alignItems: 'center',
  },
  motivationalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0A7C72',
    marginBottom: 8,
  },
  motivationalText: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 16,
  },
  motivationalButton: {
    backgroundColor: '#0A7C72',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  motivationalButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  debugSection: {
    backgroundColor: '#F7FAFC',
    margin: 20,
    padding: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  debugTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4A5568',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 10,
    color: '#718096',
    marginBottom: 2,
  },
});

export default StudentDashboardScreen;