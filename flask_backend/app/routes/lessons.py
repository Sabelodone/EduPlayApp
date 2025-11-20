from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, LessonProgress, StudyNote, UserActivity, Lesson, VideoProgress, ExamPaper, ResourceDownload
from app import db
from datetime import datetime
import json

lessons_bp = Blueprint('lessons', __name__)

# School curriculum data matching your frontend structure
SCHOOL_CURRICULUM = {
    'Mathematics': {
        '10': {
            'Algebra': [
                {
                    'id': 'math_10_algebra_1',
                    'video_id': 'KP1QlnA7K1o',
                    'title': 'Algebra Basics - Full Course',
                    'duration': '15:30',
                    'channel': 'The Organic Chemistry Tutor',
                    'description': 'Complete algebra introduction covering variables, expressions, and equations',
                    'category': 'Mathematics',
                    'grade': '10',
                    'topic': 'Algebra',
                    'difficulty': 'beginner',
                    'duration_minutes': 93,
                    'content_type': 'video'
                },
                {
                    'id': 'math_10_algebra_2',
                    'video_id': 'NybHckSEQBI',
                    'title': 'Linear Equations Practice',
                    'duration': '12:45',
                    'channel': 'Math and Science',
                    'description': 'Step-by-step linear equation solving with practice problems',
                    'category': 'Mathematics',
                    'grade': '10',
                    'topic': 'Algebra',
                    'difficulty': 'beginner',
                    'duration_minutes': 77,
                    'content_type': 'video'
                }
            ],
            'Geometry': [
                {
                    'id': 'math_10_geometry_1',
                    'video_id': 'HIFb-a8b39s',
                    'title': 'Geometry Introduction',
                    'duration': '18:20',
                    'channel': 'The Organic Chemistry Tutor',
                    'description': 'Basic geometry concepts including angles, lines, and shapes',
                    'category': 'Mathematics',
                    'grade': '10',
                    'topic': 'Geometry',
                    'difficulty': 'beginner',
                    'duration_minutes': 110,
                    'content_type': 'video'
                }
            ],
            'Trigonometry': [
                {
                    'id': 'math_10_trigonometry_1',
                    'video_id': 'T2O0Smc_6gY',
                    'title': 'Trigonometry Fundamentals',
                    'duration': '16:45',
                    'channel': 'Math and Science',
                    'description': 'Introduction to trigonometric functions and identities',
                    'category': 'Mathematics',
                    'grade': '10',
                    'topic': 'Trigonometry',
                    'difficulty': 'beginner',
                    'duration_minutes': 101,
                    'content_type': 'video'
                }
            ]
        },
        '11': {
            'Functions': [
                {
                    'id': 'math_11_functions_1',
                    'video_id': 'FXItlSSEZ1Q',
                    'title': 'Functions and Graphs',
                    'duration': '20:15',
                    'channel': 'Mario\'s Math Tutoring',
                    'description': 'Understanding functions, graphing, and function properties',
                    'category': 'Mathematics',
                    'grade': '11',
                    'topic': 'Functions',
                    'difficulty': 'intermediate',
                    'duration_minutes': 121,
                    'content_type': 'video'
                }
            ],
            'Calculus Basics': [
                {
                    'id': 'math_11_calculus_1',
                    'video_id': 'rfjf7bCtCIk',
                    'title': 'Calculus Introduction',
                    'duration': '22:30',
                    'channel': 'Professor Dave Explains',
                    'description': 'Introduction to limits and derivatives',
                    'category': 'Mathematics',
                    'grade': '11',
                    'topic': 'Calculus Basics',
                    'difficulty': 'intermediate',
                    'duration_minutes': 135,
                    'content_type': 'video'
                }
            ]
        },
        '12': {
            'Calculus': [
                {
                    'id': 'math_12_calculus_1',
                    'video_id': 'rfjf7bCtCIk',
                    'title': 'Calculus Fundamentals',
                    'duration': '25:40',
                    'channel': 'Professor Dave Explains',
                    'description': 'Introduction to differential and integral calculus',
                    'category': 'Mathematics',
                    'grade': '12',
                    'topic': 'Calculus',
                    'difficulty': 'advanced',
                    'duration_minutes': 154,
                    'content_type': 'video'
                }
            ],
            'Statistics': [
                {
                    'id': 'math_12_stats_1',
                    'video_id': 'xxpc-HPKN28',
                    'title': 'Probability and Statistics',
                    'duration': '19:20',
                    'channel': 'The Organic Chemistry Tutor',
                    'description': 'Understanding probability, distributions, and statistical analysis',
                    'category': 'Mathematics',
                    'grade': '12',
                    'topic': 'Statistics',
                    'difficulty': 'advanced',
                    'duration_minutes': 116,
                    'content_type': 'video'
                }
            ]
        }
    },
    'English': {
        '10': {
            'Grammar': [
                {
                    'id': 'english_10_grammar_1',
                    'video_id': '8qBwN_s6IjE',
                    'title': 'English Grammar Basics',
                    'duration': '14:25',
                    'channel': 'Shaw English Online',
                    'description': 'Fundamental grammar rules and sentence structure',
                    'category': 'English',
                    'grade': '10',
                    'topic': 'Grammar',
                    'difficulty': 'beginner',
                    'duration_minutes': 87,
                    'content_type': 'video'
                }
            ],
            'Literature': [
                {
                    'id': 'english_10_literature_1',
                    'video_id': '4RCFLobfqcw',
                    'title': 'Introduction to Poetry Analysis',
                    'duration': '16:30',
                    'channel': 'English with Lucy',
                    'description': 'Basic techniques for analyzing and understanding poetry',
                    'category': 'English',
                    'grade': '10',
                    'topic': 'Literature',
                    'difficulty': 'beginner',
                    'duration_minutes': 99,
                    'content_type': 'video'
                }
            ]
        }
    },
    'Accounting': {
        '10': {
            'Basic Accounting': [
                {
                    'id': 'accounting_10_basic_1',
                    'video_id': 'G4qshy9d8a8',
                    'title': 'Accounting Principles',
                    'duration': '19:35',
                    'channel': 'Accounting Stuff',
                    'description': 'Introduction to accounting concepts and principles',
                    'category': 'Accounting',
                    'grade': '10',
                    'topic': 'Basic Accounting',
                    'difficulty': 'beginner',
                    'duration_minutes': 117,
                    'content_type': 'video'
                }
            ],
            'Financial Statements': [
                {
                    'id': 'accounting_10_financial_1',
                    'video_id': 'C0ZvdxKJkK8',
                    'title': 'Understanding Balance Sheets',
                    'duration': '21:15',
                    'channel': 'The Accounting Tutor',
                    'description': 'How to read and create balance sheets',
                    'category': 'Accounting',
                    'grade': '10',
                    'topic': 'Financial Statements',
                    'difficulty': 'beginner',
                    'duration_minutes': 128,
                    'content_type': 'video'
                }
            ]
        }
    },
    'Physical Sciences': {
        '10': {
            'Physics Basics': [
                {
                    'id': 'physics_10_basics_1',
                    'video_id': 'ur0pU_imctw',
                    'title': 'Newton\'s Laws of Motion',
                    'duration': '17:45',
                    'channel': 'Physics Girl',
                    'description': 'Understanding motion, forces, and Newton\'s laws',
                    'category': 'Physical Sciences',
                    'grade': '10',
                    'topic': 'Physics Basics',
                    'difficulty': 'beginner',
                    'duration_minutes': 107,
                    'content_type': 'video'
                }
            ],
            'Chemistry Basics': [
                {
                    'id': 'chemistry_10_basics_1',
                    'video_id': 'FSyAehMdpyI',
                    'title': 'Atomic Structure and Elements',
                    'duration': '15:20',
                    'channel': 'Tyler DeWitt',
                    'description': 'Introduction to atoms, elements, and the periodic table',
                    'category': 'Physical Sciences',
                    'grade': '10',
                    'topic': 'Chemistry Basics',
                    'difficulty': 'beginner',
                    'duration_minutes': 92,
                    'content_type': 'video'
                }
            ]
        }
    }
}

