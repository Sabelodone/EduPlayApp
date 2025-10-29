// services/apiService.js
import { API_BASE_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

class FlaskApiService {
  constructor() {
    this.baseURL = API_BASE_URL; // Your Flask backend URL
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const token = await AsyncStorage.getItem('userToken'); // Make sure this matches your storage key
    
    console.log('🔐 Flask API Request:', endpoint, 'Token:', !!token);

    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` }),
        ...options.headers,
      },
      ...options,
    };

    if (options.body) {
      config.body = JSON.stringify(options.body);
    }

    try {
      const response = await fetch(url, config);
      console.log('🔐 Flask Response:', response.status, endpoint);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ 
          error: `HTTP ${response.status}` 
        }));
        throw new Error(errorData.error || errorData.message || `HTTP ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('❌ Flask API Error:', error.message);
      throw error;
    }
  }

  // ========== AUTH METHODS ==========
  async signIn(email, password) {
    return this.request('/auth/signin', {
      method: 'POST',
      body: { email, password },
    });
  }

  async signUp(userData) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: userData,
    });
  }

  async getCurrentUser() {
    return this.request('/auth/me');
  }

  // ========== DASHBOARD METHODS ==========
  async getDashboardStats() {
    return this.request('/dashboard/stats');
  }

  async getRecentActivity() {
    return this.request('/dashboard/recent-activity');
  }

  async getUpcomingChallenges() {
    return this.request('/dashboard/upcoming-challenges');
  }

  async getAchievements() {
    return this.request('/dashboard/achievements');
  }

  // ========== PROFILE METHODS ==========
  async getProfile() {
    return this.request('/profile');
  }

  async updateProfile(profileData) {
    return this.request('/profile', {
      method: 'PUT',
      body: profileData,
    });
  }

  // ========== LESSONS METHODS ==========
  async getLessons() {
    return this.request('/lessons');
  }

  async getLesson(lessonId) {
    return this.request(`/lessons/${lessonId}`);
  }

  async completeLesson(lessonId) {
    return this.request(`/lessons/${lessonId}/complete`, {
      method: 'POST',
    });
  }

  // ========== GAMES METHODS ==========
  async getGames() {
    return this.request('/games');
  }

  async getGame(gameId) {
    return this.request(`/games/${gameId}`);
  }

  async startGame(gameId) {
    return this.request(`/games/${gameId}/start`, {
      method: 'POST',
    });
  }

  async completeGame(sessionId, score, duration) {
    return this.request(`/games/session/${sessionId}/complete`, {
      method: 'POST',
      body: { score, duration },
    });
  }

  async trackGameStarted(gameData) {
    return this.request('/progress/game-started', {
      method: 'POST',
      body: gameData,
    });
  }

  async getGameQuestions(gameData) {
    return this.request('/games/questions', {
      method: 'POST',
      body: gameData,
    });
  }

  // ========== QUIZ METHODS ==========
  async getQuizzes() {
    return this.request('/quizzes');
  }

  async getQuiz(quizId) {
    return this.request(`/quizzes/${quizId}`);
  }

  async startQuiz(quizId) {
    return this.request(`/quizzes/${quizId}/start`, {
      method: 'POST',
    });
  }

  async submitQuiz(attemptId, correctAnswers, totalQuestions) {
    return this.request(`/quizzes/attempt/${attemptId}/submit`, {
      method: 'POST',
      body: { correct_answers: correctAnswers, total_questions: totalQuestions },
    });
  }

  // ========== CHALLENGES METHODS ==========
  async getChallenges() {
    return this.request('/challenges');
  }

  async getChallenge(challengeId) {
    return this.request(`/challenges/${challengeId}`);
  }

  async joinChallenge(challengeId) {
    return this.request(`/challenges/${challengeId}/join`, {
      method: 'POST',
    });
  }

  async completeChallenge(challengeId) {
    return this.request(`/challenges/${challengeId}/complete`, {
      method: 'POST',
    });
  }

  // ========== PROGRESS METHODS ==========
  async getUserProgress() {
    return this.request('/progress/user-progress');
  }

  // ========== AI METHODS (Flask Backend) ==========
  async generateAIContent(contentType, parameters) {
    return this.request('/ai/generate-content', {
      method: 'POST',
      body: {
        type: contentType,
        parameters: parameters
      },
    });
  }

  async analyzeSolution(challengeDescription, solutionCode, requirements) {
    return this.request('/ai/analyze-solution', {
      method: 'POST',
      body: {
        challenge_description: challengeDescription,
        solution_code: solutionCode,
        requirements: requirements
      },
    });
  }

  async generateHint(challengeDescription, difficulty, currentApproach) {
    return this.request('/ai/generate-hint', {
      method: 'POST',
      body: {
        challenge_description: challengeDescription,
        difficulty: difficulty,
        current_approach: currentApproach
      },
    });
  }
}

