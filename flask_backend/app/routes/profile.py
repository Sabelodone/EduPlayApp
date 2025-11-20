# flask_backend/app/routes/profile.py - UPDATED VERSION
from flask import Blueprint, request, jsonify, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, UserProfile, UserChallengeProgress, ChallengeAttempt, AIInteraction, LessonProgress, GameSession
from app import db
from datetime import datetime, timedelta
import os
import uuid
from werkzeug.utils import secure_filename

profile_bp = Blueprint('profile', __name__)

# Allowed file extensions for profile pictures
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def safe_db_operation(operation, default_value=None):
    """Safely execute database operation with error handling"""
    try:
        return operation()
    except Exception as e:
        current_app.logger.error(f"Database operation error: {str(e)}")
        return default_value

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
        
        # Safely calculate progress stats from existing models
        def calculate_progress():
            lessons_completed = LessonProgress.query.filter_by(user_id=user.id, completed=True).count()
            games_completed = GameSession.query.filter_by(user_id=user.id, completed=True).count()
            challenges_completed = UserChallengeProgress.query.filter_by(user_id=user.id, completed=True).count()
            
            # Calculate experience based on completed activities
            experience = (lessons_completed * 100) + (games_completed * 50) + (challenges_completed * 150)
            level = (experience // 1000) + 1  # Simple level calculation
            
            return {
                'total_points': experience,
                'current_streak': 0,
                'longest_streak': 0,
                'lessons_completed': lessons_completed,
                'games_completed': games_completed,
                'challenges_completed': challenges_completed,
                'quizzes_completed': 0,
                'level': level,
                'experience': experience
            }
        
        progress_data = safe_db_operation(calculate_progress, {
            'total_points': 0,
            'current_streak': 0,
            'longest_streak': 0,
            'lessons_completed': 0,
            'games_completed': 0,
            'challenges_completed': 0,
            'quizzes_completed': 0,
            'level': 1,
            'experience': 0
        })
        
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
                'profile_picture': user.profile_picture,  # Add profile picture field
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
            'progress': progress_data
        }
        
        return jsonify(profile_data), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching profile: {str(e)}")
        return jsonify({'error': 'Failed to fetch profile'}), 500

@profile_bp.route('/upload-picture', methods=['POST'])
@jwt_required()
def upload_profile_picture():
    """Upload and update user profile picture"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Check if the post request has the file part
        if 'profile_picture' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['profile_picture']
        
        # If user does not select file, browser also submits an empty part without filename
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if file and allowed_file(file.filename):
            # Check file size
            file.seek(0, os.SEEK_END)
            file_length = file.tell()
            file.seek(0, os.SEEK_SET)
            
            if file_length > MAX_FILE_SIZE:
                return jsonify({'error': 'File size too large. Maximum 5MB allowed.'}), 400
            
            # Generate unique filename
            filename = secure_filename(file.filename)
            file_extension = filename.rsplit('.', 1)[1].lower()
            unique_filename = f"{user.id}_{uuid.uuid4().hex[:8]}.{file_extension}"
            
            # Create uploads directory if it doesn't exist
            upload_folder = os.path.join(current_app.root_path, 'uploads', 'profile_pictures')
            os.makedirs(upload_folder, exist_ok=True)
            
            # Save file
            file_path = os.path.join(upload_folder, unique_filename)
            file.save(file_path)
            
            # Update user profile picture
            user.profile_picture = unique_filename
            db.session.commit()
            
            # Return the filename (in production, you might return a full URL)
            return jsonify({
                'success': True,
                'message': 'Profile picture uploaded successfully',
                'profile_picture': unique_filename,
                'profile_picture_url': f"/uploads/profile_pictures/{unique_filename}"  # Relative URL
            }), 200
        else:
            return jsonify({'error': 'Invalid file type. Allowed types: PNG, JPG, JPEG, GIF'}), 400
            
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error uploading profile picture: {str(e)}")
        return jsonify({'error': 'Failed to upload profile picture'}), 500

@profile_bp.route('/picture/<filename>', methods=['GET'])
def get_profile_picture(filename):
    """Serve profile picture"""
    try:
        upload_folder = os.path.join(current_app.root_path, 'uploads', 'profile_pictures')
        return send_from_directory(upload_folder, filename)
    except Exception as e:
        current_app.logger.error(f"Error serving profile picture: {str(e)}")
        return jsonify({'error': 'Profile picture not found'}), 404

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
        
        # Safely calculate stats from various models
        def calculate_stats():
            lessons_completed = LessonProgress.query.filter_by(user_id=user.id, completed=True).count()
            games_played = GameSession.query.filter_by(user_id=user.id).count()
            challenges_completed = UserChallengeProgress.query.filter_by(user_id=user.id, completed=True).count()
            
            # Estimate study time
            total_study_time = (lessons_completed * 30) + (games_played * 15) + (challenges_completed * 45)
            
            return {
                'total_study_time': total_study_time,
                'completed_lessons': lessons_completed,
                'games_played': games_played,
                'challenges_completed': challenges_completed,
                'quizzes_completed': 0
            }
        
        stats = safe_db_operation(calculate_stats, {
            'total_study_time': 0,
            'completed_lessons': 0,
            'games_played': 0,
            'challenges_completed': 0,
            'quizzes_completed': 0
        })
        
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
        
        activities = []
        
        # Safely get recent data
        def fetch_recent_activity():
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
            
            temp_activities = []
            
            for attempt in recent_attempts:
                temp_activities.append({
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
                temp_activities.append({
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
                    temp_activities.append({
                        'id': f'lesson_{lesson.id}',
                        'type': 'lesson',
                        'title': 'Lesson Progress',
                        'description': f'Progress: {lesson.progress * 100:.0f}% on lesson',
                        'time': lesson.last_accessed.isoformat(),
                        'timestamp': lesson.last_accessed,
                        'icon': 'book',
                        'completed': lesson.completed
                    })
            
            return temp_activities
        
        activities = safe_db_operation(fetch_recent_activity, [])
        
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
        if 'email' in data:
            user.email = data['email']
        
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
            'user': user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating profile: {str(e)}")
        return jsonify({'error': 'Failed to update profile'}), 500