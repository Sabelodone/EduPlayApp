from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, LessonProgress, StudyNote, UserActivity
from app import db
from datetime import datetime
import json

lessons_bp = Blueprint('lessons', __name__)

# Sample lessons data - using string IDs to match your database schema
SAMPLE_LESSONS = [
    {
        'id': 'lesson_1',
        'title': 'Introduction to Python',
        'description': 'Learn the basics of Python programming',
        'category': 'programming',
        'difficulty': 'beginner',
        'duration_minutes': 30,
        'content': {
            'sections': [
                {
                    'title': 'What is Python?',
                    'content': 'Python is a high-level programming language known for its simplicity and readability. It\'s widely used in web development, data science, AI, and more.',
                    'type': 'text'
                },
                {
                    'title': 'Your First Python Program',
                    'content': 'print("Hello, World!")',
                    'type': 'code'
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
        'id': 'lesson_2',
        'title': 'Variables and Data Types',
        'description': 'Understanding variables and different data types in Python',
        'category': 'programming',
        'difficulty': 'beginner',
        'duration_minutes': 45,
        'content': {
            'sections': [
                {
                    'title': 'What are Variables?',
                    'content': 'Variables are containers for storing data values. In Python, you don\'t need to declare variables with any particular type.',
                    'type': 'text'
                },
                {
                    'title': 'Basic Data Types',
                    'content': 'Python has several basic data types: integers, floats, strings, and booleans.',
                    'type': 'text'
                }
            ]
        }
    },
    {
        'id': 'lesson_3',
        'title': 'Control Structures',
        'description': 'Learn about if statements and loops in Python',
        'category': 'programming',
        'difficulty': 'intermediate',
        'duration_minutes': 60,
        'content': {
            'sections': [
                {
                    'title': 'If Statements',
                    'content': 'If statements allow you to execute code conditionally based on certain conditions.',
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
        
        # Get user progress for each lesson
        current_user_id = get_jwt_identity()
        user_progress = LessonProgress.query.filter_by(user_id=current_user_id).all()
        progress_map = {progress.lesson_id: progress for progress in user_progress}
        
        # Enhance lessons with user progress
        enhanced_lessons = []
        for lesson in filtered_lessons:
            lesson_progress = progress_map.get(lesson['id'])
            enhanced_lesson = lesson.copy()
            enhanced_lesson['user_progress'] = {
                'completed': lesson_progress.completed if lesson_progress else False,
                'progress': lesson_progress.progress if lesson_progress else 0.0,
                'last_accessed': lesson_progress.last_accessed.isoformat() if lesson_progress and lesson_progress.last_accessed else None
            }
            enhanced_lessons.append(enhanced_lesson)
        
        return jsonify({
            'success': True,
            'lessons': enhanced_lessons,
            'total': len(enhanced_lessons)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching lessons: {str(e)}")
        return jsonify({'error': 'Failed to fetch lessons'}), 500

@lessons_bp.route('/<string:lesson_id>', methods=['GET'])
@jwt_required()
def get_lesson(lesson_id):
    """Get specific lesson details"""
    try:
        lesson = next((lesson for lesson in SAMPLE_LESSONS if lesson['id'] == lesson_id), None)
        
        if not lesson:
            return jsonify({'error': 'Lesson not found'}), 404
        
        # Update or create lesson progress for last accessed
        current_user_id = get_jwt_identity()
        lesson_progress = LessonProgress.query.filter_by(
            user_id=current_user_id,
            lesson_id=lesson_id
        ).first()
        
        if not lesson_progress:
            lesson_progress = LessonProgress(
                user_id=current_user_id,
                lesson_id=lesson_id,
                progress=0.0,
                completed=False,
                last_accessed=datetime.utcnow()
            )
            db.session.add(lesson_progress)
        else:
            lesson_progress.last_accessed = datetime.utcnow()
        
        db.session.commit()
        
        # Add user progress to response
        lesson_with_progress = lesson.copy()
        lesson_with_progress['user_progress'] = {
            'completed': lesson_progress.completed,
            'progress': lesson_progress.progress,
            'last_accessed': lesson_progress.last_accessed.isoformat()
        }
        
        return jsonify({
            'success': True,
            'lesson': lesson_with_progress
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error fetching lesson: {str(e)}")
        return jsonify({'error': 'Failed to fetch lesson'}), 500

@lessons_bp.route('/<string:lesson_id>/progress', methods=['POST'])
@jwt_required()
def update_lesson_progress(lesson_id):
    """Update lesson progress"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        progress = data.get('progress', 0.0)
        completed = data.get('completed', False)
        
        lesson_progress = LessonProgress.query.filter_by(
            user_id=current_user_id,
            lesson_id=lesson_id
        ).first()
        
        if not lesson_progress:
            lesson_progress = LessonProgress(
                user_id=current_user_id,
                lesson_id=lesson_id,
                progress=progress,
                completed=completed,
                last_accessed=datetime.utcnow()
            )
            db.session.add(lesson_progress)
        else:
            lesson_progress.progress = max(lesson_progress.progress, progress)
            lesson_progress.completed = lesson_progress.completed or completed
            lesson_progress.last_accessed = datetime.utcnow()
        
        # If completed, log activity and potentially award points
        if completed:
            activity = UserActivity(
                user_id=current_user_id,
                activity_type='lesson_complete',
                activity_data=json.dumps({
                    'lesson_id': lesson_id,
                    'lesson_title': next((lesson['title'] for lesson in SAMPLE_LESSONS if lesson['id'] == lesson_id), 'Unknown Lesson'),
                    'progress': progress
                })
            )
            db.session.add(activity)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Progress updated successfully',
            'progress': lesson_progress.progress,
            'completed': lesson_progress.completed
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating lesson progress: {str(e)}")
        return jsonify({'error': 'Failed to update progress'}), 500

@lessons_bp.route('/<string:lesson_id>/complete', methods=['POST'])
@jwt_required()
def complete_lesson(lesson_id):
    """Mark a lesson as completed"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        lesson = next((lesson for lesson in SAMPLE_LESSONS if lesson['id'] == lesson_id), None)
        
        if not lesson:
            return jsonify({'error': 'Lesson not found'}), 404
        
        # Update lesson progress
        lesson_progress = LessonProgress.query.filter_by(
            user_id=current_user_id,
            lesson_id=lesson_id
        ).first()
        
        if not lesson_progress:
            lesson_progress = LessonProgress(
                user_id=current_user_id,
                lesson_id=lesson_id,
                progress=1.0,
                completed=True,
                last_accessed=datetime.utcnow()
            )
            db.session.add(lesson_progress)
        else:
            lesson_progress.progress = 1.0
            lesson_progress.completed = True
            lesson_progress.last_accessed = datetime.utcnow()
        
        # Log activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='lesson_complete',
            activity_data=json.dumps({
                'lesson_id': lesson_id,
                'lesson_title': lesson['title'],
                'difficulty': lesson['difficulty']
            })
        )
        db.session.add(activity)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Lesson "{lesson["title"]}" completed successfully!',
            'lesson_id': lesson_id
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

@lessons_bp.route('/<string:lesson_id>/notes', methods=['GET'])
@jwt_required()
def get_lesson_notes(lesson_id):
    """Get study notes for a specific lesson"""
    try:
        current_user_id = get_jwt_identity()
        
        notes = StudyNote.query.filter_by(
            user_id=current_user_id,
            lesson_id=lesson_id
        ).order_by(StudyNote.created_at.desc()).all()
        
        return jsonify({
            'success': True,
            'notes': [note.to_dict() for note in notes]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching lesson notes: {str(e)}")
        return jsonify({'error': 'Failed to fetch notes'}), 500

@lessons_bp.route('/<string:lesson_id>/notes', methods=['POST'])
@jwt_required()
def create_lesson_note(lesson_id):
    """Create a study note for a lesson"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        if not data.get('title') or not data.get('content'):
            return jsonify({'error': 'Title and content are required'}), 400
        
        note = StudyNote(
            user_id=current_user_id,
            lesson_id=lesson_id,
            title=data['title'],
            content=data['content'],
            tags=data.get('tags', []),
            is_public=data.get('is_public', False)
        )
        
        db.session.add(note)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Note created successfully',
            'note': note.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error creating lesson note: {str(e)}")
        return jsonify({'error': 'Failed to create note'}), 500

@lessons_bp.route('/progress/overview', methods=['GET'])
@jwt_required()
def get_lessons_progress_overview():
    """Get overview of user's progress across all lessons"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get all lesson progress for user
        user_progress = LessonProgress.query.filter_by(user_id=current_user_id).all()
        
        # Calculate statistics
        total_lessons = len(SAMPLE_LESSONS)
        completed_lessons = len([p for p in user_progress if p.completed])
        in_progress_lessons = len([p for p in user_progress if not p.completed and p.progress > 0])
        not_started_lessons = total_lessons - completed_lessons - in_progress_lessons
        
        # Calculate total progress percentage
        total_progress = sum(p.progress for p in user_progress) / total_lessons if total_lessons > 0 else 0
        
        return jsonify({
            'success': True,
            'overview': {
                'total_lessons': total_lessons,
                'completed_lessons': completed_lessons,
                'in_progress_lessons': in_progress_lessons,
                'not_started_lessons': not_started_lessons,
                'total_progress_percentage': round(total_progress * 100, 1)
            },
            'recent_lessons': [
                {
                    'lesson_id': progress.lesson_id,
                    'title': next((lesson['title'] for lesson in SAMPLE_LESSONS if lesson['id'] == progress.lesson_id), 'Unknown Lesson'),
                    'progress': progress.progress,
                    'completed': progress.completed,
                    'last_accessed': progress.last_accessed.isoformat() if progress.last_accessed else None
                }
                for progress in sorted(user_progress, key=lambda x: x.last_accessed or datetime.min, reverse=True)[:5]
            ]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching lessons progress overview: {str(e)}")
        return jsonify({'error': 'Failed to fetch progress overview'}), 500