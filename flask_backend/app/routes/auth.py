# flask_backend/routes/auth.py
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity, get_jwt
from app.models import User, UserProfile, BlacklistedToken, PasswordResetToken, db, bcrypt
from datetime import datetime, timedelta
import re
import uuid
import json
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os

auth_bp = Blueprint('auth', __name__)

# Token refresh cooldown tracking
token_refresh_attempts = {}

def validate_email(email):
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password(password):
    """Enhanced password validation"""
    if len(password) < 6:
        return False, 'Password must be at least 6 characters long'
    
    if not any(c.isupper() for c in password):
        return False, 'Password must contain at least one uppercase letter'
    
    if not any(c.islower() for c in password):
        return False, 'Password must contain at least one lowercase letter'
    
    if not any(c.isdigit() for c in password):
        return False, 'Password must contain at least one number'
    
    if not any(c in '!@#$%^&*(),.?":{}|<>' for c in password):
        return False, 'Password must contain at least one special character'
    
    return True, ''

def check_refresh_cooldown(user_id):
    """Check if user is in refresh cooldown period"""
    now = datetime.utcnow()
    if user_id in token_refresh_attempts:
        last_attempt, attempts = token_refresh_attempts[user_id]
        cooldown_time = min(30 * (2 ** (attempts - 1)), 300)  # Exponential backoff, max 5 minutes
        
        if (now - last_attempt).total_seconds() < cooldown_time:
            return False, cooldown_time - (now - last_attempt).total_seconds()
    
    return True, 0

def track_refresh_attempt(user_id):
    """Track token refresh attempts for rate limiting"""
    now = datetime.utcnow()
    if user_id in token_refresh_attempts:
        last_attempt, attempts = token_refresh_attempts[user_id]
        
        # Reset attempts if last attempt was more than 10 minutes ago
        if (now - last_attempt).total_seconds() > 600:
            token_refresh_attempts[user_id] = (now, 1)
        else:
            token_refresh_attempts[user_id] = (now, attempts + 1)
    else:
        token_refresh_attempts[user_id] = (now, 1)

def clear_refresh_attempts(user_id):
    """Clear refresh attempts on successful refresh"""
    if user_id in token_refresh_attempts:
        del token_refresh_attempts[user_id]

