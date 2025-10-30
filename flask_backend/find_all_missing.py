# test_routes.py
import sys
import os

def test_route_imports():
    print("🧪 Testing route imports...")
    
    routes_to_test = [
        'app.routes.auth',
        'app.routes.profile', 
        'app.routes.password',
        'app.routes.lessons',
        'app.routes.games',
        'app.routes.progress',
        'app.routes.dashboard',
        'app.routes.challenges',
        'app.routes.ai'
    ]
    
    for route in routes_to_test:
        try:
            module = __import__(route, fromlist=[''])
            if hasattr(module, f"{route.split('.')[-1]}_bp"):
                print(f"✅ {route}: SUCCESS")
            else:
                print(f"❌ {route}: Missing blueprint variable")
        except Exception as e:
            print(f"❌ {route}: {e}")

if __name__ == '__main__':
    test_route_imports()