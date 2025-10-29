// services/questionCache.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEYS = {
  QUESTIONS: 'cached_questions',
  LAST_UPDATED: 'cache_last_updated'
};

export class QuestionCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 200; // Maximum questions to cache
    this.cacheDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  }

  getKey(subject, grade, topic, difficulty) {
    return `${subject}-${grade}-${topic}-${difficulty}`.toLowerCase().replace(/\s+/g, '_');
  }

  getQuestion(subject, grade, topic, difficulty) {
    const key = this.getKey(subject, grade, topic, difficulty);
    const questions = this.cache.get(key);
    
    if (!questions || questions.length === 0) return null;
    
    // Return random question from cache to avoid repetition
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

  addQuestion(question) {
    const key = this.getKey(
      question.subject, 
      question.grade, 
      question.topic, 
      question.difficulty
    );
    
    if (!this.cache.has(key)) {
      this.cache.set(key, []);
    }
    
    const questions = this.cache.get(key);
    
    // Avoid duplicates
    const isDuplicate = questions.some(q => 
      q.question === question.question && 
      JSON.stringify(q.options) === JSON.stringify(question.options)
    );
    
    if (!isDuplicate) {
      questions.push(question);
    }
    
    // Manage cache size
    this.cleanupCache();
  }

  cleanupCache() {
    if (this.cache.size > this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }

  async saveToStorage() {
    try {
      const cacheData = {
        questions: Object.fromEntries(this.cache),
        timestamp: Date.now()
      };
      
      await AsyncStorage.setItem(CACHE_KEYS.QUESTIONS, JSON.stringify(cacheData));
    } catch (error) {
      console.error('Failed to save cache to storage:', error);
    }
  }

  async loadFromStorage() {
    try {
      const cachedData = await AsyncStorage.getItem(CACHE_KEYS.QUESTIONS);
      
      if (cachedData) {
        const { questions, timestamp } = JSON.parse(cachedData);
        
        // Check if cache is still valid
        if (Date.now() - timestamp < this.cacheDuration) {
          this.cache = new Map(Object.entries(questions));
          return true;
        } else {
          // Cache expired, clear it
          await this.clearStorage();
        }
      }
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
    }
    
    return false;
  }

  async clearStorage() {
    try {
      await AsyncStorage.removeItem(CACHE_KEYS.QUESTIONS);
      this.cache.clear();
    } catch (error) {
      console.error('Failed to clear cache storage:', error);
    }
  }

  getStats() {
    let totalQuestions = 0;
    const subjectStats = {};
    
    this.cache.forEach((questions, key) => {
      totalQuestions += questions.length;
      
      const [subject] = key.split('-');
      if (!subjectStats[subject]) {
        subjectStats[subject] = 0;
      }
      subjectStats[subject] += questions.length;
    });
    
    return {
      totalQuestions,
      subjectStats,
      cacheSize: this.cache.size
    };
  }
}

export default QuestionCache;