@auth_bp.route('/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        current_app.logger.info(f"🔍 Received signup data for: {data.get('email')}")
        
        # Validate required fields
        required_fields = ['email', 'password', 'first_name', 'last_name']
        for field in required_fields:
            if not data.get(field):
                current_app.logger.error(f"❌ Missing required field: {field}")
                return jsonify({'error': f'{field} is required'}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        first_name = data['first_name'].strip()
        last_name = data['last_name'].strip()
        
        # Validate email
        if not validate_email(email):
            current_app.logger.error(f"❌ Invalid email format: {email}")
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate password
        is_valid_password, password_error = validate_password(password)
        if not is_valid_password:
            current_app.logger.error(f"❌ Invalid password: {password_error}")
            return jsonify({'error': password_error}), 400
        
        # Check if user exists
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            current_app.logger.error(f"❌ User already exists: {email}")
            return jsonify({'error': 'User with this email already exists'}), 409
        
        # Create user
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            is_verified=False
        )
        user.set_password(password)
        
        db.session.add(user)
        db.session.flush()  # Get the user ID without committing
        
        # Create profile
        profile_data = data.get('profile', {})
        subjects = profile_data.get('subjects', [])
        
        # Ensure subjects is a list
        if isinstance(subjects, str):
            try:
                subjects = json.loads(subjects)
            except json.JSONDecodeError:
                subjects = [s.strip() for s in subjects.split(',') if s.strip()]
        elif not isinstance(subjects, list):
            subjects = [subjects] if subjects else []
        
        profile = UserProfile(
            user_id=user.id,
            grade_level=profile_data.get('grade_level'),
            school=profile_data.get('school'),
            is_minor=profile_data.get('is_minor', True),
            guardian_name=profile_data.get('guardian_name'),
            guardian_email=profile_data.get('guardian_email'),
            guardian_phone=profile_data.get('guardian_phone')
        )
        profile.set_subjects(subjects)
        
        db.session.add(profile)
        db.session.commit()
        
        current_app.logger.info(f"✅ User created successfully: {user.id}")
        
        # Create tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        user_data = user.to_dict()
        
        return jsonify({
            'success': True,
            'message': 'User created successfully',
            'user': user_data,
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'bearer',
            'expires_in': 900
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'❌ Signup error: {str(e)}')
        return jsonify({'error': f'Internal server error: {str(e)}'}), 500

@auth_bp.route('/signin', methods=['POST'])
def signin():
    try:
        data = request.get_json()
        current_app.logger.info(f"🔐 Signin attempt for: {data.get('email')}")
        
        if not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Email and password are required'}), 400
        
        email = data['email'].strip().lower()
        password = data['password']
        
        user = User.query.filter_by(email=email, is_active=True).first()
        
        if not user or not user.check_password(password):
            current_app.logger.warning(f"❌ Invalid login attempt for: {email}")
            return jsonify({'error': 'Invalid email or password'}), 401
        
        # Update last login
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        # Clear any previous refresh attempts on successful login
        clear_refresh_attempts(user.id)
        
        # Create tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        user_data = user.to_dict()
        
        current_app.logger.info(f"✅ Successful login for: {email}")
        
        return jsonify({
            'success': True,
            'message': 'Login successful',
            'user': user_data,
            'access_token': access_token,
            'refresh_token': refresh_token,
            'token_type': 'bearer',
            'expires_in': 900
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'❌ Signin error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh_token():
    """Refresh access token using refresh token"""
    try:
        current_user_id = get_jwt_identity()
        current_app.logger.info(f"🔄 Token refresh requested for user: {current_user_id}")
        
        # Check refresh cooldown
        can_refresh, cooldown_remaining = check_refresh_cooldown(current_user_id)
        if not can_refresh:
            current_app.logger.warning(f"⏳ Refresh cooldown for user: {current_user_id}")
            return jsonify({
                'error': f'Refresh cooldown active. Please wait {int(cooldown_remaining)} seconds',
                'cooldown_remaining': int(cooldown_remaining)
            }), 429
        
        # Track refresh attempt
        track_refresh_attempt(current_user_id)
        
        # Verify user still exists and is active
        user = User.query.filter_by(id=current_user_id, is_active=True).first()
        if not user:
            clear_refresh_attempts(current_user_id)
            current_app.logger.error(f"❌ User not found during refresh: {current_user_id}")
            return jsonify({'error': 'User not found or inactive'}), 401
        
        # Check if refresh token is blacklisted
        jti = get_jwt()['jti']
        blacklisted = BlacklistedToken.query.filter_by(jti=jti).first()
        if blacklisted:
            clear_refresh_attempts(current_user_id)
            current_app.logger.error(f"❌ Blacklisted refresh token for user: {current_user_id}")
            return jsonify({'error': 'Refresh token has been revoked'}), 401
        
        # Create new access token
        new_access_token = create_access_token(identity=current_user_id)
        
        # Clear attempts on successful refresh
        clear_refresh_attempts(current_user_id)
        
        current_app.logger.info(f"✅ Token refreshed successfully for user: {current_user_id}")
        
        return jsonify({
            'success': True,
            'access_token': new_access_token,
            'token_type': 'bearer',
            'expires_in': 900
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'❌ Token refresh error: {str(e)}')
        return jsonify({'error': 'Failed to refresh token'}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information - FIXED ENDPOINT"""
    try:
        current_user_id = get_jwt_identity()
        current_app.logger.info(f"👤 /me endpoint called for user: {current_user_id}")
        
        user = User.query.get(current_user_id)
        
        if not user:
            current_app.logger.error(f"❌ User not found: {current_user_id}")
            return jsonify({'error': 'User not found'}), 404
        
        user_data = user.to_dict()
        current_app.logger.info(f"✅ User data retrieved: {user.email}")
        
        return jsonify({
            'success': True,
            'user': user_data
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'❌ Get user error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

# Add these password reset functions to auth.py
def generate_reset_token():
    """Generate a secure random token for password reset"""
    return secrets.token_urlsafe(32)

def send_reset_email(user_email, reset_token):
    """Send password reset email to user"""
    try:
        # In production, use environment variables for email configuration
        smtp_server = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
        smtp_port = int(os.environ.get('SMTP_PORT', 587))
        email_address = os.environ.get('EMAIL_ADDRESS', 'noreply@eduplay.com')
        email_password = os.environ.get('EMAIL_PASSWORD', '')
        
        # Create reset link - in production, use your frontend URL
        reset_link = f"http://yourapp.com/reset-password?token={reset_token}"
        
        # Create email message
        msg = MIMEMultipart()
        msg['From'] = email_address
        msg['To'] = user_email
        msg['Subject'] = 'EduPlay - Password Reset Request'
        
        # Email body
        body = f"""
        <html>
          <body>
            <h2>Password Reset Request</h2>
            <p>Hello,</p>
            <p>You requested to reset your password for your EduPlay account.</p>
            <p>Click the link below to reset your password:</p>
            <p><a href="{reset_link}" style="background-color: #0A7C72; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this reset, please ignore this email.</p>
            <br>
            <p>Best regards,<br>The EduPlay Team</p>
          </body>
        </html>
        """
        
        msg.attach(MIMEText(body, 'html'))
        
        # Send email
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            if email_password:
                server.login(email_address, email_password)
            server.send_message(msg)
            
        return True
    except Exception as e:
        current_app.logger.error(f'❌ Email sending failed: {str(e)}')
        return False

@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    try:
        data = request.get_json()
        current_app.logger.info(f"📧 Forgot password request for: {data.get('email')}")
        
        if not data.get('email'):
            return jsonify({'error': 'Email is required'}), 400
        
        email = data['email'].strip().lower()
        
        # Check if user exists
        user = User.query.filter_by(email=email, is_active=True).first()
        
        # Always return success to prevent email enumeration
        if not user:
            current_app.logger.info(f"📧 Password reset requested for non-existent email: {email}")
            return jsonify({
                'message': 'If an account with that email exists, a password reset link has been sent.'
            }), 200
        
        # Generate reset token
        reset_token = generate_reset_token()
        expires_at = datetime.utcnow() + timedelta(hours=1)  # Token expires in 1 hour
        
        # Create reset token record
        reset_token_record = PasswordResetToken(
            user_id=user.id,
            token=reset_token,
            expires_at=expires_at
        )
        
        # Invalidate any existing tokens for this user
        PasswordResetToken.query.filter_by(user_id=user.id, is_used=False).update({'is_used': True})
        
        db.session.add(reset_token_record)
        db.session.commit()
        
        # Send reset email
        email_sent = send_reset_email(user.email, reset_token)
        
        if email_sent:
            current_app.logger.info(f"✅ Password reset email sent to: {email}")
            return jsonify({
                'success': True,
                'message': 'If an account with that email exists, a password reset link has been sent.'
            }), 200
        else:
            # Rollback token creation if email failed
            db.session.rollback()
            current_app.logger.error(f"❌ Failed to send reset email to: {email}")
            return jsonify({
                'error': 'Failed to send reset email. Please try again later.'
            }), 500
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'❌ Forgot password error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    try:
        data = request.get_json()
        current_app.logger.info(f"🔄 Reset password request")
        
        required_fields = ['token', 'new_password']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'error': f'{field} is required'}), 400
        
        token = data['token']
        new_password = data['new_password']
        
        # Validate password
        is_valid_password, password_error = validate_password(new_password)
        if not is_valid_password:
            return jsonify({'error': password_error}), 400
        
        # Find valid reset token
        reset_token = PasswordResetToken.query.filter_by(
            token=token,
            is_used=False
        ).first()
        
        if not reset_token:
            return jsonify({'error': 'Invalid or expired reset token'}), 400
        
        # Check if token is expired
        if reset_token.is_expired():
            reset_token.is_used = True
            db.session.commit()
            return jsonify({'error': 'Reset token has expired'}), 400
        
        # Find user
        user = User.query.get(reset_token.user_id)
        if not user or not user.is_active:
            return jsonify({'error': 'User not found or inactive'}), 400
        
        # Update user password
        user.set_password(new_password)
        user.updated_at = datetime.utcnow()
        
        # Mark token as used
        reset_token.is_used = True
        
        db.session.commit()
        
        current_app.logger.info(f"✅ Password reset successful for user: {user.email}")
        
        return jsonify({
            'success': True,
            'message': 'Password has been reset successfully. You can now sign in with your new password.'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'❌ Reset password error: {str(e)}')
        return jsonify({'error': 'Internal server error'}), 500

@auth_bp.route('/validate-reset-token', methods=['POST'])
def validate_reset_token():
    """Validate if a reset token is still valid"""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Token is required'}), 400
        
        # Find valid reset token
        reset_token = PasswordResetToken.query.filter_by(
            token=token,
            is_used=False
        ).first()
        
        if not reset_token:
            return jsonify({'valid': False, 'error': 'Invalid token'}), 200
        
        if reset_token.is_expired():
            reset_token.is_used = True
            db.session.commit()
            return jsonify({'valid': False, 'error': 'Token has expired'}), 200
        
        return jsonify({
            'valid': True,
            'message': 'Token is valid'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'❌ Validate reset token error: {str(e)}')
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
        
        # Clear refresh attempts on logout
        clear_refresh_attempts(user_id)
        
        db.session.commit()
        
        current_app.logger.info(f"✅ User logged out: {user_id}")
        
        return jsonify({
            'success': True,
            'message': 'Successfully logged out'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f'❌ Logout error: {str(e)}')
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
        
        # Check if token is blacklisted
        jti = get_jwt()['jti']
        blacklisted = BlacklistedToken.query.filter_by(jti=jti).first()
        if blacklisted:
            return jsonify({'valid': False, 'error': 'Token has been revoked'}), 401
        
        return jsonify({
            'valid': True,
            'user_id': user_id,
            'expires_in': get_jwt()['exp'] - datetime.utcnow().timestamp()
        }), 200
        
    except Exception as e:
        current_app.logger.error(f'❌ Token verification error: {str(e)}')
        return jsonify({'valid': False, 'error': 'Token verification failed'}), 500

@auth_bp.route('/debug-tokens', methods=['GET'])
@jwt_required()
def debug_tokens():
    """Debug endpoint to check token information"""
    try:
        user_id = get_jwt_identity()
        jwt_data = get_jwt()
        
        return jsonify({
            'user_id': user_id,
            'jwt_data': jwt_data,
            'token_type': jwt_data.get('type'),
            'expires_at': jwt_data.get('exp'),
            'issued_at': jwt_data.get('iat')
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/test', methods=['GET'])
def test_auth():
    """Public test endpoint"""
    return jsonify({
        'message': 'Auth service is working!',
        'timestamp': datetime.utcnow().isoformat()
    }), 200