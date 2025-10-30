from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Challenge, ChallengeAttempt, UserChallengeProgress
from app import db
from datetime import datetime
import json

# Make sure this line exists exactly like this
challenges_bp = Blueprint('challenges', __name__)

@challenges_bp.route('/', methods=['GET'])
@jwt_required()
def get_challenges():
    """Get all challenges"""
    try:
        current_user_id = get_jwt_identity()
        category = request.args.get('category')
        difficulty = request.args.get('difficulty')
        
        query = Challenge.query.filter_by(is_active=True)
        
        if category:
            query = query.filter_by(category=category)
        if difficulty:
            query = query.filter_by(difficulty=difficulty)
        
        challenges = query.all()
        
        # Get user progress for challenges
        user_progress = UserChallengeProgress.query.filter_by(user_id=current_user_id).all()
        progress_map = {progress.challenge_id: progress for progress in user_progress}
        
        challenges_data = []
        for challenge in challenges:
            challenge_data = challenge.to_dict()
            user_progress = progress_map.get(challenge.id)
            challenge_data['user_progress'] = {
                'completed': user_progress.completed if user_progress else False,
                'attempts': user_progress.attempts_count if user_progress else 0,
                'started_at': user_progress.started_at.isoformat() if user_progress and user_progress.started_at else None
            }
            challenges_data.append(challenge_data)
        
        return jsonify({
            'success': True,
            'challenges': challenges_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching challenges: {str(e)}")
        return jsonify({'error': 'Failed to fetch challenges'}), 500

@challenges_bp.route('/<challenge_id>', methods=['GET'])
@jwt_required()
def get_challenge(challenge_id):
    """Get specific challenge details"""
    try:
        challenge = Challenge.query.get(challenge_id)
        
        if not challenge:
            return jsonify({'error': 'Challenge not found'}), 404
        
        return jsonify({
            'success': True,
            'challenge': challenge.to_dict()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching challenge: {str(e)}")
        return jsonify({'error': 'Failed to fetch challenge'}), 500

@challenges_bp.route('/<challenge_id>/attempt', methods=['POST'])
@jwt_required()
def submit_attempt(challenge_id):
    """Submit a challenge attempt"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        solution_code = data.get('solution_code')
        if not solution_code:
            return jsonify({'error': 'Solution code is required'}), 400
        
        challenge = Challenge.query.get(challenge_id)
        if not challenge:
            return jsonify({'error': 'Challenge not found'}), 404
        
        # Create attempt
        attempt = ChallengeAttempt(
            user_id=current_user_id,
            challenge_id=challenge_id,
            solution_code=solution_code,
            is_correct=False,  # Will be set by AI analysis
            submitted_at=datetime.utcnow()
        )
        
        # Update user progress
        user_progress = UserChallengeProgress.query.filter_by(
            user_id=current_user_id,
            challenge_id=challenge_id
        ).first()
        
        if not user_progress:
            user_progress = UserChallengeProgress(
                user_id=current_user_id,
                challenge_id=challenge_id,
                started_at=datetime.utcnow(),
                attempts_count=1
            )
            db.session.add(user_progress)
        else:
            user_progress.attempts_count += 1
            user_progress.last_accessed = datetime.utcnow()
        
        db.session.add(attempt)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Attempt submitted successfully',
            'attempt_id': attempt.id
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error submitting attempt: {str(e)}")
        return jsonify({'error': 'Failed to submit attempt'}), 500

@challenges_bp.route('/<challenge_id>/progress', methods=['GET'])
@jwt_required()
def get_challenge_progress(challenge_id):
    """Get user progress for a specific challenge"""
    try:
        current_user_id = get_jwt_identity()
        
        progress = UserChallengeProgress.query.filter_by(
            user_id=current_user_id,
            challenge_id=challenge_id
        ).first()
        
        attempts = ChallengeAttempt.query.filter_by(
            user_id=current_user_id,
            challenge_id=challenge_id
        ).order_by(ChallengeAttempt.submitted_at.desc()).all()
        
        progress_data = {
            'started': progress is not None,
            'completed': progress.completed if progress else False,
            'attempts_count': progress.attempts_count if progress else 0,
            'started_at': progress.started_at.isoformat() if progress and progress.started_at else None,
            'completed_at': progress.completed_at.isoformat() if progress and progress.completed_at else None,
            'recent_attempts': [attempt.to_dict() for attempt in attempts[:5]]  # Last 5 attempts
        }
        
        return jsonify({
            'success': True,
            'progress': progress_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching challenge progress: {str(e)}")
        return jsonify({'error': 'Failed to fetch progress'}), 500