from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, LessonProgress, StudyNote
from app import db
import json

lessons_bp = Blueprint('lessons', __name__)

# Sample lessons data
SAMPLE_LESSONS = [
    {
        'id': 1,
        'title': 'Introduction to Python',
        'description': 'Learn the basics of Python programming',
        'category': 'programming',
        'difficulty': 'beginner',
        'duration_minutes': 30,
        'content': {
            'sections': [
                {
                    'title': 'What is Python?',
                    'content': 'Python is a high-level programming language...',
                    'type': 'text'
                }
            ]
        },
        'quiz_questions': [
            {
                'question': 'What function is used to output text in Python?',
                'options': ['echo', 'print', 'output', 'console.log'],
                'correct_answer': 1
            }
        ]
    },
    {
        'id': 2,
        'title': 'Variables and Data Types',
        'description': 'Understanding variables and different data types in Python',
        'category': 'programming',
        'difficulty': 'beginner',
        'duration_minutes': 45,
        'content': {
            'sections': [
                {
                    'title': 'What are Variables?',
                    'content': 'Variables are used to store data values...',
                    'type': 'text'
                }
            ]
        }
    }
]

@lessons_bp.route('/', methods=['GET'])
@jwt_required()
def get_lessons():
    """Get all available lessons with optional filtering"""
    try:
        category = request.args.get('category')
        difficulty = request.args.get('difficulty')
        
        filtered_lessons = SAMPLE_LESSONS
        
        if category:
            filtered_lessons = [lesson for lesson in filtered_lessons if lesson['category'] == category]
        
        if difficulty:
            filtered_lessons = [lesson for lesson in filtered_lessons if lesson['difficulty'] == difficulty]
        
        return jsonify({
            'success': True,
            'lessons': filtered_lessons,
            'total': len(filtered_lessons)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching lessons: {str(e)}")
        return jsonify({'error': 'Failed to fetch lessons'}), 500

@lessons_bp.route('/<int:lesson_id>', methods=['GET'])
@jwt_required()
def get_lesson(lesson_id):
    """Get specific lesson details"""
    try:
        lesson = next((lesson for lesson in SAMPLE_LESSONS if lesson['id'] == lesson_id), None)
        
        if not lesson:
            return jsonify({'error': 'Lesson not found'}), 404
        
        return jsonify({
            'success': True,
            'lesson': lesson
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching lesson: {str(e)}")
        return jsonify({'error': 'Failed to fetch lesson'}), 500

@lessons_bp.route('/<int:lesson_id>/complete', methods=['POST'])
@jwt_required()
def complete_lesson(lesson_id):
    """Mark a lesson as completed and award points"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        lesson = next((lesson for lesson in SAMPLE_LESSONS if lesson['id'] == lesson_id), None)
        
        if not lesson:
            return jsonify({'error': 'Lesson not found'}), 404
        
        # Award points based on lesson difficulty
        points_map = {'beginner': 50, 'intermediate': 100, 'advanced': 200}
        points_earned = points_map.get(lesson['difficulty'], 50)
        
        user.points += points_earned
        
        # Check for level up
        if user.points >= user.level * 1000:
            user.level += 1
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Lesson "{lesson["title"]}" completed!',
            'points_earned': points_earned,
            'total_points': user.points,
            'level': user.level
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error completing lesson: {str(e)}")
        return jsonify({'error': 'Failed to complete lesson'}), 500

@lessons_bp.route('/categories', methods=['GET'])
@jwt_required()
def get_categories():
    """Get available lesson categories"""
    try:
        categories = list(set(lesson['category'] for lesson in SAMPLE_LESSONS))
        
        return jsonify({
            'success': True,
            'categories': categories
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching categories: {str(e)}")
        return jsonify({'error': 'Failed to fetch categories'}), 500
