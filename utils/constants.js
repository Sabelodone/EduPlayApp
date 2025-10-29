// utils/constants.js
export const CAPS_CURRICULUM = {
  SUBJECTS: ['Mathematics', 'English', 'Physical Sciences', 'Accounting'],
  GRADES: [10, 11, 12],
  DIFFICULTY_LEVELS: ['Easy', 'Medium', 'Hard']
};

export const GAME_CONFIG = {
  INITIAL_LIVES: 3,
  MAX_STREAK_BONUS: 10,
  TIME_BONUS_THRESHOLD: 0.5, // 50% of time limit for bonus
  STREAK_BONUS_INTERVAL: 3 // Every 3 correct answers
};

export const API_CONFIG = {
  BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://your-api.com',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3
};

export const STORAGE_KEYS = {
  USER_PROGRESS: 'user_progress',
  CACHED_QUESTIONS: 'cached_questions',
  GAME_SETTINGS: 'game_settings'
};

export const COLORS = {
  primary: '#0A7C72',
  secondary: '#0fbfae',
  accent: '#F5E27A',
  correct: '#4CAF50',
  incorrect: '#F44336',
  warning: '#FF9800',
  info: '#2196F3'
};