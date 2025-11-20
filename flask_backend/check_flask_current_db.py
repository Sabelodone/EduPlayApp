# find_exact_database.py - Find the exact database location Flask is using
import sys
import os
from pathlib import Path
import sqlite3

# Make sure the app module is importable
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask_backend import create_app  # Adjusted import
from flask_backend.models import db

app = create_app()

print("🔍 FINDING EXACT DATABASE LOCATION")
print("=" * 50)

# Get SQLAlchemy database URI
db_uri = app.config.get('SQLALCHEMY_DATABASE_URI')
print(f"📊 Flask Database URI: {db_uri}")

# Extract the actual file path
if db_uri.startswith("sqlite:///"):
    db_path = db_uri.replace("sqlite:///", "")
    db_path = Path(db_path).resolve()
    print(f"📍 Flask is using: {db_path}")
else:
    print("⚠️ Database is not SQLite, cannot determine exact path automatically")
    db_path = None

# Check if the database file exists
if db_path and db_path.exists():
    size = os.path.getsize(db_path)
    print(f"\n📊 Database file exists:")
    print(f"  Path: {db_path}")
    print(f"  Size: {size} bytes")
    
    # Inspect tables
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = [table[0] for table in cursor.fetchall()]
        print(f"  Tables: {len(tables)} -> {tables}")

        if 'user' in tables:
            cursor.execute("PRAGMA table_info(user)")
            columns = [col[1] for col in cursor.fetchall()]
            print(f"  User table columns: {columns}")
            print(f"  Has profile_picture: {'profile_picture' in columns}")

        conn.close()
    except Exception as e:
        print(f"  Error reading database: {e}")
else:
    print(f"⚠️ Database file does not exist at: {db_path}")
