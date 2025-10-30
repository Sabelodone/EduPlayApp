# app/routes.py
from flask import Blueprint, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import jwt_required, get_jwt_identity
import os
import openai
from datetime import datetime

# Configure OpenAI (will handle free tier issues later)
openai.api_key = os.getenv('OPENAI_API_KEY')

# Create blueprints
auth_bp = Blueprint('auth', __name__)
dashboard_bp = Blueprint('dashboard', __name__)
games_bp = Blueprint('games', __name__)
api_bp = Blueprint('api', __name__)

# Helper function to generate AI content (with fallback)
def generate_ai_content(prompt, max_tokens=500):
    try:
        if not openai.api_key:
            # Return fallback content for now
            return generate_fallback_content(prompt)
            
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
        # Return fallback content on any error
        return generate_fallback_content(prompt)

def generate_fallback_content(prompt):
    """Generate basic fallback content when OpenAI is unavailable"""
    if "math" in prompt.lower():
        return "Math Game: Practice addition and subtraction with fun puzzles!"
    elif "science" in prompt.lower():
        return "Science Quiz: Learn about plants, animals, and the solar system!"
    elif "language" in prompt.lower():
        return "Word Builder: Create words from letters and improve vocabulary!"
    else:
        return "Educational Game: Learn while having fun with interactive challenges!"

# Helper function to generate educational games (with fallback)
def generate_educational_games(subject, grade_level, count=5):
    try:
        # For now, use fallback games until OpenAI is set up
        return generate_fallback_games(subject, grade_level, count)
    except Exception as e:
        return generate_fallback_games(subject, grade_level, count)

def generate_fallback_games(subject, grade_level, count=5):
    """Generate fallback games when OpenAI is unavailable"""
    fallback_games = {
        'math': [
            {
                'title': 'Math Puzzle Adventure',
                'description': 'Solve fun math puzzles to advance through levels',
                'objectives': 'Practice addition, subtraction, and problem solving',
                'mechanics': 'Drag and drop numbers to solve equations',
                'duration': '10-15 minutes',
                'difficulty': 'easy'
            },
            {
                'title': 'Number Challenge',
                'description': 'Race against time to solve math problems',
                'objectives': 'Improve calculation speed and accuracy',
                'mechanics': 'Multiple choice questions with timer',
                'duration': '5-10 minutes',
                'difficulty': 'medium'
            }
        ],
        'science': [
            {
                'title': 'Science Explorer',
                'description': 'Discover amazing science facts through interactive quizzes',
                'objectives': 'Learn about biology, physics, and chemistry',
                'mechanics': 'Explore virtual lab and answer questions',
                'duration': '15-20 minutes',
                'difficulty': 'medium'
            }
        ],
        'language': [
            {
                'title': 'Word Master',
                'description': 'Build vocabulary with word puzzles and games',
                'objectives': 'Improve spelling and vocabulary',
                'mechanics': 'Word search and crossword puzzles',
                'duration': '10-15 minutes',
                'difficulty': 'easy'
            }
        ]
    }
    
    return fallback_games.get(subject, fallback_games['math'])[:count]

# Helper function to generate personalized challenges (with fallback)
def generate_personalized_challenges(user_data, subject, count=3):
    try:
        # For now, use fallback challenges
        return generate_fallback_challenges(subject, count)
    except Exception as e:
        return generate_fallback_challenges(subject, count)

def generate_fallback_challenges(subject, count=3):
    """Generate fallback challenges when OpenAI is unavailable"""
    challenges = [
        {
            'title': f'Weekly {subject.title()} Quiz',
            'objective': 'Test your knowledge with timed questions',
            'description': f'Complete a {subject} quiz within the time limit',
            'duration': '20 minutes'
        },
        {
            'title': f'{subject.title()} Practice Session',
            'objective': 'Improve your skills through focused practice',
            'description': f'Practice key {subject} concepts with interactive exercises',
            'duration': '15 minutes'
        }
    ]
    return challenges[:count]

