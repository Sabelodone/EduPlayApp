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
import AsyncStorage from '@react-native-async-storage/async-storage';

import { DASHBOARD_CONFIG, QUICK_ACTIONS } from '../components/dashboardConfig';
import { HeaderSection } from '../components/HeaderSection';
import { StatsGrid } from '../components/StatsGrid';
import { QuickActions } from '../components/QuickActions';
import { ActivityList } from '../components/ActivityList';
import { UpcomingChallenges } from '../components/UpcomingChallenges';
import { AchievementBadges } from '../components/AchievementBadges';
import { LayoutWithNavigation } from '../components/LayoutWithNavigation';
import API_BASE_URL from '../config';

const { width } = Dimensions.get('window');

const StudentDashboardScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [userData, setUserData] = useState(null);
  const [quickStats, setQuickStats] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [upcomingChallenges, setUpcomingChallenges] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      
      console.log('🔑 Token found:', !!token);
      console.log('🌐 API Base URL:', API_BASE_URL);
      
      if (!token) {
        console.log('❌ No access token found - redirecting to login');
        Alert.alert(
          'Session Expired',
          'Please sign in again',
          [{ text: 'OK', onPress: () => navigation.navigate('SignInScreen') }]
        );
        return;
      }

      // Test the auth endpoint first
      console.log('🔄 Testing auth endpoint...');
      const authTestResponse = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      console.log('🔍 Auth response status:', authTestResponse.status);
      
      if (!authTestResponse.ok) {
        const errorText = await authTestResponse.text();
        console.log('❌ Auth error response:', errorText);
        
        if (authTestResponse.status === 401 || authTestResponse.status === 422) {
          // Token is invalid or expired
          await AsyncStorage.removeItem('access_token');
          await AsyncStorage.removeItem('refresh_token');
          Alert.alert(
            'Session Expired',
            'Please sign in again',
            [{ text: 'OK', onPress: () => navigation.navigate('SignInScreen') }]
          );
          return;
        }
        
        throw new Error(`HTTP ${authTestResponse.status}: ${errorText}`);
      }

      const authData = await authTestResponse.json();
      console.log('✅ Auth data received:', authData);
      setUserData(authData.user || {});

      // Now try to load other dashboard data with better error handling
      const endpoints = [
        { url: `${API_BASE_URL}/dashboard/stats`, setter: setQuickStats, key: 'stats' },
        { url: `${API_BASE_URL}/dashboard/recent-activity`, setter: setRecentActivity, key: 'activities' },
        { url: `${API_BASE_URL}/dashboard/upcoming-challenges`, setter: setUpcomingChallenges, key: 'challenges' },
        { url: `${API_BASE_URL}/dashboard/achievements`, setter: setAchievements, key: 'achievements' }
      ];

      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Fetching ${endpoint.key}...`);
          const response = await fetch(endpoint.url, {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
          });

          if (response.ok) {
            const data = await response.json();
            endpoint.setter(data[endpoint.key] || []);
            console.log(`✅ ${endpoint.key} loaded successfully`);
          } else {
            console.log(`⚠️ ${endpoint.key} failed:`, response.status);
            // Use fallback data for this specific endpoint
            if (endpoint.key === 'stats') {
              endpoint.setter(getFallbackStats());
            } else {
              endpoint.setter([]);
            }
          }
        } catch (endpointError) {
          console.log(`❌ ${endpoint.key} error:`, endpointError);
          // Use fallback data for this specific endpoint
          if (endpoint.key === 'stats') {
            endpoint.setter(getFallbackStats());
          } else {
            endpoint.setter([]);
          }
        }
      }

    } catch (error) {
      console.error('💥 Main dashboard error:', error);
      
      // Set safe fallback data
      setUserData({});
      setQuickStats(getFallbackStats());
      setRecentActivity([]);
      setUpcomingChallenges([]);
      setAchievements([]);
      
      // Only show alert for non-auth errors
      if (!error.message.includes('401') && !error.message.includes('422')) {
        Alert.alert(
          'Connection Error', 
          'Using offline mode. Some features may be limited.',
          [{ text: 'OK' }]
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getFallbackStats = () => {
    return [
      { 
        id: '1', 
        title: 'Lessons Completed', 
        value: '0', 
        subtitle: 'This week', 
        change: '+0%', 
        gradient: ['#4ECDC4', '#44A08D'],
        icon: 'book',
        iconType: 'Ionicons',
        suffix: ''
      },
      { 
        id: '2', 
        title: 'Study Streak', 
        value: '0', 
        subtitle: 'Days', 
        change: '+0', 
        gradient: ['#FFD166', '#FFB347'],
        icon: 'flame',
        iconType: 'Ionicons',
        suffix: ''
      },
      { 
        id: '3', 
        title: 'Points Earned', 
        value: '0', 
        subtitle: 'Total', 
        change: '+0', 
        gradient: ['#FF6B6B', '#EE5A52'],
        icon: 'star',
        iconType: 'Ionicons',
        suffix: ''
      },
      { 
        id: '4', 
        title: 'Games Played', 
        value: '0', 
        subtitle: 'This month', 
        change: '+0%', 
        gradient: ['#6A7FDB', '#5A6FC8'],
        icon: 'game-controller',
        iconType: 'Ionicons',
        suffix: ''
      }
    ];
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
  };

  const handleActionPress = (action) => {
    if (action.screen) {
      const validScreens = [
        'GamesScreen', 
        'LessonsScreen', 
        'ChallengesScreen', 
        'ProgressScreen', 
        'ProfileScreen',
        'QuizScreen',
        'HomeScreen'
      ];
      
      if (validScreens.includes(action.screen)) {
        navigation.navigate(action.screen);
      } else {
        Alert.alert('Coming Soon', `${action.title} feature coming soon!`);
      }
    }
  };

  // Empty state component
  const renderEmptyState = (section) => (
    <View style={styles.emptySection}>
      <Text style={styles.emptySectionTitle}>No {section} Yet</Text>
      <Text style={styles.emptySectionText}>
        {section === 'Statistics' && 'Complete some activities to see your statistics'}
        {section === 'Achievements' && 'Earn achievements by completing lessons and games'}
        {section === 'Activities' && 'Your recent activities will appear here'}
        {section === 'Challenges' && 'Join challenges to test your skills and earn rewards'}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <LayoutWithNavigation activeTab={activeTab} navigation={navigation}>
        <RNSafeAreaView style={styles.container}>
          <StatusBar barStyle="light-content" />
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0A7C72" />
            <Text style={styles.loadingText}>Loading your dashboard...</Text>
          </View>
        </RNSafeAreaView>
      </LayoutWithNavigation>
    );
  }

  return (
    <LayoutWithNavigation activeTab={activeTab} navigation={navigation}>
      <RNSafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Safe HeaderSection with null check */}
        <HeaderSection 
          userData={userData || {}} 
          onNotificationPress={() => Alert.alert('Notifications', 'Coming soon!')}
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
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeTitle}>
              Welcome back{userData?.first_name ? `, ${userData.first_name}` : userData?.name ? `, ${userData.name}` : ''}! 👋
            </Text>
            <Text style={styles.welcomeSubtitle}>
              Ready to continue your learning journey?
            </Text>
          </View>

          {/* Quick Stats Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Learning Overview</Text>
            {quickStats.length > 0 ? (
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
              <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Activity History feature coming soon!')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {recentActivity.length > 0 ? (
              <ActivityList 
                activities={recentActivity}
                onActivityPress={(activity) => console.log('Activity pressed:', activity)}
              />
            ) : (
              renderEmptyState('Activities')
            )}
          </View>

          {/* Achievements Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Achievements</Text>
              <TouchableOpacity onPress={() => Alert.alert('Coming Soon', 'Achievements feature coming soon!')}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            {achievements.length > 0 ? (
              <AchievementBadges 
                achievements={achievements}
                onPress={(achievement) => Alert.alert('Coming Soon', 'Achievement Details feature coming soon!')}
              />
            ) : (
              renderEmptyState('Achievements')
            )}
          </View>

          {/* Upcoming Challenges Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Featured Challenges</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ChallengesScreen')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            {upcomingChallenges.length > 0 ? (
              <UpcomingChallenges 
                challenges={upcomingChallenges}
                onJoinPress={(challengeId) => Alert.alert('Coming Soon', 'Challenge joining feature coming soon!')}
              />
            ) : (
              renderEmptyState('Challenges')
            )}
          </View>

          {/* Motivational Section */}
          <View style={styles.motivationalSection}>
            <Text style={styles.motivationalTitle}>Keep Going! 🚀</Text>
            <Text style={styles.motivationalText}>
              Every lesson completed brings you closer to your goals. You're doing great!
            </Text>
          </View>
        </ScrollView>
      </RNSafeAreaView>
    </LayoutWithNavigation>
  );
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#2D3748',
  },
  welcomeSection: {
    padding: 20,
    paddingBottom: 10,
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
  },
  motivationalSection: {
    backgroundColor: 'rgba(10, 124, 114, 0.1)',
    margin: 20,
    padding: 20,
    borderRadius: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#0A7C72',
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
  },
});

export default StudentDashboardScreen;