// OpenAI Service (Direct API calls - use with caution)
export const openAIApiService = {
  // Generate a single question using OpenAI
  async generateQuestion(filters = {}) {
    const { subject = 'Mathematics', grade = 10, topic = 'General', difficulty = 'Medium' } = filters;
    
    // Strict API key validation
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key is missing. Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file');
    }
    
    if (!OPENAI_API_KEY.startsWith('sk-')) {
      throw new Error('Invalid OpenAI API key format. Key should start with "sk-"');
    }

    const prompt = `
Create a ${difficulty.toLowerCase()} difficulty multiple-choice question for ${subject} Grade ${grade}, Topic: ${topic} aligned with South African CAPS curriculum.

REQUIREMENTS:
- Create a clear, curriculum-aligned question
- Provide 4 plausible options (a, b, c, d)
- Mark the correct answer
- Include a detailed explanation
- Make it appropriate for grade ${grade} level
- Ensure options are challenging but fair

Respond with this exact JSON format:
{
  "question": "Your question here?",
  "options": {
    "a": "Option A",
    "b": "Option B",
    "c": "Option C", 
    "d": "Option D"
  },
  "correct_answer": "a",
  "explanation": "Detailed explanation here",
  "score_value": ${difficulty === 'Easy' ? 5 : difficulty === 'Medium' ? 10 : 15},
  "time_limit_seconds": ${difficulty === 'Easy' ? 45 : difficulty === 'Medium' ? 60 : 75}
}`;

    console.log('🧠 Generating AI question for:', { subject, grade, topic, difficulty });

    const response = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo', // Using 3.5 for cost efficiency
        messages: [
          {
            role: 'system',
            content: `You are an expert ${subject} teacher for South African CAPS curriculum Grades 10-12. 
            Create engaging, curriculum-aligned multiple choice questions. 
            Always respond with valid JSON only. No additional text.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    
    try {
      const questionData = JSON.parse(data.choices[0].message.content);
      
      // Validate the response structure
      if (!questionData.question || !questionData.options || !questionData.correct_answer) {
        throw new Error('Invalid response format from OpenAI');
      }
      
      console.log('✅ AI question generated successfully:', questionData.question.substring(0, 50) + '...');
      
      // Enhance with additional metadata
      return {
        ...questionData,
        subject,
        grade,
        topic,
        difficulty,
        generated: true,
        id: `ai-${subject.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      };
      
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', parseError);
      throw new Error('Invalid JSON response from OpenAI');
    }
  },

  // Generate multiple questions in batch
  async generateBatchQuestions(filters = {}, count = 5) {
    console.log(`🚀 Generating ${count} AI questions...`);
    
    const questions = [];
    const errors = [];
    
    for (let i = 0; i < count; i++) {
      try {
        console.log(`📝 Generating question ${i + 1}/${count}...`);
        const question = await this.generateQuestion(filters);
        questions.push(question);
        
        // Rate limiting - be respectful to API
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Failed to generate question ${i + 1}:`, error.message);
        errors.push(error.message);
      }
    }
    
    if (questions.length === 0) {
      throw new Error(`Failed to generate any questions. Errors: ${errors.join(', ')}`);
    }
    
    console.log(`✅ Successfully generated ${questions.length}/${count} questions`);
    return questions;
  }
};

// Main unified API service
class ApiService {
  constructor() {
    this.flask = new FlaskApiService();
    this.openAI = openAIApiService;
  }

  // ========== AUTH METHODS ==========
  async signIn(email, password) {
    return this.flask.signIn(email, password);
  }

  async signUp(userData) {
    return this.flask.signUp(userData);
  }

  async getCurrentUser() {
    return this.flask.getCurrentUser();
  }

  // ========== DASHBOARD METHODS ==========
  async getDashboardStats() {
    return this.flask.getDashboardStats();
  }

  async getRecentActivity() {
    return this.flask.getRecentActivity();
  }

  async getUpcomingChallenges() {
    return this.flask.getUpcomingChallenges();
  }

  async getAchievements() {
    return this.flask.getAchievements();
  }

  // ========== PROFILE METHODS ==========
  async getProfile() {
    return this.flask.getProfile();
  }

  async updateProfile(profileData) {
    return this.flask.updateProfile(profileData);
  }

  // ========== LESSONS METHODS ==========
  async getLessons() {
    return this.flask.getLessons();
  }

  async getLesson(lessonId) {
    return this.flask.getLesson(lessonId);
  }

  async completeLesson(lessonId) {
    return this.flask.completeLesson(lessonId);
  }

  // ========== GAMES METHODS ==========
  async getGames() {
    return this.flask.getGames();
  }

  async getGame(gameId) {
    return this.flask.getGame(gameId);
  }

  async startGame(gameId) {
    return this.flask.startGame(gameId);
  }

  async completeGame(sessionId, score, duration) {
    return this.flask.completeGame(sessionId, score, duration);
  }

  async trackGameStarted(gameData) {
    return this.flask.trackGameStarted(gameData);
  }

  async getGameQuestions(gameData) {
    return this.flask.getGameQuestions(gameData);
  }

  // ========== QUIZ METHODS ==========
  async getQuizzes() {
    return this.flask.getQuizzes();
  }

  async getQuiz(quizId) {
    return this.flask.getQuiz(quizId);
  }

  async startQuiz(quizId) {
    return this.flask.startQuiz(quizId);
  }

  async submitQuiz(attemptId, correctAnswers, totalQuestions) {
    return this.flask.submitQuiz(attemptId, correctAnswers, totalQuestions);
  }

  // ========== CHALLENGES METHODS ==========
  async getChallenges() {
    return this.flask.getChallenges();
  }

  async getChallenge(challengeId) {
    return this.flask.getChallenge(challengeId);
  }

  async joinChallenge(challengeId) {
    return this.flask.joinChallenge(challengeId);
  }

  async completeChallenge(challengeId) {
    return this.flask.completeChallenge(challengeId);
  }

  // ========== PROGRESS METHODS ==========
  async getUserProgress() {
    return this.flask.getUserProgress();
  }

  // ========== AI METHODS ==========
  // Use Flask backend AI (recommended - secure and managed)
  async generateAIContent(contentType, parameters) {
    return this.flask.generateAIContent(contentType, parameters);
  }

  async analyzeSolution(challengeDescription, solutionCode, requirements) {
    return this.flask.analyzeSolution(challengeDescription, solutionCode, requirements);
  }

  async generateHint(challengeDescription, difficulty, currentApproach) {
    return this.flask.generateHint(challengeDescription, difficulty, currentApproach);
  }

  // Direct OpenAI calls (use with caution - exposes API key)
  async generateQuestion(filters = {}) {
    return this.openAI.generateQuestion(filters);
  }

  async generateBatchQuestions(filters = {}, count = 5) {
    return this.openAI.generateBatchQuestions(filters, count);
  }
}

// Export the unified service
const apiService = new ApiService();
export default apiService;

// Also export individual services if needed
export { openAIApiService };

// Service status logging
console.log('🔑 API Service Status:', {
  hasOpenAIKey: !!OPENAI_API_KEY,
  keyValid: OPENAI_API_KEY?.startsWith('sk-'),
  flaskBaseURL: API_BASE_URL,
  service: 'UNIFIED_API_SERVICE'
});

if (!OPENAI_API_KEY) {
  console.warn('⚠️ EXPO_PUBLIC_OPENAI_API_KEY not found - Direct OpenAI calls will fail');
}