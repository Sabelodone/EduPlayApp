import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LayoutWithNavigation } from '../components/LayoutWithNavigation';
import API_BASE_URL from '../config';

export default function HomeScreen() {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('home');
  const [userData, setUserData] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setLoading(true);
      
      // Check if user is guest
      const guestStatus = await AsyncStorage.getItem('is_guest');
      setIsGuest(guestStatus === 'true');

      const token = await AsyncStorage.getItem('access_token');
      
      if (!token && !isGuest) {
        // No token and not guest, redirect to welcome
        navigation.navigate('WelcomeScreen');
        return;
      }

      if (token) {
        // Fetch user data from backend
        const userResponse = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          setUserData(userData.user);
        }

        // Fetch recent activity
        const activityResponse = await fetch(`${API_BASE_URL}/dashboard/recent-activity`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (activityResponse.ok) {
          const activityData = await activityResponse.json();
          setRecentActivity(activityData.activities?.slice(0, 3) || []);
        }
      }

    } catch (error) {
      console.error('Error loading home data:', error);
      Alert.alert('Error', 'Failed to load data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'is_guest']);
      navigation.navigate('WelcomeScreen');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const getMotivationalQuote = () => {
    const quotes = [
      "💫 \"The beautiful thing about learning is that no one can take it away from you.\"",
      "🚀 \"Education is the most powerful weapon you can use to change the world.\"",
      "🌟 \"Your potential is endless. Keep learning, keep growing!\"",
      "📚 \"The expert in anything was once a beginner. Keep going!\"",
      "🎯 \"Every small step in learning brings you closer to your big goals.\""
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  };

  if (loading) {
    return (
      <LayoutWithNavigation activeTab={activeTab} navigation={navigation}>
        <SafeAreaView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.loadingText}>Loading your dashboard...</Text>
          </View>
        </SafeAreaView>
      </LayoutWithNavigation>
    );
  }

  return (
    <LayoutWithNavigation activeTab={activeTab} navigation={navigation}>
      <SafeAreaView style={styles.container}>
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.userInfo}>
                <Image
                  source={{ 
                    uri: userData?.profile?.avatar || 'https://via.placeholder.com/80x80?text=🎓' 
                  }}
                  style={styles.avatar}
                />
                <View style={styles.userText}>
                  <Text style={styles.greeting}>
                    {getGreeting()}{userData?.first_name ? `, ${userData.first_name}` : ''}! 👋
                  </Text>
                  <Text style={styles.subtitle}>
                    {isGuest ? 'Guest Mode - Limited Access' : 'Ready to explore and learn today?'}
                  </Text>
                </View>
              </View>
              {!isGuest && (
                <TouchableOpacity style={styles.profileButton} onPress={handleSignOut}>
                  <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                </TouchableOpacity>
              )}
            </View>

            {isGuest && (
              <View style={styles.guestBanner}>
                <Ionicons name="information-circle" size={16} color="#FFFFFF" />
                <Text style={styles.guestText}>
                  Sign up to save progress and unlock all features
                </Text>
                <TouchableOpacity 
                  style={styles.signUpPrompt}
                  onPress={() => navigation.navigate('SignUpScreen')}
                >
                  <Text style={styles.signUpText}>Sign Up</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Main Welcome Section */}
          <LinearGradient
            colors={['#FFFFFF', '#F8F9FA']}
            style={styles.welcomeCard}
          >
            <Text style={styles.welcomeTitle}>🎉 Welcome to EduPlay!</Text>
            <Text style={styles.welcomeDescription}>
              Discover AI-powered educational games, interactive lessons, and exciting challenges designed to make learning enjoyable and effective!
            </Text>
            {userData?.profile?.grade_level && (
              <View style={styles.gradeBadge}>
                <Ionicons name="school" size={16} color="#0A7C72" />
                <Text style={styles.gradeText}>Grade {userData.profile.grade_level}</Text>
              </View>
            )}
          </LinearGradient>

          {/* Dashboard Button */}
          <TouchableOpacity
            style={styles.dashboardButton}
            onPress={() => {
              setActiveTab('dashboard');
              navigation.navigate('StudentDashboardScreen');
            }}
          >
            <LinearGradient
              colors={['#0A7C72', '#0fbfae']}
              style={styles.dashboardGradient}
            >
              <View style={styles.dashboardContent}>
                <Ionicons name="stats-chart" size={24} color="#FFFFFF" />
                <View style={styles.dashboardText}>
                  <Text style={styles.dashboardButtonText}>View My Dashboard</Text>
                  <Text style={styles.dashboardButtonSubtext}>
                    Track progress, achievements, and learning stats
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Quick Actions Grid */}
          <View style={styles.actionsGrid}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.gridContainer}>
              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  setActiveTab('games');
                  navigation.navigate('GamesScreen');
                }}
              >
                <LinearGradient
                  colors={['#4ECDC4', '#44A08D']}
                  style={styles.actionGradient}
                >
                  <Ionicons name="game-controller" size={28} color="#FFFFFF" />
                  <Text style={styles.actionText}>Play Games</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  setActiveTab('lessons');
                  navigation.navigate('LessonsScreen');
                }}
              >
                <LinearGradient
                  colors={['#FFD166', '#FFB347']}
                  style={styles.actionGradient}
                >
                  <Ionicons name="book" size={28} color="#FFFFFF" />
                  <Text style={styles.actionText}>Lessons</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  setActiveTab('challenges');
                  navigation.navigate('ChallengesScreen');
                }}
              >
                <LinearGradient
                  colors={['#FF6B6B', '#FF8E8E']}
                  style={styles.actionGradient}
                >
                  <Ionicons name="trophy" size={28} color="#FFFFFF" />
                  <Text style={styles.actionText}>Challenges</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionCard}
                onPress={() => {
                  setActiveTab('progress');
                  navigation.navigate('ProgressScreen');
                }}
              >
                <LinearGradient
                  colors={['#6A7FDB', '#8E9DCC']}
                  style={styles.actionGradient}
                >
                  <Ionicons name="trending-up" size={28} color="#FFFFFF" />
                  <Text style={styles.actionText}>Progress</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {/* Daily Motivation */}
          <View style={styles.motivationCard}>
            <Ionicons name="sparkles" size={20} color="#FFD700" />
            <Text style={styles.motivationText}>{getMotivationalQuote()}</Text>
          </View>

          {/* Recent Activity */}
          <View style={styles.activitySection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              {recentActivity.length > 0 && (
                <TouchableOpacity onPress={() => navigation.navigate('StudentDashboardScreen')}>
                  <Text style={styles.seeAllText}>See All</Text>
                </TouchableOpacity>
              )}
            </View>
            
            {recentActivity.length > 0 ? (
              <View style={styles.activityList}>
                {recentActivity.map((activity, index) => (
                  <View key={index} style={styles.activityItem}>
                    <Ionicons 
                      name={activity.icon || "checkmark-circle"} 
                      size={20} 
                      color="#0A7C72" 
                    />
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>{activity.title}</Text>
                      <Text style={styles.activityTime}>{activity.time}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyActivity}>
                <Ionicons name="time-outline" size={40} color="rgba(255,255,255,0.5)" />
                <Text style={styles.emptyActivityText}>No recent activity</Text>
                <Text style={styles.emptyActivitySubtext}>
                  Start playing games or taking lessons to see your progress!
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LayoutWithNavigation>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0fbfae',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    marginBottom: 30,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  userText: {
    flex: 1,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
  },
  profileButton: {
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 20,
  },
  guestBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 12,
    borderRadius: 10,
    marginTop: 10,
  },
  guestText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    marginRight: 12,
  },
  signUpPrompt: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  signUpText: {
    color: '#0A7C72',
    fontSize: 12,
    fontWeight: '600',
  },
  welcomeCard: {
    borderRadius: 20,
    padding: 25,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  welcomeTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0A7C72',
    marginBottom: 10,
    textAlign: 'center',
  },
  welcomeDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 15,
  },
  gradeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(10, 124, 114, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  gradeText: {
    color: '#0A7C72',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  dashboardButton: {
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  dashboardGradient: {
    padding: 20,
  },
  dashboardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dashboardText: {
    flex: 1,
    marginLeft: 15,
  },
  dashboardButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 4,
  },
  dashboardButtonSubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  actionsGrid: {
    marginBottom: 25,
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
    color: 'white',
  },
  seeAllText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    fontWeight: '600',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    width: '48%',
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  actionGradient: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 15,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 8,
  },
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 25,
    borderLeftWidth: 4,
    borderLeftColor: '#FFD700',
  },
  motivationText: {
    flex: 1,
    fontSize: 16,
    color: 'white',
    fontStyle: 'italic',
    marginLeft: 12,
    lineHeight: 22,
  },
  activitySection: {
    marginBottom: 20,
  },
  activityList: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 15,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  activityContent: {
    flex: 1,
    marginLeft: 12,
  },
  activityTitle: {
    fontSize: 14,
    color: 'white',
    fontWeight: '500',
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  emptyActivity: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 15,
    padding: 30,
    alignItems: 'center',
  },
  emptyActivityText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  emptyActivitySubtext: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    lineHeight: 20,
  },
});