from flask import Flask
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from .models import db, bcrypt
import os

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///edufun.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')
    
    # Initialize extensions
    db.init_app(app)
    bcrypt.init_app(app)
    jwt = JWTManager(app)
    CORS(app)
    
    # Register blueprints - import inside function to avoid circular imports
    from .routes.auth import auth_bp
    from .routes.profile import profile_bp
    from .routes.password import password_bp
    from .routes.lessons import lessons_bp
    from .routes.games import games_bp
    from .routes.progress import progress_bp
    from .routes.dashboard import dashboard_bp
    from .routes.challenges import challenges_bp
    
    # Register core routes (these should always work)
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(profile_bp, url_prefix='/profile')
    app.register_blueprint(password_bp, url_prefix='/password')
    app.register_blueprint(lessons_bp, url_prefix='/lessons')
    app.register_blueprint(games_bp, url_prefix='/games')
    app.register_blueprint(progress_bp, url_prefix='/progress')
    app.register_blueprint(dashboard_bp, url_prefix='/api')
    app.register_blueprint(challenges_bp, url_prefix='/challenges')
    
    # Register optional routes with error handling
    try:
        from .routes.ai import ai_bp
        app.register_blueprint(ai_bp, url_prefix='/api/ai')
        print("✅ AI routes registered successfully")
    except Exception as e:
        print(f"⚠️ AI routes not available: {e}")
    
    print("🎯 All routes registered successfully!")
    
    # Initialize OpenAI (if needed)
    try:
        openai_api_key = os.environ.get('OPENAI_API_KEY')
        if openai_api_key:
            print("✅ OpenAI service initialized successfully")
        else:
            print("⚠️  OpenAI API key not found")
    except Exception as e:
        print(f"⚠️  OpenAI initialization warning: {e}")
    
    # Create tables
    with app.app_context():
        db.create_all()
        print("✅ Database tables created successfully!")
        
        # Create minimal sample data without model-specific imports
        create_sample_data(app)
    
    return app

def create_sample_data(app):
    """Create sample data without importing specific models"""
    with app.app_context():
        try:
            # Check if we have any users, create one if none exist
            from .models import User
            if User.query.count() == 0:
                print("📝 No users found, sample data will be created on first registration")
        except Exception as e:
            print(f"ℹ️  Sample data note: {e}")