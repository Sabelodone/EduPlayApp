from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Game, GameSession, UserActivity
from app import db
import uuid
import json
from datetime import datetime
import os
import requests

games_bp = Blueprint('games', __name__)

# OpenAI API Key
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')

@games_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_game():
    """Generate AI-powered educational games"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        subject = data.get('subject', 'Mathematics')
        difficulty = data.get('difficulty', 'medium')
        topics = data.get('topics', [])
        
        # Generate game using AI
        game_data = generate_ai_game(subject, difficulty, topics)
        
        return jsonify({
            'status': 'success',
            'message': 'Game generated successfully',
            'game': game_data
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to generate game: {str(e)}'
        }), 500

@games_bp.route('/questions', methods=['POST'])
@jwt_required()
def generate_question():
    """Generate AI-powered questions for games"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        subject = data.get('subject', 'Mathematics')
        difficulty = data.get('difficulty', 'medium')
        grade = data.get('grade', 10)
        topics = data.get('topics', [])
        
        # Generate question using AI
        question = generate_ai_question(subject, difficulty, grade, topics)
        
        return jsonify({
            'status': 'success',
            'question': question
        }), 200
        
    except Exception as e:
        return jsonify({
            'status': 'error',
            'message': f'Failed to generate question: {str(e)}'
        }), 500

@games_bp.route('/start', methods=['POST'])
@jwt_required()
def start_game():
    """Start a new game session"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        game_session = GameSession(
            user_id=current_user_id,
            game_id=data.get('game_id', str(uuid.uuid4())),
            game_type=data.get('game_title', 'Educational Game')
        )
        
        db.session.add(game_session)
        db.session.commit()
        
        # Log activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='game_start',
            activity_data=json.dumps({
                'game_title': data.get('game_title', 'Game'),
                'subject': data.get('subject', 'Mathematics')
            })
        )
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Game started',
            'game_session_id': game_session.id
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error starting game: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to start game: {str(e)}'
        }), 500

@games_bp.route('/submit-answer', methods=['POST'])
@jwt_required()
def submit_answer():
    """Submit answer and track progress"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        game_session_id = data.get('game_session_id')
        question_id = data.get('question_id')
        selected_answer = data.get('selected_answer')
        is_correct = data.get('is_correct', False)
        score = data.get('score', 0)
        
        # Update game session
        game_session = GameSession.query.get(game_session_id)
        if game_session:
            game_session.score += score
            game_session.completed = data.get('completed', False)
            
            # Update user points
            user = User.query.get(current_user_id)
            if user:
                user.points += score
            
            db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Answer submitted',
            'score': game_session.score if game_session else 0
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error submitting answer: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to submit answer: {str(e)}'
        }), 500

@games_bp.route('/complete', methods=['POST'])
@jwt_required()
def complete_game():
    """Complete game session and award points"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        game_session_id = data.get('game_session_id')
        final_score = data.get('final_score', 0)
        
        game_session = GameSession.query.get(game_session_id)
        if game_session:
            game_session.completed = True
            game_session.ended_at = datetime.utcnow()
            game_session.score = final_score
            
            # Update user stats
            user = User.query.get(current_user_id)
            if user:
                user.points += final_score
            
            # Log activity
            activity = UserActivity(
                user_id=current_user_id,
                activity_type='game_complete',
                activity_data=json.dumps({
                    'game_title': game_session.game_type,
                    'final_score': final_score
                })
            )
            db.session.add(activity)
            db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Game completed',
            'final_score': final_score
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error completing game: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to complete game: {str(e)}'
        }), 500

# AI Generation Functions
def generate_ai_game(subject, difficulty, topics):
    """Generate game using OpenAI"""
    if not OPENAI_API_KEY:
        return get_fallback_game(subject, difficulty, topics)
    
    try:
        # This is a simplified version - you'd integrate with OpenAI API here
        return get_fallback_game(subject, difficulty, topics)
        
    except Exception as e:
        return get_fallback_game(subject, difficulty, topics)

def generate_ai_question(subject, difficulty, grade, topics):
    """Generate question using OpenAI"""
    if not OPENAI_API_KEY:
        return get_fallback_question(subject, difficulty, grade, topics)
    
    try:
        # Simplified - integrate with OpenAI API
        return get_fallback_question(subject, difficulty, grade, topics)
        
    except Exception as e:
        return get_fallback_question(subject, difficulty, grade, topics)

def get_fallback_game(subject, difficulty, topics):
    """Fallback game data"""
    return {
        "id": str(uuid.uuid4()),
        "title": f"{subject} {difficulty.title()} Challenge",
        "description": f"Test your {subject} knowledge with this {difficulty} level game",
        "category": subject,
        "difficulty": difficulty,
        "duration": "5-10 mins",
        "players": "Individual",
        "icon": "🎮",
        "color": "#4ECDC4",
        "topics": topics or ["General"],
        "rating": 4.2,
        "generated": True,
        "locked": False
    }

def get_fallback_question(subject, difficulty, grade, topics):
    """Fallback question data"""
    return {
        "question": f"What is the main concept in {subject} that relates to {topics[0] if topics else 'this subject'}?",
        "options": {
            "a": "Option A",
            "b": "Option B", 
            "c": "Option C",
            "d": "Option D"
        },
        "correct_answer": "a",
        "explanation": "This is the correct answer because...",
        "grade": grade,
        "subject": subject,
        "difficulty": difficulty,
        "generated": True
    }