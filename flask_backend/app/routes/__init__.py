"""
Routes package for the Flask application.
"""

from .auth import auth_bp
from .profile import profile_bp
from .password import password_bp
from .ai import ai_bp
from .lessons import lessons_bp
from .games import games_bp
from .progress import progress_bp
from .dashboard import dashboard_bp
from .challenges import challenges_bp

__all__ = [
    'auth_bp', 
    'profile_bp', 
    'password_bp',
    'ai_bp',
    'lessons_bp', 
    'games_bp',
    'progress_bp',
    'dashboard_bp',
    'challenges_bp'
]