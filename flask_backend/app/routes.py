# app/routes.py
from flask import Blueprint, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import openai
from datetime import datetime

# Configure OpenAI
openai.api_key = os.getenv('OPENAI_API_KEY')

# Create blueprints
auth_bp = Blueprint('auth', __name__)
dashboard_bp = Blueprint('dashboard', __name__)
games_bp = Blueprint('games', __name__)
api_bp = Blueprint('api', __name__)

# Helper function to generate AI content
def generate_ai_content(prompt, max_tokens=500):
    try:
        if not openai.api_key:
            raise Exception("OpenAI API key not configured")
            
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": "You are an educational game assistant that creates engaging, age-appropriate learning content for students."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=max_tokens,
            temperature=0.7
        )
        return response.choices[0].message.content.strip()
    except Exception as e:
        raise Exception(f"AI generation failed: {str(e)}")

# Helper function to generate educational games
def generate_educational_games(subject, grade_level, count=5):
    prompt = f"""
    Generate {count} engaging educational games for {grade_level} grade students focusing on {subject}.
    For each game, provide:
    - A creative title
    - Brief description
    - Educational objectives
    - Game mechanics
    - Estimated play time
    - Difficulty level (easy/medium/hard)
    
    Format as a structured list.
    """
    
    try:
        content = generate_ai_content(prompt)
        # Parse the AI response into structured game data
        games = []
        lines = content.split('\n')
        
        current_game = {}
        for line in lines:
            line = line.strip()
            if line.startswith('Title:') or line.startswith('Game'):
                if current_game:
                    games.append(current_game)
                current_game = {'title': line.split(':', 1)[1].strip() if ':' in line else line}
            elif line.startswith('Description:'):
                current_game['description'] = line.split(':', 1)[1].strip()
            elif line.startswith('Objectives:'):
                current_game['objectives'] = line.split(':', 1)[1].strip()
            elif line.startswith('Mechanics:'):
                current_game['mechanics'] = line.split(':', 1)[1].strip()
            elif line.startswith('Time:'):
                current_game['duration'] = line.split(':', 1)[1].strip()
            elif line.startswith('Difficulty:'):
                current_game['difficulty'] = line.split(':', 1)[1].strip().lower()
        
        if current_game:
            games.append(current_game)
            
        return games
    except Exception as e:
        return []

# Helper function to generate personalized challenges
def generate_personalized_challenges(user_data, subject, count=3):
    prompt = f"""
    Create {count} personalized educational challenges for a student with the following profile:
    - Grade level: {user_data.get('grade_level', 'unknown')}
    - Preferred subjects: {user_data.get('subjects', 'general')}
    - Target subject: {subject}
    
    Each challenge should:
    - Be age-appropriate
    - Build on previous knowledge
    - Include clear learning objectives
    - Have measurable outcomes
    - Be engaging and interactive
    """
    
    try:
        content = generate_ai_content(prompt)
        challenges = []
        lines = content.split('\n')
        
        current_challenge = {}
        for line in lines:
            line = line.strip()
            if line.startswith('Challenge') or (line and not current_challenge.get('title')):
                if current_challenge and current_challenge.get('title'):
                    challenges.append(current_challenge)
                current_challenge = {'title': line}
            elif line.startswith('Objective:'):
                current_challenge['objective'] = line.split(':', 1)[1].strip()
            elif line.startswith('Description:'):
                current_challenge['description'] = line.split(':', 1)[1].strip()
            elif line.startswith('Duration:'):
                current_challenge['duration'] = line.split(':', 1)[1].strip()
        
        if current_challenge and current_challenge.get('title'):
            challenges.append(current_challenge)
            
        return challenges
    except Exception as e:
        return []

