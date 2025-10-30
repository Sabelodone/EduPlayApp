from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Game, GameSession, UserActivity, UserAchievement
from app import db
import uuid
import json
from datetime import datetime
import os
import requests

games_bp = Blueprint('games', __name__)

# Sample educational games data
SAMPLE_GAMES = [
    {
        'id': 'math_quiz_1',
        'title': 'Math Master Challenge',
        'description': 'Test your math skills with fun problems',
        'category': 'Mathematics',
        'difficulty': 'beginner',
        'duration_minutes': 10,
        'max_score': 1000,
        'icon': 'calculator',
        'color': '#FF6B6B',
        'topics': ['algebra', 'arithmetic']
    },
    {
        'id': 'science_trivia_1',
        'title': 'Science Trivia',
        'description': 'Explore fascinating science facts',
        'category': 'Science',
        'difficulty': 'intermediate',
        'duration_minutes': 15,
        'max_score': 1500,
        'icon': 'flask',
        'color': '#4ECDC4',
        'topics': ['biology', 'chemistry', 'physics']
    },
    {
        'id': 'coding_puzzle_1',
        'title': 'Python Puzzle',
        'description': 'Solve coding challenges in Python',
        'category': 'Programming',
        'difficulty': 'advanced',
        'duration_minutes': 20,
        'max_score': 2000,
        'icon': 'code',
        'color': '#45B7D1',
        'topics': ['python', 'algorithms']
    }
]