# ===== AUTH ROUTES =====
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
                    "username": "testuser",
                    "first_name": "Test",
                    "last_name": "User",
                    "created_at": "2025-10-29T00:00:00Z"
                }
            })
        else:
            return jsonify({"error": "Invalid credentials"}), 401
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# CRITICAL: Add the missing /auth/me endpoint
@auth_bp.route('/auth/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        
        # For now, return mock user data
        return jsonify({
            "user": {
                "id": user_id,
                "email": "test@example.com",
                "username": "testuser",
                "first_name": "Test",
                "last_name": "User",
                "created_at": "2025-10-29T00:00:00Z"
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== PROFILE ROUTES =====
@auth_bp.route('/auth/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        user_id = get_jwt_identity()
        
        # Return basic profile data for now
        return jsonify({
            "profile": {
                "id": user_id,
                "username": "testuser",
                "email": "test@example.com",
                "first_name": "Test",
                "last_name": "User",
                "grade_level": "5th",
                "school": "Elementary School",
                "preferred_language": "English",
                "subjects": ["math", "science"],
                "avatar_url": "https://ui-avatars.com/api/?name=Test+User&background=6a11cb&color=fff&size=150&bold=true",
                "bio": "Learning through fun games!",
                "social_links": {
                    "instagram": "",
                    "twitter": ""
                }
            }
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/auth/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        # For now, just return success
        return jsonify({
            "message": "Profile updated successfully",
            "profile": data
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/profile/avatar', methods=['POST'])
@jwt_required()
def upload_avatar():
    try:
        user_id = get_jwt_identity()
        # For now, return mock avatar URL
        return jsonify({
            "avatar_url": "https://ui-avatars.com/api/?name=Test+User&background=6a11cb&color=fff&size=150&bold=true"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/profile/preferences', methods=['PUT'])
@jwt_required()
def update_preferences():
    try:
        user_id = get_jwt_identity()
        data = request.get_json()
        
        return jsonify({
            "message": "Preferences updated successfully",
            "preferences": data.get('preferences', {})
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    return jsonify({
        "message": "If an account with that email exists, a reset link has been sent"
    })

# Logout route
@auth_bp.route('/auth/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        # In a real app, you'd blacklist the token here
        return jsonify({
            "message": "Logged out successfully"
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ===== DASHBOARD ROUTES =====
@dashboard_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    try:
        user_id = get_jwt_identity()
        # Return basic stats for now
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
        # Return empty array for now
        activities = []
        return jsonify(activities)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/dashboard/upcoming-challenges', methods=['GET'])
@jwt_required()
def get_upcoming_challenges():
    try:
        user_id = get_jwt_identity()
        # Use fallback challenges for now
        challenges = generate_fallback_challenges("math", 2)
        return jsonify(challenges)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@dashboard_bp.route('/dashboard/achievements', methods=['GET'])
@jwt_required()
def get_dashboard_achievements():
    try:
        user_id = get_jwt_identity()
        # Return empty array for now
        achievements = []
        return jsonify(achievements)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ===== GAMES ROUTES =====
@games_bp.route('/games', methods=['GET'])
@jwt_required()
def get_games():
    try:
        user_id = get_jwt_identity()
        
        # Use fallback games for now
        games = []
        subjects = ['math', 'science', 'language']
        
        for i, subject in enumerate(subjects):
            subject_games = generate_fallback_games(subject, '5th', 2)
            for game in subject_games:
                game.update({
                    'id': len(games) + 1,
                    'category': subject,
                    'icon': '🎮',
                    'color': ['#4CAF50', '#2196F3', '#FF9800'][i % 3]
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
        
        games = generate_fallback_games(subject, grade_level, count)
        return jsonify(games)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ===== ADDITIONAL API ROUTES =====
@api_bp.route('/achievements', methods=['GET'])
@jwt_required()
def get_achievements():
    try:
        user_id = get_jwt_identity()
        # Return empty achievements for now
        return jsonify({
            "achievements": []
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/study-stats', methods=['GET'])
@jwt_required()
def get_study_stats():
    try:
        user_id = get_jwt_identity()
        # Return basic study stats
        return jsonify({
            "total_study_time": 12.5,
            "completed_lessons": 8,
            "games_played": 15,
            "quizzes_completed": 5
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/recent-activity', methods=['GET'])
@jwt_required()
def get_recent_activity_api():
    try:
        user_id = get_jwt_identity()
        # Return empty activities for now
        return jsonify({
            "activities": []
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# AI-powered learning content generation (with fallback)
@api_bp.route('/generate-learning-content', methods=['POST'])
@jwt_required()
def generate_learning_content():
    try:
        data = request.get_json()
        topic = data.get('topic', 'general')
        grade_level = data.get('grade_level', '5th')
        content_type = data.get('content_type', 'lesson')
        
        # Use fallback content for now
        content = generate_fallback_content(f"Create a {content_type} about {topic}")
        
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

# ===== CATCH-ALL ROUTE FOR UNDEFINED ENDPOINTS =====
@api_bp.route('/<path:path>')
def catch_all(path):
    return jsonify({"error": f"Endpoint /api/{path} not found"}), 404