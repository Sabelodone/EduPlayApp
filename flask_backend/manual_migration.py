# fix_games_table.py
import os
import sys
from sqlalchemy import text, inspect

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app, db
from app.models import Game

def fix_games_table():
    app = create_app()
    
    with app.app_context():
        print("🔧 Fixing Games Table Structure...")
        print("=" * 60)
        
        # Check current database state
        inspector = inspect(db.engine)
        current_tables = inspector.get_table_names()
        print(f"📊 Current tables: {current_tables}")
        
        try:
            # Check games table structure
            if 'games' in current_tables:
                print("\n🎮 Checking games table structure...")
                game_columns = [col['name'] for col in inspector.get_columns('games')]
                print(f"Current columns: {game_columns}")
                
                # Add missing columns
                missing_columns = []
                for column in ['game_data']:
                    if column not in game_columns:
                        missing_columns.append(column)
                
                if missing_columns:
                    print(f"➕ Adding missing columns: {missing_columns}")
                    for column in missing_columns:
                        if column == 'game_data':
                            db.session.execute(text('ALTER TABLE games ADD COLUMN game_data TEXT'))
                            print(f"✅ Added {column} column")
                    
                    db.session.commit()
                    print("✅ Games table structure updated!")
                else:
                    print("✅ All required columns present in games table!")
            
            # Create sample games with proper structure
            print("\n📝 Creating sample games data...")
            create_sample_games()
            
            print("\n🎉 Games table fixes completed!")
            
        except Exception as e:
            print(f"❌ Error during migration: {e}")
            db.session.rollback()

def create_sample_games():
    """Create sample games in database with proper structure"""
    sample_games = [
        {
            'id': 'math_functions_1',
            'name': 'Functions Explorer',
            'description': 'Master functions and graphs with interactive challenges',
            'category': 'Mathematics',
            'difficulty_level': 'Easy',
            'max_score': 1000,
            'is_active': True,
            'game_data': {
                'duration': '10-15 mins',
                'players': 'Individual',
                'icon': 'calculator',
                'color': '#FF6B6B',
                'topics': ['Functions and Graphs'],
                'rating': 4.5,
                'grade_level': '10',
                'ai_generated': False,
                'locked': False
            }
        },
        {
            'id': 'math_finance_1',
            'name': 'Finance Challenge',
            'description': 'Learn about financial mathematics and growth',
            'category': 'Mathematics',
            'difficulty_level': 'Hard',
            'max_score': 1500,
            'is_active': True,
            'game_data': {
                'duration': '15-20 mins',
                'players': 'Individual',
                'icon': 'trending-up',
                'color': '#4ECDC4',
                'topics': ['Finance and Growth'],
                'rating': 4.3,
                'grade_level': '10',
                'ai_generated': False,
                'locked': False
            }
        },
        {
            'id': 'math_algebra_1',
            'name': 'Algebra Adventure',
            'description': 'Solve algebraic equations and expressions',
            'category': 'Mathematics',
            'difficulty_level': 'Intermediate',
            'max_score': 1200,
            'is_active': True,
            'game_data': {
                'duration': '12-18 mins',
                'players': 'Individual',
                'icon': 'code',
                'color': '#45B7D1',
                'topics': ['Algebra'],
                'rating': 4.7,
                'grade_level': '10',
                'ai_generated': False,
                'locked': False
            }
        },
        {
            'id': 'science_physics_1',
            'name': 'Physics Explorer',
            'description': 'Discover the laws of motion and energy',
            'category': 'Physical Sciences',
            'difficulty_level': 'Intermediate',
            'max_score': 1300,
            'is_active': True,
            'game_data': {
                'duration': '12-18 mins',
                'players': 'Individual',
                'icon': 'flask',
                'color': '#FFA726',
                'topics': ['Motion', 'Forces', 'Energy'],
                'rating': 4.6,
                'grade_level': '10',
                'ai_generated': False,
                'locked': False
            }
        },
        {
            'id': 'english_grammar_1',
            'name': 'Grammar Guardian',
            'description': 'Improve your grammar skills with fun exercises',
            'category': 'English',
            'difficulty_level': 'Easy',
            'max_score': 1000,
            'is_active': True,
            'game_data': {
                'duration': '8-12 mins',
                'players': '1-2 players',
                'icon': 'book',
                'color': '#66BB6A',
                'topics': ['Grammar', 'Sentence Structure'],
                'rating': 4.4,
                'grade_level': '10',
                'ai_generated': False,
                'locked': False
            }
        }
    ]
    
    created_count = 0
    for game_data in sample_games:
        # Check if game already exists
        existing = db.session.execute(
            text('SELECT id FROM games WHERE id = :id'),
            {'id': game_data['id']}
        ).fetchone()
        
        if not existing:
            # Insert with proper column names
            db.session.execute(text('''
                INSERT INTO games (id, name, description, category, difficulty_level, max_score, is_active, game_data, created_at)
                VALUES (:id, :name, :description, :category, :difficulty, :max_score, :is_active, :game_data, datetime('now'))
            '''), {
                'id': game_data['id'],
                'name': game_data['name'],
                'description': game_data['description'],
                'category': game_data['category'],
                'difficulty': game_data['difficulty_level'],
                'max_score': game_data['max_score'],
                'is_active': game_data['is_active'],
                'game_data': json.dumps(game_data['game_data'])
            })
            created_count += 1
            print(f"✅ Created game: {game_data['name']}")
        else:
            print(f"⚠️  Game already exists: {game_data['name']}")
    
    db.session.commit()
    print(f"🎮 Created {created_count} sample games")

if __name__ == '__main__':
    import json
    fix_games_table()