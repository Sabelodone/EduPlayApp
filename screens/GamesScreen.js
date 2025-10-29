import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  Alert,
  Animated,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

// Import your game data
import { 
  GAME_CATEGORIES, 
  GAME_TEMPLATES, 
  SUBJECT_ICONS,
  GAME_DIFFICULTIES 
} from '../components/gameData';

const { height } = Dimensions.get('window');
const isSmallDevice = height < 700;

// API Keys
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export default function GamesScreen() {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const categories = GAME_CATEGORIES;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    loadUserProfile();
    loadGames();
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
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const generateGamesWithAI = async () => {
    if (!OPENAI_API_KEY) {
      return null;
    }

    try {
      const userContext = userProfile ? `
        User Profile:
        - Grade: ${userProfile.profile?.grade_level || 'Not specified'}
        - Subjects: ${userProfile.profile?.subjects?.join(', ') || 'Not specified'}
        - School: ${userProfile.profile?.school || 'Not specified'}
      ` : 'Generate for high school students (Grades 10-12)';

      const prompt = `As an educational game designer, create 8-12 engaging educational games for high school students.
      
      ${userContext}
      
      Create games that are:
      - Educational and aligned with CAPS curriculum
      - Cover Mathematics, English, Physical Sciences, and Accounting
      - Include different difficulty levels (Beginner, Intermediate, Advanced)
      - Have clear learning objectives
      - Are interactive and engaging
      
      Format the response as a JSON array with exactly this structure for each game:
      {
        "id": "unique_id",
        "title": "Creative Game Title",
        "description": "Clear game description with learning objectives",
        "category": "Mathematics/English/Physical Sciences/Accounting",
        "difficulty": "Beginner/Intermediate/Advanced",
        "duration": "e.g., 5-10 mins, 10-15 mins",
        "players": "1-2 players or Individual",
        "icon": "🎯",
        "color": "#4ECDC4",
        "topics": ["topic1", "topic2", "topic3"],
        "rating": 4.5,
        "generated": true,
        "locked": false
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
              content: 'You are an expert educational game designer. Create engaging, curriculum-aligned games for high school students. Always respond with valid JSON array only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0]) {
        const aiResponse = data.choices[0].message.content;
        try {
          return JSON.parse(aiResponse);
        } catch (parseError) {
          console.error('Error parsing AI games:', parseError);
          return null;
        }
      }
    } catch (error) {
      console.error('Error generating games with AI:', error);
      return null;
    }
  };

  const loadGamesFromBackend = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/games`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.games || [];
      }
      return null;
    } catch (error) {
      console.error('Error loading games from backend:', error);
      return null;
    }
  };

  const loadGames = async () => {
    try {
      setLoading(true);
      setGenerating(true);
      
      console.log('🔄 Loading games...');
      
      // Try backend first
      const backendGames = await loadGamesFromBackend();
      if (backendGames && backendGames.length > 0) {
        console.log(`✅ Loaded ${backendGames.length} games from backend`);
        setGames(backendGames);
        setLoading(false);
        setGenerating(false);
        return;
      }

      // Try AI generation
      console.log('🔄 Generating AI games...');
      const aiGames = await generateGamesWithAI();
      
      if (aiGames && aiGames.length > 0) {
        console.log(`✅ Generated ${aiGames.length} AI-powered games`);
        setGames(aiGames);
        
        // Save to backend if available
        await saveGamesToBackend(aiGames);
      } else {
        // Fallback to template games
        console.log('⚠️ Using fallback template games');
        setGames(GAME_TEMPLATES);
      }
      
    } catch (error) {
      console.error('❌ Game loading failed:', error);
      Alert.alert(
        'Info', 
        'Using demo games. Add OpenAI API key for AI-generated games!',
        [{ text: 'OK' }]
      );
      
      setGames(GAME_TEMPLATES);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const saveGamesToBackend = async (games) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      await fetch(`${API_BASE_URL}/games/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ games }),
      });
    } catch (error) {
      console.error('Error saving games to backend:', error);
    }
  };

  const trackGameStart = async (game) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      await fetch(`${API_BASE_URL}/progress/game-started`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          game_id: game.id,
          game_title: game.title,
          category: game.category,
          difficulty: game.difficulty
        }),
      });
    } catch (error) {
      console.error('Error tracking game start:', error);
    }
  };

  const filteredGames = selectedCategory === 'All'
    ? games
    : games.filter(g => g.category === selectedCategory);

  const handleGamePress = async (game) => {
    if (game.locked) {
      Alert.alert('Game Locked', 'Complete previous levels to unlock this game!', [{ text: 'OK' }]);
    } else {
      // Track game start
      await trackGameStart(game);
      
      // Navigate to QuizScreen with game parameters
      navigation.navigate('QuizScreen', { 
        gameId: game.id,
        subject: game.category,
        title: game.title,
        difficulty: game.difficulty,
        topics: game.topics
      });
    }
  };

  const handleRefresh = () => {
    if (!loading) {
      loadGames();
    }
  };

  const getSubjectIcon = (category) => {
    const icons = {
      'Mathematics': 'calculator',
      'English': 'book',
      'Physical Sciences': 'flask',
      'Accounting': 'cash'
    };
    return icons[category] || 'game-controller';
  };

  const renderGameItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.gameCard, item.locked && styles.gameCardLocked]}
      onPress={() => handleGamePress(item)}
      activeOpacity={0.8}
    >
      <LinearGradient 
        colors={[item.color || '#4ECDC4', `${item.color || '#4ECDC4'}80`]} 
        style={styles.gameIconContainer}
      >
        <Ionicons 
          name={getSubjectIcon(item.category)} 
          size={28} 
          color="#FFFFFF" 
        />
        {item.generated && (
          <View style={styles.aiBadge}>
            <Ionicons name="sparkles" size={12} color="#FFFFFF" />
          </View>
        )}
      </LinearGradient>
      <View style={styles.gameInfo}>
        <View style={styles.gameHeader}>
          <Text style={styles.gameTitle}>{item.title}</Text>
          {item.generated && (
            <View style={styles.aiIndicator}>
              <Text style={styles.aiText}>AI</Text>
            </View>
          )}
        </View>
        <Text style={styles.gameDescription}>{item.description}</Text>
        <View style={styles.gameMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.metaText}>{item.duration || '5-10 mins'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.metaText}>{item.players || 'Individual'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="school-outline" size={14} color="rgba(255,255,255,0.7)" />
            <Text style={styles.metaText}>{item.category}</Text>
          </View>
        </View>
        <View style={styles.gameFooter}>
          <View style={[
            styles.difficultyBadge, 
            { backgroundColor: GAME_DIFFICULTIES[item.difficulty]?.color + '40' }
          ]}>
            <Text style={styles.difficultyText}>{item.difficulty || 'Intermediate'}</Text>
          </View>
          {item.rating > 0 && (
            <View style={styles.ratingContainer}>
              <Ionicons name="star" size={14} color="#FFD700" />
              <Text style={styles.ratingText}>{item.rating}</Text>
            </View>
          )}
        </View>
        {item.topics && item.topics.length > 0 && (
          <View style={styles.topicsContainer}>
            {item.topics.slice(0, 2).map((topic, index) => (
              <View key={index} style={styles.topicTag}>
                <Text style={styles.topicText}>{topic}</Text>
              </View>
            ))}
            {item.topics.length > 2 && (
              <View style={styles.topicTag}>
                <Text style={styles.topicText}>+{item.topics.length - 2} more</Text>
              </View>
            )}
          </View>
        )}
      </View>
      {item.locked && (
        <View style={styles.lockOverlay}>
          <Ionicons name="lock-closed" size={24} color="#FFFFFF" />
        </View>
      )}
    </TouchableOpacity>
  );

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="#FFFFFF" />
      <Text style={{ color: '#FFFFFF', marginTop: 10 }}>
        {generating ? 'Generating AI Games...' : 'Loading Games...'}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 5, fontSize: 12 }}>
        {generating ? 'Creating unique educational games' : 'Please wait'}
      </Text>
    </View>
  );

  return (
    <LinearGradient colors={['#0A7C72', '#0fbfae', '#F5E27A']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
          <View style={styles.header}>
            <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
              <Text style={styles.backButtonText}>Back</Text>
            </TouchableOpacity>
            <Text style={[styles.title, isSmallDevice && styles.titleSmall]}>Educational Games</Text>
            <Text style={[styles.subtitle, isSmallDevice && styles.subtitleSmall]}>
              Learn through play with {games[0]?.generated ? 'AI-generated' : 'CAPS-aligned'} games
            </Text>
          </View>

          <View style={styles.controlsRow}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              style={styles.categoriesContainer}
              contentContainerStyle={styles.categoriesContent}
            >
              {categories.map(category => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton, 
                    selectedCategory === category && styles.categoryButtonActive
                  ]}
                  onPress={() => setSelectedCategory(category)}
                >
                  <Text style={[
                    styles.categoryText, 
                    selectedCategory === category && styles.categoryTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            
            <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={loading}>
              <Ionicons 
                name="refresh" 
                size={20} 
                color={loading ? 'rgba(255,255,255,0.5)' : '#FFFFFF'} 
              />
            </TouchableOpacity>
          </View>

          <View style={styles.gamesContainer}>
            <Text style={styles.sectionTitle}>
              {selectedCategory} Games ({filteredGames.length})
            </Text>
            {filteredGames.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="game-controller-outline" size={64} color="rgba(255,255,255,0.5)" />
                <Text style={styles.emptyStateText}>No games found</Text>
                <Text style={styles.emptyStateSubtext}>
                  Try selecting a different category or refresh to generate new games
                </Text>
              </View>
            ) : (
              <FlatList
                data={filteredGames}
                renderItem={renderGameItem}
                keyExtractor={item => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.gamesList}
                refreshing={loading}
                onRefresh={handleRefresh}
              />
            )}
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{games.filter(g => !g.locked).length}</Text>
              <Text style={styles.statLabel}>Available</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>
                {games.filter(g => g.generated).length}
              </Text>
              <Text style={styles.statLabel}>AI Games</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statNumber}>{games.length}</Text>
              <Text style={styles.statLabel}>Total Games</Text>
            </View>
          </View>
        </Animated.View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  header: {
    marginBottom: 25,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 4,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  titleSmall: {
    fontSize: 28,
  },
  subtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  subtitleSmall: {
    fontSize: 14,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 25,
  },
  categoriesContainer: {
    flex: 1,
  },
  categoriesContent: {
    paddingHorizontal: 5,
  },
  categoryButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  categoryButtonActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderColor: 'rgba(255, 255, 255, 0.5)',
  },
  categoryText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  refreshButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    marginLeft: 10,
  },
  gamesContainer: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  gamesList: {
    paddingBottom: 20,
  },
  gameCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  gameCardLocked: {
    opacity: 0.7,
  },
  gameIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    position: 'relative',
  },
  aiBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B6B',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameInfo: {
    flex: 1,
  },
  gameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  gameTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
  },
  aiIndicator: {
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  aiText: {
    color: '#FF6B6B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  gameDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 12,
    lineHeight: 18,
  },
  gameMeta: {
    flexDirection: 'row',
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 4,
  },
  gameFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  difficultyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '500',
    marginLeft: 4,
  },
  topicsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  topicTag: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 6,
    marginBottom: 4,
  },
  topicText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 10,
  },
  lockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyStateText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 20,
  },
});