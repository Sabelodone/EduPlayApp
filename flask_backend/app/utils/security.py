import re
import secrets
from datetime import datetime, timedelta
from flask import current_app
from flask_jwt_extended import get_jwt, decode_token
from app.models import BlacklistedToken, db

class SecurityUtils:
    @staticmethod
    def is_password_strong(password):
        """Check if password meets security requirements"""
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        
        if not re.search(r"[A-Z]", password):
            return False, "Password must contain at least one uppercase letter"
        
        if not re.search(r"[a-z]", password):
            return False, "Password must contain at least one lowercase letter"
        
        if not re.search(r"\d", password):
            return False, "Password must contain at least one digit"
        
        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            return False, "Password must contain at least one special character"
        
        return True, "Password is strong"
    
    @staticmethod
    def generate_secure_token(length=32):
        """Generate cryptographically secure token"""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def blacklist_token(jti, token_type, user_id, expires_at):
        """Add token to blacklist"""
        blacklisted_token = BlacklistedToken(
            jti=jti,
            token_type=token_type,
            user_id=user_id,
            expires_at=expires_at
        )
        db.session.add(blacklisted_token)
        db.session.commit()
    
    @staticmethod
    def is_token_blacklisted(jti):
        """Check if token is blacklisted"""
        return BlacklistedToken.query.filter_by(jti=jti).first() is not None
    
    @staticmethod
    def cleanup_expired_tokens():
        """Remove expired blacklisted tokens"""
        expired_tokens = BlacklistedToken.query.filter(
            BlacklistedToken.expires_at < datetime.utcnow()
        ).all()
        
        for token in expired_tokens:
            db.session.delete(token)
        
        db.session.commit()

def validate_email(email):
    """Basic email validation"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def sanitize_input(input_string):
    """Sanitize user input to prevent XSS"""
    if not input_string:
        return ""
    return input_string.strip().replace('<', '&lt;').replace('>', '&gt;')