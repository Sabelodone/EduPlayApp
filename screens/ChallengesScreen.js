import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TouchableOpacity
} from 'react-native';
import { Card, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { LayoutWithNavigation } from '../components/LayoutWithNavigation';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

// API Keys
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export default function ChallengesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('challenges');
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile(data.user);
        await generateChallenges(data.user);
      } else {
        await generateChallenges();
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      await generateChallenges();
    }
  };

  const generateChallenges = async (user = null) => {
    if (!OPENAI_API_KEY) {
      // Fallback to sample challenges if no API key
      setChallenges(sampleChallenges);
      setLoading(false);
      return;
    }

    try {
      const userContext = user ? `
        User Profile:
        - Grade: ${user.profile?.grade_level || 'Not specified'}
        - Subjects: ${user.profile?.subjects?.join(', ') || 'Not specified'}
        - School: ${user.profile?.school || 'Not specified'}
      ` : 'No user profile available';

      const prompt = `As an educational AI assistant, generate 5-7 engaging learning challenges for high school students. 
      
      ${userContext}
      
      Create challenges that are:
      - Educational and aligned with high school curriculum
      - Varied in difficulty (Beginner, Intermediate, Advanced)
      - Cover different subjects (Mathematics, English, Science, Accounting)
      - Have clear objectives and rewards
      - Include realistic durations and participant numbers
      
      Format the response as a JSON array with exactly this structure for each challenge:
      {
        "id": "unique_id",
        "title": "Challenge Title",
        "description": "Clear challenge description",
        "subject": "Subject Name",
        "difficulty": "Beginner/Intermediate/Advanced",
        "duration": "e.g., 3 days, 1 week",
        "participants": number,
        "reward": "Badge or reward name",
        "objectives": ["objective1", "objective2", "objective3"],
        "joined": false,
        "completed": false
      }`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: 'You are an educational expert that creates engaging learning challenges for high school students. Always respond with valid JSON array only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0]) {
        const aiResponse = data.choices[0].message.content;
        try {
          // Parse the JSON response from AI
          const generatedChallenges = JSON.parse(aiResponse);
          setChallenges(generatedChallenges);
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
          // Fallback to sample challenges if parsing fails
          setChallenges(sampleChallenges);
        }
      } else {
        setChallenges(sampleChallenges);
      }
    } catch (error) {
      console.error('Error generating challenges with AI:', error);
      setChallenges(sampleChallenges);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadChallenges = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/challenges`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChallenges(data.challenges || []);
      } else {
        // Fallback to AI-generated challenges
        await generateChallenges(userProfile);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
      // Fallback to AI-generated challenges
      await generateChallenges(userProfile);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await generateChallenges(userProfile);
  };

  const handleJoinChallenge = async (challengeId) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/challenges/${challengeId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        Alert.alert('Success', 'You have joined the challenge!');
        // Update local state to show joined
        setChallenges(prev => prev.map(challenge => 
          challenge.id === challengeId 
            ? { ...challenge, joined: true }
            : challenge
        ));
      } else {
        Alert.alert('Error', 'Failed to join challenge. Please try again.');
      }
    } catch (error) {
      console.error('Error joining challenge:', error);
      Alert.alert('Error', 'Failed to join challenge. Please try again.');
    }
  };

  const handleStartChallenge = (challenge) => {
    Alert.alert(
      'Start Challenge',
      `Ready to begin "${challenge.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Now', 
          onPress: () => {
            // Navigate to the appropriate screen based on challenge type
            if (challenge.subject === 'Mathematics') {
              navigation.navigate('LessonsScreen', { 
                subject: challenge.subject,
                autoSelectTopic: true
              });
            } else if (challenge.subject === 'English') {
              navigation.navigate('QuizScreen', { 
                subject: challenge.subject,
                challengeMode: true
              });
            } else {
              navigation.navigate('GamesScreen', { 
                subject: challenge.subject,
                challengeMode: true
              });
            }
          }
        }
      ]
    );
  };

  const sampleChallenges = [
    {
      id: '1',
      title: 'Math Master Challenge',
      description: 'Complete 10 math lessons and score 80%+ on 3 quizzes in Algebra and Geometry topics.',
      subject: 'Mathematics',
      difficulty: 'Intermediate',
      duration: '3 days',
      participants: 150,
      reward: 'Math Master Badge',
      objectives: [
        'Complete 5 Algebra lessons',
        'Complete 5 Geometry lessons',
        'Score 80%+ on 3 math quizzes'
      ],
      joined: false,
      completed: false
    },
    {
      id: '2',
      title: 'Science Explorer Quest',
      description: 'Master Physics and Chemistry concepts through interactive experiments and problem-solving.',
      subject: 'Physical Sciences',
      difficulty: 'Advanced',
      duration: '1 week',
      participants: 89,
      reward: 'Science Expert Badge',
      objectives: [
        'Complete 3 physics experiments',
        'Solve 10 chemistry problems',
        'Write a lab report'
      ],
      joined: true,
      completed: false
    },
    {
      id: '3',
      title: 'Writing Excellence Sprint',
      description: 'Develop your writing skills by completing essay assignments with perfect grammar and structure.',
      subject: 'English',
      difficulty: 'Beginner',
      duration: '2 days',
      participants: 203,
      reward: 'Writing Pro Badge',
      objectives: [
        'Write 2 descriptive essays',
        'Complete grammar exercises',
        'Peer review 1 essay'
      ],
      joined: false,
      completed: false
    },
    {
      id: '4',
      title: 'Accounting Fundamentals',
      description: 'Learn basic accounting principles and practice with real-world business scenarios.',
      subject: 'Accounting',
      difficulty: 'Intermediate',
      duration: '4 days',
      participants: 75,
      reward: 'Accounting Whiz Badge',
      objectives: [
        'Complete balance sheet exercises',
        'Practice ledger entries',
        'Solve 5 accounting problems'
      ],
      joined: false,
      completed: false
    }
  ];

  const getDifficultyColor = (difficulty) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return '#4ECDC4';
      case 'intermediate': return '#FFD166';
      case 'advanced': return '#FF6B6B';
      default: return '#718096';
    }
  };

  const getSubjectIcon = (subject) => {
    const icons = {
      'Mathematics': 'calculator',
      'English': 'book',
      'Physical Sciences': 'flask',
      'Accounting': 'cash',
      'Science': 'flask'
    };
    return icons[subject] || 'trophy';
  };

  const renderChallengeItem = ({ item }) => (
    <Card style={styles.challengeCard}>
      <Card.Content>
        <View style={styles.challengeHeader}>
          <View style={styles.subjectSection}>
            <Ionicons 
              name={getSubjectIcon(item.subject)} 
              size={20} 
              color="#0A7C72" 
              style={styles.subjectIcon}
            />
            <View style={styles.subjectBadge}>
              <Text style={styles.subjectText}>{item.subject}</Text>
            </View>
          </View>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(item.difficulty) }]}>
            <Text style={styles.difficultyText}>{item.difficulty}</Text>
          </View>
        </View>
        
        <Text style={styles.challengeTitle}>{item.title}</Text>
        <Text style={styles.challengeDescription}>{item.description}</Text>
        
        {/* Objectives */}
        <View style={styles.objectivesSection}>
          <Text style={styles.objectivesTitle}>Objectives:</Text>
          {item.objectives?.map((objective, index) => (
            <View key={index} style={styles.objectiveItem}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#4ECDC4" />
              <Text style={styles.objectiveText}>{objective}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.challengeMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={16} color="#718096" />
            <Text style={styles.metaText}>{item.duration}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={16} color="#718096" />
            <Text style={styles.metaText}>{item.participants} participants</Text>
          </View>
        </View>
        
        <View style={styles.rewardSection}>
          <Ionicons name="trophy-outline" size={16} color="#FFD166" />
          <Text style={styles.rewardText}>Reward: {item.reward}</Text>
        </View>

        {item.joined ? (
          <Button 
            mode="contained" 
            style={styles.joinedButton}
            onPress={() => handleStartChallenge(item)}
          >
            <Ionicons name="play" size={16} color="#FFFFFF" style={styles.buttonIcon} />
            Start Challenge
          </Button>
        ) : (
          <Button 
            mode="contained" 
            style={styles.joinButton}
            onPress={() => handleJoinChallenge(item.id)}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" style={styles.buttonIcon} />
            Join Challenge
          </Button>
        )}
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="trophy-outline" size={64} color="#CBD5E0" />
      <Text style={styles.emptyStateTitle}>No Challenges Available</Text>
      <Text style={styles.emptyStateText}>
        {OPENAI_API_KEY 
          ? "We're generating personalized challenges for you..." 
          : "Challenges will be available soon. Check back later!"
        }
      </Text>
      {!OPENAI_API_KEY && (
        <Text style={styles.apiKeyWarning}>
          AI challenge generation requires an OpenAI API key
        </Text>
      )}
    </View>
  );

  return (
    <LayoutWithNavigation activeTab={activeTab} navigation={navigation}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Learning Challenges</Text>
          <Text style={styles.headerSubtitle}>
            {OPENAI_API_KEY 
              ? "AI-powered personalized challenges" 
              : "Test your skills and earn rewards"
            }
          </Text>
          <TouchableOpacity 
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={loading}
          >
            <Ionicons 
              name="refresh" 
              size={20} 
              color={loading ? "#CBD5E0" : "#0A7C72"} 
            />
            <Text style={[
              styles.refreshText,
              { color: loading ? "#CBD5E0" : "#0A7C72" }
            ]}>
              Refresh Challenges
            </Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#0A7C72" />
            <Text style={styles.loadingText}>
              {OPENAI_API_KEY 
                ? "Generating personalized challenges with AI..." 
                : "Loading challenges..."
              }
            </Text>
          </View>
        ) : (
          <FlatList
            data={challenges}
            keyExtractor={(item) => item.id}
            renderItem={renderChallengeItem}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                colors={['#0A7C72']}
              />
            }
            showsVerticalScrollIndicator={false}
          />
        )}
      </SafeAreaView>
    </LayoutWithNavigation>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    padding: 20,
    paddingBottom: 10,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#718096',
    marginBottom: 12,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    padding: 8,
  },
  refreshText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  listContainer: {
    padding: 20,
  },
  challengeCard: {
    marginBottom: 20,
    elevation: 3,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  challengeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  subjectSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  subjectIcon: {
    marginRight: 8,
  },
  subjectBadge: {
    backgroundColor: '#E8F5F4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  subjectText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#0A7C72',
  },
  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  difficultyText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
    lineHeight: 24,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#718096',
    marginBottom: 12,
    lineHeight: 20,
  },
  objectivesSection: {
    marginBottom: 12,
  },
  objectivesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 6,
  },
  objectiveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  objectiveText: {
    fontSize: 13,
    color: '#718096',
    marginLeft: 6,
    flex: 1,
    lineHeight: 18,
  },
  challengeMeta: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  metaText: {
    fontSize: 12,
    color: '#718096',
    marginLeft: 4,
  },
  rewardSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#FFF9E6',
    borderRadius: 6,
  },
  rewardText: {
    fontSize: 14,
    color: '#D97706',
    fontWeight: '600',
    marginLeft: 6,
  },
  joinButton: {
    backgroundColor: '#0A7C72',
    borderRadius: 8,
  },
  joinedButton: {
    backgroundColor: '#4ECDC4',
    borderRadius: 8,
  },
  buttonIcon: {
    marginRight: 6,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 8,
    marginTop: 16,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#718096',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 8,
  },
  apiKeyWarning: {
    fontSize: 12,
    color: '#E53E3E',
    textAlign: 'center',
    fontStyle: 'italic',
  },
});