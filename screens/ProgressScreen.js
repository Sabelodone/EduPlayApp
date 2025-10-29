import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { ProgressBar, Card } from 'react-native-paper';
import { LayoutWithNavigation } from '../components/LayoutWithNavigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config'; // Add this import

export default function ProgressScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('progress');
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadProgressData();
  }, []);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/progress/user-progress`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProgressData(data);
      } else {
        // Fallback to local data or empty state
        setProgressData(emptyProgressData);
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
      setProgressData(emptyProgressData);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProgressData();
  };

  const emptyProgressData = {
    totalChallenges: 0,
    completedChallenges: 0,
    badges: 0,
    achievements: 0,
    totalLessons: 0,
    completedLessons: 0,
    totalGames: 0,
    completedGames: 0,
    streak: 0,
    points: 0,
    level: 'Beginner',
    weeklyProgress: 0,
    monthlyProgress: 0
  };

  const data = progressData || emptyProgressData;

  const calculatePercentage = (completed, total) => {
    return total > 0 ? (completed / total) * 100 : 0;
  };

  return (
    <LayoutWithNavigation activeTab={activeTab} navigation={navigation}>
      <SafeAreaView style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh}
            />
          }
        >
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Your Learning Progress</Text>
            <Text style={styles.headerSubtitle}>Track your achievements and growth</Text>
          </View>

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color="#0A7C72" />
            </View>
          ) : (
            <View style={styles.content}>
              {/* Overall Progress Card */}
              <Card style={styles.progressCard}>
                <Card.Content>
                  <Text style={styles.cardTitle}>Overall Progress</Text>
                  <View style={styles.progressItem}>
                    <Text style={styles.progressLabel}>Weekly Progress</Text>
                    <Text style={styles.progressValue}>{data.weeklyProgress}%</Text>
                  </View>
                  <ProgressBar 
                    progress={data.weeklyProgress / 100} 
                    color="#0A7C72"
                    style={styles.progressBar}
                  />
                  
                  <View style={styles.progressItem}>
                    <Text style={styles.progressLabel}>Monthly Progress</Text>
                    <Text style={styles.progressValue}>{data.monthlyProgress}%</Text>
                  </View>
                  <ProgressBar 
                    progress={data.monthlyProgress / 100} 
                    color="#0fbfae"
                    style={styles.progressBar}
                  />
                </Card.Content>
              </Card>

              {/* Stats Grid */}
              <View style={styles.statsGrid}>
                <Card style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <Text style={styles.statNumber}>{data.completedLessons}/{data.totalLessons}</Text>
                    <Text style={styles.statLabel}>Lessons Completed</Text>
                    <ProgressBar 
                      progress={calculatePercentage(data.completedLessons, data.totalLessons) / 100} 
                      color="#4ECDC4"
                      style={styles.miniProgressBar}
                    />
                  </Card.Content>
                </Card>

                <Card style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <Text style={styles.statNumber}>{data.completedGames}/{data.totalGames}</Text>
                    <Text style={styles.statLabel}>Games Completed</Text>
                    <ProgressBar 
                      progress={calculatePercentage(data.completedGames, data.totalGames) / 100} 
                      color="#FFD166"
                      style={styles.miniProgressBar}
                    />
                  </Card.Content>
                </Card>

                <Card style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <Text style={styles.statNumber}>{data.completedChallenges}/{data.totalChallenges}</Text>
                    <Text style={styles.statLabel}>Challenges Completed</Text>
                    <ProgressBar 
                      progress={calculatePercentage(data.completedChallenges, data.totalChallenges) / 100} 
                      color="#FF6B6B"
                      style={styles.miniProgressBar}
                    />
                  </Card.Content>
                </Card>

                <Card style={styles.statCard}>
                  <Card.Content style={styles.statContent}>
                    <Text style={styles.statNumber}>{data.streak}</Text>
                    <Text style={styles.statLabel}>Day Streak</Text>
                    <View style={styles.streakIndicator} />
                  </Card.Content>
                </Card>
              </View>

              {/* Achievements */}
              <Card style={styles.achievementsCard}>
                <Card.Content>
                  <Text style={styles.cardTitle}>Achievements & Badges</Text>
                  <Text style={styles.achievementsCount}>
                    {data.badges} Badges • {data.achievements} Achievements
                  </Text>
                  <Text style={styles.levelText}>Level: {data.level}</Text>
                  <Text style={styles.pointsText}>{data.points} Points</Text>
                </Card.Content>
              </Card>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </LayoutWithNavigation>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#718096',
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  content: {
    padding: 20,
  },
  progressCard: {
    marginBottom: 20,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 16,
  },
  progressItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    color: '#718096',
  },
  progressValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statCard: {
    width: '48%',
    marginBottom: 12,
  },
  statContent: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    marginBottom: 8,
  },
  miniProgressBar: {
    height: 4,
    width: '100%',
    borderRadius: 2,
  },
  streakIndicator: {
    width: '100%',
    height: 4,
    backgroundColor: '#FFD166',
    borderRadius: 2,
  },
  achievementsCard: {
    marginBottom: 20,
  },
  achievementsCount: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 8,
  },
  levelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0A7C72',
    marginBottom: 4,
  },
  pointsText: {
    fontSize: 14,
    color: '#718096',
  },
});