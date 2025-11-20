# reset_database_completely.py - Complete database reset with test user
import os
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def reset_database():
    print("💥 COMPLETE DATABASE RESET")
    print("=" * 50)
    
    # Delete all database files
    db_files = ['edufun.db', 'instance/edufun.db', 'instance/app.db', 'instance/eduplay.db']
    for db_file in db_files:
        if os.path.exists(db_file):
            os.remove(db_file)
            print(f"✅ Deleted: {db_file}")
    
    # Create fresh database in root (where Flask expects it)
    conn = sqlite3.connect('edufun.db')
    cursor = conn.cursor()
    
    # Import Flask models to get correct table structure
    from app import create_app
    from app.models import db
    
    app = create_app()
    
    with app.app_context():
        # Create all tables using Flask SQLAlchemy
        db.create_all()
        print("✅ Created all tables with Flask models")
        
        # Create test user using Flask models
        from app.models import User
        
        test_user = User(
            email="test@test.com",
            first_name="Test",
            last_name="User"
        )
        test_user.set_password("test123")
        
        db.session.add(test_user)
        db.session.commit()
        print("✅ Created test user: test@test.com / test123")
    
    conn.close()
    print("\n🎯 DATABASE RESET COMPLETE!")

if __name__ == '__main__':
    reset_database()