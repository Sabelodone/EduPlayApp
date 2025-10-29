import openai
import os
import json
from datetime import datetime
from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from datetime import datetime, timedelta
import os
import json
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()

class AIService:
    def __init__(self, app=None):
        self.current_model = "gpt-3.5-turbo"
        self.openai_api_key = os.environ.get('OPENAI_API_KEY')
        
        # Initialize OpenAI client if API key is available
        if self.openai_api_key:
            openai.api_key = self.openai_api_key
            print("✅ OpenAI service initialized successfully")
        else:
            print("⚠️ OpenAI API key not found. Using fallback mode.")
    
    def generate_educational_content(self, content_type, parameters):
        """
        Unified method to generate various educational content
        
        Args:
            content_type: 'lesson', 'quiz', 'game', 'challenge', 'explanation'
            parameters: dict with specific parameters for each content type
        """
        content_generators = {
            'lesson': self._generate_lesson,
            'quiz': self._generate_quiz,
            'game': self._generate_game_content,
            'challenge': self._generate_challenge,
            'explanation': self._generate_explanation
        }
        
        generator = content_generators.get(content_type)
        if not generator:
            raise ValueError(f"Unsupported content type: {content_type}")
        
        return generator(parameters)
    
    def _generate_lesson(self, params):
        """Generate lesson content"""
        subject = params.get('subject', 'mathematics')
        grade_level = params.get('grade_level', 5)
        topic = params.get('topic', 'general')
        
        prompt = f"""
        Create a comprehensive lesson plan for {topic} in {subject} for grade {grade_level} students.
        
        Include:
        - Learning objectives
        - Key concepts with explanations
        - Examples with step-by-step solutions
        - Practice problems with answers
        - Real-world applications
        
        Format as JSON:
        {{
            "title": "Engaging lesson title",
            "subject": "{subject}",
            "grade_level": {grade_level},
            "topic": "{topic}",
            "duration_minutes": 45,
            "learning_objectives": ["objective1", "objective2"],
            "key_concepts": [
                {{
                    "concept": "concept name",
                    "explanation": "clear explanation",
                    "example": "practical example"
                }}
            ],
            "practice_problems": [
                {{
                    "problem": "problem statement",
                    "solution": "step-by-step solution",
                    "difficulty": "easy/medium/hard"
                }}
            ],
            "real_world_connections": ["connection1", "connection2"]
        }}
        """
        
        return self._call_openai(prompt, 'lesson', params)
    
    def _generate_quiz(self, params):
        """Generate quiz questions"""
        subject = params.get('subject', 'mathematics')
        grade_level = params.get('grade_level', 5)
        topic = params.get('topic', 'general')
        num_questions = params.get('num_questions', 5)
        difficulty = params.get('difficulty', 'medium')
        
        prompt = f"""
        Create {num_questions} {difficulty} difficulty multiple-choice quiz questions 
        about {topic} in {subject} for grade {grade_level} students.
        
        Each question should have:
        - Clear question stem
        - 4 plausible options (A, B, C, D)
        - Correct answer
        - Explanation
        - Points based on difficulty
        
        Format as JSON:
        {{
            "quiz_title": "Quiz about {topic}",
            "subject": "{subject}",
            "grade_level": {grade_level},
            "questions": [
                {{
                    "id": 1,
                    "question": "question text",
                    "options": {{
                        "A": "option A",
                        "B": "option B", 
                        "C": "option C",
                        "D": "option D"
                    }},
                    "correct_answer": "A",
                    "explanation": "detailed explanation",
                    "points": 10,
                    "difficulty": "{difficulty}"
                }}
            ],
            "total_points": 50,
            "time_limit_minutes": 15
        }}
        """
        
        return self._call_openai(prompt, 'quiz', params)
    
    def _generate_game_content(self, params):
        """Generate educational game content"""
        game_type = params.get('game_type', 'puzzle')
        subject = params.get('subject', 'mathematics')
        grade_level = params.get('grade_level', 5)
        
        prompt = f"""
        Create educational game content for a {game_type} game about {subject} 
        for grade {grade_level} students.
        
        Include:
        - Game objectives
        - Rules and mechanics
        - Educational content integration
        - Difficulty progression
        - Rewards system
        
        Format as JSON:
        {{
            "game_title": "Educational {game_type} game",
            "game_type": "{game_type}",
            "subject": "{subject}",
            "grade_level": {grade_level},
            "learning_objectives": ["objective1", "objective2"],
            "game_mechanics": "description of how the game works",
            "levels": [
                {{
                    "level": 1,
                    "description": "level description",
                    "challenges": ["challenge1", "challenge2"],
                    "points_reward": 100
                }}
            ],
            "educational_content": "how learning is integrated into gameplay"
        }}
        """
        
        return self._call_openai(prompt, 'game', params)
    
    def _generate_challenge(self, params):
        """Generate educational challenge"""
        user_level = params.get('user_level', 5)
        preferences = params.get('preferences', {})
        difficulty = self._determine_difficulty(user_level)
        category = preferences.get('category', 'mathematics')
        subject = preferences.get('subject', 'general')
        
        prompt = f"""
        Create an educational {difficulty} level challenge for a grade {user_level} student.
        Subject: {subject}
        Category: {category}
        
        Requirements:
        - Create an engaging title
        - Write a clear description of the challenge
        - Include learning objectives
        - Suggest time limit (in minutes)
        - Provide 3-5 key concepts covered
        
        Respond in JSON format:
        {{
            "title": "Challenge title",
            "description": "Detailed description",
            "difficulty": "{difficulty}",
            "category": "{category}",
            "subject": "{subject}",
            "points": {user_level * 100},
            "time_limit_minutes": 30,
            "learning_objectives": ["objective1", "objective2"],
            "key_concepts": ["concept1", "concept2", "concept3"],
            "requirements": {{
                "min_time": 10,
                "max_time": 60
            }},
            "ai_generated": true
        }}
        """
        
        result = self._call_openai(prompt, 'challenge', params)
        if result:
            result['user_level'] = user_level
        return result
    
    def _generate_explanation(self, params):
        """Generate explanation for a concept"""
        concept = params.get('concept', '')
        grade_level = params.get('grade_level', 5)
        
        prompt = f"""
        Explain the concept of '{concept}' to a grade {grade_level} student.
        
        Provide:
        - Simple definition
        - Step-by-step explanation
        - Examples
        - Common misconceptions
        - Practice application
        
        Format as JSON:
        {{
            "concept": "{concept}",
            "grade_level": {grade_level},
            "simple_definition": "easy-to-understand definition",
            "detailed_explanation": "step-by-step explanation",
            "examples": [
                {{
                    "example": "concrete example",
                    "explanation": "why this example works"
                }}
            ],
            "common_misconceptions": ["misconception1", "misconception2"],
            "practice_application": "how to apply this concept"
        }}
        """
        
        return self._call_openai(prompt, 'explanation', params)
    
    def _call_openai(self, prompt, content_type, params):
        """Make API call to OpenAI with error handling"""
        if not self.openai_api_key:
            return self._generate_fallback_content(content_type, params)
        
        try:
            response = openai.ChatCompletion.create(
                model=self.current_model,
                messages=[
                    {
                        "role": "system", 
                        "content": "You are an expert educational content creator for K-12 students."
                    },
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )
            
            content = response.choices[0].message.content.strip()
            result = json.loads(content)
            
            # Add metadata
            result['ai_generated'] = True
            result['generated_at'] = datetime.utcnow().isoformat()
            result['model_used'] = self.current_model
            
            return result
            
        except Exception as e:
            print(f"❌ OpenAI API error for {content_type}: {e}")
            return self._generate_fallback_content(content_type, params)
    
    def _generate_fallback_content(self, content_type, params):
        """Generate fallback content when AI is unavailable"""
        if content_type == 'lesson':
            topic = params.get('topic', 'general')
            grade_level = params.get('grade_level', 5)
            return {
                'title': f'Introduction to {topic}',
                'subject': params.get('subject', 'mathematics'),
                'grade_level': grade_level,
                'topic': topic,
                'duration_minutes': 40,
                'learning_objectives': [f'Understand basic {topic} concepts', f'Apply {topic} principles'],
                'key_concepts': [
                    {
                        'concept': 'Fundamental principles',
                        'explanation': f'Basic principles of {topic}',
                        'example': f'Example of {topic} in action'
                    }
                ],
                'practice_problems': [
                    {
                        'problem': f'Practice problem 1 on {topic}',
                        'solution': 'Step-by-step solution',
                        'difficulty': 'easy'
                    }
                ],
                'real_world_connections': [f'Real-world application of {topic}'],
                'ai_generated': False
            }
        elif content_type == 'quiz':
            return {
                'quiz_title': f"Quiz about {params.get('topic', 'general')}",
                'subject': params.get('subject', 'mathematics'),
                'grade_level': params.get('grade_level', 5),
                'questions': [
                    {
                        'id': 1,
                        'question': f"What is the main concept of {params.get('topic', 'this subject')}?",
                        'options': {
                            'A': 'Option A',
                            'B': 'Option B',
                            'C': 'Option C',
                            'D': 'Option D'
                        },
                        'correct_answer': 'A',
                        'explanation': 'This is the correct answer because...',
                        'points': 10,
                        'difficulty': 'medium'
                    }
                ],
                'total_points': 10,
                'time_limit_minutes': 10,
                'ai_generated': False
            }
        else:
            return {
                'title': f'Fallback {content_type.title()}',
                'description': f'This is fallback content for {content_type}',
                'ai_generated': False,
                'generated_at': datetime.utcnow().isoformat()
            }
    
    def analyze_solution(self, challenge_description, solution_code, requirements):
        """Analyze student solution using AI"""
        if not self.openai_api_key:
            return self._analyze_fallback(challenge_description, solution_code, requirements)
        
        try:
            prompt = f"""
            Analyze this student solution for an educational challenge.
            
            Challenge: {challenge_description}
            Student Solution: {solution_code}
            
            Provide feedback in JSON format:
            {{
                "correct": boolean,
                "score": 0-100,
                "feedback": ["positive feedback points"],
                "improvements": ["suggested improvements"],
                "concepts_mastered": ["list of concepts demonstrated"],
                "areas_for_improvement": ["areas needing work"]
            }}
            """
            
            response = openai.ChatCompletion.create(
                model=self.current_model,
                messages=[
                    {"role": "system", "content": "You are an expert educational assessor. Provide constructive feedback."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=600
            )
            
            content = response.choices[0].message.content.strip()
            analysis = json.loads(content)
            return analysis
            
        except Exception as e:
            print(f"❌ AI analysis failed: {e}")
            return self._analyze_fallback(challenge_description, solution_code, requirements)
    
    def _analyze_fallback(self, challenge_description, solution_code, requirements):
        """Fallback solution analysis"""
        solution_length = len(solution_code) if solution_code else 0
        
        if solution_length > 50:
            return {
                'correct': True,
                'score': 85,
                'feedback': ["Good effort! Your solution shows understanding."],
                'improvements': ["Add more comments to explain your reasoning"],
                'concepts_mastered': ["Basic problem solving"],
                'areas_for_improvement': ["Code documentation"]
            }
        else:
            return {
                'correct': False,
                'score': 40,
                'feedback': ["Try to expand your solution with more details."],
                'improvements': ["Provide a more comprehensive answer", "Explain your approach"],
                'concepts_mastered': [],
                'areas_for_improvement': ["Solution completeness", "Explanation clarity"]
            }
    
    def generate_hint(self, challenge_description, difficulty, current_approach):
        """Generate helpful hints using AI"""
        if not self.openai_api_key:
            return self._generate_fallback_hint(difficulty)
        
        try:
            prompt = f"""
            Generate a helpful hint for a student working on this challenge.
            
            Challenge: {challenge_description}
            Difficulty: {difficulty}
            Student's Current Approach: {current_approach or 'Not specified'}
            
            Provide a hint that:
            - Guides without giving away the answer
            - Is appropriate for {difficulty} level
            - Helps overcome the specific challenge
            
            Respond with a JSON object:
            {{
                "hint": "the hint text",
                "approach_suggestion": "suggested approach",
                "resources_to_review": ["relevant topics to review"]
            }}
            """
            
            response = openai.ChatCompletion.create(
                model=self.current_model,
                messages=[
                    {"role": "system", "content": "You are a helpful tutor. Provide guidance that encourages learning."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.5,
                max_tokens=300
            )
            
            content = response.choices[0].message.content.strip()
            hint_data = json.loads(content)
            return hint_data
            
        except Exception as e:
            print(f"❌ AI hint generation failed: {e}")
            return self._generate_fallback_hint(difficulty)
    
    def _generate_fallback_hint(self, difficulty):
        """Fallback hints"""
        hints = {
            'easy': {
                "hint": "Try breaking the problem down into smaller steps.",
                "approach_suggestion": "Start with the simplest case first.",
                "resources_to_review": ["Basic concepts", "Fundamental principles"]
            },
            'medium': {
                "hint": "Consider using a systematic approach.",
                "approach_suggestion": "Look for patterns in the problem.",
                "resources_to_review": ["Problem-solving strategies", "Related concepts"]
            },
            'hard': {
                "hint": "This might require thinking outside the box.",
                "approach_suggestion": "Break the problem into sub-problems and solve each one.",
                "resources_to_review": ["Advanced topics", "Creative thinking techniques"]
            }
        }
        return hints.get(difficulty, hints['easy'])
    
    def _determine_difficulty(self, user_level):
        if user_level <= 3: 
            return 'easy'
        elif user_level <= 7: 
            return 'medium'
        else: 
            return 'hard'