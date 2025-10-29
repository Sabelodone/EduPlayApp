from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from app.models import User, UserProfile, BlacklistedToken
from app import db
from datetime import datetime, timedelta
import re

auth_bp = Blueprint('auth', __name__)

# ... rest of your auth.py code remains the same ...

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['email', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        first_name = data['first_name'].strip()
        last_name = data['last_name'].strip()
        
        # Validate email
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Check if user exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'User with this email already exists'}), 409
        
        # Create user
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name
        )
        user.set_password(password)
        
        # Create profile
        profile_data = data.get('profile', {})
        profile = UserProfile(
            user=user,
            grade_level=profile_data.get('grade_level'),
            school=profile_data.get('school'),
            subjects=profile_data.get('subjects', []),
            is_minor=profile_data.get('is_minor', True),
            guardian_name=profile_data.get('guardian_name'),
            guardian_email=profile_data.get('guardian_email'),
            guardian_phone=profile_data.get('guardian_phone')
        )
        
        db.session.add(user)
        db.session.add(profile)
        db.session.commit()
        
        # Create tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        user_data = user.to_dict()
        user_data['profile'] = profile.to_dict()
        
        return jsonify({
            'message': 'User created successfully',
            'user': user_data,
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Signup error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/signin', methods=['POST'])
def signin():
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        
        user = User.query.filter_by(email=email, is_active=True).first()
        
        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Update last login
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Create tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        user_data = user.to_dict()
        if user.profile:
            user_data['profile'] = user.profile.to_dict()
        
        return jsonify({
            'message': 'Login successful',
            'user': user_data,
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Signin error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user.to_dict()
        if user.profile:
            user_data['profile'] = user.profile.to_dict()
        
        return jsonify(user_data), 200
        
    except Exception as e:
        current_app.logger.error(f'Get user error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    try:
        jti = get_jwt()['jti']
        token_type = get_jwt()['type']
        user_id = get_jwt_identity()
        expires_at = datetime.fromtimestamp(get_jwt()['exp'])
        
        # Add token to blacklist
        blacklisted_token = BlacklistedToken(
            jti=jti,
            token_type=token_type,
            user_id=user_id,
            expires_at=expires_at
        )
        db.session.add(blacklisted_token)
        db.session.commit()
        
        return jsonify({'message': 'Successfully logged out'}), 200
        
    except Exception as e:
        current_app.logger.error(f'Logout error: {str(e)}')
        return jsonify({'error': 'Logout failed'}), 500