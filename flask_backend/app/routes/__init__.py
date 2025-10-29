"""
Routes package for the Flask application.
"""

from .auth import auth_bp
from .profile import profile_bp
from .password import password_bp

__all__ = ['auth_bp', 'profile_bp', 'password_bp']