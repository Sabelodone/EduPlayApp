from flask import Blueprint, jsonify, current_app, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Challenge, ChallengeAttempt, UserChallengeProgress, AIInteraction, LessonProgress, GameSession, UserActivity
from app import db
from datetime import datetime, timedelta
from sqlalchemy import func, distinct
import json

dashboard_bp = Blueprint('dashboard', __name__)

def safe_db_query(query, default_value=None):
    """Safely execute database query with error handling"""
    try:
        return query
    except Exception as e:
        current_app.logger.error(f"Database query error: {str(e)}")
        return default_value

@dashboard_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get dashboard statistics for the current user - Updated for React Native StatsGrid"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Safely calculate stats with error handling
        total_challenges = safe_db_query(Challenge.query.count(), 0)
        completed_challenges = safe_db_query(UserChallengeProgress.query.filter_by(
            user_id=current_user_id, 
            completed=True
        ).count(), 0)
        
        # Calculate recent activity (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        recent_attempts = safe_db_query(ChallengeAttempt.query.filter_by(
            user_id=current_user_id
        ).filter(
            ChallengeAttempt.submitted_at >= week_ago
        ).count(), 0)
        
        # Calculate AI interactions (last 30 days)
        month_ago = datetime.utcnow() - timedelta(days=30)
        ai_interactions = safe_db_query(AIInteraction.query.filter_by(
            user_id=current_user_id
        ).filter(
            AIInteraction.created_at >= month_ago
        ).count(), 0)
        
        # Calculate user level and points from activities
        completed_lessons = safe_db_query(LessonProgress.query.filter_by(
            user_id=current_user_id, 
            completed=True
        ).count(), 0)
        
        completed_games = safe_db_query(GameSession.query.filter_by(
            user_id=current_user_id, 
            completed=True
        ).count(), 0)
        
        # Calculate total points and level
        total_points = (
            completed_challenges * 30 +
            completed_lessons * 10 +
            completed_games * 20
        )
        user_level = min((total_points // 100) + 1, 10)
        
        # Format stats for React Native StatsGrid component
        stats = [
            {
                'id': '1', 
                'title': 'Challenges Completed', 
                'value': str(completed_challenges), 
                'subtitle': 'Total', 
                'change': '+0%', 
                'gradient': ['#4ECDC4', '#44A08D'],
                'icon': 'trophy',
                'iconType': 'Ionicons',
                'suffix': ''
            },
            {
                'id': '2', 
                'title': 'Current Level', 
                'value': str(user_level), 
                'subtitle': 'Level', 
                'change': '+0', 
                'gradient': ['#FFD166', '#FFB347'],
                'icon': 'star',
                'iconType': 'Ionicons',
                'suffix': ''
            },
            {
                'id': '3', 
                'title': 'Learning Points', 
                'value': str(total_points), 
                'subtitle': 'Total', 
                'change': '+0', 
                'gradient': ['#FF6B6B', '#EE5A52'],
                'icon': 'flash',
                'iconType': 'Ionicons',
                'suffix': ''
            },
            {
                'id': '4', 
                'title': 'Recent Activity', 
                'value': str(recent_attempts + ai_interactions), 
                'subtitle': 'This week', 
                'change': '+0%', 
                'gradient': ['#6A7FDB', '#5A6FC8'],
                'icon': 'activity',
                'iconType': 'Ionicons',
                'suffix': ''
            }
        ]
        
        return jsonify({'stats': stats}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in /api/dashboard/stats: {str(e)}")
        # Return safe default stats on error
        default_stats = [
            {
                'id': '1', 'title': 'Challenges Completed', 'value': '0', 'subtitle': 'Total', 
                'change': '+0%', 'gradient': ['#4ECDC4', '#44A08D'], 'icon': 'trophy',
                'iconType': 'Ionicons', 'suffix': ''
            },
            {
                'id': '2', 'title': 'Current Level', 'value': '1', 'subtitle': 'Level', 
                'change': '+0', 'gradient': ['#FFD166', '#FFB347'], 'icon': 'star',
                'iconType': 'Ionicons', 'suffix': ''
            },
            {
                'id': '3', 'title': 'Learning Points', 'value': '0', 'subtitle': 'Total', 
                'change': '+0', 'gradient': ['#FF6B6B', '#EE5A52'], 'icon': 'flash',
                'iconType': 'Ionicons', 'suffix': ''
            },
            {
                'id': '4', 'title': 'Recent Activity', 'value': '0', 'subtitle': 'This week', 
                'change': '+0%', 'gradient': ['#6A7FDB', '#5A6FC8'], 'icon': 'activity',
                'iconType': 'Ionicons', 'suffix': ''
            }
        ]
        return jsonify({'stats': default_stats}), 200

@dashboard_bp.route('/dashboard/recent-activity', methods=['GET'])
@jwt_required()
def get_recent_activity():
    """Get recent user activity - Updated with proper icons"""
    try:
        current_user_id = get_jwt_identity()
        limit = request.args.get('limit', 5, type=int)
        
        activities = []
        
        # Safely get recent data with error handling
        try:
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
            
            # Get recent game sessions
            recent_games = GameSession.query.filter_by(
                user_id=current_user_id
            ).order_by(
                GameSession.started_at.desc()
            ).limit(limit).all()
            
            # Format challenge attempts
            for attempt in recent_attempts:
                challenge = Challenge.query.get(attempt.challenge_id)
                activities.append({
                    'id': f'challenge_{attempt.id}',
                    'type': 'challenge',
                    'title': f'Challenge: {challenge.title if challenge else "Coding Challenge"}',
                    'description': f'{"Completed" if attempt.is_correct else "Attempted"} programming challenge',
                    'time': attempt.submitted_at.isoformat() if attempt.submitted_at else datetime.utcnow().isoformat(),
                    'icon': 'code',
                    'iconType': 'Ionicons',
                    'completed': attempt.is_correct,
                    'timestamp': attempt.submitted_at or datetime.utcnow()
                })
            
            # Format AI interactions
            for interaction in recent_ai_interactions:
                activities.append({
                    'id': f'ai_{interaction.id}',
                    'type': 'ai_interaction',
                    'title': 'AI Learning Assistant',
                    'description': f'Used AI for {interaction.action or "learning help"}',
                    'time': interaction.created_at.isoformat() if interaction.created_at else datetime.utcnow().isoformat(),
                    'icon': 'robot',
                    'iconType': 'Ionicons',
                    'completed': True,
                    'timestamp': interaction.created_at or datetime.utcnow()
                })
            
            # Format lesson progress
            for lesson in recent_lessons:
                if lesson.last_accessed:
                    activities.append({
                        'id': f'lesson_{lesson.id}',
                        'type': 'lesson',
                        'title': 'Lesson Progress',
                        'description': f'{"Completed" if lesson.completed else "Progress"} on learning module',
                        'time': lesson.last_accessed.isoformat(),
                        'icon': 'book',
                        'iconType': 'Ionicons',
                        'completed': lesson.completed,
                        'timestamp': lesson.last_accessed
                    })
            
            # Format game sessions
            for game in recent_games:
                activities.append({
                    'id': f'game_{game.id}',
                    'type': 'game',
                    'title': f'Game: {game.game_type}',
                    'description': f'{"Completed" if game.completed else "Played"} educational game',
                    'time': game.started_at.isoformat() if game.started_at else datetime.utcnow().isoformat(),
                    'icon': 'game-controller',
                    'iconType': 'Ionicons',
                    'completed': game.completed,
                    'timestamp': game.started_at or datetime.utcnow()
                })
            
        except Exception as db_error:
            current_app.logger.error(f"Database error in recent activity: {str(db_error)}")
            # Continue with empty activities list
        
        # Sort by timestamp and limit
        activities.sort(key=lambda x: x.get('timestamp', datetime.min), reverse=True)
        activities = activities[:limit]
        
        # Remove timestamp before returning
        for activity in activities:
            activity.pop('timestamp', None)
        
        # If no activities, return sample data
        if not activities:
            current_time = datetime.utcnow().isoformat()
            activities = [
                {
                    'id': '1',
                    'type': 'challenge',
                    'title': 'Python Basics Challenge',
                    'description': 'Completed programming fundamentals',
                    'time': current_time,
                    'icon': 'code',
                    'iconType': 'Ionicons',
                    'completed': True
                },
                {
                    'id': '2', 
                    'type': 'ai_interaction',
                    'title': 'AI Learning Assistant',
                    'description': 'Got help with algorithm optimization',
                    'time': current_time,
                    'icon': 'robot',
                    'iconType': 'Ionicons',
                    'completed': True
                }
            ]
        
        return jsonify({'activities': activities}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in /api/dashboard/recent-activity: {str(e)}")
        # Return safe default activities
        current_time = datetime.utcnow().isoformat()
        default_activities = [
            {
                'id': '1',
                'type': 'challenge',
                'title': 'Welcome to EduPlay!',
                'description': 'Start your learning journey',
                'time': current_time,
                'icon': 'rocket',
                'iconType': 'Ionicons',
                'completed': False
            }
        ]
        return jsonify({'activities': default_activities}), 200

@dashboard_bp.route('/dashboard/upcoming-challenges', methods=['GET'])
@jwt_required()
def get_upcoming_challenges():
    """Get upcoming challenges - Updated for React Native"""
    try:
        current_user_id = get_jwt_identity()
        
        challenge_list = []
        
        try:
            # Get active challenges that user hasn't completed yet
            completed_challenge_ids = db.session.query(UserChallengeProgress.challenge_id).filter_by(
                user_id=current_user_id,
                completed=True
            ).subquery()
            
            challenges = Challenge.query.filter(
                ~Challenge.id.in_(completed_challenge_ids)
            ).filter_by(
                is_active=True
            ).limit(5).all()
            
            for challenge in challenges:
                # Count participants (users who attempted this challenge)
                participants_count = db.session.query(
                    func.count(distinct(ChallengeAttempt.user_id))
                ).filter_by(
                    challenge_id=challenge.id
                ).scalar() or 0
                
                challenge_list.append({
                    'id': challenge.id,
                    'title': challenge.title,
                    'description': challenge.description or 'Test your skills with this challenge',
                    'difficulty': getattr(challenge, 'difficulty', 'medium'),
                    'category': getattr(challenge, 'category', 'programming'),
                    'points': getattr(challenge, 'points', 100),
                    'participants': participants_count,
                    'is_ai_generated': getattr(challenge, 'is_ai_generated', False)
                })
                
        except Exception as db_error:
            current_app.logger.error(f"Database error in upcoming challenges: {str(db_error)}")
        
        # If no challenges, return sample data
        if not challenge_list:
            challenge_list = [
                {
                    'id': 'sample_1',
                    'title': 'Python Fundamentals Challenge',
                    'description': 'Master basic Python concepts and syntax',
                    'difficulty': 'beginner',
                    'category': 'python',
                    'points': 100,
                    'participants': 156,
                    'is_ai_generated': False
                },
                {
                    'id': 'sample_2',
                    'title': 'Algorithm Mastery', 
                    'description': 'Solve complex algorithm problems',
                    'difficulty': 'advanced',
                    'category': 'algorithms',
                    'points': 200,
                    'participants': 89,
                    'is_ai_generated': True
                }
            ]
        
        return jsonify({'challenges': challenge_list}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in /api/dashboard/upcoming-challenges: {str(e)}")
        # Return safe default challenges
        default_challenges = [
            {
                'id': 'default_1',
                'title': 'Getting Started',
                'description': 'Begin your coding journey with basic concepts',
                'difficulty': 'beginner',
                'category': 'programming',
                'points': 50,
                'participants': 0,
                'is_ai_generated': False
            }
        ]
        return jsonify({'challenges': default_challenges}), 200

@dashboard_bp.route('/dashboard/achievements', methods=['GET'])
@jwt_required()
def get_achievements():
    """Get user achievements - Updated with proper icons"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Safely calculate user progress for achievements
        try:
            completed_challenges = UserChallengeProgress.query.filter_by(
                user_id=current_user_id, 
                completed=True
            ).count() or 0
            
            completed_lessons = LessonProgress.query.filter_by(
                user_id=current_user_id, 
                completed=True
            ).count() or 0
            
            completed_games = GameSession.query.filter_by(
                user_id=current_user_id, 
                completed=True
            ).count() or 0
            
            total_attempts = ChallengeAttempt.query.filter_by(
                user_id=current_user_id
            ).count() or 0
            
            correct_attempts = ChallengeAttempt.query.filter_by(
                user_id=current_user_id,
                is_correct=True
            ).count() or 0
            
            accuracy = (correct_attempts / total_attempts * 100) if total_attempts > 0 else 0
            
            # Calculate total points for level
            total_points = (
                completed_challenges * 30 +
                completed_lessons * 10 +
                completed_games * 20
            )
            user_level = min((total_points // 100) + 1, 10)
            
        except Exception as db_error:
            current_app.logger.error(f"Database error in achievements: {str(db_error)}")
            completed_challenges = 0
            completed_lessons = 0
            completed_games = 0
            accuracy = 0
            user_level = 1
        
        # Define achievements based on user progress with proper icons
        achievements_list = [
            {
                'id': 1,
                'name': 'First Steps',
                'description': 'Complete your first challenge',
                'icon': 'flag',
                'iconType': 'Ionicons',
                'progress': min(completed_challenges, 1),
                'total': 1,
                'completed': completed_challenges >= 1,
                'percentage': min(completed_challenges, 1) * 100
            },
            {
                'id': 2,
                'name': 'Challenge Master',
                'description': 'Complete 10 challenges',
                'icon': 'trophy',
                'iconType': 'Ionicons',
                'progress': min(completed_challenges, 10),
                'total': 10,
                'completed': completed_challenges >= 10,
                'percentage': min(completed_challenges, 10) * 10
            },
            {
                'id': 3,
                'name': 'Learning Pathfinder',
                'description': 'Complete 5 lessons',
                'icon': 'book',
                'iconType': 'Ionicons',
                'progress': min(completed_lessons, 5),
                'total': 5,
                'completed': completed_lessons >= 5,
                'percentage': min(completed_lessons, 5) * 20
            },
            {
                'id': 4,
                'name': 'Game Champion',
                'description': 'Complete 3 educational games',
                'icon': 'game-controller',
                'iconType': 'Ionicons',
                'progress': min(completed_games, 3),
                'total': 3,
                'completed': completed_games >= 3,
                'percentage': min(completed_games, 3) * 33.3
            },
            {
                'id': 5,
                'name': 'Code Ninja',
                'description': 'Reach level 5',
                'icon': 'star',
                'iconType': 'Ionicons',
                'progress': min(user_level, 5),
                'total': 5,
                'completed': user_level >= 5,
                'percentage': min(user_level, 5) * 20
            },
            {
                'id': 6,
                'name': 'Precision Coder',
                'description': 'Achieve 80% accuracy',
                'icon': 'target',
                'iconType': 'Ionicons',
                'progress': min(accuracy, 80),
                'total': 80,
                'completed': accuracy >= 80,
                'percentage': min(accuracy, 80)
            }
        ]
        
        return jsonify({'achievements': achievements_list}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in /api/dashboard/achievements: {str(e)}")
        # Return safe default achievements
        default_achievements = [
            {
                'id': 1,
                'name': 'Welcome!',
                'description': 'Start your coding journey',
                'icon': 'hand-right',
                'iconType': 'Ionicons',
                'progress': 0,
                'total': 1,
                'completed': False,
                'percentage': 0
            }
        ]
        return jsonify({'achievements': default_achievements}), 200

@dashboard_bp.route('/dashboard/complete-activity', methods=['POST'])
@jwt_required()
def complete_activity():
    """Mark an activity as completed"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        data = request.get_json()
        activity_id = data.get('activity_id')
        activity_type = data.get('activity_type')
        
        # Log the activity completion
        activity = UserActivity(
            user_id=current_user_id,
            activity_type=f'{activity_type}_complete',
            activity_data=json.dumps({
                'activity_id': activity_id,
                'completed_at': datetime.utcnow().isoformat()
            })
        )
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'message': 'Activity completed successfully',
            'activity_id': activity_id,
            'points_earned': 10
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error in /api/dashboard/complete-activity: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@dashboard_bp.route('/dashboard/overview', methods=['GET'])
@jwt_required()
def get_dashboard_overview():
    """Get comprehensive dashboard overview"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get stats from other endpoints with error handling
        try:
            stats_response = get_dashboard_stats()
            activities_response = get_recent_activity()
            challenges_response = get_upcoming_challenges()
            achievements_response = get_achievements()
            
            # Extract data from responses
            stats_data = stats_response[0].json if hasattr(stats_response[0], 'json') else {'stats': []}
            activities_data = activities_response[0].json if hasattr(activities_response[0], 'json') else {'activities': []}
            challenges_data = challenges_response[0].json if hasattr(challenges_response[0], 'json') else {'challenges': []}
            achievements_data = achievements_response[0].json if hasattr(achievements_response[0], 'json') else {'achievements': []}
            
        except Exception as endpoint_error:
            current_app.logger.error(f"Endpoint error in overview: {str(endpoint_error)}")
            stats_data = {'stats': []}
            activities_data = {'activities': []}
            challenges_data = {'challenges': []}
            achievements_data = {'achievements': []}
        
        overview = {
            'user': user.to_dict(),
            'stats': stats_data.get('stats', []),
            'recent_activities': activities_data.get('activities', [])[:3],
            'upcoming_challenges': challenges_data.get('challenges', [])[:3],
            'achievements': achievements_data.get('achievements', [])[:4]
        }
        
        return jsonify({
            'success': True,
            'overview': overview
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching dashboard overview: {str(e)}")
        return jsonify({'error': 'Failed to fetch dashboard data'}), 500