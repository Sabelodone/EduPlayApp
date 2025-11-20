# check_actual_routes.py - Check routes from your current structure
import sys
import os

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    # Import based on your structure
    from app import create_app
    
    # Create app instance
    app = create_app()
    
    print("🌐 YOUR ACTUAL FLASK ROUTES:")
    print("=" * 70)
    
    routes = []
    for rule in app.url_map.iter_rules():
        if 'static' not in rule.rule:  # Skip static files
            methods = ','.join(sorted(rule.methods - set(['OPTIONS', 'HEAD'])))
            routes.append((rule.rule, methods, rule.endpoint))
    
    # Sort by route
    routes.sort(key=lambda x: x[0])
    
    # Print API routes first
    api_routes = [r for r in routes if '/api' in r[0]]
    non_api_routes = [r for r in routes if '/api' not in r[0]]
    
    print("📚 API ROUTES:")
    for route, methods, endpoint in api_routes:
        print(f"  {route:<50} {methods:<20} {endpoint}")
    
    if non_api_routes:
        print("\n📚 OTHER ROUTES:")
        for route, methods, endpoint in non_api_routes:
            print(f"  {route:<50} {methods:<20} {endpoint}")
    
    print("=" * 70)
    print(f"📊 Total API routes: {len(api_routes)}")
    print(f"📊 Total routes: {len(routes)}")
    
    # Check critical endpoints
    critical_endpoints = [
        '/api/auth/signup',
        '/api/auth/signin', 
        '/api/dashboard',
        '/api/profile',
        '/api/games',
        '/api/lessons',
        '/api/progress'
    ]
    
    print("\n🔍 CRITICAL ENDPOINT CHECK:")
    for endpoint in critical_endpoints:
        found = any(endpoint in route[0] for route in routes)
        status = "✅ FOUND" if found else "❌ MISSING"
        print(f"  {status} {endpoint}")
        
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    
    print("\n💡 TROUBLESHOOTING:")
    print("1. Check if your app/__init__.py has the create_app() function")
    print("2. Make sure all route files have proper blueprint definitions")
    print("3. Check for circular imports in your route files")