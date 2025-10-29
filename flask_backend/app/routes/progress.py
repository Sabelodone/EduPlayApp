from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, UserChallengeProgress, ChallengeAttempt, GameSession, UserActivity, LessonProgress, UserAchievement
from app import db
from datetime import datetime, timedelta
import json

progress_bp = Blueprint('progress', __name__)

@progress_bp.route('/user-progress', methods=['GET'])
@jwt_required()
def get_user_progress():
    """Get comprehensive user progress data"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get user
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Calculate recent activity
        recent_activities = UserActivity.query.filter_by(
            user_id=current_user_id
        ).order_by(UserActivity.created_at.desc()).limit(5).all()
        
        # Calculate achievements
        achievements = UserAchievement.query.filter_by(user_id=current_user_id).all()
        
        # Calculate game stats
        game_sessions = GameSession.query.filter_by(user_id=current_user_id).all()
        total_games = len(game_sessions)
        completed_games = len([g for g in game_sessions if g.completed])
        
        # Calculate lesson stats
        lesson_progress = LessonProgress.query.filter_by(user_id=current_user_id).all()
        total_lessons = len(lesson_progress)
        completed_lessons = len([l for l in lesson_progress if l.completed])
        
        # Calculate challenge stats
        challenge_progress = UserChallengeProgress.query.filter_by(user_id=current_user_id).all()
        total_challenges = len(challenge_progress)
        completed_challenges = len([c for c in challenge_progress if c.completed])
        
        progress_data = {
            'overallProgress': {
                'weekly_progress': 0,  # You can calculate this based on recent activity
                'monthly_progress': 0, # You can calculate this based on recent activity
                'total_points': user.points,
                'streak': 0,  # You can implement streak logic
                'level': user.level if hasattr(user, 'level') else 'Beginner'
            },
            'stats': [
                {
                    'id': '1',
                    'title': 'Lessons Completed',
                    'value': f'{completed_lessons}/{total_lessons}',
                    'subtitle': 'Total',
                    'change': '+0%',
                    'color': '#4ECDC4'
                },
                {
                    'id': '2', 
                    'title': 'Games Played',
                    'value': f'{completed_games}/{total_games}',
                    'subtitle': 'Total',
                    'change': '+0',
                    'color': '#FFD166'
                },
                {
                    'id': '3',
                    'title': 'Points Earned', 
                    'value': str(user.points),
                    'subtitle': 'Total',
                    'change': '+0',
                    'color': '#FF6B6B'
                },
                {
                    'id': '4',
                    'title': 'Challenges Completed',
                    'value': f'{completed_challenges}/{total_challenges}',
                    'subtitle': 'Total', 
                    'change': '+0%',
                    'color': '#6A7FDB'
                }
            ],
            'completedVideos': get_completed_videos(current_user_id),
            'achievements': [achievement.to_dict() for achievement in achievements],
            'recentActivity': [activity.to_dict() for activity in recent_activities]
        }
        
        return jsonify({
            'status': 'success',
            'progress': progress_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error getting progress: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to get progress: {str(e)}'
        }), 500

@progress_bp.route('/video-completed', methods=['POST'])
@jwt_required()
def track_video_completed():
    """Track video completion progress"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        # Update or create lesson progress
        lesson_progress = LessonProgress.query.filter_by(
            user_id=current_user_id,
            lesson_id=data.get('video_id')
        ).first()
        
        if not lesson_progress:
            lesson_progress = LessonProgress(
                user_id=current_user_id,
                lesson_id=data.get('video_id'),
                progress=1.0,
                completed=True,
                last_accessed=datetime.utcnow()
            )
        else:
            lesson_progress.progress = 1.0
            lesson_progress.completed = True
            lesson_progress.last_accessed = datetime.utcnow()
        
        # Update user
        user = User.query.get(current_user_id)
        if user:
            user.points += 10  # Points for completing video
        
        # Log activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='lesson_complete',
            activity_data=json.dumps({
                'video_id': data.get('video_id'),
                'video_title': data.get('video_title', 'video')
            })
        )
        
        db.session.add(lesson_progress)
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Video progress tracked'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error tracking video: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to track video: {str(e)}'
        }), 500

@progress_bp.route('/game-started', methods=['POST'])
@jwt_required()
def track_game_started():
    """Track game start"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='game_start',
            activity_data=json.dumps({
                'game_title': data.get('game_title', 'Game'),
                'category': data.get('category', 'game'),
                'difficulty': data.get('difficulty', 'medium')
            })
        )
        
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Game start tracked'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error tracking game start: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to track game start: {str(e)}'
        }), 500

@progress_bp.route('/download-resource', methods=['POST'])
@jwt_required()
def track_download():
    """Track resource downloads"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='download',
            activity_data=json.dumps({
                'resource_type': data.get('resource_type', 'Resource'),
                'resource_id': data.get('resource_id', 'material'),
                'subject': data.get('subject', 'subject')
            })
        )
        
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Download tracked'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error tracking download: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to track download: {str(e)}'
        }), 500

def get_completed_videos(user_id):
    """Get completed videos for user"""
    completed_lessons = LessonProgress.query.filter_by(
        user_id=user_id, 
        completed=True
    ).all()
    
    completed_videos = {}
    for lesson in completed_lessons:
        key = f"{lesson.lesson_id}"
        completed_videos[key] = True
    
    return completed_videos