import AsyncStorage from '@react-native-async-storage/async-storage';
import API_BASE_URL, { verifyApiUrl } from '../config';
import AuthService from './auth';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.isRefreshing = false;
    this.failedQueue = [];
    this.refreshAttempts = 0;
    this.maxRefreshAttempts = 2;
    this.circuitOpen = false;
    
    console.log('🔧 ApiService initialized with URL:', this.baseURL);
    this.testConnection();
  }

  async testConnection() {
    try {
      await verifyApiUrl();
    } catch (error) {
      console.log('❌ ApiService connection test failed:', error.message);
    }
  }

  processQueue(error, token = null) {
    this.failedQueue.forEach(promise => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve(token);
      }
    });
    this.failedQueue = [];
  }

  async makeRequest(endpoint, options = {}) {
    if (this.circuitOpen) {
      throw new Error('Service temporarily unavailable. Please try again later.');
    }

    try {
      let token = await this.getValidToken();
      
      const response = await this.fetchWithTimeout(`${this.baseURL}${endpoint}`, {
        method: options.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers,
        },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      if (response.status === 401) {
        console.log('🔄 Token expired, attempting refresh...');
        token = await this.refreshToken();
        
        const retryResponse = await this.fetchWithTimeout(`${this.baseURL}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            ...options.headers,
          },
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        if (!retryResponse.ok) {
          throw new Error(`HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
        }

        return retryResponse;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response;
    } catch (error) {
      console.error(`❌ API Request failed for ${endpoint}:`, error.message);
      
      if (error.message.includes('401') || error.message.includes('Token')) {
        this.refreshAttempts++;
        
        if (this.refreshAttempts >= this.maxRefreshAttempts) {
          this.circuitOpen = true;
          setTimeout(() => {
            this.circuitOpen = false;
            this.refreshAttempts = 0;
          }, 300000);
        }
      }
      
      throw error;
    }
  }

  async fetchWithTimeout(url, options = {}) {
    const { timeout = 15000 } = options;
    
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  async getValidToken() {
    const token = await AsyncStorage.getItem('access_token');
    
    if (!token) {
      throw new Error('No authentication token available');
    }

    if (this.isTokenExpired(token)) {
      return await this.refreshToken();
    }
    
    return token;
  }

  isTokenExpired(token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const bufferTime = 2 * 60 * 1000;
      return (payload.exp * 1000) - Date.now() < bufferTime;
    } catch {
      return true;
    }
  }

  async clearAuthData() {
    await AsyncStorage.multiRemove(['access_token', 'refresh_token', 'user_data']);
  }

  async request(endpoint, options = {}) {
    try {
      const response = await this.makeRequest(endpoint, options);
      return await response.json();
    } catch (error) {
      console.error(`❌ API Error for ${endpoint}:`, error.message);
      throw error;
    }
  }

  // ========== AUTH METHODS ==========
  async signIn(email, password) {
    try {
      console.log('🔐 API Service: Signing in...');
      const response = await fetch(`${this.baseURL}/auth/signin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (data.access_token) {
        await AuthService.storeTokens(data.access_token, data.refresh_token, data.user);
      }
      
      return data;
    } catch (error) {
      console.error('❌ API Service: Sign in failed:', error);
      throw error;
    }
  }

  async signUp(userData) {
    try {
      console.log('🚀 API Service: Signing up...');
      const response = await fetch(`${this.baseURL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (data.access_token) {
        await AuthService.storeTokens(data.access_token, data.refresh_token, data.user);
      }
      
      return data;
    } catch (error) {
      console.error('❌ API Service: Sign up failed:', error);
      throw error;
    }
  }

  async logout() {
    try {
      console.log('🚪 API Service: Logging out...');
      const response = await fetch(`${this.baseURL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await this.getValidToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      await this.clearAuthData();
      return data;
    } catch (error) {
      console.error('❌ API Service: Logout failed:', error);
      await this.clearAuthData();
      throw error;
    }
  }

  async getCurrentUser() {
    try {
      console.log('👤 API Service: Getting current user...');
      const response = await fetch(`${this.baseURL}/auth/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${await this.getValidToken()}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } catch (error) {
      console.error('❌ API Service: Get current user failed:', error);
      throw error;
    }
  }

  async refreshToken() {
    try {
      console.log('🔄 API Service: Refreshing token...');
      const refreshToken = await AuthService.getRefreshToken();
      
      const response = await fetch(`${this.baseURL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${refreshToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      if (data.access_token) {
        await AsyncStorage.setItem('access_token', data.access_token);
      }
      
      return data;
    } catch (error) {
      console.error('❌ API Service: Token refresh failed:', error);
      throw error;
    }
  }

  async forgotPassword(email) {
    try {
      console.log('📧 API Service: Forgot password request...');
      const response = await fetch(`${this.baseURL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } catch (error) {
      console.error('❌ API Service: Forgot password failed:', error);
      throw error;
    }
  }

  async resetPassword(token, newPassword) {
    try {
      console.log('🔄 API Service: Resetting password...');
      const response = await fetch(`${this.baseURL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, new_password: newPassword }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } catch (error) {
      console.error('❌ API Service: Reset password failed:', error);
      throw error;
    }
  }

  async validateResetToken(token) {
    try {
      console.log('🔍 API Service: Validating reset token...');
      const response = await fetch(`${this.baseURL}/auth/validate-reset-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return data;
    } catch (error) {
      console.error('❌ API Service: Validate reset token failed:', error);
      throw error;
    }
  }

  // ========== DASHBOARD METHODS ==========
  async getDashboardStats() {
    try {
      return await this.request('/dashboard/stats');
    } catch (error) {
      console.log('⚠️ Dashboard stats endpoint not available, returning fallback data');
      return {
        total_lessons: 0,
        completed_lessons: 0,
        progress_percentage: 0,
        streak_days: 0
      };
    }
  }

  async getRecentActivity() {
    try {
      return await this.request('/dashboard/recent-activity');
    } catch (error) {
      console.log('⚠️ Recent activity endpoint not available, returning empty array');
      return [];
    }
  }

  async getUpcomingChallenges() {
    try {
      return await this.request('/dashboard/upcoming-challenges');
    } catch (error) {
      console.log('⚠️ Upcoming challenges endpoint not available, returning empty array');
      return [];
    }
  }

  async getAchievements() {
    try {
      return await this.request('/dashboard/achievements');
    } catch (error) {
      console.log('⚠️ Achievements endpoint not available, returning empty array');
      return [];
    }
  }

  // ========== PROFILE METHODS ==========
  async getProfile() {
    try {
      return await this.request('/profile');
    } catch (error) {
      console.log('⚠️ Profile endpoint not available');
      throw error;
    }
  }

  async updateProfile(profileData) {
    return this.request('/profile', {
      method: 'PUT',
      body: profileData,
    });
  }

  // ========== LESSONS & CURRICULUM METHODS ==========
  async getCurriculum() {
    return this.request('/lessons/curriculum');
  }

  async getSubjects() {
    return this.request('/lessons/subjects');
  }

  async getGrades() {
    return this.request('/lessons/grades');
  }

  async getTopics(subject, grade) {
    return this.request(`/lessons/${subject}/${grade}/topics`);
  }

  async getTopicVideos(subject, grade, topic) {
    return this.request(`/lessons/${subject}/${grade}/${topic}/videos`);
  }

  async updateVideoProgress(videoData) {
    return this.request('/lessons/video-progress', {
      method: 'POST',
      body: videoData,
    });
  }

  // ========== STUDY NOTES METHODS ==========
  async generateStudyNotes(subject, grade, topic) {
    return this.request('/lessons/study-notes', {
      method: 'POST',
      body: { subject, grade, topic },
    });
  }

  async getStudyNotes(subject, grade, topic) {
    return this.request('/lessons/study-notes', {
      method: 'POST',
      body: { subject, grade, topic },
    });
  }

  // ========== EXAM PAPERS METHODS ==========
  async getExamPapers(subject = null, grade = null) {
    let url = '/lessons/exam-papers';
    const params = new URLSearchParams();
    
    if (subject) params.append('subject', subject);
    if (grade) params.append('grade', grade);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    
    return this.request(url);
  }

  // ========== PROGRESS METHODS ==========
  async getProgressOverview() {
    return this.request('/lessons/progress/overview');
  }

  async getUserProgress() {
    try {
      return await this.request('/progress/user-progress');
    } catch (error) {
      console.log('⚠️ User progress endpoint not available');
      throw error;
    }
  }

  // ========== GAMES METHODS ==========
  async getGames() {
    try {
      return await this.request('/games');
    } catch (error) {
      console.log('⚠️ Games endpoint not available, returning fallback games');
      return [
        {
          id: 'math-quiz-1',
          name: 'Math Challenge',
          description: 'Test your math skills with fun challenges',
          category: 'Mathematics',
          difficulty: 'beginner',
          isActive: true
        },
        {
          id: 'vocab-builder-1',
          name: 'Vocabulary Builder',
          description: 'Expand your English vocabulary',
          category: 'English',
          difficulty: 'beginner',
          isActive: true
        }
      ];
    }
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
    try {
      return await this.request('/progress/game-started', {
        method: 'POST',
        body: gameData,
      });
    } catch (error) {
      console.log('⚠️ Game started tracking not available');
      return { success: true };
    }
  }

  async getGameQuestions(gameData) {
    try {
      return await this.request('/games/questions', {
        method: 'POST',
        body: gameData,
      });
    } catch (error) {
      console.log('⚠️ Game questions endpoint not available');
      throw error;
    }
  }

  // ========== QUIZ METHODS ==========
  async getQuizzes() {
    try {
      return await this.request('/quizzes');
    } catch (error) {
      console.log('⚠️ Quizzes endpoint not available');
      throw error;
    }
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
    try {
      return await this.request('/challenges');
    } catch (error) {
      console.log('⚠️ Challenges endpoint not available');
      throw error;
    }
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

  // ========== AI METHODS ==========
  async generateAIContent(contentType, parameters) {
    try {
      return await this.request('/ai/generate-content', {
        method: 'POST',
        body: {
          type: contentType,
          parameters: parameters
        },
      });
    } catch (error) {
      console.log('⚠️ AI content generation not available');
      throw error;
    }
  }

  async analyzeSolution(challengeDescription, solutionCode, requirements) {
    try {
      return await this.request('/ai/analyze-solution', {
        method: 'POST',
        body: {
          challenge_description: challengeDescription,
          solution_code: solutionCode,
          requirements: requirements
        },
      });
    } catch (error) {
      console.log('⚠️ AI solution analysis not available');
      throw error;
    }
  }

  async generateHint(challengeDescription, difficulty, currentApproach) {
    try {
      return await this.request('/ai/generate-hint', {
        method: 'POST',
        body: {
          challenge_description: challengeDescription,
          difficulty: difficulty,
          current_approach: currentApproach
        },
      });
    } catch (error) {
      console.log('⚠️ AI hint generation not available');
      throw error;
    }
  }

  // ========== AI Q&A METHODS ==========
  async askQuestion(question, subject = null, grade = null, topic = null) {
    return this.request('/lessons/ask-question', {
      method: 'POST',
      body: {
        question,
        subject,
        grade,
        topic
      },
    });
  }

  // ========== RESOURCE DOWNLOAD METHODS ==========
  async downloadResource(data) {
    return this.request('/lessons/progress/download-resource', {
      method: 'POST',
      body: data,
    });
  }

  // ========== TEST METHODS ==========
  async testStudyNotes() {
    console.log('🧪 Testing study notes endpoint...');
    try {
      const result = await this.generateStudyNotes('Mathematics', '10', 'Algebra');
      console.log('✅ Study notes test passed:', result);
      return result;
    } catch (error) {
      console.error('❌ Study notes test failed:', error.message);
      throw error;
    }
  }

  async testAllEndpoints() {
    console.log('🧪 Testing all critical endpoints...');
    
    const endpoints = [
      { name: 'Health', method: () => fetch(`${this.baseURL}/health`) },
      { name: 'Curriculum', method: () => this.getCurriculum() },
      { name: 'Study Notes', method: () => this.testStudyNotes() },
      { name: 'Current User', method: () => this.getCurrentUser() }
    ];

    for (const endpoint of endpoints) {
      try {
        await endpoint.method();
        console.log(`✅ ${endpoint.name} endpoint: WORKING`);
      } catch (error) {
        console.log(`❌ ${endpoint.name} endpoint: FAILED - ${error.message}`);
      }
    }
  }
}

const apiService = new ApiService();
export default apiService;