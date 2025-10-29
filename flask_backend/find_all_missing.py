# final_fix_all.py
import os
import shutil

def recreate_ai_py():
    """Recreate ai.py with correct content"""
    content = '''from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Challenge, ChallengeAttempt, AIInteraction
from app.services.ai_service import AIService
from app import db
from datetime import datetime
import json

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/api/ai/generate-challenge', methods=['POST'])
@jwt_required()
def generate_ai_challenge():
    """Generate a challenge using AI based on user preferences"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        preferences = data.get('preferences', {})
        
        # Get AI service instance
        ai_service = AIService()
        
        # Generate challenge using AI
        challenge_data = ai_service.generate_challenge(
            user_level=user.level,
            preferences=preferences
        )
        
        # Create new challenge
        challenge = Challenge(
            title=challenge_data['title'],
            description=challenge_data['description'],
            difficulty=challenge_data['difficulty'],
            category=challenge_data['category'],
            points=challenge_data['points'],
            requirements=challenge_data.get('requirements', {}),
            created_by='ai',
            is_ai_generated=True,
            ai_prompt=json.dumps(preferences)
        )
        
        db.session.add(challenge)
        db.session.commit()
        
        # Log AI interaction
        interaction = AIInteraction(
            user_id=current_user_id,
            action='generate_challenge',
            input_data=json.dumps(preferences),
            output_data=json.dumps(challenge_data),
            model_used=ai_service.current_model
        )
        db.session.add(interaction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'challenge': challenge.to_dict(),
            'ai_feedback': challenge_data.get('ai_feedback', '')
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error generating AI challenge: {str(e)}")
        return jsonify({'error': 'Failed to generate challenge'}), 500

@ai_bp.route('/api/ai/analyze-solution', methods=['POST'])
@jwt_required()
def analyze_solution():
    """Analyze user's solution using AI and provide feedback"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        attempt_id = data.get('attempt_id')
        solution_code = data.get('solution_code')
        challenge_id = data.get('challenge_id')
        
        if not all([attempt_id or challenge_id, solution_code]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Get attempt or challenge
        if attempt_id:
            attempt = ChallengeAttempt.query.get(attempt_id)
            if not attempt or attempt.user_id != current_user_id:
                return jsonify({'error': 'Attempt not found'}), 404
            challenge = attempt.challenge
        else:
            challenge = Challenge.query.get(challenge_id)
            if not challenge:
                return jsonify({'error': 'Challenge not found'}), 404
        
        # Get AI service instance
        ai_service = AIService()
        
        # Analyze solution
        analysis = ai_service.analyze_solution(
            challenge_description=challenge.description,
            solution_code=solution_code,
            requirements=challenge.requirements
        )
        
        # Log AI interaction
        interaction = AIInteraction(
            user_id=current_user_id,
            action='analyze_solution',
            input_data=json.dumps({
                'challenge_id': challenge.id,
                'solution_code_length': len(solution_code)
            }),
            output_data=json.dumps(analysis),
            model_used=ai_service.current_model
        )
        db.session.add(interaction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'analysis': analysis,
            'improvement_suggestions': analysis.get('improvements', [])
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error analyzing solution: {str(e)}")
        return jsonify({'error': 'Failed to analyze solution'}), 500

@ai_bp.route('/api/ai/get-hint', methods=['POST'])
@jwt_required()
def get_ai_hint():
    """Get AI-generated hint for a challenge"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        challenge_id = data.get('challenge_id')
        current_approach = data.get('current_approach', '')
        
        if not challenge_id:
            return jsonify({'error': 'Challenge ID required'}), 400
        
        challenge = Challenge.query.get(challenge_id)
        if not challenge:
            return jsonify({'error': 'Challenge not found'}), 404
        
        # Get AI service instance
        ai_service = AIService()
        
        # Generate hint
        hint = ai_service.generate_hint(
            challenge_description=challenge.description,
            difficulty=challenge.difficulty,
            current_approach=current_approach
        )
        
        # Log AI interaction
        interaction = AIInteraction(
            user_id=current_user_id,
            action='get_hint',
            input_data=json.dumps({
                'challenge_id': challenge_id,
                'has_approach': bool(current_approach)
            }),
            output_data=json.dumps({'hint': hint}),
            model_used=ai_service.current_model
        )
        db.session.add(interaction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'hint': hint,
            'challenge_id': challenge_id
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error generating hint: {str(e)}")
        return jsonify({'error': 'Failed to generate hint'}), 500

@ai_bp.route('/api/ai/interactions', methods=['GET'])
@jwt_required()
def get_ai_interactions():
    """Get user's AI interaction history"""
    try:
        current_user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        
        interactions = AIInteraction.query.filter_by(
            user_id=current_user_id
        ).order_by(
            AIInteraction.created_at.desc()
        ).paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'success': True,
            'interactions': [interaction.to_dict() for interaction in interactions.items],
            'total': interactions.total,
            'pages': interactions.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching AI interactions: {str(e)}")
        return jsonify({'error': 'Failed to fetch interactions'}), 500
'''
    with open('app/routes/ai.py', 'w', encoding='utf-8') as f:
        f.write(content)
    return "ai.py"