# Exam papers data
EXAM_PAPERS = {
    'Mathematics': {
        '10': [
            {
                'id': 'math_10_paper_1_2023',
                'title': 'Grade 10 Mathematics Paper 1 - 2023',
                'questions': 8,
                'duration': '2 hours',
                'subject': 'Mathematics',
                'grade': '10',
                'year': '2023',
                'download_url': 'https://www.education.gov.za/Portals/0/Documents/Publications/Mathematics%20P1%20Gr10%202023.pdf'
            },
            {
                'id': 'math_10_paper_2_2023',
                'title': 'Grade 10 Mathematics Paper 2 - 2023',
                'questions': 7,
                'duration': '2 hours',
                'subject': 'Mathematics',
                'grade': '10',
                'year': '2023',
                'download_url': 'https://www.education.gov.za/Portals/0/Documents/Publications/Mathematics%20P2%20Gr10%202023.pdf'
            }
        ],
        '11': [
            {
                'id': 'math_11_paper_1_2023',
                'title': 'Grade 11 Mathematics Paper 1 - 2023',
                'questions': 9,
                'duration': '2 hours',
                'subject': 'Mathematics',
                'grade': '11',
                'year': '2023',
                'download_url': 'https://www.education.gov.za/Portals/0/Documents/Publications/Mathematics%20P1%20Gr11%202023.pdf'
            }
        ]
    },
    'English': {
        '10': [
            {
                'id': 'english_10_paper_1_2023',
                'title': 'Grade 10 English Paper 1 - 2023',
                'questions': 5,
                'duration': '2 hours',
                'subject': 'English',
                'grade': '10',
                'year': '2023',
                'download_url': 'https://www.education.gov.za/Portals/0/Documents/Publications/English%20P1%20Gr10%202023.pdf'
            }
        ]
    }
}

