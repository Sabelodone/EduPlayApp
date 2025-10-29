from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, UserProfile, UserProgress, ChallengeAttempt, AIInteraction
from app import db
from datetime import datetime, timedelta

profile_bp = Blueprint('profile', __name__)

@profile_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """Get current user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Ensure profile exists
        if not user.profile:
            user.profile = UserProfile(
                user_id=user.id,
                preferred_language='English',
                is_minor=True
            )
            db.session.add(user.profile)
            db.session.commit()
        
        # Ensure progress exists
        if not user.progress:
            user.progress = UserProgress(user_id=user.id)
            db.session.add(user.progress)
            db.session.commit()
        
        # Safely handle subjects
        profile = user.profile
        subjects = []
        if profile.subjects:
            if isinstance(profile.subjects, str):
                subjects = profile.subjects.split(',')
            elif isinstance(profile.subjects, list):
                subjects = profile.subjects
        
        profile_data = {
            'user': {
                'id': user.id,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'created_at': user.created_at.isoformat() if user.created_at else None
            },
            'profile': {
                'grade_level': profile.grade_level or '',
                'school': profile.school or '',
                'preferred_language': profile.preferred_language or 'English',
                'subjects': subjects,
                'avatar_url': profile.avatar_url or '',
                'bio': profile.bio or '',
                'guardian_name': profile.guardian_name or '',
                'guardian_email': profile.guardian_email or '',
                'guardian_phone': profile.guardian_phone or ''
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
        current_app.logger.error(f"Error fetching profile: {str(e)}")
        return jsonify({'error': 'Failed to fetch profile'}), 500

# ADD THESE MISSING ENDPOINTS:

@profile_bp.route('/achievements', methods=['GET'])
@jwt_required()
def get_profile_achievements():
    """Get user achievements - for /api/achievements endpoint"""
    try:
        current_user_id = get_jwt_identity()
        
        # Return empty achievements for now, or redirect to dashboard endpoint
        return jsonify({
            'success': True,
            'achievements': []
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching achievements: {str(e)}")
        return jsonify({'error': 'Failed to fetch achievements'}), 500

@profile_bp.route('/study-stats', methods=['GET'])
@jwt_required()
def get_study_stats():
    """Get user study statistics - for /api/study-stats endpoint"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user or not user.progress:
            stats = {
                'total_study_time': 0,
                'completed_lessons': 0,
                'games_played': 0,
                'quizzes_completed': 0
            }
        else:
            progress = user.progress
            stats = {
                'total_study_time': progress.total_points * 10,
                'completed_lessons': progress.lessons_completed,
                'games_played': progress.games_completed,
                'quizzes_completed': progress.quizzes_completed
            }
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching study stats: {str(e)}")
        return jsonify({'error': 'Failed to fetch study stats'}), 500

@profile_bp.route('/recent-activity', methods=['GET'])
@jwt_required()
def get_profile_recent_activity():
    """Get user recent activity - for /api/recent-activity endpoint"""
    try:
        current_user_id = get_jwt_identity()
        limit = request.args.get('limit', 5, type=int)
        
        # Get recent challenge attempts
        recent_attempts = ChallengeAttempt.query.filter_by(
            user_id=current_user_id
        ).order_by(
            ChallengeAttempt.submitted_at.desc()
        ).limit(limit).all()
        
        # Get recent AI interactions
        recent_ai_interactions = AIInteraction.query.filter_by(
            user_id=current_user_id
        ).order_by(
            AIInteraction.created_at.desc()
        ).limit(limit).all()
        
        activities = []
        
        for attempt in recent_attempts:
            activities.append({
                'id': f'challenge_{attempt.id}',
                'type': 'challenge',
                'title': f'Challenge Attempt',
                'description': f'{"Completed" if attempt.is_correct else "Attempted"} challenge',
                'time': attempt.submitted_at.strftime('%Y-%m-%d %H:%M') if attempt.submitted_at else 'Recently',
                'icon': 'trophy',
                'completed': attempt.is_correct
            })
        
        for interaction in recent_ai_interactions:
            activities.append({
                'id': f'ai_{interaction.id}',
                'type': 'ai_interaction',
                'title': 'AI Assistance',
                'description': f'Used {interaction.model_used or "AI"} for help',
                'time': interaction.created_at.strftime('%Y-%m-%d %H:%M') if interaction.created_at else 'Recently',
                'icon': 'help-buoy',
                'completed': True
            })
        
        # If no activities, return empty array
        if not activities:
            activities = []
        
        return jsonify({
            'success': True,
            'activities': activities
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching recent activity: {str(e)}")
        return jsonify({'error': 'Failed to fetch recent activity'}), 500

@profile_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update user basic info
        if 'first_name' in data:
            user.first_name = data['first_name']
        if 'last_name' in data:
            user.last_name = data['last_name']
        
        # Ensure profile exists
        if not user.profile:
            user.profile = UserProfile(user_id=user.id)
            db.session.add(user.profile)
        
        profile = user.profile
        
        # Update profile fields safely
        if 'grade_level' in data:
            profile.grade_level = data['grade_level']
        if 'school' in data:
            profile.school = data['school']
        if 'preferred_language' in data:
            profile.preferred_language = data['preferred_language']
        if 'subjects' in data:
            if isinstance(data['subjects'], list):
                profile.subjects = ','.join(data['subjects'])
            else:
                profile.subjects = str(data['subjects'])
        if 'avatar_url' in data:
            profile.avatar_url = data['avatar_url']
        if 'bio' in data:
            profile.bio = data['bio']
        if 'guardian_name' in data:
            profile.guardian_name = data['guardian_name']
        if 'guardian_email' in data:
            profile.guardian_email = data['guardian_email']
        if 'guardian_phone' in data:
            profile.guardian_phone = data['guardian_phone']
        
        db.session.commit()
        
        return jsonify({'message': 'Profile updated successfully'}), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating profile: {str(e)}")
        return jsonify({'error': 'Failed to update profile'}), 500