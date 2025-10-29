# app/routes.py or in your main app file
from flask import Blueprint, request, jsonify
from flask_cors import CORS

# Create blueprint
auth_bp = Blueprint('auth', __name__)

# Auth routes
@auth_bp.route('/auth/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        
        # Basic validation
        if not data:
            return jsonify({"error": "No data provided"}), 400
            
        email = data.get('email')
        password = data.get('password')
        username = data.get('username')
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        # Here you would typically save to database
        # For now, just return success
        return jsonify({
            "message": "User registered successfully",
            "user": {
                "id": 1,
                "username": username,
                "email": email
            }
        }), 201
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/auth/signin', methods=['POST'])
def signin():
    try:
        data = request.get_json()
        
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400
        
        # Mock authentication - replace with real auth
        if email == "test@example.com" and password == "password":
            return jsonify({
                "message": "Login successful",
                "token": "mock_jwt_token_here",
                "user": {
                    "id": 1,
                    "email": email,
                    "username": "testuser"
                }
            })
        else:
            return jsonify({"error": "Invalid credentials"}), 401
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    
    return jsonify({
        "message": "If an account with that email exists, a reset link has been sent"
    })