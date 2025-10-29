from flask import Blueprint, jsonify, current_app, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Challenge, ChallengeAttempt, UserChallengeProgress, AIInteraction
from app import db
from datetime import datetime, timedelta
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/dashboard/stats', methods=['GET'])
@jwt_required()
def get_dashboard_stats():
    """Get dashboard statistics for the current user - Updated for React Native StatsGrid"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Calculate stats based on your models
        total_challenges = Challenge.query.count()
        completed_challenges = UserChallengeProgress.query.filter_by(
            user_id=current_user_id, 
            completed=True
        ).count()
        
        recent_attempts = ChallengeAttempt.query.filter_by(
            user_id=current_user_id
        ).filter(
            ChallengeAttempt.submitted_at >= datetime.utcnow() - timedelta(days=7)
        ).count()
        
        ai_interactions = AIInteraction.query.filter_by(
            user_id=current_user_id
        ).filter(
            AIInteraction.created_at >= datetime.utcnow() - timedelta(days=30)
        ).count()
        
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
                'value': str(getattr(user, 'level', 1)), 
                'subtitle': 'Level', 
                'change': '+0', 
                'gradient': ['#FFD166', '#FFB347'],
                'icon': 'star',
                'iconType': 'Ionicons',
                'suffix': ''
            },
            {
                'id': '3', 
                'title': 'Points Earned', 
                'value': str(getattr(user, 'points', 0)), 
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
                'value': str(recent_attempts), 
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
        return jsonify({'error': 'Internal server error'}), 500

@dashboard_bp.route('/dashboard/recent-activity', methods=['GET'])
@jwt_required()
def get_recent_activity():
    """Get recent user activity - Updated with proper icons"""
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
        
        # Format challenge attempts for React Native with proper icons
        for attempt in recent_attempts:
            challenge = Challenge.query.get(attempt.challenge_id)
            activities.append({
                'id': f'challenge_{attempt.id}',
                'type': 'challenge',
                'title': f'Challenge: {challenge.title if challenge else "Unknown"}',
                'description': f'{"Completed" if attempt.is_correct else "Attempted"} challenge',
                'time': attempt.submitted_at.strftime('%Y-%m-%d %H:%M') if attempt.submitted_at else 'Recently',
                'icon': 'trophy',
                'iconType': 'Ionicons',
                'completed': attempt.is_correct
            })
        
        # Format AI interactions for React Native with proper icons
        for interaction in recent_ai_interactions:
            activities.append({
                'id': f'ai_{interaction.id}',
                'type': 'ai_interaction',
                'title': 'AI Assistance',
                'description': f'Used {interaction.model_used or "AI"} for help',
                'time': interaction.created_at.strftime('%Y-%m-%d %H:%M') if interaction.created_at else 'Recently',
                'icon': 'help-buoy',
                'iconType': 'Ionicons',
                'completed': True
            })
        
        # If no activities, return sample data with proper icons
        if not activities:
            activities = [
                {
                    'id': '1',
                    'type': 'challenge',
                    'title': 'Python Basics Challenge',
                    'description': 'Completed programming fundamentals',
                    'time': '2 hours ago',
                    'icon': 'trophy',
                    'iconType': 'Ionicons',
                    'completed': True
                },
                {
                    'id': '2', 
                    'type': 'ai_interaction',
                    'title': 'AI Code Review',
                    'description': 'Got help with algorithm optimization',
                    'time': '5 hours ago',
                    'icon': 'help-buoy',
                    'iconType': 'Ionicons',
                    'completed': True
                }
            ]
        
        # Sort by time and limit
        activities.sort(key=lambda x: x.get('time', ''), reverse=True)
        activities = activities[:limit]
        
        return jsonify({'activities': activities}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in /api/dashboard/recent-activity: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@dashboard_bp.route('/dashboard/upcoming-challenges', methods=['GET'])
@jwt_required()
def get_upcoming_challenges():
    """Get upcoming challenges - Updated for React Native"""
    try:
        # Get active challenges that haven't ended
        current_time = datetime.utcnow()
        challenges = Challenge.query.filter(
            (Challenge.end_date == None) | (Challenge.end_date >= current_time)
        ).filter_by(
            is_active=True
        ).limit(5).all()
        
        challenge_list = []
        for challenge in challenges:
            # Count participants (users who attempted this challenge)
            participants = ChallengeAttempt.query.filter_by(
                challenge_id=challenge.id
            ).distinct(ChallengeAttempt.user_id).count()
            
            challenge_list.append({
                'id': challenge.id,
                'title': challenge.title,
                'description': challenge.description or 'Test your skills with this challenge',
                'date': challenge.end_date.strftime('%Y-%m-%d') if challenge.end_date else 'No deadline',
                'participants': participants,
                'difficulty': getattr(challenge, 'difficulty', 'medium'),
                'category': getattr(challenge, 'category', 'programming')
            })
        
        # If no challenges, return sample data
        if not challenge_list:
            challenge_list = [
                {
                    'id': 1,
                    'title': 'Python Fundamentals Challenge',
                    'description': 'Master basic Python concepts and syntax',
                    'date': '2025-10-28',
                    'participants': 156,
                    'difficulty': 'beginner',
                    'category': 'python'
                },
                {
                    'id': 2,
                    'title': 'Algorithm Mastery',
                    'description': 'Solve complex algorithm problems', 
                    'date': '2025-10-30',
                    'participants': 89,
                    'difficulty': 'advanced',
                    'category': 'algorithms'
                }
            ]
        
        return jsonify({'challenges': challenge_list}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in /api/dashboard/upcoming-challenges: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@dashboard_bp.route('/dashboard/achievements', methods=['GET'])
@jwt_required()
def get_achievements():
    """Get user achievements - Updated with proper icons"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        achievements_list = []
        
        # Calculate user progress for achievements
        completed_challenges = UserChallengeProgress.query.filter_by(
            user_id=current_user_id, 
            completed=True
        ).count()
        
        total_attempts = ChallengeAttempt.query.filter_by(
            user_id=current_user_id
        ).count()
        
        correct_attempts = ChallengeAttempt.query.filter_by(
            user_id=current_user_id,
            is_correct=True
        ).count()
        
        accuracy = (correct_attempts / total_attempts * 100) if total_attempts > 0 else 0
        
        # Define achievements based on user progress with proper icons
        achievements_data = [
            {
                'id': 1,
                'name': 'First Steps',
                'description': 'Complete your first challenge',
                'icon': 'flag',
                'iconType': 'Ionicons',
                'progress': min(completed_challenges, 1) * 100,
                'completed': completed_challenges >= 1
            },
            {
                'id': 2,
                'name': 'Challenge Master',
                'description': 'Complete 10 challenges',
                'icon': 'trophy',
                'iconType': 'Ionicons',
                'progress': min(completed_challenges, 10) * 10,
                'completed': completed_challenges >= 10
            },
            {
                'id': 3,
                'name': 'Code Ninja',
                'description': 'Reach level 5',
                'icon': 'star',
                'iconType': 'Ionicons',
                'progress': min(getattr(user, 'level', 1), 5) * 20,
                'completed': getattr(user, 'level', 0) >= 5
            },
            {
                'id': 4,
                'name': 'Precision Coder',
                'description': 'Achieve 80% accuracy',
                'icon': 'target',
                'iconType': 'Ionicons',
                'progress': min(accuracy, 80),
                'completed': accuracy >= 80
            }
        ]
        
        # Add any existing achievements from user model if available
        if hasattr(user, 'achievements') and user.achievements:
            for achievement in user.achievements:
                achievements_list.append({
                    'id': len(achievements_list) + 1,
                    'name': achievement.get('name', 'Achievement'),
                    'description': achievement.get('description', ''),
                    'icon': achievement.get('icon', 'trophy'),
                    'iconType': 'Ionicons',
                    'progress': 100,
                    'completed': True
                })
        
        # Combine with calculated achievements
        for achievement in achievements_data:
            achievements_list.append(achievement)
        
        # Ensure we have at least some achievements
        if not achievements_list:
            achievements_list = [
                {
                    'id': 1,
                    'name': 'Welcome!',
                    'description': 'Start your coding journey',
                    'icon': 'hand-right',
                    'iconType': 'Ionicons',
                    'progress': 0,
                    'completed': False
                }
            ]
        
        return jsonify({'achievements': achievements_list}), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in /api/dashboard/achievements: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@dashboard_bp.route('/dashboard/complete-activity', methods=['POST'])
@jwt_required()
def complete_activity():
    """Mark an activity as completed - Simple implementation"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
            
        data = request.get_json()
        activity_id = data.get('activity_id')
        
        # For now, just return success since we don't have a specific activity model
        # In a real implementation, you'd update the relevant model
        
        return jsonify({
            'message': 'Activity completed successfully',
            'activity_id': activity_id,
            'points_earned': 10
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error in /api/dashboard/complete-activity: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

# Keep your existing endpoints for other functionality
@dashboard_bp.route('/dashboard/overview', methods=['GET'])
@jwt_required()
def get_dashboard_overview():
    """Get overview data for user dashboard - Your existing endpoint"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Your existing overview logic here
        # ...
        
        return jsonify({
            'success': True,
            'overview': {
                # Your existing overview data structure
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching dashboard overview: {str(e)}")
        return jsonify({'error': 'Failed to fetch dashboard data'}), 500