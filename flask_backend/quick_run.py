from app import create_app
import warnings

# Suppress warnings
warnings.filterwarnings("ignore")

app = create_app()

if __name__ == '__main__':
    print("🚀 Starting EduPlayApp with quick fixes...")
    app.run(host='0.0.0.0', port=5000, debug=True)
