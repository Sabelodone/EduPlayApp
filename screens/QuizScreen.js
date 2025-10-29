import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

// API Keys
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;

export default function QuizScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { gameId, subject, title, difficulty, topics } = route.params || {};
  
  const [gameState, setGameState] = useState({
    score: 0,
    lives: 3,
    streak: 0,
    questionsAttempted: 0,
    currentQuestion: null,
    isLoading: false,
    isGameOver: false
  });
  
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [questionError, setQuestionError] = useState(null);

  useEffect(() => {
    loadInitialQuestion();
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  const generateQuestionWithAI = async () => {
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `Create a ${difficulty || 'medium'} difficulty multiple choice question for ${subject || 'Mathematics'} for Grade 10 students.
    
    ${topics ? `Focus on these topics: ${Array.isArray(topics) ? topics.join(', ') : topics}` : ''}
    
    Format the response as a JSON object with exactly this structure:
    {
      "question": "Clear and concise question text",
      "options": {
        "a": "Option A text",
        "b": "Option B text", 
        "c": "Option C text",
        "d": "Option D text"
      },
      "correct_answer": "a/b/c/d",
      "explanation": "Detailed explanation of why the correct answer is right",
      "grade": 10,
      "subject": "${subject || 'Mathematics'}",
      "difficulty": "${difficulty || 'medium'}",
      "generated": true
    }`;

    try {
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
              content: 'You are an expert educational content creator. Create clear, curriculum-aligned multiple choice questions for high school students. Always respond with valid JSON only.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 800,
          temperature: 0.7
        })
      });

      const data = await response.json();
      
      if (data.choices && data.choices[0]) {
        const aiResponse = data.choices[0].message.content;
        try {
          return JSON.parse(aiResponse);
        } catch (parseError) {
          console.error('Error parsing AI response:', parseError);
          throw new Error('Failed to generate question');
        }
      } else {
        throw new Error('No response from AI');
      }
    } catch (error) {
      console.error('AI question generation error:', error);
      throw new Error('Failed to generate AI question');
    }
  };

  const loadQuestionFromBackend = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await fetch(`${API_BASE_URL}/games/questions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject: subject || 'Mathematics',
          difficulty: difficulty || 'medium',
          grade: 10,
          topics: topics || []
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.question;
      } else {
        throw new Error('Backend question service unavailable');
      }
    } catch (error) {
      console.error('Backend question error:', error);
      throw new Error('Failed to load question from backend');
    }
  };

  const loadInitialQuestion = async () => {
    try {
      setQuestionError(null);
      setGameState(prev => ({ ...prev, isLoading: true }));
      
      console.log('🧠 Loading question for:', { subject, difficulty, topics });
      
      let question;
      
      // Try backend first
      try {
        question = await loadQuestionFromBackend();
        console.log('✅ Question loaded from backend');
      } catch (backendError) {
        // Fallback to AI
        console.log('🔄 Falling back to AI question generation');
        question = await generateQuestionWithAI();
        console.log('✅ AI question generated');
      }
      
      setGameState(prev => ({ 
        ...prev, 
        currentQuestion: question,
        isLoading: false 
      }));
      
    } catch (error) {
      console.error('❌ Question load error:', error);
      setQuestionError(error.message);
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const submitAnswerToBackend = async (questionId, selectedAnswer, isCorrect) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      await fetch(`${API_BASE_URL}/games/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          game_id: gameId,
          question_id: questionId,
          selected_answer: selectedAnswer,
          is_correct: isCorrect,
          score: gameState.score,
          streak: gameState.streak
        }),
      });
    } catch (error) {
      console.error('Error submitting answer to backend:', error);
    }
  };

  const handleAnswerSelect = async (optionKey) => {
    if (showExplanation || !gameState.currentQuestion) return;
    
    setSelectedAnswer(optionKey);
    
    try {
      const isCorrect = optionKey === gameState.currentQuestion.correct_answer;
      const pointsEarned = isCorrect ? 10 : 0;
      const streakBonus = isCorrect && gameState.streak > 0 ? Math.min(gameState.streak * 2, 10) : 0;
      const totalPoints = pointsEarned + streakBonus;

      // Update game state
      const newScore = gameState.score + totalPoints;
      const newStreak = isCorrect ? gameState.streak + 1 : 0;
      const newLives = isCorrect ? gameState.lives : gameState.lives - 1;
      const newQuestionsAttempted = gameState.questionsAttempted + 1;
      const isGameOver = newLives <= 0;

      setGameState(prev => ({
        ...prev,
        score: newScore,
        streak: newStreak,
        lives: newLives,
        questionsAttempted: newQuestionsAttempted,
        isGameOver: isGameOver
      }));

      // Submit to backend
      await submitAnswerToBackend(
        gameState.currentQuestion.id || 'ai-generated',
        optionKey,
        isCorrect
      );

      setShowExplanation(true);
      
      setTimeout(() => {
        if (isCorrect) {
          Alert.alert(
            'Correct! 🎉', 
            `+${pointsEarned} points${streakBonus > 0 ? ` (+${streakBonus} streak bonus!)` : ''}`, 
            [{ text: 'Next Question', onPress: loadNextQuestion }]
          );
        } else {
          if (isGameOver) {
            Alert.alert(
              'Game Over 🎯', 
              `Final Score: ${newScore}\n\nGreat effort! Keep practicing to improve your skills.`, 
              [
                { text: 'Back to Games', onPress: () => navigation.goBack() },
                { text: 'Try Again', onPress: () => {
                  resetGame();
                  loadInitialQuestion();
                }}
              ]
            );
          } else {
            Alert.alert(
              'Incorrect ❌', 
              `The correct answer was: ${gameState.currentQuestion.correct_answer.toUpperCase()}\n\n${gameState.currentQuestion.explanation}`, 
              [{ text: 'Next Question', onPress: loadNextQuestion }]
            );
          }
        }
      }, 1500);
    } catch (error) {
      console.error('❌ Answer submission error:', error);
      Alert.alert('Error', 'Failed to submit answer. Please try again.');
    }
  };

  const loadNextQuestion = async () => {
    setSelectedAnswer(null);
    setShowExplanation(false);
    setQuestionError(null);
    
    if (gameState.isGameOver) {
      Alert.alert('Game Over 🎯', `Final Score: ${gameState.score}`, [
        { text: 'Back to Games', onPress: () => navigation.goBack() },
        { text: 'Play Again', onPress: () => {
          resetGame();
          loadInitialQuestion();
        }}
      ]);
      return;
    }
    
    await loadInitialQuestion();
  };

  const resetGame = () => {
    setGameState({
      score: 0,
      lives: 3,
      streak: 0,
      questionsAttempted: 0,
      currentQuestion: null,
      isLoading: false,
      isGameOver: false
    });
    setSelectedAnswer(null);
    setShowExplanation(false);
    setQuestionError(null);
  };

  const getOptionStyle = (optionKey) => {
    if (!showExplanation || !gameState.currentQuestion) {
      return styles.option;
    }
    
    if (optionKey === gameState.currentQuestion.correct_answer) {
      return [styles.option, styles.correctOption];
    }
    
    if (optionKey === selectedAnswer && optionKey !== gameState.currentQuestion.correct_answer) {
      return [styles.option, styles.incorrectOption];
    }
    
    return styles.option;
  };

  if (gameState.isLoading) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.loadingText}>Generating Question...</Text>
          <Text style={styles.loadingSubtext}>
            Creating a unique {subject} question for you
          </Text>
          {questionError && (
            <Text style={styles.errorText}>{questionError}</Text>
          )}
        </View>
      </LinearGradient>
    );
  }

  if (!gameState.currentQuestion || questionError) {
    return (
      <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={50} color="#FFFFFF" />
          <Text style={styles.errorTitle}>Question Not Available</Text>
          <Text style={styles.errorText}>
            {questionError || 'Failed to load question'}
          </Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButton} onPress={loadInitialQuestion}>
              <Ionicons name="refresh" size={20} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.retryButton, styles.backButton]} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={20} color="#FFFFFF" />
              <Text style={styles.retryButtonText}>Back to Games</Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    );
  }

  const currentQuestion = gameState.currentQuestion;

  return (
    <LinearGradient colors={['#667eea', '#764ba2']} style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#FFFFFF" />
          <Text style={styles.backButtonText}>Back</Text>
        </TouchableOpacity>
        
        <View style={styles.headerInfo}>
          <Text style={styles.subject}>{subject}</Text>
          <Text style={styles.difficulty}>{difficulty}</Text>
          {currentQuestion.generated && (
            <View style={styles.aiBadge}>
              <Ionicons name="sparkles" size={12} color="#FFFFFF" />
              <Text style={styles.aiText}>AI</Text>
            </View>
          )}
        </View>
        
        <View style={styles.scoreContainer}>
          <Text style={styles.score}>Score: {gameState.score}</Text>
          <Text style={styles.lives}>Lives: {gameState.lives} ❤️</Text>
        </View>
      </View>

      <View style={styles.questionContainer}>
        <View style={styles.questionHeader}>
          <Text style={styles.questionNumber}>
            Question {gameState.questionsAttempted + 1}
          </Text>
          {gameState.streak > 0 && (
            <View style={styles.streakContainer}>
              <Ionicons name="flash" size={16} color="#FFD700" />
              <Text style={styles.streakText}>Streak: {gameState.streak}</Text>
            </View>
          )}
        </View>
        
        <Text style={styles.questionText}>{currentQuestion.question}</Text>
        
        <View style={styles.optionsContainer}>
          {Object.entries(currentQuestion.options).map(([key, value]) => (
            <TouchableOpacity
              key={key}
              style={getOptionStyle(key)}
              onPress={() => handleAnswerSelect(key)}
              disabled={showExplanation}
            >
              <Text style={styles.optionText}>
                <Text style={styles.optionKey}>{key.toUpperCase()}. </Text>
                {value}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {showExplanation && (
          <View style={styles.explanationContainer}>
            <View style={styles.explanationHeader}>
              <Ionicons name="bulb-outline" size={20} color="#4ECDC4" />
              <Text style={styles.explanationTitle}>Explanation</Text>
            </View>
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
          </View>
        )}
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          {currentQuestion.generated ? '🤖 AI-Generated Question' : '📚 Curriculum Question'} • 
          Grade {currentQuestion.grade} • 
          {currentQuestion.topic && ` ${currentQuestion.topic}`}
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    marginLeft: 5,
  },
  headerInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  subject: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  difficulty: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.3)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  aiText: {
    color: '#FF6B6B',
    fontSize: 10,
    fontWeight: 'bold',
  },
  scoreContainer: {
    alignItems: 'flex-end',
  },
  score: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  lives: {
    color: '#FFFFFF',
    fontSize: 14,
    marginTop: 4,
  },
  questionContainer: {
    flex: 1,
    padding: 20,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  questionNumber: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,215,0,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  streakText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  questionText: {
    color: '#FFFFFF',
    fontSize: 20,
    lineHeight: 28,
    marginBottom: 30,
    textAlign: 'center',
  },
  optionsContainer: {
    marginBottom: 20,
  },
  option: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  correctOption: {
    backgroundColor: 'rgba(76, 175, 80, 0.3)',
    borderColor: '#4CAF50',
  },
  incorrectOption: {
    backgroundColor: 'rgba(244, 67, 54, 0.3)',
    borderColor: '#F44336',
  },
  optionText: {
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 22,
  },
  optionKey: {
    fontWeight: 'bold',
  },
  explanationContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#4ECDC4',
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  explanationTitle: {
    color: '#4ECDC4',
    fontSize: 16,
    fontWeight: 'bold',
  },
  explanationText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    lineHeight: 20,
  },
  footer: {
    padding: 20,
    alignItems: 'center',
  },
  footerText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 18,
    marginTop: 10,
    fontWeight: '600',
  },
  loadingSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    marginTop: 5,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
    marginBottom: 10,
  },
  errorText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});