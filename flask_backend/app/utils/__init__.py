"""
Utilities package for the Flask application.

This package contains utility modules for:
- security: Security-related utilities (password hashing, token management, etc.)
- validators: Input validation and sanitization utilities
- helpers: General helper functions

These utilities are used across the application to maintain consistency and security.
"""

from .security import SecurityUtils, validate_email as security_validate_email
from .validators import Validators, validate_email, validate_password, validate_name, sanitize_input

# Re-export commonly used functions for easy access
__all__ = [
    'SecurityUtils',
    'Validators',
    'validate_email',
    'validate_password', 
    'validate_name',
    'sanitize_input'
]

# Package version
__version__ = '1.0.0'
__author__ = 'Your Learning App Team'
__description__ = 'Utility functions for Learning Application'