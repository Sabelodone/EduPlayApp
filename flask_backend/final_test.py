# check_auth_route.py - Check what's happening in the auth route
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from app.models import User
from flask import jsonify

app = create_app()

def check_auth_route():
    print("🔍 CHECKING AUTH ROUTE IMPLEMENTATION")
    print("=" * 50)
    
    with app.app_context():
        # Test the exact same logic that should be in your auth route
        email = "test@test.com"
        password = "test123"
        
        print(f"Testing auth route logic for: {email}")
        
        try:
            # Step 1: Find user (this is what your route should do)
            user = User.query.filter_by(email=email).first()
            print(f"✅ User found: {user is not None}")
            if not user:
                print("❌ User not found")
                return
                
            # Step 2: Check password
            print(f"✅ Password check: {user.check_password(password)}")
            
            if user.check_password(password):
                print("🎉 Auth logic works - should return success response")
                
                # This is what your route should return
                user_data = {
                    'id': user.id,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'profile_picture': user.profile_picture
                }
                print(f"✅ User data prepared: {user_data}")
                
                # Check if we can create a JWT token
                try:
                    from flask_jwt_extended import create_access_token
                    token = create_access_token(identity=user.id)
                    print(f"✅ JWT token can be created: {token is not None}")
                except Exception as e:
                    print(f"❌ JWT token creation failed: {e}")
                    
            else:
                print("❌ Password incorrect")
                
        except Exception as e:
            print(f"❌ ERROR in auth route logic: {e}")
            import traceback
            traceback.print_exc()

if __name__ == '__main__':
    check_auth_route()