# flask_backend/__init__.py
from flask import Flask, jsonify, request
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from .models import db, bcrypt
from datetime import datetime, timedelta
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env from the root project directory
ROOT_DIR = Path(__file__).resolve().parent.parent  # flask_backend/../
ENV_PATH = ROOT_DIR / '.env'
if ENV_PATH.exists():
    load_dotenv(dotenv_path=ENV_PATH)
    print(f"✅ Loaded environment variables from {ENV_PATH}")
else:
    print(f"⚠️ .env file not found at {ENV_PATH}")

def create_app():
    app = Flask(__name__)

    # Ensure instance folder exists
    INSTANCE_PATH = ROOT_DIR / 'flask_backend' / 'instance'
    os.makedirs(INSTANCE_PATH, exist_ok=True)

    # Path to the database inside the instance folder
    DB_FILE = 'edufun.db'
    DB_PATH = INSTANCE_PATH / DB_FILE

    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SQLALCHEMY_DATABASE_URI'] = f"sqlite:///{DB_PATH}"
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-super-secret-key-change-this-too')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=15)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=7)
    app.config['JWT_TOKEN_LOCATION'] = ['headers']
    app.config['JWT_HEADER_NAME'] = 'Authorization'
    app.config['JWT_HEADER_TYPE'] = 'Bearer'

    # Email configuration
    app.config['SMTP_SERVER'] = os.environ.get('SMTP_SERVER', 'smtp.gmail.com')
    app.config['SMTP_PORT'] = int(os.environ.get('SMTP_PORT', 587))
    app.config['EMAIL_ADDRESS'] = os.environ.get('EMAIL_ADDRESS', '')
    app.config['EMAIL_PASSWORD'] = os.environ.get('EMAIL_PASSWORD', '')
    app.config['FRONTEND_URL'] = os.environ.get('FRONTEND_URL', 'http://localhost:3000')

    # Load OpenAI API key from .env
    OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY')
    if OPENAI_API_KEY:
        app.config['OPENAI_API_KEY'] = OPENAI_API_KEY
        print("✅ OPENAI_API_KEY loaded from .env")
    else:
        print("⚠️ OPENAI_API_KEY not found in environment variables")

    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    jwt = JWTManager(app)
    CORS(app, origins=[app.config['FRONTEND_URL'], 'http://192.168.1.131:3000'])

    # Request logging
    @app.before_request
    def log_requests():
        auth_header = request.headers.get('Authorization', 'None')
        print(f"🌐 Incoming request: {request.method} {request.path}")
        print(f"🔐 Auth Header: {auth_header[:50]}{'...' if len(auth_header) > 50 else ''}")

    # Health check endpoints
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'message': 'EduPlay API server is running',
            'timestamp': datetime.utcnow().isoformat(),
            'endpoints': {
                'auth': '/api/auth/*',
                'profile': '/api/profile/*',
                'lessons': '/api/lessons/*',
                'dashboard': '/api/dashboard/*'
            }
        })

    @app.route('/api/auth/health')
    def auth_health():
        return jsonify({
            'status': 'healthy',
            'message': 'Auth service is running',
            'endpoints': {
                'signup': 'POST /api/auth/signup',
                'signin': 'POST /api/auth/signin',
                'refresh': 'POST /api/auth/refresh',
                'me': 'GET /api/auth/me',
                'verify': 'POST /api/auth/verify-token'
            }
        })

    # JWT error handlers
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired', 'message': 'Please refresh your token'}), 401

    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Invalid token', 'message': 'Token verification failed'}), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Authorization required', 'message': 'Request does not contain an access token'}), 401

    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.profile import profile_bp
    from .routes.password import password_bp
    from .routes.lessons import lessons_bp
    from .routes.games import games_bp
    from .routes.progress import progress_bp
    from .routes.dashboard import dashboard_bp
    from .routes.challenges import challenges_bp

    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(profile_bp, url_prefix='/api/profile')
    app.register_blueprint(password_bp, url_prefix='/api/password')
    app.register_blueprint(lessons_bp, url_prefix='/api/lessons')
    app.register_blueprint(games_bp, url_prefix='/api/games')
    app.register_blueprint(progress_bp, url_prefix='/api/progress')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(challenges_bp, url_prefix='/api/challenges')

    # Optional AI routes
    try:
        from .routes.ai import ai_bp
        app.register_blueprint(ai_bp, url_prefix='/api/ai')
        print("✅ AI routes registered successfully")
    except Exception as e:
        print(f"⚠️ AI routes not available: {e}")

    print("🎯 All routes registered successfully!")
    print(f"📚 Database will be used at instance folder: {DB_PATH}")

    # Create tables
    with app.app_context():
        db.create_all()
        print("✅ Database tables created successfully!")
        create_sample_data(app)

    return app

def create_sample_data(app):
    with app.app_context():
        try:
            from .models import User
            if User.query.count() == 0:
                print("📝 No users found, sample data will be created on first registration")
        except Exception as e:
            print(f"ℹ️ Sample data note: {e}")
