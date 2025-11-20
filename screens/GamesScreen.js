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
  ActivityIndicator,
  Modal
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

// Available grades for South African curriculum (Grades 10-12)
const AVAILABLE_GRADES = ['10', '11', '12'];

export default function GamesScreen() {
  const navigation = useNavigation();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedGrade, setSelectedGrade] = useState('10'); // Default to Grade 10
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const categories = GAME_CATEGORIES;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();
    loadUserProfile();
    loadGames();
  }, [selectedGrade]); // Reload games when grade changes

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
        // Set grade from user profile if available, otherwise use default
        if (data.user?.profile?.grade_level && AVAILABLE_GRADES.includes(data.user.profile.grade_level)) {
          setSelectedGrade(data.user.profile.grade_level);
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const loadGamesFromBackend = async (grade = selectedGrade) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(
        `${API_BASE_URL}/games?include_ai=true&grade=${grade}${selectedCategory !== 'All' ? `&category=${selectedCategory}` : ''}`, 
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Loaded ${data.games?.length || 0} games for Grade ${grade}`);
        console.log(`📊 From database: ${data.from_database}, AI enabled: ${data.ai_enabled}`);
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
      
      console.log(`🔄 Loading games for Grade ${selectedGrade}...`);
      
      // Try backend first
      const backendGames = await loadGamesFromBackend();
      if (backendGames && backendGames.length > 0) {
        console.log(`✅ Successfully loaded ${backendGames.length} games for Grade ${selectedGrade}`);
        setGames(backendGames);
        setLoading(false);
        setGenerating(false);
        return;
      }

      // Fallback to template games if backend fails
      console.log('⚠️ Using fallback template games');
      const filteredTemplates = GAME_TEMPLATES.filter(game => 
        game.grade_level === selectedGrade || !game.grade_level
      );
      setGames(filteredTemplates);
      
    } catch (error) {
      console.error('❌ Game loading failed:', error);
      Alert.alert(
        'Connection Issue', 
        'Using demo games. Make sure your backend is running!',
        [{ text: 'OK' }]
      );
      
      const filteredTemplates = GAME_TEMPLATES.filter(game => 
        game.grade_level === selectedGrade || !game.grade_level
      );
      setGames(filteredTemplates);
    } finally {
      setLoading(false);
      setGenerating(false);
    }
  };

  const saveGamesToBackend = async (games) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/games/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ games }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Saved ${data.saved_count} games to backend`);
      }
    } catch (error) {
      console.error('Error saving games to backend:', error);
    }
  };

  const trackGameStart = async (game) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      await fetch(`${API_BASE_URL}/games/progress/game-started`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          game_id: game.id,
          game_title: game.title,
          category: game.category,
          difficulty: game.difficulty,
          grade: selectedGrade
        }),
      });
    } catch (error) {
      console.error('Error tracking game start:', error);
    }
  };

  const startGameSession = async (game) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/games/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          game_id: game.id,
          grade: selectedGrade
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Game session started:', data.game_session_id);
        return data.game_session_id;
      }
    } catch (error) {
      console.error('Error starting game session:', error);
    }
    return null;
  };

  const handleGradeChange = async (grade) => {
    setSelectedGrade(grade);
    setShowGradeModal(false);
    // Games will reload automatically due to useEffect dependency
  };

  const filteredGames = selectedCategory === 'All'
    ? games
    : games.filter(g => g.category === selectedCategory);

  const handleGamePress = async (game) => {
    if (game.locked) {
      Alert.alert('Game Locked', 'Complete previous levels to unlock this game!', [{ text: 'OK' }]);
    } else {
      try {
        // Track game start
        await trackGameStart(game);
        
        // Start game session and get session ID
        const sessionId = await startGameSession(game);
        
        // Navigate to QuizScreen with game parameters including grade
        navigation.navigate('QuizScreen', { 
          gameId: game.id,
          subject: game.category,
          title: game.title,
          difficulty: game.difficulty,
          topics: game.topics,
          grade: selectedGrade,
          gameSessionId: sessionId
        });
      } catch (error) {
        console.error('Error starting game:', error);
        // Still navigate even if tracking fails
        navigation.navigate('QuizScreen', { 
          gameId: game.id,
          subject: game.category,
          title: game.title,
          difficulty: game.difficulty,
          topics: game.topics,
          grade: selectedGrade
        });
      }
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

  const getGradeColor = (grade) => {
    const colors = {
      '10': '#FF6B6B', // Red
      '11': '#4ECDC4', // Teal
      '12': '#45B7D1'  // Blue
    };
    return colors[grade] || '#4ECDC4';
  };

  const renderGameItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.gameCard, item.locked && styles.gameCardLocked]}
      onPress={() => handleGamePress(item)}
      activeOpacity={0.8}
    >
      <LinearGradient 
        colors={[item.color || getGradeColor(selectedGrade), `${item.color || getGradeColor(selectedGrade)}80`]} 
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
          <View style={styles.gameBadges}>
            {item.generated && (
              <View style={styles.aiIndicator}>
                <Text style={styles.aiText}>AI</Text>
              </View>
            )}
            <View style={[styles.gradeBadge, { backgroundColor: getGradeColor(selectedGrade) + '40' }]}>
              <Text style={styles.gradeBadgeText}>Gr. {selectedGrade}</Text>
            </View>
          </View>
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
        {item.user_progress && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { 
                    width: `${item.user_progress.completed ? 100 : 
                      (item.user_progress.best_score / (item.max_score || 1000)) * 100}%` 
                  }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {item.user_progress.completed ? 'Completed' : 
               `Best: ${item.user_progress.best_score}/${item.max_score || 1000}`}
            </Text>
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

  const GradeSelectorModal = () => (
    <Modal
      visible={showGradeModal}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowGradeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Select Grade</Text>
          <Text style={styles.modalSubtitle}>Choose your grade level to see appropriate games</Text>
          
          {AVAILABLE_GRADES.map(grade => (
            <TouchableOpacity
              key={grade}
              style={[
                styles.gradeOption,
                selectedGrade === grade && styles.gradeOptionSelected
              ]}
              onPress={() => handleGradeChange(grade)}
            >
              <View style={[styles.gradeOptionCircle, { backgroundColor: getGradeColor(grade) }]}>
                <Text style={styles.gradeOptionText}>{grade}</Text>
              </View>
              <Text style={styles.gradeOptionLabel}>Grade {grade}</Text>
              {selectedGrade === grade && (
                <Ionicons name="checkmark" size={20} color={getGradeColor(grade)} />
              )}
            </TouchableOpacity>
          ))}
          
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowGradeModal(false)}
          >
            <Text style={styles.modalCloseButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) return (
    <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color="#FFFFFF" />
      <Text style={{ color: '#FFFFFF', marginTop: 10 }}>
        {generating ? `Loading Games for Grade ${selectedGrade}...` : 'Loading Games...'}
      </Text>
      <Text style={{ color: 'rgba(255,255,255,0.7)', marginTop: 5, fontSize: 12 }}>
        {generating ? `Fetching ${selectedGrade} educational games` : 'Please wait'}
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
              CAPS-aligned games for Grade {selectedGrade}
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
            
            <View style={styles.rightControls}>
              <TouchableOpacity 
                style={[styles.gradeButton, { backgroundColor: getGradeColor(selectedGrade) }]}
                onPress={() => setShowGradeModal(true)}
              >
                <Ionicons name="school" size={16} color="#FFFFFF" />
                <Text style={styles.gradeButtonText}>Gr. {selectedGrade}</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh} disabled={loading}>
                <Ionicons 
                  name="refresh" 
                  size={20} 
                  color={loading ? 'rgba(255,255,255,0.5)' : '#FFFFFF'} 
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.gamesContainer}>
            <Text style={styles.sectionTitle}>
              {selectedCategory} Games for Grade {selectedGrade} ({filteredGames.length})
            </Text>
            {filteredGames.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="game-controller-outline" size={64} color="rgba(255,255,255,0.5)" />
                <Text style={styles.emptyStateText}>No games found for Grade {selectedGrade}</Text>
                <Text style={styles.emptyStateSubtext}>
                  Try selecting a different grade or category
                </Text>
                <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
                  <Text style={styles.retryButtonText}>Retry Loading</Text>
                </TouchableOpacity>
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
              <Text style={styles.statNumber}>{selectedGrade}</Text>
              <Text style={styles.statLabel}>Grade</Text>
            </View>
          </View>

          <GradeSelectorModal />
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
  rightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 10,
  },
  gradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  gradeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  refreshButton: {
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
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
  gameBadges: {
    flexDirection: 'row',
    alignItems: 'center',
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
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  gradeBadgeText: {
    color: '#FFFFFF',
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
    marginBottom: 8,
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
  progressContainer: {
    marginTop: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4ECDC4',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
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
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#1E2A3A',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 24,
  },
  gradeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginBottom: 12,
  },
  gradeOptionSelected: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#4ECDC4',
  },
  gradeOptionCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  gradeOptionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  gradeOptionLabel: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
  modalCloseButton: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '500',
  },
});