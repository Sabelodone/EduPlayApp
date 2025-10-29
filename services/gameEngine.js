// services/gameEngine.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import apiService from './apiService';

const STORAGE_KEYS = {
  USER_PROGRESS: 'user_progress',
  GAME_STATS: 'game_stats'
};

export class QuizGameEngine {
  constructor(userId) {
    this.userId = userId;
    this.lives = 3;
    this.score = 0;
    this.streak = 0;
    this.currentQuestion = null;
    this.questionHistory = [];
    this.startTime = null;
  }

  async initialize() {
    await this.loadProgress();
  }

  async loadNewQuestion(filters = {}) {
    try {
      this.startTime = Date.now();
      this.currentQuestion = await apiService.getQuestion(filters);
      return this.currentQuestion;
    } catch (error) {
      throw new Error('Failed to load question: ' + error.message);
    }
  }

  async submitAnswer(selectedOption) {
    if (!this.currentQuestion) {
      throw new Error('No question loaded');
    }

    const timeSpent = Math.floor((Date.now() - this.startTime) / 1000);
    const isCorrect = selectedOption === this.currentQuestion.correct_answer;
    
    const result = {
      isCorrect,
      correctAnswer: this.currentQuestion.correct_answer,
      explanation: this.currentQuestion.explanation,
      pointsEarned: 0,
      timeSpent,
      streakBonus: 0
    };

    if (isCorrect) {
      this.streak++;
      
      // Calculate streak bonus (extra points for consecutive correct answers)
      const streakBonus = this.streak >= 3 ? Math.floor(this.streak / 3) * 2 : 0;
      result.streakBonus = streakBonus;
      
      // Time bonus (faster answers get more points)
      const timeBonus = timeSpent < (this.currentQuestion.time_limit_seconds / 2) ? 2 : 0;
      
      result.pointsEarned = this.currentQuestion.score_value + streakBonus + timeBonus;
      this.score += result.pointsEarned;
    } else {
      this.streak = 0;
      this.lives--;
    }

    // Record question in history
    this.questionHistory.push({
      question: this.currentQuestion,
      userAnswer: selectedOption,
      result,
      timestamp: new Date().toISOString()
    });

    // Save progress after each question
    await this.saveProgress();

    return result;
  }

  getGameState() {
    return {
      userId: this.userId,
      score: this.score,
      lives: this.lives,
      streak: this.streak,
      questionsAttempted: this.questionHistory.length,
      accuracy: this.calculateAccuracy(),
      currentQuestion: this.currentQuestion
    };
  }

  calculateAccuracy() {
    if (this.questionHistory.length === 0) return 0;
    
    const correctAnswers = this.questionHistory.filter(q => q.result.isCorrect).length;
    return (correctAnswers / this.questionHistory.length) * 100;
  }

  getSubjectPerformance() {
    const performance = {};
    
    this.questionHistory.forEach(item => {
      const subject = item.question.subject;
      if (!performance[subject]) {
        performance[subject] = { correct: 0, total: 0, averageTime: 0 };
      }
      
      performance[subject].total++;
      if (item.result.isCorrect) performance[subject].correct++;
      performance[subject].averageTime = 
        ((performance[subject].averageTime * (performance[subject].total - 1)) + item.result.timeSpent) / performance[subject].total;
    });

    return performance;
  }

  async saveProgress() {
    try {
      const progressData = {
        userId: this.userId,
        score: this.score,
        lives: this.lives,
        streak: this.streak,
        questionHistory: this.questionHistory,
        lastUpdated: new Date().toISOString()
      };

      await AsyncStorage.setItem(
        `${STORAGE_KEYS.USER_PROGRESS}_${this.userId}`,
        JSON.stringify(progressData)
      );
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }

  async loadProgress() {
    try {
      const savedProgress = await AsyncStorage.getItem(
        `${STORAGE_KEYS.USER_PROGRESS}_${this.userId}`
      );
      
      if (savedProgress) {
        const progressData = JSON.parse(savedProgress);
        this.score = progressData.score || 0;
        this.lives = progressData.lives || 3;
        this.streak = progressData.streak || 0;
        this.questionHistory = progressData.questionHistory || [];
      }
    } catch (error) {
      console.error('Failed to load progress:', error);
    }
  }

  resetGame() {
    this.lives = 3;
    this.score = 0;
    this.streak = 0;
    this.currentQuestion = null;
    this.questionHistory = [];
    this.startTime = null;
  }

  isGameOver() {
    return this.lives <= 0;
  }
}

export default QuizGameEngine;