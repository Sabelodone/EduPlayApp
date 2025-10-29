from flask import Blueprint, request, jsonify, current_app
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
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        preferences = data.get('preferences', {})
        
        ai_service = AIService()
        challenge_data = ai_service.generate_challenge(
            user_level=user.level,
            preferences=preferences
        )
        
        challenge = Challenge(
            title=challenge_data['title'],
            description=challenge_data['description'],
            difficulty=challenge_data['difficulty'],
            category=challenge_data['category'],
            points=challenge_data['points'],
            created_by='ai',
            is_ai_generated=True
        )
        
        db.session.add(challenge)
        db.session.commit()
        
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
        analysis = ai_service.analyze_solution(
            challenge_description=challenge.description,
            solution_code=solution_code,
            requirements={}
        )
        
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