# ========== DEBUG ENDPOINTS ==========
@lessons_bp.route('/debug/test', methods=['GET'])
def debug_test():
    """Debug endpoint to test basic connectivity"""
    print("🔧 Debug endpoint called successfully!")
    return jsonify({
        'success': True,
        'message': 'Debug endpoint working',
        'curriculum_keys': list(SCHOOL_CURRICULUM.keys()),
        'timestamp': datetime.utcnow().isoformat()
    }), 200

@lessons_bp.route('/debug/auth-test', methods=['GET'])
@jwt_required()
def debug_auth_test():
    """Debug endpoint to test authentication"""
    current_user_id = get_jwt_identity()
    print(f"🔐 Auth test - User ID: {current_user_id}")
    
    return jsonify({
        'success': True,
        'message': 'Authentication working',
        'user_id': current_user_id,
        'timestamp': datetime.utcnow().isoformat()
    }), 200

# ========== MAIN ENDPOINTS ==========
@lessons_bp.route('/curriculum', methods=['GET'])
@jwt_required()
def get_curriculum():
    """Get complete school curriculum structure"""
    try:
        print("📚 Curriculum endpoint called")
        return jsonify({
            'success': True,
            'curriculum': SCHOOL_CURRICULUM
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching curriculum: {str(e)}")
        return jsonify({'error': 'Failed to fetch curriculum'}), 500

@lessons_bp.route('/subjects', methods=['GET'])
@jwt_required()
def get_subjects():
    """Get available subjects"""
    try:
        subjects = list(SCHOOL_CURRICULUM.keys())
        print(f"📖 Subjects endpoint called, returning: {subjects}")
        return jsonify({
            'success': True,
            'subjects': subjects
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching subjects: {str(e)}")
        return jsonify({'error': 'Failed to fetch subjects'}), 500

@lessons_bp.route('/grades', methods=['GET'])
@jwt_required()
def get_grades():
    """Get available grades"""
    try:
        grades = ['10', '11', '12']
        print(f"🎓 Grades endpoint called, returning: {grades}")
        return jsonify({
            'success': True,
            'grades': grades
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching grades: {str(e)}")
        return jsonify({'error': 'Failed to fetch grades'}), 500

@lessons_bp.route('/<string:subject>/<string:grade>/topics', methods=['GET'])
@jwt_required()
def get_topics(subject, grade):
    """Get topics for a specific subject and grade"""
    try:
        print(f"🔍 Topics endpoint called - Subject: {subject}, Grade: {grade}")
        
        if subject not in SCHOOL_CURRICULUM:
            print(f"❌ Subject '{subject}' not found in curriculum")
            return jsonify({'error': 'Subject not found'}), 404
            
        if grade not in SCHOOL_CURRICULUM[subject]:
            print(f"❌ Grade '{grade}' not found for subject '{subject}'")
            return jsonify({'error': 'Grade not found for this subject'}), 404
            
        topics = list(SCHOOL_CURRICULUM.get(subject, {}).get(grade, {}).keys())
        print(f"✅ Topics found: {topics}")
        
        return jsonify({
            'success': True,
            'subject': subject,
            'grade': grade,
            'topics': topics
        }), 200
    except Exception as e:
        current_app.logger.error(f"Error fetching topics: {str(e)}")
        return jsonify({'error': 'Failed to fetch topics'}), 500

@lessons_bp.route('/<string:subject>/<string:grade>/<string:topic>/videos', methods=['GET'])
@jwt_required()
def get_topic_videos(subject, grade, topic):
    """Get videos for a specific topic"""
    try:
        print(f"🎥 Videos endpoint called - Subject: {subject}, Grade: {grade}, Topic: {topic}")
        
        if subject not in SCHOOL_CURRICULUM:
            return jsonify({'error': 'Subject not found'}), 404
            
        if grade not in SCHOOL_CURRICULUM[subject]:
            return jsonify({'error': 'Grade not found for this subject'}), 404
            
        if topic not in SCHOOL_CURRICULUM[subject][grade]:
            return jsonify({'error': 'Topic not found for this subject and grade'}), 404
            
        videos = SCHOOL_CURRICULUM.get(subject, {}).get(grade, {}).get(topic, [])
        
        # Get user progress for these videos
        current_user_id = get_jwt_identity()
        video_ids = [video['id'] for video in videos]
        
        user_progress = LessonProgress.query.filter(
            LessonProgress.user_id == current_user_id,
            LessonProgress.lesson_id.in_(video_ids)
        ).all()
        
        progress_map = {progress.lesson_id: progress for progress in user_progress}
        
        # Enhance videos with user progress
        enhanced_videos = []
        for video in videos:
            video_progress = progress_map.get(video['id'])
            enhanced_video = video.copy()
            enhanced_video['user_progress'] = {
                'completed': video_progress.completed if video_progress else False,
                'progress': video_progress.progress if video_progress else 0.0,
                'last_accessed': video_progress.last_accessed.isoformat() if video_progress and video_progress.last_accessed else None
            }
            enhanced_videos.append(enhanced_video)
        
        return jsonify({
            'success': True,
            'subject': subject,
            'grade': grade,
            'topic': topic,
            'videos': enhanced_videos
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching topic videos: {str(e)}")
        return jsonify({'error': 'Failed to fetch videos'}), 500

@lessons_bp.route('/video-progress', methods=['POST'])
@jwt_required()
def update_video_progress():
    """Update video lesson progress"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        video_id = data.get('video_id')
        subject = data.get('subject')
        grade = data.get('grade')
        topic = data.get('topic')
        action = data.get('action', 'completed')
        
        if not all([video_id, subject, grade, topic]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        print(f"📹 Video progress update - User: {current_user_id}, Video: {video_id}, Action: {action}")
        
        # Find the lesson from curriculum
        lesson_data = None
        for subject_name, grades_data in SCHOOL_CURRICULUM.items():
            for grade_level, topics_data in grades_data.items():
                for topic_name, lessons in topics_data.items():
                    for lesson in lessons:
                        if lesson.get('video_id') == video_id:
                            lesson_data = lesson
                            break
                    if lesson_data:
                        break
                if lesson_data:
                    break
            if lesson_data:
                break
        
        if not lesson_data:
            return jsonify({'error': 'Video lesson not found'}), 404
        
        lesson_id = lesson_data['id']
        
        # Update lesson progress
        lesson_progress = LessonProgress.query.filter_by(
            user_id=current_user_id,
            lesson_id=lesson_id
        ).first()
        
        completed = (action == 'completed')
        progress_value = 1.0 if completed else 0.5
        
        if not lesson_progress:
            lesson_progress = LessonProgress(
                user_id=current_user_id,
                lesson_id=lesson_id,
                progress=progress_value,
                completed=completed,
                last_accessed=datetime.utcnow(),
                subject=subject,
                grade=grade,
                topic=topic,
                video_id=video_id
            )
            db.session.add(lesson_progress)
        else:
            lesson_progress.progress = max(lesson_progress.progress, progress_value)
            if completed:
                lesson_progress.completed = True
            lesson_progress.last_accessed = datetime.utcnow()
        
        # Also update VideoProgress table
        video_progress = VideoProgress.query.filter_by(
            user_id=current_user_id,
            video_id=video_id
        ).first()
        
        if not video_progress:
            video_progress = VideoProgress(
                user_id=current_user_id,
                video_id=video_id,
                subject=subject,
                grade=grade,
                topic=topic,
                completed=completed,
                progress=progress_value,
                last_accessed=datetime.utcnow()
            )
            db.session.add(video_progress)
        else:
            video_progress.progress = max(video_progress.progress, progress_value)
            if completed:
                video_progress.completed = True
            video_progress.last_accessed = datetime.utcnow()
        
        # Log activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='video_completed' if completed else 'video_started',
            activity_data=json.dumps({
                'video_id': video_id,
                'lesson_id': lesson_id,
                'subject': subject,
                'grade': grade,
                'topic': topic,
                'title': lesson_data['title'],
                'action': action
            })
        )
        db.session.add(activity)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Video progress updated successfully',
            'progress': lesson_progress.progress,
            'completed': lesson_progress.completed
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error updating video progress: {str(e)}")
        return jsonify({'error': 'Failed to update video progress'}), 500

@lessons_bp.route('/exam-papers', methods=['GET'])
@jwt_required()
def get_exam_papers():
    """Get exam papers with optional subject and grade filtering"""
    try:
        subject = request.args.get('subject')
        grade = request.args.get('grade')
        
        print(f"📝 Exam papers endpoint called - Subject: {subject}, Grade: {grade}")
        
        filtered_papers = []
        
        for paper_subject, grades in EXAM_PAPERS.items():
            if subject and paper_subject != subject:
                continue
            for paper_grade, papers in grades.items():
                if grade and paper_grade != grade:
                    continue
                filtered_papers.extend(papers)
        
        return jsonify({
            'success': True,
            'exam_papers': filtered_papers,
            'total': len(filtered_papers)
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching exam papers: {str(e)}")
        return jsonify({'error': 'Failed to fetch exam papers'}), 500

@lessons_bp.route('/progress/overview', methods=['GET'])
@jwt_required()
def get_progress_overview():
    """Get overview of user's progress across all subjects"""
    try:
        current_user_id = get_jwt_identity()
        print(f"📊 Progress overview called for user: {current_user_id}")
        
        # Get all lessons from curriculum
        all_lessons = []
        for subject, grades in SCHOOL_CURRICULUM.items():
            for grade, topics in grades.items():
                for topic, lessons in topics.items():
                    all_lessons.extend(lessons)
        
        # Get user progress
        user_progress = LessonProgress.query.filter_by(user_id=current_user_id).all()
        progress_map = {progress.lesson_id: progress for progress in user_progress}
        
        # Calculate subject-wise progress
        subject_progress = {}
        for subject in SCHOOL_CURRICULUM.keys():
            subject_lessons = []
            for grade, topics in SCHOOL_CURRICULUM[subject].items():
                for topic, lessons in topics.items():
                    subject_lessons.extend(lessons)
            
            completed_count = 0
            total_progress = 0
            for lesson in subject_lessons:
                progress = progress_map.get(lesson['id'])
                if progress and progress.completed:
                    completed_count += 1
                total_progress += progress.progress if progress else 0
            
            total_lessons = len(subject_lessons)
            progress_percent = (total_progress / total_lessons) * 100 if total_lessons > 0 else 0
            
            subject_progress[subject] = {
                'total_lessons': total_lessons,
                'completed_lessons': completed_count,
                'progress_percent': round(progress_percent, 1)
            }
        
        # Calculate overall progress
        total_lessons = len(all_lessons)
        completed_lessons = len([p for p in user_progress if p.completed])
        total_progress = sum(p.progress for p in user_progress) / total_lessons if total_lessons > 0 else 0
        
        return jsonify({
            'success': True,
            'overview': {
                'total_lessons': total_lessons,
                'completed_lessons': completed_lessons,
                'in_progress_lessons': len([p for p in user_progress if not p.completed and p.progress > 0]),
                'not_started_lessons': total_lessons - completed_lessons,
                'total_progress_percentage': round(total_progress * 100, 1)
            },
            'subject_progress': subject_progress,
            'recent_activity': [
                {
                    'lesson_id': progress.lesson_id,
                    'title': next((lesson['title'] for lesson in all_lessons if lesson['id'] == progress.lesson_id), 'Unknown Lesson'),
                    'subject': next((lesson['category'] for lesson in all_lessons if lesson['id'] == progress.lesson_id), 'Unknown'),
                    'progress': progress.progress,
                    'completed': progress.completed,
                    'last_accessed': progress.last_accessed.isoformat() if progress.last_accessed else None
                }
                for progress in sorted(user_progress, key=lambda x: x.last_accessed or datetime.min, reverse=True)[:5]
            ]
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching progress overview: {str(e)}")
        return jsonify({'error': 'Failed to fetch progress overview'}), 500

@lessons_bp.route('/study-notes', methods=['POST'])
@jwt_required()
def generate_study_notes():
    """Generate or get study notes for a topic"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        subject = data.get('subject')
        grade = data.get('grade')
        topic = data.get('topic')
        
        if not all([subject, grade, topic]):
            return jsonify({'error': 'Subject, grade, and topic are required'}), 400
        
        print(f"📓 Study notes requested - Subject: {subject}, Grade: {grade}, Topic: {topic}")
        
        # Check if notes already exist
        existing_note = StudyNote.query.filter_by(
            user_id=current_user_id,
            subject=subject,
            grade=grade,
            topic=topic
        ).first()
        
        if existing_note:
            return jsonify({
                'success': True,
                'notes': existing_note.to_dict(),
                'from_cache': True
            }), 200
        
        # For now, return placeholder notes - you can integrate with AI here
        placeholder_notes = f"""# Study Notes for {subject} - Grade {grade}

## {topic}

### Key Concepts
- Fundamental principles and theories related to {topic}
- Important formulas and equations
- Real-world applications

### Learning Objectives
1. Understand the basic concepts of {topic}
2. Apply knowledge to solve problems
3. Analyze and interpret results

### Study Tips
- Practice regularly with exercises
- Review concepts weekly
- Create summary notes
- Work through past exam papers

### Common Mistakes to Avoid
- Rushing through problems without understanding
- Not showing working steps
- Forgetting to check answers

### Practice Questions
1. Basic application question
2. Intermediate problem-solving
3. Advanced analytical question

Remember to review these notes regularly and practice with past exam papers!"""
        
        note = StudyNote(
            user_id=current_user_id,
            subject=subject,
            grade=grade,
            topic=topic,
            title=f"{subject} - {topic} Notes",
            content=placeholder_notes,
            tags=[subject, grade, topic],
            is_public=False
        )
        
        db.session.add(note)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'notes': note.to_dict(),
            'from_cache': False
        }), 201
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error generating study notes: {str(e)}")
        return jsonify({'error': 'Failed to generate study notes'}), 500

@lessons_bp.route('/ask-question', methods=['POST'])
@jwt_required()
def ask_question():
    """AI Q&A endpoint"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        question = data.get('question')
        subject = data.get('subject')
        grade = data.get('grade')
        topic = data.get('topic')
        
        if not question:
            return jsonify({'error': 'Question is required'}), 400
        
        print(f"🤖 AI Question - Subject: {subject}, Grade: {grade}, Topic: {topic}")
        
        # Enhanced placeholder response
        ai_response = f"""I can help you with your question about {topic} in {subject} (Grade {grade})!

**Your Question:** {question}

**My Response:**
This is a comprehensive explanation about {topic}. In {subject} for Grade {grade}, we focus on building strong foundational knowledge.

Key points to remember:
1. Understand the basic concepts first
2. Practice with examples
3. Review regularly
4. Ask for help when needed

For more specific answers, I'd recommend:
- Reviewing your textbook chapter on {topic}
- Working through practice problems
- Consulting with your teacher for personalized guidance

Would you like me to explain any specific aspect in more detail?"""
        
        # Log the Q&A activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='ai_question',
            activity_data=json.dumps({
                'question': question,
                'subject': subject,
                'grade': grade,
                'topic': topic,
                'response': ai_response
            })
        )
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'question': question,
            'answer': ai_response,
            'subject': subject,
            'grade': grade,
            'topic': topic
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error processing question: {str(e)}")
        return jsonify({'error': 'Failed to process question'}), 500

@lessons_bp.route('/progress/download-resource', methods=['POST'])
@jwt_required()
def download_resource():
    """Handle resource downloads"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        resource_type = data.get('resource_type')
        resource_id = data.get('resource_id')
        subject = data.get('subject')
        grade = data.get('grade')
        
        if not all([resource_type, resource_id, subject, grade]):
            return jsonify({'error': 'Missing required fields'}), 400
        
        print(f"📥 Download resource - Type: {resource_type}, ID: {resource_id}")
        
        # Log the download activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type=f'download_{resource_type}',
            activity_data=json.dumps({
                'resource_type': resource_type,
                'resource_id': resource_id,
                'subject': subject,
                'grade': grade
            })
        )
        db.session.add(activity)
        
        # Create resource download record
        download = ResourceDownload(
            user_id=current_user_id,
            resource_type=resource_type,
            resource_id=resource_id,
            downloaded_at=datetime.utcnow()
        )
        db.session.add(download)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Download recorded successfully',
            'download_id': download.id
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error recording download: {str(e)}")
        return jsonify({'error': 'Failed to record download'}), 500