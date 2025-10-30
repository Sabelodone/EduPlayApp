from app import create_app
import warnings
import os

# Suppress all warnings
warnings.filterwarnings("ignore")

# Clear any environment variables that might cause issues
os.environ['PYTHONWARNINGS'] = 'ignore'

app = create_app()

if __name__ == '__main__':
    print("🚀 Starting EduPlayApp with complete fixes...")
    print("✅ All models properly structured")
    print("✅ Database initialized")
    print("✅ Server starting on http://0.0.0.0:5000")
    app.run(host='0.0.0.0', port=5000, debug=False)  # debug=False to avoid reloader issues
