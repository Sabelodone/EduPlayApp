// services/OpenAIService.js
import axios from 'axios';

class OpenAIService {
  constructor() {
    this.apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
    console.log('🔑 OpenAI API Key Status:', {
      exists: !!this.apiKey,
      length: this.apiKey?.length,
      preview: this.apiKey ? `${this.apiKey.substring(0, 10)}...` : 'None'
    });
  }

  async makeAPICall(messages, max_tokens = 1500) {
    try {
      if (!this.apiKey) {
        throw new Error('OpenAI API key not found. Please check your .env file');
      }

      console.log('🔄 Making OpenAI API request...');
      
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: "gpt-3.5-turbo", // Using 3.5-turbo for reliability
          messages: messages,
          max_tokens: max_tokens,
          temperature: 0.7
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout
        }
      );

      console.log('✅ OpenAI API Response received');

      // Validate response structure
      if (!response.data || 
          !response.data.choices || 
          !response.data.choices[0] || 
          !response.data.choices[0].message) {
        throw new Error('Invalid API response structure');
      }

      return response.data.choices[0].message.content;

    } catch (error) {
      console.error('❌ OpenAI API Error Details:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });

      if (error.response?.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key.');
      } else if (error.response?.status === 429) {
        throw new Error('API quota exceeded. Please check your OpenAI billing.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try again.');
      } else {
        throw new Error(`API Error: ${error.message}`);
      }
    }
  }

  async generateExamQuestions(subject, grade, topic, numberOfQuestions = 5) {
    const prompt = `
    Create ${numberOfQuestions} exam-style multiple choice questions for ${subject}, Grade ${grade} in South Africa, topic: ${topic}.

    REQUIREMENTS:
    - Aligned with CAPS curriculum
    - Grade-appropriate difficulty
    - Clear, unambiguous questions
    - 4 multiple choice options (A, B, C, D)
    - Detailed explanations
    - Step-by-step solutions
    - Common mistakes to avoid

    FORMAT each question as JSON object:
    {
      "question": "clear question text",
      "options": ["option A", "option B", "option C", "option D"],
      "correctAnswer": 0,
      "explanation": "detailed explanation why this is correct",
      "steps": ["step 1", "step 2", "step 3"],
      "commonMistakes": ["mistake 1", "mistake 2"]
    }

    Return ONLY a JSON array of question objects, nothing else.
    `;

    const messages = [
      {
        role: "system",
        content: "You are an expert South African CAPS curriculum teacher. Create high-quality educational content."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    const content = await this.makeAPICall(messages);
    return this.parseQuestions(content);
  }

  async generateLessonContent(subject, grade, topic) {
    const prompt = `
    Create a comprehensive lesson for ${subject}, Grade ${grade} in South Africa, topic: ${topic}.

    Include:
    1. Key learning objectives
    2. Clear explanations of core concepts
    3. Worked examples with step-by-step solutions
    4. Real-world applications
    5. Common student difficulties and how to overcome them
    6. Summary of key points

    Make it engaging and easy to understand for high school students.
    `;

    const messages = [
      {
        role: "system",
        content: "You are an engaging South African high school teacher."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    return await this.makeAPICall(messages);
  }

  parseQuestions(content) {
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        
        // Validate questions structure
        if (Array.isArray(questions) && questions.length > 0) {
          return questions.map((q, index) => ({
            id: index + 1,
            question: q.question || `Question ${index + 1}`,
            options: q.options || ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: q.correctAnswer || 0,
            explanation: q.explanation || 'Explanation not provided',
            steps: q.steps || [],
            commonMistakes: q.commonMistakes || []
          }));
        }
      }
      
      // Fallback: return simple questions if parsing fails
      console.warn('JSON parsing failed, using fallback questions');
      return this.createFallbackQuestions();
      
    } catch (error) {
      console.error('Error parsing questions:', error);
      return this.createFallbackQuestions();
    }
  }

  createFallbackQuestions() {
    // Simple fallback questions
    return [
      {
        id: 1,
        question: "What is the main topic being studied?",
        options: ["Advanced concepts", "Basic principles", "Practical applications", "Theoretical framework"],
        correctAnswer: 1,
        explanation: "This question tests understanding of the core topic.",
        steps: ["Read the question carefully", "Consider what you've learned", "Choose the best answer"],
        commonMistakes: ["Rushing without thinking", "Not reviewing key concepts"]
      }
    ];
  }
}

export default new OpenAIService();