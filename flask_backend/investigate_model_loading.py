# investigate_model_loading.py - Investigate how the User model is being loaded
import sys
import os

def investigate_model():
    print("🔍 INVESTIGATING MODEL LOADING ISSUE")
    print("=" * 50)
    
    # Check Python path
    print("📁 Python path:")
    for path in sys.path[:5]:  # Show first 5 paths
        print(f"  {path}")
    
    # Check if we can import User directly
    try:
        from app.models import User
        print(f"✅ Successfully imported User from app.models")
        print(f"📝 User module: {User.__module__}")
        print(f"📝 User class: {User}")
        
        # Check the actual file being used
        user_file = sys.modules['app.models'].__file__
        print(f"📁 Models file location: {user_file}")
        
    except Exception as e:
        print(f"❌ Error importing User: {e}")
        return
    
    # Create app and check
    from app import create_app
    app = create_app()
    
    with app.app_context():
        # Check what methods are actually on the class
        print(f"\n📋 User CLASS methods (before instance):")
        class_methods = [m for m in dir(User) if not m.startswith('_')]
        password_methods = [m for m in class_methods if 'password' in m.lower()]
        print(f"  All methods: {class_methods}")
        print(f"  Password methods: {password_methods}")
        
        # Get a user instance
        user = User.query.first()
        if user:
            print(f"\n👤 User INSTANCE methods:")
            instance_methods = [m for m in dir(user) if not m.startswith('_')]
            password_instance_methods = [m for m in instance_methods if 'password' in m.lower()]
            print(f"  All instance methods: {instance_methods}")
            print(f"  Password instance methods: {password_instance_methods}")
            
            # Check if it's the same object
            print(f"\n🔍 Object identity check:")
            print(f"  User class: {User}")
            print(f"  user instance class: {user.__class__}")
            print(f"  Same class: {User is user.__class__}")
            
        else:
            print("❌ No users found in database")

if __name__ == '__main__':
    investigate_model()