from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from app.models import User, UserProfile, BlacklistedToken
from app import db
from datetime import datetime, timedelta
import re
import uuid

auth_bp = Blueprint('auth', __name__)

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Basic password validation"""
    if len(password) < 6:
        return False, 'Password must be at least 6 characters long'
    return True, ''

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
        
        # Validate password
        is_valid_password, password_error = validate_password(password)
        if not is_valid_password:
            return jsonify({'error': password_error}), 400
        
        # Check if user exists
        if User.query.filter_by(email=email).first():
            return jsonify({'error': 'User with this email already exists'}), 409
        
        # Create user
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_verified=False  # Email verification can be added later
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
            'success': True,
            'message': 'User created successfully',
            'user': user_data,
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Signup error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/guest-signup', methods=['POST'])
def guest_signup():
    """Create a temporary guest account"""
    try:
        # Generate guest credentials
        guest_id = str(uuid.uuid4())
        guest_email = f"guest_{guest_id[:8]}@edplayapp.com"
        guest_password = str(uuid.uuid4())
        
        # Create guest user
        user = User(
            email=guest_email,
            first_name="Guest",
            last_name="User",
            is_guest=True,
            is_verified=False
        )
        user.set_password(guest_password)
        
        # Create basic profile
        profile = UserProfile(
            user=user,
            grade_level="Not specified",
            is_minor=True
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
            'success': True,
            'message': 'Guest account created successfully',
            'user': user_data,
            'access_token': access_token,
            'refresh_token': refresh_token,
            'is_guest': True
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Guest signup error: {str(e)}')
        return jsonify({'error': 'Failed to create guest account'}), 500

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
            'success': True,
            'message': 'Login successful',
            'user': user_data,
            'access_token': access_token,
            'refresh_token': refresh_token
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Signin error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """Refresh access token using refresh token"""
    try:
        current_user_id = get_jwt_identity()
        
        # Verify user still exists and is active
        user = User.query.filter_by(id=current_user_id, is_active=True).first()
        if not user:
            return jsonify({'error': 'User not found or inactive'}), 401
        
        # Create new access token
        new_access_token = create_access_token(identity=current_user_id)
        
        return jsonify({
            'success': True,
            'access_token': new_access_token
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Token refresh error: {str(e)}')
        return jsonify({'error': 'Failed to refresh token'}), 500

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
        
        return jsonify({
            'success': True,
            'user': user_data
        }), 200
        
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
        
        return jsonify({
            'success': True,
            'message': 'Successfully logged out'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Logout error: {str(e)}')
        return jsonify({'error': 'Logout failed'}), 500

@auth_bp.route('/verify-token', methods=['POST'])
@jwt_required()
def verify_token():
    """Verify if the current access token is valid"""
    try:
        user_id = get_jwt_identity()
        user = User.query.filter_by(id=user_id, is_active=True).first()
        
        if not user:
            return jsonify({'valid': False, 'error': 'User not found'}), 401
        
        return jsonify({
            'valid': True,
            'user_id': user_id
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Token verification error: {str(e)}')
        return jsonify({'valid': False, 'error': 'Token verification failed'}), 500

@auth_bp.route('/update-profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """Update user profile information"""
    try:
        user_id = get_jwt_identity()
        user = User.query.get(user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        
        # Update user basic info
        if 'first_name' in data:
            user.first_name = data['first_name'].strip()
        if 'last_name' in data:
            user.last_name = data['last_name'].strip()
        
        # Ensure profile exists
        if not user.profile:
            user.profile = UserProfile(user_id=user_id)
            db.session.add(user.profile)
        
        profile = user.profile
        
        # Update profile fields
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
        
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        user_data = user.to_dict()
        user_data['profile'] = profile.to_dict()
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'user': user_data
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'Update profile error: {str(e)}')
        return jsonify({'error': 'Failed to update profile'}), 500

@auth_bp.route('/check-email', methods=['POST'])
def check_email():
    """Check if email is available for registration"""
    try:
        data = request.get_json()
        email = data.get('email', '').strip().lower()
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        if not validate_email(email):
            return jsonify({'error': 'Invalid email format'}), 400
        
        user_exists = User.query.filter_by(email=email).first() is not None
        
        return jsonify({
            'success': True,
            'available': not user_exists,
            'email': email
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'Check email error: {str(e)}')
        return jsonify({'error': 'Failed to check email availability'}), 500