@games_bp.route('/', methods=['GET'])
@jwt_required()
def get_games():
    """Get all available educational games"""
    try:
        category = request.args.get('category')
        difficulty = request.args.get('difficulty')
        
        filtered_games = SAMPLE_GAMES
        
        if category:
            filtered_games = [game for game in filtered_games if game['category'] == category]
        
        if difficulty:
            filtered_games = [game for game in filtered_games if game['difficulty'] == difficulty]
        
        # Get user's game sessions to show progress
        current_user_id = get_jwt_identity()
        user_sessions = GameSession.query.filter_by(user_id=current_user_id).all()
        
        # Enhance games with user progress
        enhanced_games = []
        for game in filtered_games:
            user_game_sessions = [s for s in user_sessions if s.game_type == game['id']]
            best_score = max([s.score for s in user_game_sessions]) if user_game_sessions else 0
            completed = any(s.completed for s in user_game_sessions)
            
            enhanced_game = game.copy()
            enhanced_game['user_progress'] = {
                'best_score': best_score,
                'completed': completed,
                'attempts': len(user_game_sessions)
            }
            enhanced_games.append(enhanced_game)
        
        return jsonify({
            'success': True,
            'games': enhanced_games,
            'total': len(enhanced_games)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching games: {str(e)}")
        return jsonify({'error': 'Failed to fetch games'}), 500

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
        grade_level = data.get('grade_level', '10')
        
        # Generate game using AI (simplified for now)
        game_data = generate_ai_game(subject, difficulty, topics, grade_level)
        
        return jsonify({
            'success': True,
            'message': 'Game generated successfully',
            'game': game_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error generating game: {str(e)}")
        return jsonify({'error': 'Failed to generate game'}), 500

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
        question_type = data.get('question_type', 'multiple_choice')
        
        # Generate question using AI (simplified for now)
        question = generate_ai_question(subject, difficulty, grade, topics, question_type)
        
        return jsonify({
            'success': True,
            'question': question
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error generating question: {str(e)}")
        return jsonify({'error': 'Failed to generate question'}), 500

@games_bp.route('/start', methods=['POST'])
@jwt_required()
def start_game():
    """Start a new game session"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        game_id = data.get('game_id')
        if not game_id:
            return jsonify({'error': 'Game ID is required'}), 400
        
        # Find the game in our sample data
        game = next((g for g in SAMPLE_GAMES if g['id'] == game_id), None)
        if not game:
            return jsonify({'error': 'Game not found'}), 404
        
        game_session = GameSession(
            user_id=current_user_id,
            game_type=game_id,
            score=0,
            completed=False,
            started_at=datetime.utcnow(),
            game_data=json.dumps({
                'game_title': game['title'],
                'category': game['category'],
                'difficulty': game['difficulty'],
                'start_time': datetime.utcnow().isoformat()
            })
        )
        
        db.session.add(game_session)
        
        # Log activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='game_start',
            activity_data=json.dumps({
                'game_id': game_id,
                'game_title': game['title'],
                'category': game['category']
            })
        )
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Game started successfully',
            'game_session_id': game_session.id,
            'game': game
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error starting game: {str(e)}")
        return jsonify({'error': 'Failed to start game'}), 500

@games_bp.route('/submit-answer', methods=['POST'])
@jwt_required()
def submit_answer():
    """Submit answer and track progress"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        game_session_id = data.get('game_session_id')
        question_data = data.get('question_data', {})
        selected_answer = data.get('selected_answer')
        is_correct = data.get('is_correct', False)
        points_earned = data.get('points_earned', 10)
        
        if not game_session_id:
            return jsonify({'error': 'Game session ID is required'}), 400
        
        # Update game session
        game_session = GameSession.query.get(game_session_id)
        if not game_session:
            return jsonify({'error': 'Game session not found'}), 404
        
        if game_session.user_id != current_user_id:
            return jsonify({'error': 'Unauthorized access to game session'}), 403
        
        # Update score
        if is_correct:
            game_session.score += points_earned
        
        # Update game data with the question attempt
        current_game_data = {}
        if game_session.game_data:
            try:
                current_game_data = json.loads(game_session.game_data)
            except:
                current_game_data = {}
        
        # Initialize questions array if not exists
        if 'questions_attempted' not in current_game_data:
            current_game_data['questions_attempted'] = []
        
        # Add current question attempt
        current_game_data['questions_attempted'].append({
            'question_data': question_data,
            'selected_answer': selected_answer,
            'is_correct': is_correct,
            'points_earned': points_earned if is_correct else 0,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        game_session.game_data = json.dumps(current_game_data)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Answer submitted successfully',
            'score': game_session.score,
            'is_correct': is_correct,
            'points_earned': points_earned if is_correct else 0
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error submitting answer: {str(e)}")
        return jsonify({'error': 'Failed to submit answer'}), 500

@games_bp.route('/complete', methods=['POST'])
@jwt_required()
def complete_game():
    """Complete game session and award points"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        game_session_id = data.get('game_session_id')
        final_score = data.get('final_score', 0)
        
        if not game_session_id:
            return jsonify({'error': 'Game session ID is required'}), 400
        
        game_session = GameSession.query.get(game_session_id)
        if not game_session:
            return jsonify({'error': 'Game session not found'}), 404
        
        if game_session.user_id != current_user_id:
            return jsonify({'error': 'Unauthorized access to game session'}), 403
        
        # Update game session
        game_session.completed = True
        game_session.ended_at = datetime.utcnow()
        game_session.score = final_score
        
        # Update game data with completion info
        current_game_data = {}
        if game_session.game_data:
            try:
                current_game_data = json.loads(game_session.game_data)
            except:
                current_game_data = {}
        
        current_game_data['completed_at'] = datetime.utcnow().isoformat()
        current_game_data['final_score'] = final_score
        game_session.game_data = json.dumps(current_game_data)
        
        # Log activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='game_complete',
            activity_data=json.dumps({
                'game_session_id': game_session_id,
                'game_type': game_session.game_type,
                'final_score': final_score,
                'duration_minutes': calculate_game_duration(game_session)
            })
        )
        db.session.add(activity)
        
        # Check for achievements
        check_game_achievements(current_user_id, game_session)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Game completed successfully',
            'final_score': final_score,
            'game_session_id': game_session_id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error completing game: {str(e)}")
        return jsonify({'error': 'Failed to complete game'}), 500

@games_bp.route('/session/<session_id>', methods=['GET'])
@jwt_required()
def get_game_session(session_id):
    """Get specific game session details"""
    try:
        current_user_id = get_jwt_identity()
        
        game_session = GameSession.query.get(session_id)
        if not game_session:
            return jsonify({'error': 'Game session not found'}), 404
        
        if game_session.user_id != current_user_id:
            return jsonify({'error': 'Unauthorized access to game session'}), 403
        
        return jsonify({
            'success': True,
            'game_session': game_session.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching game session: {str(e)}")
        return jsonify({'error': 'Failed to fetch game session'}), 500

@games_bp.route('/user/sessions', methods=['GET'])
@jwt_required()
def get_user_game_sessions():
    """Get user's game sessions"""
    try:
        current_user_id = get_jwt_identity()
        limit = request.args.get('limit', 10, type=int)
        
        sessions = GameSession.query.filter_by(
            user_id=current_user_id
        ).order_by(
            GameSession.started_at.desc()
        ).limit(limit).all()
        
        return jsonify({
            'success': True,
            'sessions': [session.to_dict() for session in sessions],
            'total': len(sessions)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching user game sessions: {str(e)}")
        return jsonify({'error': 'Failed to fetch game sessions'}), 500

# Helper functions
def generate_ai_game(subject, difficulty, topics, grade_level):
    """Generate game using AI (placeholder implementation)"""
    # In a real implementation, you would call an AI API here
    game_id = f"ai_{subject.lower()}_{difficulty}_{str(uuid.uuid4())[:8]}"
    
    return {
        "id": game_id,
        "title": f"AI {subject} {difficulty.title()} Challenge",
        "description": f"An AI-generated {difficulty} level game about {subject} focusing on {', '.join(topics) if topics else 'various topics'}",
        "category": subject,
        "difficulty": difficulty,
        "duration_minutes": 15,
        "max_score": 1000,
        "icon": "robot",
        "color": "#6A7FDB",
        "topics": topics,
        "grade_level": grade_level,
        "ai_generated": True
    }

def generate_ai_question(subject, difficulty, grade, topics, question_type):
    """Generate question using AI (placeholder implementation)"""
    # In a real implementation, you would call an AI API here
    return {
        "id": str(uuid.uuid4()),
        "question": f"What is an important concept in {subject} at {grade}th grade level?",
        "options": {
            "A": "Basic principles",
            "B": "Advanced theories", 
            "C": "Practical applications",
            "D": "Historical context"
        },
        "correct_answer": "A",
        "explanation": "This covers the fundamental concepts needed for this grade level.",
        "subject": subject,
        "difficulty": difficulty,
        "points": 10,
        "question_type": question_type
    }

def calculate_game_duration(game_session):
    """Calculate game duration in minutes"""
    if game_session.started_at and game_session.ended_at:
        duration = game_session.ended_at - game_session.started_at
        return round(duration.total_seconds() / 60, 1)
    return 0

def check_game_achievements(user_id, game_session):
    """Check and award achievements for game performance"""
    try:
        # Check for high score achievement
        user_sessions = GameSession.query.filter_by(
            user_id=user_id, 
            game_type=game_session.game_type
        ).all()
        
        if len(user_sessions) >= 5:
            # Award "Game Enthusiast" achievement
            achievement = UserAchievement(
                user_id=user_id,
                achievement_type='game_enthusiast',
                achievement_data=json.dumps({
                    'game_type': game_session.game_type,
                    'sessions_played': len(user_sessions)
                })
            )
            db.session.add(achievement)
        
        # Check for perfect score achievement
        game_data = json.loads(game_session.game_data) if game_session.game_data else {}
        max_score = 1000  # This should come from game definition
        if game_session.score >= max_score:
            achievement = UserAchievement(
                user_id=user_id,
                achievement_type='perfect_score',
                achievement_data=json.dumps({
                    'game_type': game_session.game_type,
                    'score': game_session.score
                })
            )
            db.session.add(achievement)
            
    except Exception as e:
        current_app.logger.error(f"Error checking game achievements: {str(e)}")