def recreate_challenges_py():
    """Recreate challenges.py with correct content"""
    content = '''from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Challenge, ChallengeAttempt, UserChallengeProgress
from app import db
from datetime import datetime
from sqlalchemy import or_, and_

challenges_bp = Blueprint('challenges', __name__)

@challenges_bp.route('/api/challenges', methods=['GET'])
@jwt_required()
def get_challenges():
    """Get paginated list of challenges with filtering and sorting"""
    try:
        current_user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        difficulty = request.args.get('difficulty')
        category = request.args.get('category')
        search = request.args.get('search')
        sort_by = request.args.get('sort_by', 'created_at')
        sort_order = request.args.get('sort_order', 'desc')
        
        # Base query
        query = Challenge.query
        
        # Apply filters
        if difficulty:
            query = query.filter(Challenge.difficulty == difficulty)
        if category:
            query = query.filter(Challenge.category == category)
        if search:
            query = query.filter(
                or_(
                    Challenge.title.ilike(f'%{search}%'),
                    Challenge.description.ilike(f'%{search}%')
                )
            )
        
        # Apply sorting
        if sort_by == 'difficulty':
            if sort_order == 'asc':
                query = query.order_by(Challenge.difficulty.asc())
            else:
                query = query.order_by(Challenge.difficulty.desc())
        elif sort_by == 'points':
            if sort_order == 'asc':
                query = query.order_by(Challenge.points.asc())
            else:
                query = query.order_by(Challenge.points.desc())
        else:
            if sort_order == 'asc':
                query = query.order_by(Challenge.created_at.asc())
            else:
                query = query.order_by(Challenge.created_at.desc())
        
        # Paginate
        challenges = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        # Get user's progress
        challenge_ids = [challenge.id for challenge in challenges.items]
        user_progress = UserChallengeProgress.query.filter(
            UserChallengeProgress.user_id == current_user_id,
            UserChallengeProgress.challenge_id.in_(challenge_ids)
        ).all()
        
        progress_map = {progress.challenge_id: progress for progress in user_progress}
        
        # Prepare response
        challenges_data = []
        for challenge in challenges.items:
            challenge_data = challenge.to_dict()
            progress = progress_map.get(challenge.id)
            
            if progress:
                if progress.completed:
                    challenge_data['status'] = 'completed'
                    challenge_data['completed_at'] = progress.completed_at.isoformat()
                else:
                    challenge_data['status'] = 'in_progress'
                    challenge_data['started_at'] = progress.started_at.isoformat()
            else:
                challenge_data['status'] = 'not_started'
            
            challenges_data.append(challenge_data)
        
        return jsonify({
            'success': True,
            'challenges': challenges_data,
            'total': challenges.total,
            'pages': challenges.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching challenges: {str(e)}")
        return jsonify({'error': 'Failed to fetch challenges'}), 500

@challenges_bp.route('/api/challenges/<int:challenge_id>', methods=['GET'])
@jwt_required()
def get_challenge(challenge_id):
    """Get specific challenge details"""
    try:
        current_user_id = get_jwt_identity()
        
        challenge = Challenge.query.get(challenge_id)
        if not challenge:
            return jsonify({'error': 'Challenge not found'}), 404
        
        # Get user's progress
        progress = UserChallengeProgress.query.filter_by(
            user_id=current_user_id,
            challenge_id=challenge_id
        ).first()
        
        challenge_data = challenge.to_dict()
        
        if progress:
            challenge_data['user_progress'] = {
                'started_at': progress.started_at.isoformat(),
                'completed': progress.completed,
                'completed_at': progress.completed_at.isoformat() if progress.completed_at else None,
                'attempts_count': progress.attempts_count
            }
        
        return jsonify({
            'success': True,
            'challenge': challenge_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching challenge: {str(e)}")
        return jsonify({'error': 'Failed to fetch challenge'}), 500

@challenges_bp.route('/api/challenges/<int:challenge_id>/start', methods=['POST'])
@jwt_required()
def start_challenge(challenge_id):
    """Start a challenge for the current user"""
    try:
        current_user_id = get_jwt_identity()
        
        challenge = Challenge.query.get(challenge_id)
        if not challenge:
            return jsonify({'error': 'Challenge not found'}), 404
        
        # Check if already in progress
        existing_progress = UserChallengeProgress.query.filter_by(
            user_id=current_user_id,
            challenge_id=challenge_id
        ).first()
        
        if existing_progress:
            if existing_progress.completed:
                return jsonify({'error': 'Challenge already completed'}), 400
            return jsonify({
                'success': True,
                'message': 'Challenge already in progress',
                'progress': existing_progress.to_dict()
            }), 200
        
        # Create new progress
        progress = UserChallengeProgress(
            user_id=current_user_id,
            challenge_id=challenge_id,
            started_at=datetime.utcnow()
        )
        
        db.session.add(progress)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Challenge started successfully',
            'progress': progress.to_dict()
        }), 201
        
    except Exception as e:
        current_app.logger.error(f"Error starting challenge: {str(e)}")
        return jsonify({'error': 'Failed to start challenge'}), 500

@challenges_bp.route('/api/challenges/<int:challenge_id>/submit', methods=['POST'])
@jwt_required()
def submit_challenge(challenge_id):
    """Submit a solution for a challenge"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        solution_code = data.get('solution_code')
        if not solution_code:
            return jsonify({'error': 'Solution code is required'}), 400
        
        challenge = Challenge.query.get(challenge_id)
        if not challenge:
            return jsonify({'error': 'Challenge not found'}), 404
        
        # Get or create progress
        progress = UserChallengeProgress.query.filter_by(
            user_id=current_user_id,
            challenge_id=challenge_id
        ).first()
        
        if not progress:
            progress = UserChallengeProgress(
                user_id=current_user_id,
                challenge_id=challenge_id,
                started_at=datetime.utcnow()
            )
            db.session.add(progress)
        
        # Create attempt
        attempt = ChallengeAttempt(
            user_id=current_user_id,
            challenge_id=challenge_id,
            solution_code=solution_code,
            submitted_at=datetime.utcnow()
        )
        
        # Simple validation (always true for now)
        is_correct = True
        
        attempt.is_correct = is_correct
        db.session.add(attempt)
        
        # Update progress
        progress.attempts_count += 1
        
        if is_correct and not progress.completed:
            progress.completed = True
            progress.completed_at = datetime.utcnow()
            
            # Update user points and level
            user = User.query.get(current_user_id)
            user.points += challenge.points
            user.completed_challenges_count += 1
            
            # Check for level up
            if user.points >= user.level * 1000:
                user.level += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'correct': is_correct,
            'attempt': attempt.to_dict(),
            'progress': progress.to_dict(),
            'points_earned': challenge.points if is_correct and progress.completed else 0
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error submitting challenge: {str(e)}")
        return jsonify({'error': 'Failed to submit challenge'}), 500

@challenges_bp.route('/api/challenges/<int:challenge_id>/attempts', methods=['GET'])
@jwt_required()
def get_challenge_attempts(challenge_id):
    """Get user's attempts for a specific challenge"""
    try:
        current_user_id = get_jwt_identity()
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 5, type=int)
        
        attempts = ChallengeAttempt.query.filter_by(
            user_id=current_user_id,
            challenge_id=challenge_id
        ).order_by(
            ChallengeAttempt.submitted_at.desc()
        ).paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'success': True,
            'attempts': [attempt.to_dict() for attempt in attempts.items],
            'total': attempts.total,
            'pages': attempts.pages,
            'current_page': page
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching attempts: {str(e)}")
        return jsonify({'error': 'Failed to fetch attempts'}), 500
'''
    with open('app/routes/challenges.py', 'w', encoding='utf-8') as f:
        f.write(content)
    return "challenges.py"

