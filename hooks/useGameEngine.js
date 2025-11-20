// hooks/useGameEngine.js - UPDATED WITH BACKEND INTEGRATION
import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL from '../config';

export const useGameEngine = () => {
  const [currentGame, setCurrentGame] = useState(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState('idle'); // idle, playing, completed, paused
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Track game start to backend
  const trackGameStart = async (gameData) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/progress/game-started`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          game_title: gameData.title,
          game_id: gameData.id,
          category: gameData.category,
          difficulty: gameData.difficulty,
          subject: gameData.category // Use category as subject
        }),
      });

      if (response.ok) {
        console.log('✅ Game start tracked to backend');
      }
    } catch (error) {
      console.log('⚠️ Failed to track game start:', error.message);
    }
  };

  // Track game completion to backend
  const trackGameCompletion = async (gameData, finalScore, duration) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/progress/game-completed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          game_id: gameData.id,
          game_type: gameData.gameType || 'quiz',
          score: finalScore,
          duration: duration,
          correct_answers: finalScore / 10, // Assuming 10 points per correct answer
          total_questions: questions.length
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Game completion tracked:', result);
        return result;
      }
    } catch (error) {
      console.log('⚠️ Failed to track game completion:', error.message);
    }
  };

  const startGame = useCallback(async (game) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🎮 Starting game:', game.title);
      
      // Set current game
      setCurrentGame(game);
      setGameState('playing');
      setScore(0);
      setCurrentQuestionIndex(0);
      
      // Set timer based on game duration
      const duration = game.duration || '15-20 min';
      const timeMatch = duration.match(/(\d+)/);
      const gameTime = timeMatch ? parseInt(timeMatch[1]) * 60 : 900; // Default 15 minutes
      setTimeRemaining(gameTime);
      
      // Generate or fetch questions
      const gameQuestions = await generateQuestionsForGame(game);
      setQuestions(gameQuestions);
      
      // Track game start to backend
      await trackGameStart(game);
      
      console.log(`✅ Game started with ${gameQuestions.length} questions`);
      
    } catch (err) {
      console.error('❌ Failed to start game:', err);
      setError(err.message);
      Alert.alert('Game Error', 'Failed to start game. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const generateQuestionsForGame = async (game) => {
    // Simulate question generation - in real app, this would call your question service
    const questionCount = game.difficulty === 'Easy' ? 5 : 
                         game.difficulty === 'Medium' ? 8 : 12;
    
    return Array.from({ length: questionCount }, (_, index) => ({
      id: `q-${game.id}-${index}`,
      question: `Sample question about ${game.topics?.[0] || game.category} (${index + 1})`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: Math.floor(Math.random() * 4),
      explanation: 'This is a sample explanation for the correct answer.',
      points: 10
    }));
  };

  const submitAnswer = useCallback(async (selectedAnswer) => {
    if (gameState !== 'playing') return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    
    if (isCorrect) {
      const newScore = score + currentQuestion.points;
      setScore(newScore);
    }
    
    // Move to next question or end game
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      await endGame();
    }
    
    return isCorrect;
  }, [currentQuestionIndex, questions, score, gameState]);

  const endGame = useCallback(async () => {
    try {
      setGameState('completed');
      
      // Calculate duration
      const startTime = currentGame?.startTime || Date.now() - (timeRemaining * 1000);
      const duration = Math.floor((Date.now() - startTime) / 1000); // in seconds
      
      // Track completion to backend
      const result = await trackGameCompletion(currentGame, score, duration);
      
      console.log('🎯 Game completed:', { score, duration, result });
      
      return {
        success: true,
        score,
        duration,
        totalQuestions: questions.length,
        correctAnswers: Math.floor(score / 10),
        pointsEarned: result?.points_earned || score
      };
      
    } catch (error) {
      console.error('❌ Error ending game:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }, [currentGame, score, timeRemaining, questions.length]);

  const pauseGame = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused');
    }
  }, [gameState]);

  const resumeGame = useCallback(() => {
    if (gameState === 'paused') {
      setGameState('playing');
    }
  }, [gameState]);

  const resetGame = useCallback(() => {
    setCurrentGame(null);
    setScore(0);
    setGameState('idle');
    setTimeRemaining(0);
    setQuestions([]);
    setCurrentQuestionIndex(0);
    setError(null);
  }, []);

  // Timer effect
  useEffect(() => {
    let interval;
    
    if (gameState === 'playing' && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            endGame();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [gameState, timeRemaining, endGame]);

  const currentQuestion = questions[currentQuestionIndex] || null;

  return {
    // State
    currentGame,
    score,
    gameState,
    timeRemaining,
    questions,
    currentQuestion,
    currentQuestionIndex,
    loading,
    error,
    
    // Actions
    startGame,
    submitAnswer,
    endGame,
    pauseGame,
    resumeGame,
    resetGame,
    
    // Derived state
    progress: questions.length > 0 ? (currentQuestionIndex / questions.length) * 100 : 0,
    totalQuestions: questions.length,
    isGameActive: gameState === 'playing' || gameState === 'paused'
  };
};

export default useGameEngine;