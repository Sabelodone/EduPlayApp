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
        
        # Verify current password
        if not user.check_password(current_password):
            return jsonify({'error': 'Current password is incorrect'}), 400
        
        # Update password
        user.set_password(new_password)
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
            # Create reset token (simplified)
            token = secrets.token_urlsafe(32)
            reset = PasswordReset(
                user_id=user.id,
                token=token,
                expires_at=datetime.utcnow() + timedelta(hours=1)
            )
            db.session.add(reset)
            db.session.commit()
            
            # In a real app, send email here
            print(f"Password reset token for {email}: {token}")
        
        # Always return success to prevent email enumeration
        return jsonify({
            'success': True,
            'message': 'If the email exists, a reset link has been sent'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error requesting password reset: {str(e)}")
        return jsonify({'error': 'Failed to process reset request'}), 500
