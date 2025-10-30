from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, PasswordReset
from app import db
import secrets
from datetime import datetime, timedelta

password_bp = Blueprint('password', __name__)

@password_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        data = request.get_json()
        current_password = data.get('current_password')
        new_password = data.get('new_password')
        
        if not current_password or not new_password:
            return jsonify({'error': 'Current password and new password are required'}), 400
        
        # Validate password strength
        if len(new_password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        # Verify current password
        if not user.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        # Don't allow same password
        if user.check_password(new_password):
            return jsonify({'error': 'New password must be different from current password'}), 400
        
        # Update password
        user.set_password(new_password)
        user.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Password updated successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error changing password: {str(e)}")
        return jsonify({'error': 'Failed to change password'}), 500

@password_bp.route('/reset-password', methods=['POST'])
def request_password_reset():
    """Request password reset"""
    try:
        data = request.get_json()
        email = data.get('email')
        
        if not email:
            return jsonify({'error': 'Email is required'}), 400
        
        user = User.query.filter_by(email=email, is_active=True).first()
        if user:
            # Invalidate any existing reset tokens for this user
            PasswordReset.query.filter_by(user_id=user.id, used=False).update({'used': True})
            
            # Create new reset token
            token = secrets.token_urlsafe(32)
            reset = PasswordReset(
                user_id=user.id,
                token=token,
                expires_at=datetime.utcnow() + timedelta(hours=1)
            )
            db.session.add(reset)
            db.session.commit()
            
            # In a real app, send email here with the reset link
            # For now, we'll log it for testing
            current_app.logger.info(f"Password reset token for {email}: {token}")
            print(f"Password reset token for {email}: {token}")
        
        # Always return success to prevent email enumeration
        return jsonify({
            'success': True,
            'message': 'If the email exists in our system, a password reset link has been sent.'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error requesting password reset: {str(e)}")
        return jsonify({'error': 'Failed to process reset request'}), 500

@password_bp.route('/reset-password/confirm', methods=['POST'])
def confirm_password_reset():
    """Confirm password reset with token"""
    try:
        data = request.get_json()
        token = data.get('token')
        new_password = data.get('new_password')
        
        if not token or not new_password:
            return jsonify({'error': 'Token and new password are required'}), 400
        
        # Validate password strength
        if len(new_password) < 6:
            return jsonify({'error': 'Password must be at least 6 characters long'}), 400
        
        # Find valid reset token
        reset = PasswordReset.query.filter_by(
            token=token, 
            used=False
        ).first()
        
        if not reset:
            return jsonify({'error': 'Invalid or expired reset token'}), 400
        
        # Check if token is expired
        if reset.expires_at < datetime.utcnow():
            reset.used = True  # Mark as used
            db.session.commit()
            return jsonify({'error': 'Reset token has expired'}), 400
        
        # Get user and update password
        user = User.query.get(reset.user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Update user password
        user.set_password(new_password)
        user.updated_at = datetime.utcnow()
        
        # Mark reset token as used
        reset.used = True
        reset.used_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Password has been reset successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error confirming password reset: {str(e)}")
        return jsonify({'error': 'Failed to reset password'}), 500

@password_bp.route('/reset-password/validate-token', methods=['POST'])
def validate_reset_token():
    """Validate a password reset token"""
    try:
        data = request.get_json()
        token = data.get('token')
        
        if not token:
            return jsonify({'error': 'Token is required'}), 400
        
        reset = PasswordReset.query.filter_by(
            token=token, 
            used=False
        ).first()
        
        if not reset:
            return jsonify({'valid': False, 'error': 'Invalid token'}), 200
        
        if reset.expires_at < datetime.utcnow():
            return jsonify({'valid': False, 'error': 'Token expired'}), 200
        
        return jsonify({
            'valid': True,
            'message': 'Token is valid'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error validating reset token: {str(e)}")
        return jsonify({'error': 'Failed to validate token'}), 500

@password_bp.route('/password-strength', methods=['POST'])
def check_password_strength():
    """Check password strength"""
    try:
        data = request.get_json()
        password = data.get('password', '')
        
        if not password:
            return jsonify({'error': 'Password is required'}), 400
        
        # Simple password strength check
        strength = {
            'length': len(password) >= 8,
            'has_upper': any(c.isupper() for c in password),
            'has_lower': any(c.islower() for c in password),
            'has_digit': any(c.isdigit() for c in password),
            'has_special': any(not c.isalnum() for c in password)
        }
        
        score = sum(strength.values())
        
        if score <= 2:
            strength_level = 'Weak'
        elif score <= 4:
            strength_level = 'Medium'
        else:
            strength_level = 'Strong'
        
        return jsonify({
            'score': score,
            'strength': strength_level,
            'checks': strength,
            'is_acceptable': len(password) >= 6  # Minimum requirement
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error checking password strength: {str(e)}")
        return jsonify({'error': 'Failed to check password strength'}), 500