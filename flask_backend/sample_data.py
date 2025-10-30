# sample_data.py - Run this after the main app is working
from app import create_app
from app.models import db, Lesson, Quiz, User, Game, Challenge

def create_sample_data():
    app = create_app()
    
    with app.app_context():
        # Create sample lessons
        if Lesson.query.count() == 0:
            sample_lesson = Lesson(
                title="Python Basics",
                description="Learn the fundamentals of Python programming",
                content="This lesson covers variables, data types, and basic operations in Python.",
                difficulty="beginner",
                category="Programming",
                order_index=1
            )
            db.session.add(sample_lesson)
            
            sample_lesson2 = Lesson(
                title="Web Development with Flask",
                description="Build web applications using Python Flask",
                content="Learn how to create web applications with Flask framework.",
                difficulty="intermediate", 
                category="Web Development",
                order_index=2
            )
            db.session.add(sample_lesson2)
            
            db.session.commit()
            print("✅ Sample lessons created!")
        
        # Create sample games
        if Game.query.count() == 0:
            sample_game = Game(
                name="Code Puzzle",
                description="Solve programming puzzles",
                category="Programming",
                difficulty_level="easy",
                max_score=1000
            )
            db.session.add(sample_game)
            db.session.commit()
            print("✅ Sample game created!")
        
        print("🎉 Sample data setup complete!")

if __name__ == '__main__':
    create_sample_data()
