from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, Challenge, ChallengeAttempt, AIInteraction, UserChallengeProgress
from app.services.ai_service import AIService
from app import db
from datetime import datetime
import json

ai_bp = Blueprint('ai', __name__)

@ai_bp.route('/api/ai/generate-challenge', methods=['POST'])
@jwt_required()
def generate_ai_challenge():
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        preferences = data.get('preferences', {})
        
        user_level = 1
        completed_challenges = UserChallengeProgress.query.filter_by(
            user_id=current_user_id, 
            completed=True
        ).count()
        user_level = min((completed_challenges // 3) + 1, 10)
        
        ai_service = AIService()
        challenge_data = ai_service.generate_challenge(
            user_level=user_level,
            preferences=preferences
        )
        
        challenge = Challenge(
            title=challenge_data.get('title', 'AI Generated Challenge'),
            description=challenge_data.get('description', ''),
            difficulty=challenge_data.get('difficulty', 'beginner'),
            category=challenge_data.get('category', 'programming'),
            points=challenge_data.get('points', 100),
            created_by='ai',
            is_ai_generated=True,
            ai_prompt=json.dumps(preferences)
        )
        
        if 'requirements' in challenge_data:
            challenge.set_requirements(challenge_data['requirements'])
        
        db.session.add(challenge)
        db.session.commit()
        
        interaction = AIInteraction(
            user_id=current_user_id,
            action='generate_challenge',
            input_data=json.dumps(preferences),
            output_data=json.dumps({
                'challenge_id': challenge.id,
                'title': challenge.title,
                'difficulty': challenge.difficulty
            }),
            model_used=getattr(ai_service, 'current_model', 'gpt-3.5-turbo')
        )
        db.session.add(interaction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'challenge': challenge.to_dict(),
            'ai_feedback': challenge_data.get('ai_feedback', 'Challenge generated successfully!')
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error generating AI challenge: {str(e)}")
        return jsonify({'error': 'Failed to generate challenge'}), 500

@ai_bp.route('/api/ai/analyze-solution', methods=['POST'])
@jwt_required()
def analyze_solution():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        solution_code = data.get('solution_code')
        challenge_id = data.get('challenge_id')
        
        if not solution_code or not challenge_id:
            return jsonify({'error': 'Solution code and challenge ID are required'}), 400
        
        challenge = Challenge.query.get(challenge_id)
        if not challenge:
            return jsonify({'error': 'Challenge not found'}), 404
        
        ai_service = AIService()
        challenge_requirements = challenge.get_requirements()
        
        analysis = ai_service.analyze_solution(
            challenge_description=challenge.description,
            solution_code=solution_code,
            requirements=challenge_requirements
        )
        
        attempt = ChallengeAttempt(
            user_id=current_user_id,
            challenge_id=challenge_id,
            solution_code=solution_code,
            is_correct=analysis.get('is_correct', False),
            submitted_at=datetime.utcnow()
        )
        db.session.add(attempt)
        
        if analysis.get('is_correct', False):
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
            
            user_progress.completed = True
            user_progress.completed_at = datetime.utcnow()
        
        interaction = AIInteraction(
            user_id=current_user_id,
            action='analyze_solution',
            input_data=json.dumps({
                'challenge_id': challenge.id,
                'solution_code_length': len(solution_code),
                'challenge_title': challenge.title
            }),
            output_data=json.dumps({
                'is_correct': analysis.get('is_correct', False),
                'score': analysis.get('score', 0)
            }),
            model_used=getattr(ai_service, 'current_model', 'gpt-3.5-turbo')
        )
        db.session.add(interaction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'analysis': analysis,
            'is_correct': analysis.get('is_correct', False),
            'score': analysis.get('score', 0),
            'improvement_suggestions': analysis.get('improvements', []),
            'attempt_id': attempt.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error analyzing solution: {str(e)}")
        return jsonify({'error': 'Failed to analyze solution'}), 500

@ai_bp.route('/api/ai/get-hint', methods=['POST'])
@jwt_required()
def get_ai_hint():
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
        
        ai_service = AIService()
        hint = ai_service.generate_hint(
            challenge_description=challenge.description,
            difficulty=challenge.difficulty,
            current_approach=current_approach
        )
        
        interaction = AIInteraction(
            user_id=current_user_id,
            action='get_hint',
            input_data=json.dumps({
                'challenge_id': challenge_id,
                'has_approach': bool(current_approach),
                'challenge_title': challenge.title
            }),
            output_data=json.dumps({'hint': hint}),
            model_used=getattr(ai_service, 'current_model', 'gpt-3.5-turbo')
        )
        db.session.add(interaction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'hint': hint,
            'challenge_id': challenge_id,
            'challenge_title': challenge.title
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error generating hint: {str(e)}")
        return jsonify({'error': 'Failed to generate hint'}), 500

@ai_bp.route('/api/ai/interactions', methods=['GET'])
@jwt_required()
def get_ai_interactions():
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

@ai_bp.route('/api/ai/explain-concept', methods=['POST'])
@jwt_required()
def explain_concept():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        concept = data.get('concept')
        context = data.get('context', '')
        
        if not concept:
            return jsonify({'error': 'Concept is required'}), 400
        
        ai_service = AIService()
        explanation = ai_service.explain_concept(
            concept=concept,
            context=context
        )
        
        interaction = AIInteraction(
            user_id=current_user_id,
            action='explain_concept',
            input_data=json.dumps({
                'concept': concept,
                'context': context
            }),
            output_data=json.dumps({'explanation': explanation}),
            model_used=getattr(ai_service, 'current_model', 'gpt-3.5-turbo')
        )
        db.session.add(interaction)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'concept': concept,
            'explanation': explanation
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error explaining concept: {str(e)}")
        return jsonify({'error': 'Failed to explain concept'}), 500

@ai_bp.route('/api/ai/health', methods=['GET'])
def ai_health_check():
    try:
        ai_service = AIService()
        is_healthy = hasattr(ai_service, 'generate_challenge')
        
        return jsonify({
            'success': True,
            'healthy': is_healthy,
            'service': 'AI Service',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"AI health check failed: {str(e)}")
        return jsonify({
            'success': False,
            'healthy': False,
            'error': str(e),
            'service': 'AI Service'
        }), 503
