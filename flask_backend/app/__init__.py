from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_jwt_extended import JWTManager, create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from flask_cors import CORS
from datetime import datetime, timedelta
import os
import json
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

# Initialize extensions
db = SQLAlchemy()
bcrypt = Bcrypt()
jwt = JWTManager()

class AIService:
    def __init__(self):
        self.current_model = "gpt-3.5-turbo"
        self.openai_api_key = os.environ.get('OPENAI_API_KEY')
        
        # Initialize OpenAI client if API key is available
        if self.openai_api_key:
            self.client = OpenAI(api_key=self.openai_api_key)
            print("✅ OpenAI service initialized successfully")
        else:
            self.client = None
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
        if not self.openai_api_key or not self.client:
            return self._generate_fallback_content(content_type, params)
        
        try:
            response = self.client.chat.completions.create(
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
        if not self.openai_api_key or not self.client:
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
            
            response = self.client.chat.completions.create(
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
        if not self.openai_api_key or not self.client:
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
            
            response = self.client.chat.completions.create(
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

# Initialize AI Service
ai_service = AIService()

def create_app():
    app = Flask(__name__)
    
    # Configuration - Updated to use environment variables
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL') or 'sqlite:///eduplay.db'
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 hours
    
    # Initialize extensions with app
    db.init_app(app)
    bcrypt.init_app(app)
    jwt.init_app(app)
    CORS(app)  # Enable CORS for all routes
    
    # Define models
    class User(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        email = db.Column(db.String(120), unique=True, nullable=False)
        password = db.Column(db.String(255), nullable=False)
        first_name = db.Column(db.String(50), nullable=False)
        last_name = db.Column(db.String(50), nullable=False)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        # Profile relationship
        profile = db.relationship('UserProfile', backref='user', uselist=False, cascade='all, delete-orphan')
        progress = db.relationship('UserProgress', backref='user', uselist=False, cascade='all, delete-orphan')
        game_sessions = db.relationship('GameSession', backref='user', lazy=True)
        quiz_attempts = db.relationship('QuizAttempt', backref='user', lazy=True)
        user_challenges = db.relationship('UserChallenge', backref='user', lazy=True)
        user_achievements = db.relationship('UserAchievement', backref='user', lazy=True)
    
    class UserProfile(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
        grade_level = db.Column(db.String(50))
        school = db.Column(db.String(200))
        preferred_language = db.Column(db.String(50), default='English')
        subjects = db.Column(db.String(500))
        is_minor = db.Column(db.Boolean, default=True)
        guardian_name = db.Column(db.String(100))
        guardian_email = db.Column(db.String(120))
        guardian_phone = db.Column(db.String(20))
        avatar_url = db.Column(db.String(500))
        bio = db.Column(db.Text)
    
    class UserProgress(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
        total_points = db.Column(db.Integer, default=0)
        current_streak = db.Column(db.Integer, default=0)
        longest_streak = db.Column(db.Integer, default=0)
        lessons_completed = db.Column(db.Integer, default=0)
        games_completed = db.Column(db.Integer, default=0)
        quizzes_completed = db.Column(db.Integer, default=0)
        level = db.Column(db.Integer, default=1)
        experience = db.Column(db.Integer, default=0)
        last_activity_date = db.Column(db.DateTime)
    
    class Lesson(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        title = db.Column(db.String(200), nullable=False)
        description = db.Column(db.Text)
        subject = db.Column(db.String(100), nullable=False)
        grade_level = db.Column(db.String(50))
        difficulty = db.Column(db.String(50), default='beginner')
        duration = db.Column(db.Integer)  # in minutes
        content_url = db.Column(db.String(500))
        thumbnail_url = db.Column(db.String(500))
        is_active = db.Column(db.Boolean, default=True)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    class Game(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        title = db.Column(db.String(200), nullable=False)
        description = db.Column(db.Text)
        category = db.Column(db.String(100), nullable=False)
        difficulty = db.Column(db.String(50), default='easy')
        max_players = db.Column(db.Integer, default=1)
        game_url = db.Column(db.String(500))
        thumbnail_url = db.Column(db.String(500))
        is_active = db.Column(db.Boolean, default=True)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    class GameSession(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
        game_id = db.Column(db.Integer, db.ForeignKey('game.id'), nullable=False)
        score = db.Column(db.Integer, default=0)
        duration = db.Column(db.Integer)  # in seconds
        completed = db.Column(db.Boolean, default=False)
        played_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        game = db.relationship('Game', backref='sessions')
    
    class Quiz(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        title = db.Column(db.String(200), nullable=False)
        description = db.Column(db.Text)
        subject = db.Column(db.String(100), nullable=False)
        difficulty = db.Column(db.String(50), default='easy')
        time_limit = db.Column(db.Integer)  # in minutes
        total_questions = db.Column(db.Integer, default=10)
        is_active = db.Column(db.Boolean, default=True)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    class QuizAttempt(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
        quiz_id = db.Column(db.Integer, db.ForeignKey('quiz.id'), nullable=False)
        score = db.Column(db.Integer, default=0)
        total_questions = db.Column(db.Integer, default=0)
        correct_answers = db.Column(db.Integer, default=0)
        completed = db.Column(db.Boolean, default=False)
        attempted_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        quiz = db.relationship('Quiz', backref='attempts')
    
    class Challenge(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        title = db.Column(db.String(200), nullable=False)
        description = db.Column(db.Text)
        challenge_type = db.Column(db.String(100), nullable=False)  # 'lesson', 'game', 'quiz'
        target_id = db.Column(db.Integer)  # ID of lesson, game, or quiz
        points_reward = db.Column(db.Integer, default=100)
        start_date = db.Column(db.DateTime)
        end_date = db.Column(db.DateTime)
        is_active = db.Column(db.Boolean, default=True)
        created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    class UserChallenge(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
        challenge_id = db.Column(db.Integer, db.ForeignKey('challenge.id'), nullable=False)
        completed = db.Column(db.Boolean, default=False)
        completed_at = db.Column(db.DateTime)
        joined_at = db.Column(db.DateTime, default=datetime.utcnow)
        
        challenge = db.relationship('Challenge', backref='user_challenges')
    
    class Achievement(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        name = db.Column(db.String(200), nullable=False)
        description = db.Column(db.Text)
        icon = db.Column(db.String(50))
        criteria_type = db.Column(db.String(100))  # 'lessons', 'games', 'quizzes', 'streak'
        criteria_value = db.Column(db.Integer)
        points_reward = db.Column(db.Integer, default=50)
    
    class UserAchievement(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
        achievement_id = db.Column(db.Integer, db.ForeignKey('achievement.id'), nullable=False)
        earned_at = db.Column(db.DateTime, default=datetime.utcnow)
        progress = db.Column(db.Integer, default=0)
        
        achievement = db.relationship('Achievement', backref='user_achievements')

    # ========== AI ENDPOINTS ==========
    @app.route('/api/ai/generate-content', methods=['POST'])
    @jwt_required()
    def generate_ai_content():
        """Generate educational content using AI"""
        try:
            user_id = get_jwt_identity()
            data = request.get_json()
            
            content_type = data.get('type')  # 'lesson', 'quiz', 'game', 'challenge', 'explanation'
            parameters = data.get('parameters', {})
            
            if not content_type:
                return jsonify({'error': 'Content type is required'}), 400
            
            print(f"🧠 Generating AI content: {content_type} for user {user_id}")
            
            content = ai_service.generate_educational_content(content_type, parameters)
            
            return jsonify({
                'status': 'success',
                'content': content,
                'type': content_type,
                'ai_generated': content.get('ai_generated', False)
            }), 200
            
        except Exception as e:
            print(f"❌ AI content generation error: {str(e)}")
            return jsonify({'error': f'AI content generation failed: {str(e)}'}), 500

    @app.route('/api/ai/analyze-solution', methods=['POST'])
    @jwt_required()
    def analyze_solution():
        """Analyze student solution using AI"""
        try:
            user_id = get_jwt_identity()
            data = request.get_json()
            
            challenge_description = data.get('challenge_description')
            solution_code = data.get('solution_code')
            requirements = data.get('requirements', {})
            
            if not challenge_description or not solution_code:
                return jsonify({'error': 'Challenge description and solution code are required'}), 400
            
            print(f"🔍 Analyzing solution for user {user_id}")
            
            analysis = ai_service.analyze_solution(challenge_description, solution_code, requirements)
            
            return jsonify({
                'status': 'success',
                'analysis': analysis,
                'ai_analyzed': True
            }), 200
            
        except Exception as e:
            print(f"❌ Solution analysis error: {str(e)}")
            return jsonify({'error': f'Solution analysis failed: {str(e)}'}), 500

    @app.route('/api/ai/generate-hint', methods=['POST'])
    @jwt_required()
    def generate_hint():
        """Generate hint using AI"""
        try:
            user_id = get_jwt_identity()
            data = request.get_json()
            
            challenge_description = data.get('challenge_description')
            difficulty = data.get('difficulty', 'medium')
            current_approach = data.get('current_approach', '')
            
            if not challenge_description:
                return jsonify({'error': 'Challenge description is required'}), 400
            
            print(f"💡 Generating hint for user {user_id}")
            
            hint = ai_service.generate_hint(challenge_description, difficulty, current_approach)
            
            return jsonify({
                'status': 'success',
                'hint': hint,
                'ai_generated': True
            }), 200
            
        except Exception as e:
            print(f"❌ Hint generation error: {str(e)}")
            return jsonify({'error': f'Hint generation failed: {str(e)}'}), 500

    # ========== AUTH ENDPOINTS ==========
    @app.route('/api/auth/signup', methods=['POST'])
    def signup():
        try:
            print("📝 Signup endpoint hit!")
            
            if not request.is_json:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing JSON in request'
                }), 400
                
            data = request.get_json()
            print("📝 Signup data received:", data)
            
            if not data:
                return jsonify({
                    'status': 'error',
                    'message': 'No data provided'
                }), 400
            
            # Validate required fields
            required_fields = ['email', 'password', 'first_name', 'last_name']
            for field in required_fields:
                if not data.get(field):
                    return jsonify({
                        'status': 'error',
                        'message': f'{field.replace("_", " ").title()} is required'
                    }), 400
            
            email = data['email'].lower().strip()
            password = data['password']
            first_name = data['first_name'].strip()
            last_name = data['last_name'].strip()
            
            # Check if user already exists
            existing_user = User.query.filter_by(email=email).first()
            if existing_user:
                return jsonify({
                    'status': 'error',
                    'message': 'User with this email already exists'
                }), 409
            
            # Create user
            hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
            user = User(
                email=email,
                password=hashed_password,
                first_name=first_name,
                last_name=last_name
            )
            db.session.add(user)
            db.session.flush()  # Get user ID without committing
            
            # Create user progress
            progress = UserProgress(user_id=user.id)
            db.session.add(progress)
            
            # Create profile if profile data provided
            profile_data = data.get('profile', {})
            if profile_data:
                subjects_list = profile_data.get('subjects', [])
                subjects_str = ','.join(subjects_list) if isinstance(subjects_list, list) else str(subjects_list)
                
                profile = UserProfile(
                    user_id=user.id,
                    grade_level=profile_data.get('grade_level'),
                    school=profile_data.get('school'),
                    preferred_language=profile_data.get('preferred_language', 'English'),
                    subjects=subjects_str,
                    is_minor=profile_data.get('is_minor', True),
                    guardian_name=profile_data.get('guardian_name'),
                    guardian_email=profile_data.get('guardian_email'),
                    guardian_phone=profile_data.get('guardian_phone', '')
                )
                db.session.add(profile)
            
            db.session.commit()
            
            # Create tokens
            access_token = create_access_token(identity=user.id)
            refresh_token = create_refresh_token(identity=user.id)
            
            print(f"✅ User registered successfully: {user.id} - {user.email}")
            
            return jsonify({
                'status': 'success',
                'message': 'User registered successfully',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name
                }
            }), 201
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Signup error: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Internal server error during registration'
            }), 500
    
    @app.route('/api/auth/signin', methods=['POST'])
    def signin():
        try:
            if not request.is_json:
                return jsonify({
                    'status': 'error',
                    'message': 'Missing JSON in request'
                }), 400
                
            data = request.get_json()
            print("🔐 Signin attempt for:", data.get('email'))
            
            email = data.get('email', '').lower().strip()
            password = data.get('password', '')
            
            if not email or not password:
                return jsonify({
                    'status': 'error', 
                    'message': 'Email and password are required'
                }), 400
            
            # Find user
            user = User.query.filter_by(email=email).first()
            if not user:
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid email or password'
                }), 401
            
            # Check password
            if not bcrypt.check_password_hash(user.password, password):
                return jsonify({
                    'status': 'error',
                    'message': 'Invalid email or password'
                }), 401
            
            # Create tokens
            access_token = create_access_token(identity=user.id)
            refresh_token = create_refresh_token(identity=user.id)
            
            print(f"✅ User signed in successfully: {user.id}")
            
            return jsonify({
                'status': 'success',
                'message': 'Login successful',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name
                }
            }), 200
            
        except Exception as e:
            print(f"❌ Signin error: {str(e)}")
            return jsonify({
                'status': 'error',
                'message': 'Internal server error during login'
            }), 500

    @app.route('/api/auth/me', methods=['GET'])
    @jwt_required()
    def get_current_user():
        """Get current user information"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
                
            return jsonify({
                'user': {
                    'id': user.id,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'username': user.email.split('@')[0],
                    'created_at': user.created_at.isoformat() if user.created_at else None
                }
            }), 200
        except Exception as e:
            print(f"❌ Error in /api/auth/me: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/auth/forgot-password', methods=['POST'])
    def forgot_password():
        """Initiate password reset"""
        try:
            data = request.get_json()
            email = data.get('email', '').lower().strip()
            
            if not email:
                return jsonify({'error': 'Email is required'}), 400
            
            user = User.query.filter_by(email=email).first()
            if user:
                # In a real app, send email with reset token
                print(f"Password reset requested for: {email}")
                # For now, just return success
                return jsonify({
                    'message': 'If an account with that email exists, a reset link has been sent.'
                }), 200
            else:
                # Still return success to prevent email enumeration
                return jsonify({
                    'message': 'If an account with that email exists, a reset link has been sent.'
                }), 200
                
        except Exception as e:
            print(f"❌ Error in /api/auth/forgot-password: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/auth/logout', methods=['POST'])
    @jwt_required()
    def logout():
        """Logout user - currently JWT logout is client-side"""
        try:
            # With JWT, logout is typically handled client-side by removing tokens
            # You could implement token blacklisting here if needed
            
            return jsonify({'message': 'Logged out successfully'}), 200
            
        except Exception as e:
            print(f"❌ Error in /api/auth/logout: {str(e)}")
            return jsonify({'error': 'Logout failed'}), 500

    # ========== DASHBOARD ENDPOINTS ==========
    @app.route('/api/dashboard/stats', methods=['GET'])
    @jwt_required()
    def get_dashboard_stats():
        """Get dashboard statistics for the current user"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            progress = user.progress or UserProgress(user_id=user_id)
            
            stats = [
                {'id': '1', 'title': 'Lessons Completed', 'value': str(progress.lessons_completed), 'subtitle': 'This week', 'change': '+20%', 'color': '#4ECDC4'},
                {'id': '2', 'title': 'Study Streak', 'value': str(progress.current_streak), 'subtitle': 'Days', 'change': '+2', 'color': '#FFD166'},
                {'id': '3', 'title': 'Points Earned', 'value': str(progress.total_points), 'subtitle': 'Total', 'change': '+50', 'color': '#FF6B6B'},
                {'id': '4', 'title': 'Games Played', 'value': str(progress.games_completed), 'subtitle': 'This month', 'change': '+25%', 'color': '#6A7FDB'}
            ]
            
            return jsonify({'stats': stats}), 200
        except Exception as e:
            print(f"❌ Error in /api/dashboard/stats: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/dashboard/recent-activity', methods=['GET'])
    @jwt_required()
    def get_recent_activity():
        """Get recent user activity"""
        try:
            user_id = get_jwt_identity()
            
            # Get recent game sessions
            recent_games = GameSession.query.filter_by(user_id=user_id).order_by(GameSession.played_at.desc()).limit(3).all()
            # Get recent quiz attempts
            recent_quizzes = QuizAttempt.query.filter_by(user_id=user_id).order_by(QuizAttempt.attempted_at.desc()).limit(2).all()
            
            activities = []
            
            for game in recent_games:
                activities.append({
                    'id': f'game_{game.id}',
                    'type': 'game',
                    'title': f'Game: {game.game.title if game.game else "Unknown"}',
                    'description': f'Scored {game.score} points',
                    'time': game.played_at.strftime('%Y-%m-%d %H:%M'),
                    'icon': '🎮',
                    'completed': game.completed
                })
            
            for quiz in recent_quizzes:
                activities.append({
                    'id': f'quiz_{quiz.id}',
                    'type': 'quiz',
                    'title': f'Quiz: {quiz.quiz.title if quiz.quiz else "Unknown"}',
                    'description': f'Score: {quiz.score}/{quiz.total_questions}',
                    'time': quiz.attempted_at.strftime('%Y-%m-%d %H:%M'),
                    'icon': '📝',
                    'completed': quiz.completed
                })
            
            # If no activities, return sample data
            if not activities:
                activities = [
                    {
                        'id': '1',
                        'type': 'lesson',
                        'title': 'Mathematics Basics',
                        'description': 'Completed Algebra fundamentals',
                        'time': '2 hours ago',
                        'icon': '📚',
                        'completed': True
                    },
                    {
                        'id': '2', 
                        'type': 'game',
                        'title': 'Math Puzzle Challenge',
                        'description': 'Scored 85% in math puzzle',
                        'time': '5 hours ago',
                        'icon': '🎮',
                        'completed': True
                    }
                ]
            
            return jsonify({'activities': activities[:5]}), 200
        except Exception as e:
            print(f"❌ Error in /api/dashboard/recent-activity: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/dashboard/upcoming-challenges', methods=['GET'])
    @jwt_required()
    def get_upcoming_challenges():
        """Get upcoming challenges"""
        try:
            challenges = Challenge.query.filter(
                Challenge.end_date >= datetime.utcnow(),
                Challenge.is_active == True
            ).limit(5).all()
            
            challenge_list = []
            for challenge in challenges:
                challenge_list.append({
                    'id': challenge.id,
                    'title': challenge.title,
                    'description': challenge.description,
                    'date': challenge.end_date.strftime('%Y-%m-%d') if challenge.end_date else 'No deadline',
                    'participants': UserChallenge.query.filter_by(challenge_id=challenge.id).count(),
                    'difficulty': 'medium',
                    'category': challenge.challenge_type
                })
            
            if not challenge_list:
                challenge_list = [
                    {
                        'id': 1,
                        'title': 'Weekly Math Challenge',
                        'description': 'Solve 50 math problems in 30 minutes',
                        'date': '2025-10-25',
                        'participants': 124,
                        'difficulty': 'medium',
                        'category': 'mathematics'
                    },
                    {
                        'id': 2,
                        'title': 'Science Trivia',
                        'description': 'Test your science knowledge',
                        'date': '2025-10-26', 
                        'participants': 89,
                        'difficulty': 'easy',
                        'category': 'science'
                    }
                ]
            
            return jsonify({'challenges': challenge_list}), 200
        except Exception as e:
            print(f"❌ Error in /api/dashboard/upcoming-challenges: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/dashboard/achievements', methods=['GET'])
    @jwt_required()
    def get_achievements():
        """Get user achievements"""
        try:
            user_id = get_jwt_identity()
            
            user_achievements = UserAchievement.query.filter_by(user_id=user_id).all()
            
            achievements_list = []
            for ua in user_achievements:
                achievements_list.append({
                    'id': ua.achievement.id,
                    'name': ua.achievement.name,
                    'description': ua.achievement.description,
                    'icon': ua.achievement.icon or '🏆',
                    'progress': ua.progress,
                    'completed': ua.progress >= (ua.achievement.criteria_value if ua.achievement.criteria_value else 100)
                })
            
            if not achievements_list:
                achievements_list = [
                    {
                        'id': 1,
                        'name': 'Fast Learner',
                        'description': 'Complete 10 lessons in one week',
                        'icon': '🚀',
                        'progress': 80,
                        'completed': False
                    },
                    {
                        'id': 2,
                        'name': 'Math Whiz',
                        'description': 'Score 100% on 5 math quizzes',
                        'icon': '⭐',
                        'progress': 60,
                        'completed': False
                    },
                    {
                        'id': 3, 
                        'name': 'Consistent Learner',
                        'description': 'Maintain a 7-day study streak',
                        'icon': '🔥',
                        'progress': 100,
                        'completed': True
                    }
                ]
            
            return jsonify({'achievements': achievements_list}), 200
        except Exception as e:
            print(f"❌ Error in /api/dashboard/achievements: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/dashboard/complete-activity', methods=['POST'])
    @jwt_required()
    def complete_activity():
        """Mark an activity as completed"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
                
            data = request.get_json()
            activity_id = data.get('activity_id')
            
            print(f"✅ Activity {activity_id} marked as completed for user {user_id}")
            
            # Update user progress
            progress = user.progress
            if progress:
                progress.lessons_completed += 1
                progress.total_points += 10
                progress.last_activity_date = datetime.utcnow()
                db.session.commit()
            
            return jsonify({
                'message': 'Activity completed successfully',
                'activity_id': activity_id,
                'points_earned': 10
            }), 200
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error in /api/dashboard/complete-activity: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    # ========== PROFILE ENDPOINTS ==========
    @app.route('/api/profile', methods=['GET'])
    @jwt_required()
    def get_profile():
        """Get user profile with enhanced data"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # Get preferences from bio field (temporary solution)
            preferences = {}
            if user.profile and user.profile.bio:
                try:
                    bio_data = json.loads(user.profile.bio)
                    preferences = bio_data.get('preferences', {})
                except:
                    preferences = {}
            
            profile_data = {
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'created_at': user.created_at.isoformat() if user.created_at else None,
                    'preferences': preferences
                },
                'profile': {
                    'grade_level': user.profile.grade_level if user.profile else None,
                    'school': user.profile.school if user.profile else None,
                    'preferred_language': user.profile.preferred_language if user.profile else 'English',
                    'subjects': user.profile.subjects.split(',') if user.profile and user.profile.subjects else [],
                    'avatar_url': user.profile.avatar_url if user.profile else None,
                    'bio': user.profile.bio if user.profile and not user.profile.bio.startswith('{') else 'Tell us about yourself...',
                    'guardian_name': user.profile.guardian_name if user.profile else None,
                    'guardian_email': user.profile.guardian_email if user.profile else None,
                    'guardian_phone': user.profile.guardian_phone if user.profile else None
                },
                'progress': {
                    'total_points': user.progress.total_points if user.progress else 0,
                    'current_streak': user.progress.current_streak if user.progress else 0,
                    'longest_streak': user.progress.longest_streak if user.progress else 0,
                    'lessons_completed': user.progress.lessons_completed if user.progress else 0,
                    'games_completed': user.progress.games_completed if user.progress else 0,
                    'quizzes_completed': user.progress.quizzes_completed if user.progress else 0,
                    'level': user.progress.level if user.progress else 1,
                    'experience': user.progress.experience if user.progress else 0
                }
            }
            
            return jsonify(profile_data), 200
        except Exception as e:
            print(f"❌ Error in /api/profile: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/profile', methods=['PUT'])
    @jwt_required()
    def update_profile():
        """Update user profile with enhanced fields"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            data = request.get_json()
            
            # Update user basic info
            if 'first_name' in data:
                user.first_name = data['first_name']
            if 'last_name' in data:
                user.last_name = data['last_name']
            if 'email' in data:
                user.email = data['email']
            
            # Update or create profile
            if not user.profile:
                user.profile = UserProfile(user_id=user_id)
            
            profile = user.profile
            
            # Update profile fields
            profile_fields = [
                'grade_level', 'school', 'preferred_language', 
                'avatar_url', 'bio', 'guardian_name', 'guardian_email', 'guardian_phone'
            ]
            
            for field in profile_fields:
                if field in data:
                    setattr(profile, field, data[field])
            
            # Handle subjects array
            if 'subjects' in data:
                if isinstance(data['subjects'], list):
                    profile.subjects = ','.join(data['subjects'])
                else:
                    profile.subjects = data['subjects']
            
            # Handle social links
            if 'social_links' in data:
                # Store social links in bio field (temporary solution)
                current_bio = {}
                if profile.bio and profile.bio.startswith('{'):
                    try:
                        current_bio = json.loads(profile.bio)
                    except:
                        current_bio = {}
                
                current_bio['social_links'] = data['social_links']
                profile.bio = json.dumps(current_bio)
            
            db.session.commit()
            
            return jsonify({'message': 'Profile updated successfully'}), 200
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error in /api/profile PUT: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/profile/avatar', methods=['POST'])
    @jwt_required()
    def upload_avatar():
        """Upload user avatar"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            # Check if file was uploaded
            if 'avatar' not in request.files:
                return jsonify({'error': 'No file provided'}), 400
            
            file = request.files['avatar']
            if file.filename == '':
                return jsonify({'error': 'No file selected'}), 400
            
            # For now, return a placeholder URL since file upload requires more setup
            # In production, you'd upload to cloud storage (AWS S3, Cloudinary, etc.)
            avatar_url = f"https://ui-avatars.com/api/?name={user.first_name}+{user.last_name}&background=6a11cb&color=fff&size=150"
            
            # Update user profile with avatar URL
            if not user.profile:
                user.profile = UserProfile(user_id=user_id)
            
            user.profile.avatar_url = avatar_url
            db.session.commit()
            
            return jsonify({
                'message': 'Avatar updated successfully',
                'avatar_url': avatar_url
            }), 200
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error in /api/profile/avatar: {str(e)}")
            return jsonify({'error': 'Failed to upload avatar'}), 500

    @app.route('/api/profile/preferences', methods=['PUT'])
    @jwt_required()
    def update_preferences():
        """Update user preferences"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            data = request.get_json()
            preferences = data.get('preferences', {})
            
            # Store preferences in user profile (you might want to add a preferences column)
            # For now, we'll store it as JSON in the profile table
            if not user.profile:
                user.profile = UserProfile(user_id=user_id)
            
            # Convert preferences to JSON string and store in bio field temporarily
            # In production, add a dedicated preferences column
            user.profile.bio = json.dumps({'preferences': preferences})
            db.session.commit()
            
            return jsonify({'message': 'Preferences updated successfully'}), 200
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error in /api/profile/preferences: {str(e)}")
            return jsonify({'error': 'Failed to update preferences'}), 500

    # ========== LESSONS ENDPOINTS ==========
    @app.route('/api/lessons', methods=['GET'])
    @jwt_required()
    def get_lessons():
        """Get all lessons"""
        try:
            lessons = Lesson.query.filter_by(is_active=True).all()
            
            lessons_list = []
            for lesson in lessons:
                lessons_list.append({
                    'id': lesson.id,
                    'title': lesson.title,
                    'description': lesson.description,
                    'subject': lesson.subject,
                    'grade_level': lesson.grade_level,
                    'difficulty': lesson.difficulty,
                    'duration': lesson.duration,
                    'thumbnail_url': lesson.thumbnail_url,
                    'content_url': lesson.content_url,
                    'completed': False
                })
            
            return jsonify({'lessons': lessons_list}), 200
        except Exception as e:
            print(f"❌ Error in /api/lessons: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/lessons/<int:lesson_id>', methods=['GET'])
    @jwt_required()
    def get_lesson(lesson_id):
        """Get specific lesson"""
        try:
            lesson = Lesson.query.get(lesson_id)
            
            if not lesson:
                return jsonify({'error': 'Lesson not found'}), 404
            
            lesson_data = {
                'id': lesson.id,
                'title': lesson.title,
                'description': lesson.description,
                'subject': lesson.subject,
                'grade_level': lesson.grade_level,
                'difficulty': lesson.difficulty,
                'duration': lesson.duration,
                'content_url': lesson.content_url,
                'thumbnail_url': lesson.thumbnail_url
            }
            
            return jsonify(lesson_data), 200
        except Exception as e:
            print(f"❌ Error in /api/lessons/{lesson_id}: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/lessons/<int:lesson_id>/complete', methods=['POST'])
    @jwt_required()
    def complete_lesson(lesson_id):
        """Mark a lesson as completed"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            lesson = Lesson.query.get(lesson_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            if not lesson:
                return jsonify({'error': 'Lesson not found'}), 404
            
            # Update user progress
            progress = user.progress
            if not progress:
                progress = UserProgress(user_id=user_id)
                db.session.add(progress)
            
            progress.lessons_completed += 1
            progress.total_points += 50
            progress.last_activity_date = datetime.utcnow()
            
            db.session.commit()
            
            return jsonify({
                'message': 'Lesson completed successfully',
                'points_earned': 50,
                'lesson_id': lesson_id
            }), 200
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error in /api/lessons/{lesson_id}/complete: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    # ========== GAMES ENDPOINTS ==========
    @app.route('/api/games', methods=['GET'])
    @jwt_required()
    def get_games():
        """Get all games"""
        try:
            games = Game.query.filter_by(is_active=True).all()
            
            games_list = []
            for game in games:
                games_list.append({
                    'id': game.id,
                    'title': game.title,
                    'description': game.description,
                    'category': game.category,
                    'difficulty': game.difficulty,
                    'max_players': game.max_players,
                    'game_url': game.game_url,
                    'thumbnail_url': game.thumbnail_url
                })
            
            return jsonify({'games': games_list}), 200
        except Exception as e:
            print(f"❌ Error in /api/games: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/games/<int:game_id>', methods=['GET'])
    @jwt_required()
    def get_game(game_id):
        """Get specific game"""
        try:
            game = Game.query.get(game_id)
            
            if not game:
                return jsonify({'error': 'Game not found'}), 404
            
            game_data = {
                'id': game.id,
                'title': game.title,
                'description': game.description,
                'category': game.category,
                'difficulty': game.difficulty,
                'max_players': game.max_players,
                'game_url': game.game_url,
                'thumbnail_url': game.thumbnail_url
            }
            
            return jsonify(game_data), 200
        except Exception as e:
            print(f"❌ Error in /api/games/{game_id}: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/games/<int:game_id>/start', methods=['POST'])
    @jwt_required()
    def start_game(game_id):
        """Start a game session"""
        try:
            user_id = get_jwt_identity()
            game = Game.query.get(game_id)
            
            if not game:
                return jsonify({'error': 'Game not found'}), 404
            
            # Create game session
            game_session = GameSession(
                user_id=user_id,
                game_id=game_id,
                played_at=datetime.utcnow()
            )
            
            db.session.add(game_session)
            db.session.commit()
            
            return jsonify({
                'message': 'Game session started',
                'session_id': game_session.id,
                'game': {
                    'id': game.id,
                    'title': game.title,
                    'game_url': game.game_url
                }
            }), 200
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error in /api/games/{game_id}/start: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/games/session/<int:session_id>/complete', methods=['POST'])
    @jwt_required()
    def complete_game(session_id):
        """Complete a game session"""
        try:
            user_id = get_jwt_identity()
            game_session = GameSession.query.get(session_id)
            
            if not game_session or game_session.user_id != user_id:
                return jsonify({'error': 'Game session not found'}), 404
            
            data = request.get_json()
            game_session.score = data.get('score', 0)
            game_session.duration = data.get('duration', 0)
            game_session.completed = True
            
            # Update user progress
            user_progress = UserProgress.query.filter_by(user_id=user_id).first()
            if not user_progress:
                user_progress = UserProgress(user_id=user_id)
                db.session.add(user_progress)
            
            user_progress.games_completed += 1
            user_progress.total_points += game_session.score
            user_progress.last_activity_date = datetime.utcnow()
            
            db.session.commit()
            
            return jsonify({
                'message': 'Game completed successfully',
                'score': game_session.score,
                'points_earned': game_session.score
            }), 200
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error in /api/games/session/{session_id}/complete: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/games/questions', methods=['POST'])
    @jwt_required()
    def get_game_questions():
        """Get questions for a game"""
        try:
            user_id = get_jwt_identity()
            data = request.get_json()
            
            game_id = data.get('game_id')
            game_type = data.get('game_type', 'math')
            
            # Sample questions based on game type
            if game_type == 'math':
                questions = [
                    {
                        'id': 1,
                        'question': 'What is 15 + 27?',
                        'options': ['32', '42', '52', '62'],
                        'correct_answer': 1,  # index of correct option (42)
                        'explanation': '15 + 27 = 42'
                    },
                    {
                        'id': 2,
                        'question': 'What is 8 × 7?',
                        'options': ['48', '56', '64', '72'],
                        'correct_answer': 1,  # 56
                        'explanation': '8 × 7 = 56'
                    },
                    {
                        'id': 3,
                        'question': 'What is 144 ÷ 12?',
                        'options': ['10', '11', '12', '13'],
                        'correct_answer': 2,  # 12
                        'explanation': '144 ÷ 12 = 12'
                    }
                ]
            elif game_type == 'science':
                questions = [
                    {
                        'id': 1,
                        'question': 'What planet is known as the Red Planet?',
                        'options': ['Venus', 'Mars', 'Jupiter', 'Saturn'],
                        'correct_answer': 1,  # Mars
                        'explanation': 'Mars is called the Red Planet due to its reddish appearance.'
                    },
                    {
                        'id': 2,
                        'question': 'What is H2O commonly known as?',
                        'options': ['Oxygen', 'Hydrogen', 'Water', 'Carbon Dioxide'],
                        'correct_answer': 2,  # Water
                        'explanation': 'H2O is the chemical formula for water.'
                    }
                ]
            else:
                questions = [
                    {
                        'id': 1,
                        'question': 'What is the capital of France?',
                        'options': ['London', 'Berlin', 'Paris', 'Madrid'],
                        'correct_answer': 2,  # Paris
                        'explanation': 'Paris is the capital city of France.'
                    }
                ]
            
            return jsonify({
                'questions': questions,
                'total_questions': len(questions),
                'game_id': game_id
            }), 200
        except Exception as e:
            print(f"❌ Error in /api/games/questions: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    # ========== QUIZ ENDPOINTS ==========
    @app.route('/api/quizzes', methods=['GET'])
    @jwt_required()
    def get_quizzes():
        """Get all quizzes"""
        try:
            quizzes = Quiz.query.filter_by(is_active=True).all()
            
            quizzes_list = []
            for quiz in quizzes:
                quizzes_list.append({
                    'id': quiz.id,
                    'title': quiz.title,
                    'description': quiz.description,
                    'subject': quiz.subject,
                    'difficulty': quiz.difficulty,
                    'time_limit': quiz.time_limit,
                    'total_questions': quiz.total_questions
                })
            
            return jsonify({'quizzes': quizzes_list}), 200
        except Exception as e:
            print(f"❌ Error in /api/quizzes: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/quizzes/<int:quiz_id>', methods=['GET'])
    @jwt_required()
    def get_quiz(quiz_id):
        """Get specific quiz"""
        try:
            quiz = Quiz.query.get(quiz_id)
            
            if not quiz:
                return jsonify({'error': 'Quiz not found'}), 404
            
            quiz_data = {
                'id': quiz.id,
                'title': quiz.title,
                'description': quiz.description,
                'subject': quiz.subject,
                'difficulty': quiz.difficulty,
                'time_limit': quiz.time_limit,
                'total_questions': quiz.total_questions
            }
            
            return jsonify(quiz_data), 200
        except Exception as e:
            print(f"❌ Error in /api/quizzes/{quiz_id}: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/quizzes/<int:quiz_id>/start', methods=['POST'])
    @jwt_required()
    def start_quiz(quiz_id):
        """Start a quiz"""
        try:
            user_id = get_jwt_identity()
            quiz = Quiz.query.get(quiz_id)
            
            if not quiz:
                return jsonify({'error': 'Quiz not found'}), 404
            
            # Create quiz attempt
            quiz_attempt = QuizAttempt(
                user_id=user_id,
                quiz_id=quiz_id,
                total_questions=quiz.total_questions,
                attempted_at=datetime.utcnow()
            )
            
            db.session.add(quiz_attempt)
            db.session.commit()
            
            return jsonify({
                'message': 'Quiz started',
                'attempt_id': quiz_attempt.id,
                'quiz': {
                    'id': quiz.id,
                    'title': quiz.title,
                    'time_limit': quiz.time_limit,
                    'total_questions': quiz.total_questions
                }
            }), 200
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error in /api/quizzes/{quiz_id}/start: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/quizzes/attempt/<int:attempt_id>/submit', methods=['POST'])
    @jwt_required()
    def submit_quiz(attempt_id):
        """Submit quiz answers"""
        try:
            user_id = get_jwt_identity()
            quiz_attempt = QuizAttempt.query.get(attempt_id)
            
            if not quiz_attempt or quiz_attempt.user_id != user_id:
                return jsonify({'error': 'Quiz attempt not found'}), 404
            
            data = request.get_json()
            correct_answers = data.get('correct_answers', 0)
            total_questions = data.get('total_questions', quiz_attempt.total_questions)
            
            quiz_attempt.correct_answers = correct_answers
            quiz_attempt.score = int((correct_answers / total_questions) * 100) if total_questions > 0 else 0
            quiz_attempt.completed = True
            
            # Update user progress
            user_progress = UserProgress.query.filter_by(user_id=user_id).first()
            if not user_progress:
                user_progress = UserProgress(user_id=user_id)
                db.session.add(user_progress)
            
            user_progress.quizzes_completed += 1
            user_progress.total_points += quiz_attempt.score
            user_progress.last_activity_date = datetime.utcnow()
            
            db.session.commit()
            
            return jsonify({
                'message': 'Quiz submitted successfully',
                'score': quiz_attempt.score,
                'correct_answers': correct_answers,
                'total_questions': total_questions,
                'points_earned': quiz_attempt.score
            }), 200
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error in /api/quizzes/attempt/{attempt_id}/submit: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    # ========== CHALLENGES ENDPOINTS ==========
    @app.route('/api/challenges', methods=['GET'])
    @jwt_required()
    def get_challenges():
        """Get all challenges"""
        try:
            user_id = get_jwt_identity()
            challenges = Challenge.query.filter_by(is_active=True).all()
            
            challenges_list = []
            for challenge in challenges:
                participants = UserChallenge.query.filter_by(challenge_id=challenge.id).count()
                user_joined = UserChallenge.query.filter_by(
                    challenge_id=challenge.id, 
                    user_id=user_id
                ).first() is not None
                
                challenges_list.append({
                    'id': challenge.id,
                    'title': challenge.title,
                    'description': challenge.description,
                    'type': challenge.challenge_type,
                    'points_reward': challenge.points_reward,
                    'start_date': challenge.start_date.isoformat() if challenge.start_date else None,
                    'end_date': challenge.end_date.isoformat() if challenge.end_date else None,
                    'participants': participants,
                    'joined': user_joined,
                    'completed': UserChallenge.query.filter_by(
                        challenge_id=challenge.id, 
                        user_id=user_id,
                        completed=True
                    ).first() is not None
                })
            
            return jsonify({'challenges': challenges_list}), 200
        except Exception as e:
            print(f"❌ Error in /api/challenges: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/challenges/<int:challenge_id>', methods=['GET'])
    @jwt_required()
    def get_challenge(challenge_id):
        """Get specific challenge"""
        try:
            user_id = get_jwt_identity()
            challenge = Challenge.query.get(challenge_id)
            
            if not challenge:
                return jsonify({'error': 'Challenge not found'}), 404
            
            user_challenge = UserChallenge.query.filter_by(
                challenge_id=challenge_id, 
                user_id=user_id
            ).first()
            
            challenge_data = {
                'id': challenge.id,
                'title': challenge.title,
                'description': challenge.description,
                'type': challenge.challenge_type,
                'points_reward': challenge.points_reward,
                'start_date': challenge.start_date.isoformat() if challenge.start_date else None,
                'end_date': challenge.end_date.isoformat() if challenge.end_date else None,
                'joined': user_challenge is not None,
                'completed': user_challenge.completed if user_challenge else False,
                'participants': UserChallenge.query.filter_by(challenge_id=challenge_id).count()
            }
            
            return jsonify(challenge_data), 200
        except Exception as e:
            print(f"❌ Error in /api/challenges/{challenge_id}: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/challenges/<int:challenge_id>/join', methods=['POST'])
    @jwt_required()
    def join_challenge(challenge_id):
        """Join a challenge"""
        try:
            user_id = get_jwt_identity()
            challenge = Challenge.query.get(challenge_id)
            
            if not challenge:
                return jsonify({'error': 'Challenge not found'}), 404
            
            # Check if already joined
            existing_join = UserChallenge.query.filter_by(
                user_id=user_id, 
                challenge_id=challenge_id
            ).first()
            
            if existing_join:
                return jsonify({'message': 'Already joined this challenge'}), 200
            
            # Join challenge
            user_challenge = UserChallenge(
                user_id=user_id,
                challenge_id=challenge_id,
                joined_at=datetime.utcnow()
            )
            
            db.session.add(user_challenge)
            db.session.commit()
            
            return jsonify({'message': 'Successfully joined the challenge'}), 200
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error in /api/challenges/{challenge_id}/join: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/challenges/<int:challenge_id>/complete', methods=['POST'])
    @jwt_required()
    def complete_challenge(challenge_id):
        """Complete a challenge"""
        try:
            user_id = get_jwt_identity()
            user_challenge = UserChallenge.query.filter_by(
                user_id=user_id, 
                challenge_id=challenge_id
            ).first()
            
            if not user_challenge:
                return jsonify({'error': 'Challenge not found or not joined'}), 404
            
            challenge = Challenge.query.get(challenge_id)
            if not challenge:
                return jsonify({'error': 'Challenge not found'}), 404
            
            user_challenge.completed = True
            user_challenge.completed_at = datetime.utcnow()
            
            # Award points
            user_progress = UserProgress.query.filter_by(user_id=user_id).first()
            if user_progress:
                user_progress.total_points += challenge.points_reward
            
            db.session.commit()
            
            return jsonify({
                'message': 'Challenge completed successfully',
                'points_earned': challenge.points_reward
            }), 200
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error in /api/challenges/{challenge_id}/complete: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    # ========== PROGRESS ENDPOINTS ==========
    @app.route('/api/progress/user-progress', methods=['GET'])
    @jwt_required()
    def get_user_progress():
        """Get user progress data"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            progress = user.progress
            if not progress:
                progress = UserProgress(user_id=user_id)
                db.session.add(progress)
                db.session.commit()
            
            # Calculate weekly progress (example)
            weekly_goal = 10
            weekly_completed = min(progress.lessons_completed % weekly_goal, weekly_goal)
            weekly_progress = int((weekly_completed / weekly_goal) * 100) if weekly_goal > 0 else 0
            
            progress_data = {
                'total_lessons_completed': progress.lessons_completed,
                'total_games_completed': progress.games_completed,
                'total_quizzes_completed': progress.quizzes_completed,
                'total_points': progress.total_points,
                'current_streak': progress.current_streak,
                'longest_streak': progress.longest_streak,
                'level': progress.level,
                'experience': progress.experience,
                'weekly_goal_progress': weekly_progress,
                'recent_achievements': [
                    achievement.achievement.name for achievement in user.user_achievements 
                    if achievement.earned_at >= datetime.utcnow() - timedelta(days=7)
                ][:3]  # Last 7 days, max 3
            }
            
            return jsonify(progress_data), 200
        except Exception as e:
            print(f"❌ Error in /api/progress/user-progress: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/progress/game-started', methods=['POST'])
    @jwt_required()
    def game_started():
        """Track when a game starts"""
        try:
            user_id = get_jwt_identity()
            data = request.get_json()
            
            game_id = data.get('game_id')
            game_title = data.get('game_title', 'Unknown Game')
            game_type = data.get('game_type', 'educational')
            
            print(f"🎮 Game started: {game_title} (ID: {game_id}) by user {user_id}")
            
            # Create a game session record
            game_session = GameSession(
                user_id=user_id,
                game_id=game_id or 1,  # Use default if not provided
                played_at=datetime.utcnow(),
                completed=False
            )
            
            db.session.add(game_session)
            db.session.commit()
            
            return jsonify({
                'message': 'Game start tracked successfully',
                'game_id': game_id,
                'game_title': game_title,
                'session_id': game_session.id,
                'timestamp': datetime.utcnow().isoformat()
            }), 200
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error in /api/progress/game-started: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/study-stats', methods=['GET'])
    @jwt_required()
    def get_study_stats():
        """Get detailed study statistics for user"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            progress = user.progress or UserProgress(user_id=user_id)
            
            # Calculate study stats based on user progress
            study_stats = {
                'total_study_time': progress.lessons_completed * 30,  # Estimate 30 mins per lesson
                'completed_lessons': progress.lessons_completed,
                'games_played': progress.games_completed,
                'quizzes_completed': progress.quizzes_completed,
                'current_streak': progress.current_streak,
                'total_points': progress.total_points,
                'level': progress.level
            }
            
            return jsonify(study_stats), 200
            
        except Exception as e:
            print(f"❌ Error in /api/study-stats: {str(e)}")
            return jsonify({'error': 'Failed to get study stats'}), 500

    # ========== HOME & WELCOME ENDPOINTS ==========
    @app.route('/api/home', methods=['GET'])
    @jwt_required()
    def get_home_data():
        """Get home screen data"""
        try:
            user_id = get_jwt_identity()
            user = User.query.get(user_id)
            
            if not user:
                return jsonify({'error': 'User not found'}), 404
            
            progress = user.progress or UserProgress(user_id=user_id)
            
            home_data = {
                'welcome_message': f"Welcome back, {user.first_name}!",
                'quick_stats': {
                    'current_streak': progress.current_streak,
                    'total_points': progress.total_points,
                    'level': progress.level
                },
                'featured_lessons': [
                    {
                        'id': 1,
                        'title': 'Mathematics Fundamentals',
                        'subject': 'Math',
                        'duration': 30,
                        'difficulty': 'Beginner'
                    },
                    {
                        'id': 2,
                        'title': 'Science Explorer',
                        'subject': 'Science', 
                        'duration': 45,
                        'difficulty': 'Intermediate'
                    }
                ],
                'daily_challenge': {
                    'title': 'Daily Math Quiz',
                    'description': 'Complete 10 math questions',
                    'points': 100,
                    'completed': False
                }
            }
            
            return jsonify(home_data), 200
        except Exception as e:
            print(f"❌ Error in /api/home: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    @app.route('/api/welcome', methods=['GET'])
    def get_welcome_data():
        """Get welcome screen data"""
        try:
            welcome_data = {
                'app_name': 'EduPlay',
                'tagline': 'Learn, Play, Grow',
                'features': [
                    {
                        'title': 'Interactive Lessons',
                        'description': 'Engaging educational content',
                        'icon': '📚'
                    },
                    {
                        'title': 'Fun Games',
                        'description': 'Learn through play',
                        'icon': '🎮'
                    },
                    {
                        'title': 'Track Progress',
                        'description': 'Monitor your learning journey',
                        'icon': '📊'
                    }
                ],
                'version': '1.0.0'
            }
            
            return jsonify(welcome_data), 200
        except Exception as e:
            print(f"❌ Error in /api/welcome: {str(e)}")
            return jsonify({'error': 'Internal server error'}), 500

    # ========== HEALTH & UTILITY ENDPOINTS ==========
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy', 
            'message': 'EduPlay Backend Server is running',
            'version': '1.0.0',
            'timestamp': datetime.utcnow().isoformat()
        })

    @app.route('/api/test')
    def test_api():
        return jsonify({
            'message': 'EduPlay API is working!',
            'timestamp': datetime.utcnow().isoformat()
        })
    
    @app.route('/')
    def root():
        return jsonify({
            'message': 'EduPlay Backend API',
            'version': '1.0.0',
            'endpoints': {
                'ai': {
                    'generate_content': 'POST /api/ai/generate-content',
                    'analyze_solution': 'POST /api/ai/analyze-solution',
                    'generate_hint': 'POST /api/ai/generate-hint'
                },
                'auth': {
                    'signup': 'POST /api/auth/signup',
                    'signin': 'POST /api/auth/signin',
                    'me': 'GET /api/auth/me',
                    'forgot_password': 'POST /api/auth/forgot-password',
                    'logout': 'POST /api/auth/logout'
                },
                'dashboard': {
                    'stats': 'GET /api/dashboard/stats',
                    'recent_activity': 'GET /api/dashboard/recent-activity',
                    'upcoming_challenges': 'GET /api/dashboard/upcoming-challenges',
                    'achievements': 'GET /api/dashboard/achievements',
                    'complete_activity': 'POST /api/dashboard/complete-activity'
                },
                'profile': {
                    'get_profile': 'GET /api/profile',
                    'update_profile': 'PUT /api/profile',
                    'upload_avatar': 'POST /api/profile/avatar',
                    'update_preferences': 'PUT /api/profile/preferences'
                },
                'content': {
                    'lessons': 'GET /api/lessons',
                    'lesson_detail': 'GET /api/lessons/<id>',
                    'complete_lesson': 'POST /api/lessons/<id>/complete',
                    'games': 'GET /api/games',
                    'game_detail': 'GET /api/games/<id>',
                    'start_game': 'POST /api/games/<id>/start',
                    'complete_game': 'POST /api/games/session/<id>/complete',
                    'game_questions': 'POST /api/games/questions',
                    'quizzes': 'GET /api/quizzes',
                    'quiz_detail': 'GET /api/quizzes/<id>',
                    'start_quiz': 'POST /api/quizzes/<id>/start',
                    'submit_quiz': 'POST /api/quizzes/attempt/<id>/submit',
                    'challenges': 'GET /api/challenges',
                    'challenge_detail': 'GET /api/challenges/<id>',
                    'join_challenge': 'POST /api/challenges/<id>/join',
                    'complete_challenge': 'POST /api/challenges/<id>/complete'
                },
                'progress': {
                    'user_progress': 'GET /api/progress/user-progress',
                    'game_started': 'POST /api/progress/game-started',
                    'study_stats': 'GET /api/study-stats'
                },
                'user': {
                    'home': 'GET /api/home'
                },
                'general': {
                    'welcome': 'GET /api/welcome',
                    'health': 'GET /api/health',
                    'test': 'GET /api/test'
                }
            }
        })
    
    # Create database tables and sample data
    with app.app_context():
        db.create_all()
        print("✅ Database tables created successfully!")
        
        # Create sample data if tables are empty
        if Lesson.query.count() == 0:
            sample_lessons = [
                Lesson(
                    title='Mathematics Basics',
                    description='Learn fundamental mathematics concepts including addition, subtraction, multiplication and division.',
                    subject='Mathematics',
                    grade_level='Elementary',
                    difficulty='beginner',
                    duration=30,
                    thumbnail_url='https://example.com/math-basics.jpg',
                    content_url='https://example.com/lessons/math-basics'
                ),
                Lesson(
                    title='Introduction to Science',
                    description='Explore the wonders of science through fun experiments and interactive lessons.',
                    subject='Science',
                    grade_level='Elementary',
                    difficulty='beginner', 
                    duration=45,
                    thumbnail_url='https://example.com/science-intro.jpg',
                    content_url='https://example.com/lessons/science-intro'
                ),
                Lesson(
                    title='English Grammar Fundamentals',
                    description='Master the basics of English grammar including nouns, verbs, adjectives and sentence structure.',
                    subject='English',
                    grade_level='Elementary',
                    difficulty='beginner',
                    duration=40,
                    thumbnail_url='https://example.com/english-grammar.jpg',
                    content_url='https://example.com/lessons/english-grammar'
                )
            ]
            db.session.add_all(sample_lessons)
        
        if Game.query.count() == 0:
            sample_games = [
                Game(
                    title='Math Puzzle Adventure',
                    description='Solve math puzzles to advance through exciting levels and unlock new challenges.',
                    category='Mathematics',
                    difficulty='easy',
                    max_players=1,
                    game_url='https://example.com/games/math-puzzle',
                    thumbnail_url='https://example.com/math-puzzle.jpg'
                ),
                Game(
                    title='Science Explorer',
                    description='Discover scientific concepts through interactive exploration and experiments.',
                    category='Science',
                    difficulty='medium',
                    max_players=1,
                    game_url='https://example.com/games/science-explorer',
                    thumbnail_url='https://example.com/science-explorer.jpg'
                ),
                Game(
                    title='Word Builder Challenge',
                    description='Build words and expand your vocabulary in this engaging language game.',
                    category='English',
                    difficulty='easy',
                    max_players=2,
                    game_url='https://example.com/games/word-builder',
                    thumbnail_url='https://example.com/word-builder.jpg'
                )
            ]
            db.session.add_all(sample_games)
        
        if Quiz.query.count() == 0:
            sample_quizzes = [
                Quiz(
                    title='Basic Math Quiz',
                    description='Test your fundamental math skills with this beginner-level quiz.',
                    subject='Mathematics',
                    difficulty='easy',
                    time_limit=15,
                    total_questions=10
                ),
                Quiz(
                    title='Science Knowledge Test',
                    description='Challenge your science knowledge with questions from various topics.',
                    subject='Science',
                    difficulty='medium',
                    time_limit=20,
                    total_questions=15
                ),
                Quiz(
                    title='Grammar Master',
                    description='Prove your English grammar expertise with this comprehensive quiz.',
                    subject='English',
                    difficulty='medium',
                    time_limit=25,
                    total_questions=12
                )
            ]
            db.session.add_all(sample_quizzes)
        
        if Challenge.query.count() == 0:
            sample_challenges = [
                Challenge(
                    title='Weekly Math Marathon',
                    description='Complete 5 math lessons and 3 math games this week',
                    challenge_type='mixed',
                    points_reward=200,
                    start_date=datetime.utcnow(),
                    end_date=datetime.utcnow() + timedelta(days=7)
                ),
                Challenge(
                    title='Science Explorer Quest',
                    description='Finish all science-related content available this month',
                    challenge_type='lesson',
                    points_reward=150,
                    start_date=datetime.utcnow(),
                    end_date=datetime.utcnow() + timedelta(days=30)
                ),
                Challenge(
                    title='Daily Quiz Champion',
                    description='Achieve 90% or higher on any quiz today',
                    challenge_type='quiz',
                    points_reward=100,
                    start_date=datetime.utcnow(),
                    end_date=datetime.utcnow() + timedelta(days=1)
                )
            ]
            db.session.add_all(sample_challenges)
        
        if Achievement.query.count() == 0:
            sample_achievements = [
                Achievement(
                    name='Fast Learner',
                    description='Complete 10 lessons in one week',
                    icon='🚀',
                    criteria_type='lessons',
                    criteria_value=10,
                    points_reward=50
                ),
                Achievement(
                    name='Math Whiz',
                    description='Score 100% on 5 math quizzes',
                    icon='⭐',
                    criteria_type='quizzes',
                    criteria_value=5,
                    points_reward=75
                ),
                Achievement(
                    name='Game Master',
                    description='Win 10 educational games',
                    icon='🎮',
                    criteria_type='games',
                    criteria_value=10,
                    points_reward=60
                ),
                Achievement(
                    name='Consistent Learner',
                    description='Maintain a 7-day study streak',
                    icon='🔥',
                    criteria_type='streak',
                    criteria_value=7,
                    points_reward=100
                )
            ]
            db.session.add_all(sample_achievements)
        
        db.session.commit()
        print("✅ Sample data created successfully!")
    
    return app

# Create the app instance
app = create_app()

if __name__ == '__main__':
    print("🚀 Starting EduPlayApp Backend with AI Integration...")
    print("📍 Server will be available at: http://127.0.0.1:5000")
    print("🌐 Network access: http://YOUR_LOCAL_IP:5000")
    print("")
    print("🤖 AI Endpoints:")
    print("   POST /api/ai/generate-content  - Generate lessons, quizzes, games")
    print("   POST /api/ai/analyze-solution  - Analyze student solutions") 
    print("   POST /api/ai/generate-hint     - Generate hints for challenges")
    print("")
    print("📊 Available Endpoints:")
    print("   AUTH ENDPOINTS:")
    print("   POST /api/auth/signup          - User registration")
    print("   POST /api/auth/signin          - User login") 
    print("   GET  /api/auth/me              - Get current user")
    print("   POST /api/auth/forgot-password - Forgot password")
    print("   POST /api/auth/logout          - Logout user")
    print("")
    print("   DASHBOARD ENDPOINTS:")
    print("   GET  /api/dashboard/stats      - Dashboard statistics")
    print("   GET  /api/dashboard/recent-activity - Recent activities")
    print("   GET  /api/dashboard/upcoming-challenges - Upcoming challenges")
    print("   GET  /api/dashboard/achievements - User achievements")
    print("   POST /api/dashboard/complete-activity - Complete activity")
    print("")
    print("   PROFILE ENDPOINTS:")
    print("   GET  /api/profile              - Get user profile")
    print("   PUT  /api/profile              - Update user profile")
    print("   POST /api/profile/avatar       - Upload avatar")
    print("   PUT  /api/profile/preferences  - Update preferences")
    print("")
    print("   CONTENT ENDPOINTS:")
    print("   GET  /api/lessons              - Get all lessons")
    print("   GET  /api/lessons/<id>         - Get specific lesson")
    print("   POST /api/lessons/<id>/complete - Complete lesson")
    print("   GET  /api/games                - Get all games")
    print("   GET  /api/games/<id>           - Get specific game")
    print("   POST /api/games/<id>/start     - Start game session")
    print("   POST /api/games/session/<id>/complete - Complete game")
    print("   POST /api/games/questions      - Get game questions")
    print("   GET  /api/quizzes              - Get all quizzes")
    print("   GET  /api/quizzes/<id>         - Get specific quiz")
    print("   POST /api/quizzes/<id>/start   - Start quiz")
    print("   POST /api/quizzes/attempt/<id>/submit - Submit quiz")
    print("   GET  /api/challenges           - Get all challenges")
    print("   GET  /api/challenges/<id>      - Get specific challenge")
    print("   POST /api/challenges/<id>/join - Join challenge")
    print("   POST /api/challenges/<id>/complete - Complete challenge")
    print("")
    print("   PROGRESS ENDPOINTS:")
    print("   GET  /api/progress/user-progress - User progress")
    print("   POST /api/progress/game-started - Track game start")
    print("   GET  /api/study-stats          - Study statistics")
    print("   GET  /api/home                 - Home screen data")
    print("   GET  /api/welcome              - Welcome screen data")
    print("")
    print("   GENERAL ENDPOINTS:")
    print("   GET  /api/health               - Health check")
    print("   GET  /api/test                 - Test endpoint")
    print("   GET  /                         - API info")
    print("")
    print("🔧 Debug mode: ON")
    print("⚡ Ready to accept connections...")
    print("")
    print("💡 Tip: Make sure your React Native app is using the correct API_BASE_URL")
    print("       API_BASE_URL should be: http://YOUR_LOCAL_IP:5000")
    
    app.run(host='0.0.0.0', port=5000, debug=True)