# debug_password_method.py - Debug the check_password method
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import User

app = create_app()

def debug_password_method():
    print("🔍 DEBUGGING check_password METHOD")
    print("=" * 50)
    
    with app.app_context():
        # Get test user
        user = User.query.filter_by(email="test@test.com").first()
        
        if not user:
            print("❌ Test user not found")
            return
        
        print(f"Testing user: {user.email}")
        print(f"User ID: {user.id}")
        print(f"Password hash: {user.password_hash}")
        
        # Check if methods exist
        print(f"\n📋 Available methods:")
        print(f"  set_password: {hasattr(user, 'set_password')}")
        print(f"  check_password: {hasattr(user, 'check_password')}")
        
        # Test the check_password method directly
        if hasattr(user, 'check_password'):
            print("\n🧪 TESTING check_password METHOD:")
            try:
                # Test with correct password
                result1 = user.check_password("test123")
                print(f"  check_password('test123'): {result1}")
                
                # Test with wrong password
                result2 = user.check_password("wrong")
                print(f"  check_password('wrong'): {result2}")
                
                # Test what happens in the actual auth flow
                print(f"\n🎯 AUTH SIMULATION:")
                if user and user.check_password("test123"):
                    print("  ✅ Authentication would SUCCEED")
                else:
                    print("  ❌ Authentication would FAIL")
                    
            except Exception as e:
                print(f"  ❌ Error in check_password: {e}")
                import traceback
                traceback.print_exc()
        else:
            print("❌ check_password method not found!")
            
        # Let's also check the actual method source
        print(f"\n📝 Method source check:")
        try:
            import inspect
            source = inspect.getsource(user.check_password)
            print("  check_password method exists and is accessible")
            # Show first few lines
            lines = source.split('\n')[:3]
            for line in lines:
                print(f"    {line}")
        except Exception as e:
            print(f"  ❌ Cannot access method source: {e}")

if __name__ == '__main__':
    debug_password_method()