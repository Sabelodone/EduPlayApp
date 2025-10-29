// services/gameGeneratorService.js - PURE OPENAI VERSION
import { GAME_CATEGORIES, SUBJECT_COLORS, SUBJECT_ICONS } from '../components/gameData';

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
  // Generate a single game
  async generateGame(params = {}) {
    try {
      const { subject, difficulty = 'Medium', grade = '10' } = params;
      
      console.log('🎮 Generating game for:', { subject, difficulty, grade });

      const prompt = `
Create an educational game for ${subject} Grade ${grade} with ${difficulty} difficulty aligned to South African CAPS curriculum.

Generate a JSON response with:
- title (engaging, 2-3 words)
- description (1 sentence explaining the game)
- difficulty ("${difficulty}")
- duration (e.g., "10-15 min") 
- players (e.g., "1-4")
- rating (4.0 to 5.0)
- topics (2-3 CAPS topics)
- grade ("${grade}")

Make it fun and educational! Respond with valid JSON only.`;

      console.log('🔄 Calling OpenAI API...');

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
              content: 'You are an educational game designer for South African CAPS curriculum. Respond with valid JSON only. No additional text.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 500
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
      
      return this.formatGameData(gameData, subject);
      
    } catch (error) {
      console.error('❌ Game generation failed:', error.message);
      throw error; // Don't fallback to mock - throw the error
    }
  }

  // Generate multiple games for all subjects
  async generateAllGames() {
    const subjects = GAME_CATEGORIES.filter(cat => cat !== 'All');
    const allGames = [];
    
    console.log('🚀 Starting AI game generation for subjects:', subjects);
    
    for (const subject of subjects) {
      try {
        // Generate 2 games per subject
        for (let i = 0; i < 2; i++) {
          const difficulties = ['Easy', 'Medium', 'Hard'];
          const grades = ['10', '11', '12'];
          
          const difficulty = difficulties[Math.floor(Math.random() * difficulties.length)];
          const grade = grades[Math.floor(Math.random() * grades.length)];
          
          console.log(`📚 Generating ${subject} game ${i + 1}...`);
          const game = await this.generateGame({ subject, difficulty, grade });
          allGames.push(game);
          
          // Avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.error(`❌ Failed to generate games for ${subject}:`, error.message);
        // Continue with other subjects even if one fails
      }
    }
    
    if (allGames.length === 0) {
      throw new Error('Failed to generate any games. Check your OpenAI API key and internet connection.');
    }
    
    console.log(`✅ Successfully generated ${allGames.length} AI-powered games`);
    return allGames;
  }

  // Format OpenAI response into game object
  formatGameData(gameData, subject) {
    const id = this.generateId(subject, gameData.title);
    
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
      locked: false, // No locked games for now
      grade: gameData.grade,
      topics: gameData.topics || [],
      generated: true,
      timestamp: new Date().toISOString()
    };
  }

  // Generate unique ID
  generateId(subject, title) {
    const subjectSlug = subject.toLowerCase().replace(/\s+/g, '-');
    const titleSlug = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    return `${subjectSlug}-${titleSlug}-${Date.now()}`;
  }
}

console.log('🎯 GameGeneratorService: Using PURE OpenAI API (no mock data)');
export default new GameGeneratorService();