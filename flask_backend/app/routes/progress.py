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
        total_game_score = sum([g.score for g in game_sessions if g.score])
        
        # Calculate lesson stats
        lesson_progress = LessonProgress.query.filter_by(user_id=current_user_id).all()
        total_lessons = len(lesson_progress)
        completed_lessons = len([l for l in lesson_progress if l.completed])
        
        # Calculate challenge stats
        challenge_progress = UserChallengeProgress.query.filter_by(user_id=current_user_id).all()
        total_challenges = len(challenge_progress)
        completed_challenges = len([c for c in challenge_progress if c.completed])
        challenge_attempts = ChallengeAttempt.query.filter_by(user_id=current_user_id).all()
        
        # Calculate total points from various activities
        total_points = (
            completed_lessons * 10 +  # 10 points per lesson
            completed_games * 20 +    # 20 points per game
            completed_challenges * 30 +  # 30 points per challenge
            total_game_score          # Add actual game scores
        )
        
        # Calculate level based on total points
        user_level = min((total_points // 100) + 1, 10)  # Level up every 100 points, max level 10
        
        progress_data = {
            'overallProgress': {
                'weekly_progress': calculate_weekly_progress(current_user_id),
                'monthly_progress': calculate_monthly_progress(current_user_id),
                'total_points': total_points,
                'streak': calculate_streak(current_user_id),
                'level': user_level
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
                    'value': str(total_points),
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
            'achievements': [achievement_to_dict(achievement) for achievement in achievements],
            'recentActivity': [activity_to_dict(activity) for activity in recent_activities]
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
        
        if not data or not data.get('video_id'):
            return jsonify({'error': 'Video ID is required'}), 400
        
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
                last_accessed=datetime.utcnow(),
                data=json.dumps({
                    'video_title': data.get('video_title', 'Unknown Video'),
                    'completed_at': datetime.utcnow().isoformat()
                })
            )
        else:
            lesson_progress.progress = 1.0
            lesson_progress.completed = True
            lesson_progress.last_accessed = datetime.utcnow()
        
        # Log activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='lesson_complete',
            activity_data=json.dumps({
                'video_id': data.get('video_id'),
                'video_title': data.get('video_title', 'Unknown Video'),
                'points_earned': 10
            })
        )
        
        db.session.add(lesson_progress)
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Video progress tracked',
            'points_earned': 10
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error tracking video: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to track video: {str(e)}'
        }), 500

@progress_bp.route('/game-completed', methods=['POST'])
@jwt_required()
def track_game_completed():
    """Track game completion"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or not data.get('game_type'):
            return jsonify({'error': 'Game type is required'}), 400
        
        # Create or update game session
        game_session = GameSession(
            user_id=current_user_id,
            game_type=data.get('game_type'),
            score=data.get('score', 0),
            completed=True,
            ended_at=datetime.utcnow(),
            game_data=json.dumps({
                'duration': data.get('duration', 0),
                'level': data.get('level', 1),
                'correct_answers': data.get('correct_answers', 0),
                'total_questions': data.get('total_questions', 0)
            })
        )
        
        # Log activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='game_complete',
            activity_data=json.dumps({
                'game_type': data.get('game_type'),
                'score': data.get('score', 0),
                'points_earned': data.get('score', 0) // 10  # Convert score to points
            })
        )
        
        db.session.add(game_session)
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Game completion tracked',
            'points_earned': data.get('score', 0) // 10
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error tracking game completion: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to track game completion: {str(e)}'
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
        db.session.rollback()
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
        db.session.rollback()
        current_app.logger.error(f"Error tracking download: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to track download: {str(e)}'
        }), 500

@progress_bp.route('/challenge-completed', methods=['POST'])
@jwt_required()
def track_challenge_completed():
    """Track challenge completion"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data or not data.get('challenge_id'):
            return jsonify({'error': 'Challenge ID is required'}), 400
        
        # Update challenge progress
        challenge_progress = UserChallengeProgress.query.filter_by(
            user_id=current_user_id,
            challenge_id=data.get('challenge_id')
        ).first()
        
        if not challenge_progress:
            challenge_progress = UserChallengeProgress(
                user_id=current_user_id,
                challenge_id=data.get('challenge_id'),
                started_at=datetime.utcnow(),
                completed=True,
                completed_at=datetime.utcnow(),
                attempts_count=1
            )
        else:
            challenge_progress.completed = True
            challenge_progress.completed_at = datetime.utcnow()
            challenge_progress.attempts_count += 1
        
        # Log activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='challenge_complete',
            activity_data=json.dumps({
                'challenge_id': data.get('challenge_id'),
                'score': data.get('score', 0),
                'points_earned': 30
            })
        )
        
        db.session.add(challenge_progress)
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'status': 'success',
            'message': 'Challenge completion tracked',
            'points_earned': 30
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error tracking challenge completion: {str(e)}")
        return jsonify({
            'status': 'error',
            'message': f'Failed to track challenge completion: {str(e)}'
        }), 500

# Helper functions
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

def calculate_weekly_progress(user_id):
    """Calculate weekly progress"""
    week_ago = datetime.utcnow() - timedelta(days=7)
    recent_activities = UserActivity.query.filter(
        UserActivity.user_id == user_id,
        UserActivity.created_at >= week_ago
    ).count()
    return min(recent_activities * 10, 100)  # Scale to percentage

def calculate_monthly_progress(user_id):
    """Calculate monthly progress"""
    month_ago = datetime.utcnow() - timedelta(days=30)
    recent_activities = UserActivity.query.filter(
        UserActivity.user_id == user_id,
        UserActivity.created_at >= month_ago
    ).count()
    return min(recent_activities * 3, 100)  # Scale to percentage

def calculate_streak(user_id):
    """Calculate user streak"""
    # Simple streak calculation - you can make this more sophisticated
    recent_activities = UserActivity.query.filter_by(
        user_id=user_id
    ).order_by(UserActivity.created_at.desc()).limit(7).all()
    
    if len(recent_activities) >= 3:
        return 3  # Basic streak for demo
    return len(recent_activities)

def achievement_to_dict(achievement):
    """Convert achievement to dictionary"""
    return {
        'id': achievement.id,
        'type': achievement.achievement_type,
        'title': achievement.achievement_type.replace('_', ' ').title(),
        'description': f'Achieved {achievement.achievement_type}',
        'earned_at': achievement.earned_at.isoformat() if achievement.earned_at else None,
        'icon': 'trophy'
    }

def activity_to_dict(activity):
    """Convert activity to dictionary"""
    activity_data = {}
    if activity.activity_data:
        try:
            activity_data = json.loads(activity.activity_data)
        except:
            activity_data = {'description': activity.activity_data}
    
    return {
        'id': activity.id,
        'type': activity.activity_type,
        'title': activity.activity_type.replace('_', ' ').title(),
        'description': activity_data.get('description', f'Completed {activity.activity_type}'),
        'time': activity.created_at.isoformat() if activity.created_at else None,
        'icon': get_activity_icon(activity.activity_type)
    }

def get_activity_icon(activity_type):
    """Get appropriate icon for activity type"""
    icon_map = {
        'lesson_complete': 'book',
        'game_complete': 'game-controller',
        'game_start': 'game-controller',
        'challenge_complete': 'trophy',
        'download': 'download'
    }
    return icon_map.get(activity_type, 'help-circle')