# Auth routes
@auth_bp.route('/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        email = data.get('email')
        password = data.get('password')
        username = data.get('username')
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        # Here you would typically save to database
        return jsonify({
            "message": "User registered successfully",
            "user": {
                "id": 1,
                "username": username,
                "email": email
            }
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/auth/signin', methods=['POST'])
def signin():
    try:
        data = request.get_json()
        
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        # Mock authentication - replace with real auth
        if email == "test@example.com" and password == "password":
            return jsonify({
                "message": "Login successful",
                "token": "mock_jwt_token_here",
                "user": {
                    "id": 1,
                    "email": email,
                    "username": "testuser"
                }
            })
        else:
            return jsonify({"error": "Invalid credentials"}), 401
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    return jsonify({
        "message": "If an account with that email exists, a reset link has been sent"
    })

# Dashboard routes
@dashboard_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    try:
        user_id = get_jwt_identity()
        # Get real stats from database
        # This would come from your actual database queries
        stats = {
            "totalStudyTime": 12.5,
            "gamesCompleted": 8,
            "challengesWon": 3,
            "currentStreak": 5
        }
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/dashboard/recent-activity', methods=['GET'])
@jwt_required()
def get_recent_activity():
    try:
        user_id = get_jwt_identity()
        # Get real activities from database
        activities = []  # Replace with actual database query
        return jsonify(activities)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/dashboard/upcoming-challenges', methods=['GET'])
@jwt_required()
def get_upcoming_challenges():
    try:
        user_id = get_jwt_identity()
        # Generate personalized challenges using AI
        user_profile = {}  # Get user profile from database
        challenges = generate_personalized_challenges(user_profile, "math", 3)
        return jsonify(challenges)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/dashboard/achievements', methods=['GET'])
@jwt_required()
def get_dashboard_achievements():
    try:
        user_id = get_jwt_identity()
        # Get real achievements from database
        achievements = []  # Replace with actual database query
        return jsonify(achievements)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Games routes
@games_bp.route('/games', methods=['GET'])
@jwt_required()
def get_games():
    try:
        user_id = get_jwt_identity()
        
        # Get user preferences from database
        user_profile = {}  # Replace with actual user profile query
        grade_level = user_profile.get('grade_level', '5th')
        preferred_subjects = user_profile.get('subjects', ['math', 'science'])
        
        # Generate AI-powered educational games
        games = []
        for subject in preferred_subjects[:2]:  # Limit to 2 subjects
            subject_games = generate_educational_games(subject, grade_level, 3)
            for game in subject_games:
                game.update({
                    'id': len(games) + 1,
                    'category': subject,
                    'icon': '🎮',  # You can make this dynamic based on subject
                    'color': '#4CAF50' if subject == 'math' else '#2196F3'
                })
                games.append(game)
        
        return jsonify(games)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Game generation endpoint
@games_bp.route('/games/generate', methods=['POST'])
@jwt_required()
def generate_games():
    try:
        data = request.get_json()
        subject = data.get('subject', 'math')
        grade_level = data.get('grade_level', '5th')
        count = data.get('count', 3)
        
        games = generate_educational_games(subject, grade_level, count)
        return jsonify(games)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Additional API routes
@api_bp.route('/achievements', methods=['GET'])
@jwt_required()
def get_achievements():
    try:
        user_id = get_jwt_identity()
        # Get real achievements from database
        achievements = []  # Replace with actual database query
        return jsonify(achievements)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/study-stats', methods=['GET'])
@jwt_required()
def get_study_stats():
    try:
        user_id = get_jwt_identity()
        # Get real study stats from database
        stats = {}  # Replace with actual database query
        return jsonify(stats)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/recent-activity', methods=['GET'])
@jwt_required()
def get_recent_activity_api():
    try:
        user_id = get_jwt_identity()
        # Get real recent activity from database
        activities = []  # Replace with actual database query
        return jsonify(activities)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# AI-powered learning content generation
@api_bp.route('/generate-learning-content', methods=['POST'])
@jwt_required()
def generate_learning_content():
    try:
        data = request.get_json()
        topic = data.get('topic')
        grade_level = data.get('grade_level', '5th')
        content_type = data.get('content_type', 'lesson')  # lesson, quiz, activity
        
        prompt = f"""
        Create an engaging {content_type} about {topic} for {grade_level} grade students.
        Make it interactive, educational, and age-appropriate.
        Include clear learning objectives and practical examples.
        """
        
        content = generate_ai_content(prompt)
        return jsonify({
            'topic': topic,
            'grade_level': grade_level,
            'content_type': content_type,
            'content': content
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Health check route
@api_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "message": "Server is running"})