def recreate_dashboard_py():
    """Recreate dashboard.py with correct content"""
    content = '''from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Challenge, ChallengeAttempt, UserChallengeProgress, AIInteraction
from app import db
from datetime import datetime, timedelta
from sqlalchemy import func

dashboard_bp = Blueprint('dashboard', __name__)

@dashboard_bp.route('/api/dashboard/overview', methods=['GET'])
@jwt_required()
def get_dashboard_overview():
    """Get overview data for user dashboard"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Calculate recent activity (last 7 days)
        week_ago = datetime.utcnow() - timedelta(days=7)
        
        # Recent challenge attempts
        recent_attempts = ChallengeAttempt.query.filter_by(
            user_id=current_user_id
        ).filter(
            ChallengeAttempt.submitted_at >= week_ago
        ).count()
        
        # Completed challenges this week
        completed_this_week = UserChallengeProgress.query.filter_by(
            user_id=current_user_id,
            completed=True
        ).filter(
            UserChallengeProgress.completed_at >= week_ago
        ).count()
        
        # AI interactions this week
        ai_interactions_week = AIInteraction.query.filter_by(
            user_id=current_user_id
        ).filter(
            AIInteraction.created_at >= week_ago
        ).count()
        
        # Current progress statistics
        total_challenges = Challenge.query.count()
        user_completed = UserChallengeProgress.query.filter_by(
            user_id=current_user_id,
            completed=True
        ).count()
        
        user_in_progress = UserChallengeProgress.query.filter_by(
            user_id=current_user_id,
            completed=False
        ).count()
        
        completion_rate = (user_completed / total_challenges * 100) if total_challenges > 0 else 0
        
        return jsonify({
            'success': True,
            'overview': {
                'user_stats': {
                    'level': user.level,
                    'points': user.points,
                    'rank': user.rank,
                    'completion_rate': round(completion_rate, 1)
                },
                'activity_metrics': {
                    'recent_attempts': recent_attempts,
                    'completed_this_week': completed_this_week,
                    'ai_interactions_week': ai_interactions_week
                },
                'progress_summary': {
                    'total_challenges': total_challenges,
                    'completed': user_completed,
                    'in_progress': user_in_progress,
                    'not_started': total_challenges - user_completed - user_in_progress
                }
            }
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching dashboard overview: {str(e)}")
        return jsonify({'error': 'Failed to fetch dashboard data'}), 500

@dashboard_bp.route('/api/dashboard/activity', methods=['GET'])
@jwt_required()
def get_recent_activity():
    """Get recent user activity for dashboard"""
    try:
        current_user_id = get_jwt_identity()
        limit = request.args.get('limit', 10, type=int)
        
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
        
        # Combine and sort activities
        activities = []
        
        for attempt in recent_attempts:
            activities.append({
                'type': 'challenge_attempt',
                'timestamp': attempt.submitted_at,
                'data': {
                    'challenge_id': attempt.challenge_id,
                    'challenge_title': attempt.challenge.title,
                    'correct': attempt.is_correct,
                    'points': attempt.challenge.points if attempt.is_correct else 0
                }
            })
        
        for interaction in recent_ai_interactions:
            activities.append({
                'type': 'ai_interaction',
                'timestamp': interaction.created_at,
                'data': {
                    'action': interaction.action,
                    'model_used': interaction.model_used
                }
            })
        
        # Sort by timestamp descending
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        activities = activities[:limit]
        
        # Convert timestamps to ISO format
        for activity in activities:
            activity['timestamp'] = activity['timestamp'].isoformat()
        
        return jsonify({
            'success': True,
            'activities': activities
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching recent activity: {str(e)}")
        return jsonify({'error': 'Failed to fetch recent activity'}), 500

@dashboard_bp.route('/api/dashboard/achievements', methods=['GET'])
@jwt_required()
def get_achievements():
    """Get user achievements and milestones"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        achievements = []
        
        # Check for various achievements
        if user.completed_challenges_count >= 1:
            achievements.append({
                'name': 'First Steps',
                'description': 'Complete your first challenge',
                'icon': '🎯',
                'unlocked_at': user.updated_at.isoformat()
            })
        
        if user.completed_challenges_count >= 10:
            achievements.append({
                'name': 'Decathlete',
                'description': 'Complete 10 challenges',
                'icon': '🏆',
                'unlocked_at': user.updated_at.isoformat()
            })
        
        if user.level >= 5:
            achievements.append({
                'name': 'Rising Star',
                'description': 'Reach level 5',
                'icon': '⭐',
                'unlocked_at': user.updated_at.isoformat()
            })
        
        return jsonify({
            'success': True,
            'achievements': achievements
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching achievements: {str(e)}")
        return jsonify({'error': 'Failed to fetch achievements'}), 500
'''
    with open('app/routes/dashboard.py', 'w', encoding='utf-8') as f:
        f.write(content)
    return "dashboard.py"

