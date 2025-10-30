from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, UserProfile, UserChallengeProgress, ChallengeAttempt, AIInteraction, LessonProgress, GameSession
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
                grade_level='',
                school='',
                is_minor=True
            )
            db.session.add(user.profile)
            db.session.commit()
        
        # Calculate progress stats from existing models
        total_points = 0
        lessons_completed = LessonProgress.query.filter_by(user_id=user.id, completed=True).count()
        games_completed = GameSession.query.filter_by(user_id=user.id, completed=True).count()
        challenges_completed = UserChallengeProgress.query.filter_by(user_id=user.id, completed=True).count()
        
        # Calculate experience based on completed activities
        experience = (lessons_completed * 100) + (games_completed * 50) + (challenges_completed * 150)
        level = (experience // 1000) + 1  # Simple level calculation
        
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
                'subjects': subjects,
                'is_minor': profile.is_minor if profile.is_minor else True,
                'guardian_name': profile.guardian_name or '',
                'guardian_email': profile.guardian_email or '',
                'guardian_phone': profile.guardian_phone or ''
            },
            'progress': {
                'total_points': total_points,
                'current_streak': 0,  # You can implement streak logic later
                'longest_streak': 0,
                'lessons_completed': lessons_completed,
                'games_completed': games_completed,
                'challenges_completed': challenges_completed,
                'quizzes_completed': 0,  # You can add quiz logic if needed
                'level': level,
                'experience': experience
            }
        }
        
        return jsonify(profile_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching profile: {str(e)}")
        return jsonify({'error': 'Failed to fetch profile'}), 500

@profile_bp.route('/achievements', methods=['GET'])
@jwt_required()
def get_profile_achievements():
    """Get user achievements - for /api/achievements endpoint"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user achievements from UserAchievement model
        achievements = []
        user_achievements = user.achievements if hasattr(user, 'achievements') else []
        
        for achievement in user_achievements:
            achievements.append({
                'id': achievement.id,
                'type': achievement.achievement_type,
                'title': achievement.achievement_type.replace('_', ' ').title(),
                'description': f'Achieved {achievement.achievement_type}',
                'earned_at': achievement.earned_at.isoformat() if achievement.earned_at else None,
                'icon': 'trophy'
            })
        
        return jsonify({
            'success': True,
            'achievements': achievements
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
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Calculate stats from various models
        lessons_completed = LessonProgress.query.filter_by(user_id=user.id, completed=True).count()
        games_played = GameSession.query.filter_by(user_id=user.id).count()
        challenges_completed = UserChallengeProgress.query.filter_by(user_id=user.id, completed=True).count()
        
        # Estimate study time (you can make this more accurate later)
        total_study_time = (lessons_completed * 30) + (games_played * 15) + (challenges_completed * 45)
        
        stats = {
            'total_study_time': total_study_time,  # in minutes
            'completed_lessons': lessons_completed,
            'games_played': games_played,
            'challenges_completed': challenges_completed,
            'quizzes_completed': 0  # Add if you have quiz system
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
        
        # Get recent lesson progress
        recent_lessons = LessonProgress.query.filter_by(
            user_id=current_user_id
        ).order_by(
            LessonProgress.last_accessed.desc()
        ).limit(limit).all()
        
        activities = []
        
        for attempt in recent_attempts:
            activities.append({
                'id': f'challenge_{attempt.id}',
                'type': 'challenge',
                'title': 'Challenge Attempt',
                'description': f'{"Completed" if attempt.is_correct else "Attempted"} coding challenge',
                'time': attempt.submitted_at.isoformat() if attempt.submitted_at else None,
                'timestamp': attempt.submitted_at,
                'icon': 'code',
                'completed': attempt.is_correct
            })
        
        for interaction in recent_ai_interactions:
            activities.append({
                'id': f'ai_{interaction.id}',
                'type': 'ai_interaction',
                'title': 'AI Assistance',
                'description': f'Used AI for {interaction.action}',
                'time': interaction.created_at.isoformat() if interaction.created_at else None,
                'timestamp': interaction.created_at,
                'icon': 'robot',
                'completed': True
            })
        
        for lesson in recent_lessons:
            if lesson.last_accessed:
                activities.append({
                    'id': f'lesson_{lesson.id}',
                    'type': 'lesson',
                    'title': 'Lesson Progress',
                    'description': f'Progress: {lesson.progress * 100:.0f}% on lesson',
                    'time': lesson.last_accessed.isoformat(),
                    'timestamp': lesson.last_accessed,
                    'icon': 'book',
                    'completed': lesson.completed
                })
        
        # Sort by timestamp and limit
        activities.sort(key=lambda x: x['timestamp'] if x['timestamp'] else datetime.min, reverse=True)
        activities = activities[:limit]
        
        # Remove timestamp before returning
        for activity in activities:
            activity.pop('timestamp', None)
        
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
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
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
        if 'subjects' in data:
            if isinstance(data['subjects'], list):
                profile.subjects = ','.join(data['subjects'])
            else:
                profile.subjects = str(data['subjects'])
        if 'is_minor' in data:
            profile.is_minor = bool(data['is_minor'])
        if 'guardian_name' in data:
            profile.guardian_name = data['guardian_name']
        if 'guardian_email' in data:
            profile.guardian_email = data['guardian_email']
        if 'guardian_phone' in data:
            profile.guardian_phone = data['guardian_phone']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'profile': profile.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating profile: {str(e)}")
        return jsonify({'error': 'Failed to update profile'}), 500