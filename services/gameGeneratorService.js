// services/gameGeneratorService.js - ENHANCED OPENAI VERSION
import { GAME_CATEGORIES, SUBJECT_COLORS, SUBJECT_ICONS, CAPS_TOPICS } from '../components/gameData';

// Use environment variable for API key
const OPENAI_API_KEY = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

// Strict API validation
console.log('🔑 OpenAI API Key Status:', {
  exists: !!OPENAI_API_KEY,
  validFormat: OPENAI_API_KEY?.startsWith('sk-'),
  length: OPENAI_API_KEY?.length,
  preview: OPENAI_API_KEY ? OPENAI_API_KEY.substring(0, 10) + '...' : 'MISSING'
});

if (!OPENAI_API_KEY) {
  console.error('❌ CRITICAL: EXPO_PUBLIC_OPENAI_API_KEY is missing from .env file');
  throw new Error('OpenAI API key is required. Please add EXPO_PUBLIC_OPENAI_API_KEY to your .env file');
}

if (!OPENAI_API_KEY.startsWith('sk-')) {
  console.error('❌ CRITICAL: Invalid OpenAI API key format. Key must start with "sk-"');
  throw new Error('Invalid OpenAI API key format. Please check your .env file');
}

class GameGeneratorService {
  // Generate a single game with specific parameters
  async generateGame(params = {}) {
    try {
      const { 
        subject = 'Mathematics', 
        difficulty = 'Medium', 
        grade = 10, 
        topic = null 
      } = params;
      
      console.log('🎮 Generating game with params:', { subject, difficulty, grade, topic });

      // Get available topics for the subject and grade
      const availableTopics = CAPS_TOPICS[subject]?.[grade] || ['General Topics'];
      const selectedTopic = topic || availableTopics[Math.floor(Math.random() * availableTopics.length)];

      const prompt = `
Create an educational game for ${subject} Grade ${grade} with ${difficulty} difficulty aligned to South African CAPS curriculum.

SPECIFIC TOPIC: ${selectedTopic}

Generate a JSON response with:
- title (engaging, 2-3 words related to ${selectedTopic})
- description (1 sentence explaining the game and how it relates to ${selectedTopic})
- difficulty ("${difficulty}")
- duration (e.g., "10-15 min") 
- players (e.g., "1-4")
- rating (4.0 to 5.0)
- topics (include "${selectedTopic}" and 1-2 related topics)
- grade ("${grade}")

Make it fun, educational, and specifically focused on ${selectedTopic}! Respond with valid JSON only.`;

      console.log('🔄 Calling OpenAI API for:', { subject, grade, difficulty, topic: selectedTopic });

      const response = await fetch(OPENAI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'system',
              content: `You are an expert ${subject} teacher for South African CAPS curriculum Grades 10-12. 
              Create engaging, curriculum-aligned educational games that focus on specific topics.
              Always respond with valid JSON only. No additional text.`
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 600
        })
      });

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ OpenAI API error:', response.status, errorText);
        throw new Error(`OpenAI API error ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ OpenAI response received');
      
      // Parse the response
      const gameData = JSON.parse(data.choices[0].message.content);
      console.log('🎯 Generated game:', gameData.title);
      
      return this.formatGameData(gameData, subject, grade, selectedTopic);
      
    } catch (error) {
      console.error('❌ Game generation failed:', error.message);
      throw error;
    }
  }

  // Generate multiple games for all subjects (default behavior)
  async generateAllGames() {
    const subjects = GAME_CATEGORIES.filter(cat => cat !== 'All');
    const allGames = [];
    
    console.log('🚀 Starting AI game generation for all subjects and grades...');
    
    for (const subject of subjects) {
      try {
        // Generate games for each grade (10, 11, 12)
        for (const grade of [10, 11, 12]) {
          const difficulties = ['Easy', 'Medium', 'Hard'];
          const availableTopics = CAPS_TOPICS[subject]?.[grade] || ['General Topics'];
          
          // Generate 1 game per difficulty level per grade
          for (const difficulty of difficulties) {
            const topic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
            
            console.log(`📚 Generating ${subject} Grade ${grade} ${difficulty} game...`);
            
            try {
              const game = await this.generateGame({ 
                subject, 
                difficulty, 
                grade, 
                topic 
              });
              allGames.push(game);
              
              // Avoid rate limiting
              await new Promise(resolve => setTimeout(resolve, 1200));
            } catch (gameError) {
              console.error(`❌ Failed to generate ${subject} Grade ${grade} ${difficulty} game:`, gameError.message);
              // Continue with next game even if one fails
            }
          }
        }
      } catch (subjectError) {
        console.error(`❌ Failed to generate games for ${subject}:`, subjectError.message);
        // Continue with other subjects even if one fails
      }
    }
    
    if (allGames.length === 0) {
      throw new Error('Failed to generate any games. Please check your OpenAI API key and internet connection.');
    }
    
    console.log(`✅ Successfully generated ${allGames.length} AI-powered games across all subjects and grades`);
    return allGames;
  }

  // Generate games for specific subject and grade
  async generateGamesForSubject(subject, grade, count = 3) {
    console.log(`🎯 Generating ${count} games for ${subject} Grade ${grade}...`);
    
    const games = [];
    const difficulties = ['Easy', 'Medium', 'Hard'];
    const availableTopics = CAPS_TOPICS[subject]?.[grade] || ['General Topics'];
    
    for (let i = 0; i < count; i++) {
      try {
        const difficulty = difficulties[i % difficulties.length];
        const topic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
        
        const game = await this.generateGame({ 
          subject, 
          difficulty, 
          grade, 
          topic 
        });
        games.push(game);
        
        // Avoid rate limiting
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Failed to generate game ${i + 1} for ${subject} Grade ${grade}:`, error.message);
      }
    }
    
    if (games.length === 0) {
      throw new Error(`Failed to generate any games for ${subject} Grade ${grade}`);
    }
    
    return games;
  }

  // Generate games with custom filters
  async generateGamesWithFilters(filters = {}) {
    const { 
      subject = 'Mathematics', 
      grade = 10, 
      difficulty = null,
      topic = null 
    } = filters;
    
    console.log('🎯 Generating games with custom filters:', filters);
    
    if (difficulty && topic) {
      // Specific difficulty and topic
      return [await this.generateGame({ subject, grade, difficulty, topic })];
    } else if (difficulty) {
      // Specific difficulty, random topic
      return await this.generateGamesForSubject(subject, grade, 2);
    } else if (topic) {
      // Specific topic, random difficulties
      const games = [];
      const difficulties = ['Easy', 'Medium', 'Hard'];
      
      for (const diff of difficulties) {
        try {
          const game = await this.generateGame({ subject, grade, difficulty: diff, topic });
          games.push(game);
          await new Promise(resolve => setTimeout(resolve, 800));
        } catch (error) {
          console.error(`❌ Failed to generate ${diff} game for topic ${topic}:`, error.message);
        }
      }
      
      return games;
    } else {
      // Default: generate variety for subject and grade
      return await this.generateGamesForSubject(subject, grade, 3);
    }
  }

  // Get available options for UI selection
  getAvailableOptions() {
    const options = {
      subjects: GAME_CATEGORIES.filter(cat => cat !== 'All'),
      grades: [10, 11, 12],
      difficulties: ['Easy', 'Medium', 'Hard'],
      topicsBySubjectAndGrade: CAPS_TOPICS
    };
    
    return options;
  }

  // Format OpenAI response into game object
  formatGameData(gameData, subject, grade, topic) {
    const id = this.generateId(subject, gameData.title);
    
    // Ensure topics array includes the specific topic
    const topics = gameData.topics || [];
    if (!topics.includes(topic)) {
      topics.unshift(topic);
    }
    
    return {
      id,
      title: gameData.title,
      category: subject,
      description: gameData.description,
      difficulty: gameData.difficulty,
      duration: gameData.duration,
      players: gameData.players,
      rating: parseFloat(gameData.rating) || 4.0,
      color: SUBJECT_COLORS[subject] || '#667eea',
      icon: SUBJECT_ICONS[subject] || '🎮',
      locked: false,
      grade: grade.toString(),
      topics: topics.slice(0, 3), // Limit to 3 topics max
      primaryTopic: topic,
      generated: true,
      timestamp: new Date().toISOString(),
      selectable: true
    };
  }

  // Generate unique ID
  generateId(subject, title) {
    const subjectSlug = subject.toLowerCase().replace(/\s+/g, '-');
    const titleSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${subjectSlug}-${titleSlug}-${Date.now()}`;
  }
}

console.log('🎯 GameGeneratorService: Enhanced OpenAI API with grade/subject/topic selection');
console.log('📚 Available subjects:', GAME_CATEGORIES.filter(cat => cat !== 'All'));
console.log('🎓 Available grades: [10, 11, 12]');

export default new GameGeneratorService();