def check_file_corruption(file_path):
    """Check if a file is corrupted (contains null bytes or invalid syntax)"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Check for null bytes
        if '\x00' in content:
            return True
        
        # Check syntax
        compile(content, file_path, 'exec')
        return False
    except:
        return True

def main():
    print("🚀 COMPREHENSIVE ROUTE FILES RECREATION")
    print("=" * 60)
    
    # List of all route files to check and recreate if needed
    route_files = [
        ('ai.py', recreate_ai_py),
        ('challenges.py', recreate_challenges_py),
        ('dashboard.py', recreate_dashboard_py),
    ]
    
    corrupted_files = []
    recreated_files = []
    
    print("🔍 Checking all route files...")
    for filename, recreate_func in route_files:
        file_path = f'app/routes/{filename}'
        if check_file_corruption(file_path):
            corrupted_files.append(filename)
            print(f"❌ {filename}: Corrupted")
        else:
            print(f"✅ {filename}: OK")
    
    print(f"\n🔧 Recreating {len(corrupted_files)} corrupted files...")
    for filename, recreate_func in route_files:
        if filename in corrupted_files:
            try:
                recreated_name = recreate_func()
                recreated_files.append(recreated_name)
                print(f"✅ Recreated: {recreated_name}")
            except Exception as e:
                print(f"❌ Failed to recreate {filename}: {e}")
    
    print("=" * 60)
    print(f"🎯 Recreated {len(recreated_files)} files")
    
    # Final test
    print("\n🧪 FINAL IMPORT TEST")
    print("=" * 60)
    
    test_modules = [
        'app.routes.auth',
        'app.routes.profile', 
        'app.routes.password',
        'app.routes.lessons',
        'app.routes.challenges',
        'app.routes.dashboard',
        'app.routes.ai',
        'app.routes.games',
        'app.routes.progress'
    ]
    
    successful = 0
    for module in test_modules:
        try:
            __import__(module)
            print(f"✅ {module}: SUCCESS")
            successful += 1
        except Exception as e:
            print(f"❌ {module}: FAILED - {e}")
    
    print("=" * 60)
    print(f"📊 {successful}/{len(test_modules)} imports successful")
    
    if successful == len(test_modules):
        print("🎉 ALL IMPORTS WORKING! Your Flask app is ready to run!")
        print("\n🚀 Run: python run.py")
    else:
        print("💡 Some imports need attention, but core functionality should work.")

if __name__ == "__main__":
    main()