# app/routes/games.py
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.models import User, UserProfile, Game, GameSession, UserActivity, UserAchievement, StudyNote, AIInteraction
from app import db
import uuid
import json
from datetime import datetime
import os
import openai
import random

games_bp = Blueprint('games', __name__)

# Initialize OpenAI if API key is available
openai_api_key = os.getenv('OPENAI_API_KEY')
if openai_api_key:
    openai.api_key = openai_api_key

# Enhanced CAPS-aligned sample games for Grades 10-12
CAPS_GAMES = [
    # Grade 10 Games
    {
        'id': 'math_algebra_10',
        'title': 'Algebra Adventure',
        'description': 'Master algebraic expressions and equations through interactive challenges',
        'category': 'Mathematics',
        'difficulty': 'Beginner',
        'duration': '10-15 mins',
        'players': 'Individual',
        'icon': 'calculator',
        'color': '#FF6B6B',
        'topics': ['algebraic expressions', 'equations', 'variables'],
        'rating': 4.5,
        'generated': False,
        'locked': False,
        'grade_level': '10',
        'max_score': 1000
    },
    {
        'id': 'english_grammar_10',
        'title': 'Grammar Guardian',
        'description': 'Improve your grammar skills with fun sentence-building exercises',
        'category': 'English',
        'difficulty': 'Beginner',
        'duration': '8-12 mins',
        'players': '1-2 players',
        'icon': 'book',
        'color': '#4ECDC4',
        'topics': ['parts of speech', 'sentence structure', 'punctuation'],
        'rating': 4.3,
        'generated': False,
        'locked': False,
        'grade_level': '10',
        'max_score': 1000
    },
    {
        'id': 'science_physics_10',
        'title': 'Physics Explorer',
        'description': 'Discover the laws of motion and energy through interactive experiments',
        'category': 'Physical Sciences',
        'difficulty': 'Intermediate',
        'duration': '12-18 mins',
        'players': 'Individual',
        'icon': 'flask',
        'color': '#45B7D1',
        'topics': ['motion', 'forces', 'energy'],
        'rating': 4.7,
        'generated': False,
        'locked': False,
        'grade_level': '10',
        'max_score': 1500
    },
    {
        'id': 'accounting_basics_10',
        'title': 'Accounting Ace',
        'description': 'Learn basic accounting principles and financial statements',
        'category': 'Accounting',
        'difficulty': 'Beginner',
        'duration': '10-15 mins',
        'players': 'Individual',
        'icon': 'cash',
        'color': '#96CEB4',
        'topics': ['financial statements', 'debits credits', 'balance sheet'],
        'rating': 4.4,
        'generated': False,
        'locked': False,
        'grade_level': '10',
        'max_score': 1000
    },
    
    # Grade 11 Games
    {
        'id': 'math_functions_11',
        'title': 'Functions Master',
        'description': 'Explore functions, graphs and advanced algebraic concepts',
        'category': 'Mathematics',
        'difficulty': 'Intermediate',
        'duration': '15-20 mins',
        'players': 'Individual',
        'icon': 'trending-up',
        'color': '#FFA726',
        'topics': ['functions', 'graphs', 'inverse functions'],
        'rating': 4.6,
        'generated': False,
        'locked': False,
        'grade_level': '11',
        'max_score': 1200
    },
    {
        'id': 'english_literature_11',
        'title': 'Literature Analysis',
        'description': 'Analyze literary texts and develop critical thinking skills',
        'category': 'English',
        'difficulty': 'Intermediate',
        'duration': '15-25 mins',
        'players': 'Individual',
        'icon': 'bookmarks',
        'color': '#66BB6A',
        'topics': ['literary analysis', 'themes', 'character development'],
        'rating': 4.5,
        'generated': False,
        'locked': False,
        'grade_level': '11',
        'max_score': 1300
    },
    {
        'id': 'science_chemistry_11',
        'title': 'Chemistry Lab',
        'description': 'Explore chemical reactions and molecular structures',
        'category': 'Physical Sciences',
        'difficulty': 'Intermediate',
        'duration': '18-25 mins',
        'players': 'Individual',
        'icon': 'beaker',
        'color': '#AB47BC',
        'topics': ['chemical reactions', 'molecules', 'periodic table'],
        'rating': 4.8,
        'generated': False,
        'locked': False,
        'grade_level': '11',
        'max_score': 1400
    },
    {
        'id': 'accounting_ledgers_11',
        'title': 'Ledger Logic',
        'description': 'Master general ledgers and trial balance preparation',
        'category': 'Accounting',
        'difficulty': 'Intermediate',
        'duration': '15-20 mins',
        'players': 'Individual',
        'icon': 'list',
        'color': '#26C6DA',
        'topics': ['general ledger', 'trial balance', 'accounting cycle'],
        'rating': 4.4,
        'generated': False,
        'locked': False,
        'grade_level': '11',
        'max_score': 1250
    },
    
    # Grade 12 Games
    {
        'id': 'math_calculus_12',
        'title': 'Calculus Challenge',
        'description': 'Master differential and integral calculus concepts',
        'category': 'Mathematics',
        'difficulty': 'Advanced',
        'duration': '20-30 mins',
        'players': 'Individual',
        'icon': 'graph',
        'color': '#EF5350',
        'topics': ['derivatives', 'integrals', 'limits'],
        'rating': 4.9,
        'generated': False,
        'locked': False,
        'grade_level': '12',
        'max_score': 2000
    },
    {
        'id': 'english_paper3_12',
        'title': 'Paper 3 Prep',
        'description': 'Prepare for final exams with comprehensive language practice',
        'category': 'English',
        'difficulty': 'Advanced',
        'duration': '25-35 mins',
        'players': 'Individual',
        'icon': 'document-text',
        'color': '#29B6F6',
        'topics': ['comprehension', 'essay writing', 'language structures'],
        'rating': 4.7,
        'generated': False,
        'locked': False,
        'grade_level': '12',
        'max_score': 1800
    },
    {
        'id': 'science_electricity_12',
        'title': 'Electricity & Magnetism',
        'description': 'Explore advanced concepts in electricity and electromagnetism',
        'category': 'Physical Sciences',
        'difficulty': 'Advanced',
        'duration': '20-30 mins',
        'players': 'Individual',
        'icon': 'flash',
        'color': '#FFCA28',
        'topics': ['electric circuits', 'magnetism', 'electromagnetism'],
        'rating': 4.8,
        'generated': False,
        'locked': False,
        'grade_level': '12',
        'max_score': 1900
    },
    {
        'id': 'accounting_financial_12',
        'title': 'Financial Analysis',
        'description': 'Master financial statements and ratio analysis',
        'category': 'Accounting',
        'difficulty': 'Advanced',
        'duration': '20-30 mins',
        'players': 'Individual',
        'icon': 'bar-chart',
        'color': '#26A69A',
        'topics': ['financial ratios', 'cash flow', 'budgeting'],
        'rating': 4.6,
        'generated': False,
        'locked': False,
        'grade_level': '12',
        'max_score': 1700
    }
]

# Enhanced static question bank for Grades 10-12
STATIC_QUESTIONS = {
    'Mathematics': {
        '10': {
            'Easy': [
                {
                    'question': 'What is the value of x in the equation: 2x + 5 = 15?',
                    'options': ['x = 5', 'x = 10', 'x = 7.5', 'x = 8'],
                    'correct_answer': 'x = 5',
                    'explanation': 'Subtract 5 from both sides: 2x = 10, then divide by 2: x = 5',
                    'topics': ['Algebra', 'Equations']
                },
                {
                    'question': 'What is the area of a rectangle with length 8cm and width 5cm?',
                    'options': ['13 cm²', '40 cm²', '26 cm²', '45 cm²'],
                    'correct_answer': '40 cm²',
                    'explanation': 'Area of rectangle = length × width = 8 × 5 = 40 cm²',
                    'topics': ['Geometry', 'Area']
                }
            ],
            'Intermediate': [
                {
                    'question': 'Solve the quadratic equation: x² - 5x + 6 = 0',
                    'options': ['x = 2, 3', 'x = 1, 6', 'x = -2, -3', 'x = -1, -6'],
                    'correct_answer': 'x = 2, 3',
                    'explanation': 'Factor: (x - 2)(x - 3) = 0, so x = 2 or x = 3',
                    'topics': ['Algebra', 'Quadratic Equations']
                }
            ]
        },
        '11': {
            'Intermediate': [
                {
                    'question': 'Find the derivative of f(x) = 3x² + 2x - 1',
                    'options': ['6x + 2', '3x + 2', '6x - 1', '3x² + 2'],
                    'correct_answer': '6x + 2',
                    'explanation': 'Using power rule: d/dx(3x²) = 6x, d/dx(2x) = 2, d/dx(-1) = 0',
                    'topics': ['Calculus', 'Derivatives']
                }
            ],
            'Hard': [
                {
                    'question': 'Solve for x: log₂(x) + log₂(x - 2) = 3',
                    'options': ['x = 4', 'x = 8', 'x = 2', 'x = 6'],
                    'correct_answer': 'x = 4',
                    'explanation': 'Combine logs: log₂(x(x-2)) = 3 → x(x-2) = 8 → x² - 2x - 8 = 0 → (x-4)(x+2)=0 → x=4',
                    'topics': ['Logarithms', 'Algebra']
                }
            ]
        },
        '12': {
            'Hard': [
                {
                    'question': 'Find the integral of ∫(3x² + 2x + 1) dx',
                    'options': ['x³ + x² + x + C', '6x + 2 + C', 'x³ + x² + C', '3x³ + 2x² + x + C'],
                    'correct_answer': 'x³ + x² + x + C',
                    'explanation': 'Using power rule: ∫3x² dx = x³, ∫2x dx = x², ∫1 dx = x, plus constant C',
                    'topics': ['Calculus', 'Integration']
                }
            ]
        }
    },
    'Physical Sciences': {
        '10': {
            'Easy': [
                {
                    'question': 'What is the SI unit of force?',
                    'options': ['Newton', 'Joule', 'Watt', 'Pascal'],
                    'correct_answer': 'Newton',
                    'explanation': 'Force is measured in Newtons (N)',
                    'topics': ['Physics', 'Units']
                },
                {
                    'question': 'Which law states that every action has an equal and opposite reaction?',
                    'options': ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Ohm's Law"],
                    'correct_answer': "Newton's Third Law",
                    'explanation': "Newton's Third Law: For every action, there is an equal and opposite reaction",
                    'topics': ['Physics', 'Laws of Motion']
                }
            ]
        },
        '11': {
            'Intermediate': [
                {
                    'question': 'Calculate the work done when a 10N force moves an object 5m in the direction of the force.',
                    'options': ['50 J', '2 J', '15 J', '5 J'],
                    'correct_answer': '50 J',
                    'explanation': 'Work = Force × Distance = 10N × 5m = 50 Joules',
                    'topics': ['Physics', 'Work and Energy']
                }
            ]
        },
        '12': {
            'Hard': [
                {
                    'question': 'A 2kg object is moving at 3m/s. What is its kinetic energy?',
                    'options': ['9 J', '6 J', '18 J', '12 J'],
                    'correct_answer': '9 J',
                    'explanation': 'KE = ½mv² = ½ × 2kg × (3m/s)² = 9 Joules',
                    'topics': ['Physics', 'Energy']
                }
            ]
        }
    },
    'English': {
        '10': {
            'Easy': [
                {
                    'question': 'Which word is a noun in the sentence: "The quick brown fox jumps over the lazy dog."',
                    'options': ['quick', 'jumps', 'fox', 'over'],
                    'correct_answer': 'fox',
                    'explanation': '"fox" is a noun (a naming word for an animal)',
                    'topics': ['Grammar', 'Parts of Speech']
                }
            ]
        },
        '11': {
            'Intermediate': [
                {
                    'question': 'Identify the metaphor in: "Time is a thief that steals our moments."',
                    'options': ['Time is a thief', 'steals our moments', 'that steals', 'our moments'],
                    'correct_answer': 'Time is a thief',
                    'explanation': 'This is a metaphor comparing time to a thief without using "like" or "as"',
                    'topics': ['Literature', 'Figurative Language']
                }
            ]
        },
        '12': {
            'Hard': [
                {
                    'question': 'Which literary device is used in: "The wind whispered through the trees."',
                    'options': ['Personification', 'Simile', 'Metaphor', 'Hyperbole'],
                    'correct_answer': 'Personification',
                    'explanation': 'Giving human qualities (whispering) to non-human things (wind) is personification',
                    'topics': ['Literature', 'Literary Devices']
                }
            ]
        }
    },
    'Accounting': {
        '10': {
            'Easy': [
                {
                    'question': 'What is the accounting equation?',
                    'options': [
                        'Assets = Liabilities + Equity',
                        'Income = Expenses + Profit',
                        'Debits = Credits',
                        'Revenue - Expenses = Net Income'
                    ],
                    'correct_answer': 'Assets = Liabilities + Equity',
                    'explanation': 'The fundamental accounting equation is Assets = Liabilities + Equity',
                    'topics': ['Accounting Principles', 'Equations']
                }
            ]
        },
        '11': {
            'Intermediate': [
                {
                    'question': 'Which financial statement shows revenues and expenses?',
                    'options': ['Income Statement', 'Balance Sheet', 'Cash Flow Statement', 'Statement of Equity'],
                    'correct_answer': 'Income Statement',
                    'explanation': 'The Income Statement shows revenues, expenses, and net income over a period',
                    'topics': ['Financial Statements', 'Accounting']
                }
            ]
        },
        '12': {
            'Hard': [
                {
                    'question': 'Calculate the current ratio if Current Assets = R50,000 and Current Liabilities = R25,000',
                    'options': ['2:1', '0.5:1', '1:1', '1.5:1'],
                    'correct_answer': '2:1',
                    'explanation': 'Current Ratio = Current Assets / Current Liabilities = 50,000 / 25,000 = 2:1',
                    'topics': ['Financial Ratios', 'Analysis']
                }
            ]
        }
    }
}

@games_bp.route('/', methods=['GET'])
@jwt_required()
def get_games():
    """Get all available educational games from database for specific grade"""
    try:
        current_user_id = get_jwt_identity()
        
        # Get query parameters
        category = request.args.get('category')
        difficulty = request.args.get('difficulty')
        grade = request.args.get('grade', '10')
        include_ai = request.args.get('include_ai', 'true').lower() == 'true'
        
        # Validate grade parameter
        if grade not in ['10', '11', '12']:
            grade = '10'  # Default to grade 10 if invalid
        
        # Start with games from database
        query = Game.query.filter_by(is_active=True)
        
        # Apply filters
        if category and category != 'All':
            query = query.filter(Game.category == category)
        
        if difficulty:
            query = query.filter(Game.difficulty_level == difficulty)
        
        db_games = query.all()
        
        # Convert database games to API format and filter by grade
        filtered_games = []
        for db_game in db_games:
            game_data = db_game.get_game_data() if db_game.game_data else {}
            game_grade = game_data.get('grade_level', grade)
            
            # Only include games that match the requested grade
            if game_grade == grade:
                game = {
                    'id': db_game.id,
                    'title': db_game.name,
                    'description': db_game.description,
                    'category': db_game.category,
                    'difficulty': db_game.difficulty_level,
                    'duration': game_data.get('duration', '10-15 mins'),
                    'players': game_data.get('players', 'Individual'),
                    'icon': game_data.get('icon', 'game-controller'),
                    'color': game_data.get('color', '#4ECDC4'),
                    'topics': game_data.get('topics', []),
                    'rating': game_data.get('rating', 4.0),
                    'generated': game_data.get('ai_generated', False),
                    'locked': game_data.get('locked', False),
                    'grade_level': game_grade,
                    'max_score': db_game.max_score
                }
                filtered_games.append(game)
        
        # Add sample games if no database games found for this grade
        if not filtered_games:
            filtered_games = [game for game in CAPS_GAMES if game.get('grade_level') == grade]
        
        # Generate AI games if requested and API key available
        if include_ai and openai_api_key:
            try:
                user_profile = UserProfile.query.filter_by(user_id=current_user_id).first()
                ai_games = generate_ai_games_with_openai(
                    category=category, 
                    grade=grade, 
                    user_profile=user_profile
                )
                if ai_games:
                    # Save AI games to database
                    saved_ai_games = save_ai_games_to_db(ai_games)
                    filtered_games.extend(saved_ai_games)
            except Exception as ai_error:
                current_app.logger.error(f"AI game generation failed: {str(ai_error)}")
        
        # Get user's game sessions to show progress
        user_sessions = GameSession.query.filter_by(user_id=current_user_id).all()
        
        # Enhance games with user progress
        enhanced_games = []
        for game in filtered_games:
            user_game_sessions = [s for s in user_sessions if s.game_type == game['id']]
            best_score = max([s.score for s in user_game_sessions]) if user_game_sessions else 0
            completed = any(s.completed for s in user_game_sessions)
            
            enhanced_game = game.copy()
            enhanced_game['user_progress'] = {
                'best_score': best_score,
                'completed': completed,
                'attempts': len(user_game_sessions)
            }
            enhanced_games.append(enhanced_game)
        
        return jsonify({
            'success': True,
            'games': enhanced_games,
            'total': len(enhanced_games),
            'ai_enabled': bool(openai_api_key),
            'from_database': len(db_games) > 0,
            'grade': grade,
            'message': f'Found {len(enhanced_games)} games for Grade {grade}'
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error fetching games: {str(e)}")
        # Return sample games for the requested grade as fallback
        grade = request.args.get('grade', '10')
        fallback_games = [game for game in CAPS_GAMES if game.get('grade_level') == grade]
        return jsonify({
            'success': False,
            'error': 'Failed to fetch games',
            'games': fallback_games,
            'total': len(fallback_games),
            'grade': grade
        }), 200

@games_bp.route('/questions/generate', methods=['POST'])
@jwt_required()
def generate_question():
    """Generate educational questions for specific grade"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        subject = data.get('subject', 'Mathematics')
        difficulty = data.get('difficulty', 'Easy')
        topics = data.get('topics', [])
        grade = data.get('grade', '10')
        question_type = data.get('question_type', 'multiple_choice')
        
        # Validate grade
        if grade not in ['10', '11', '12']:
            grade = '10'
        
        # Try to get question from database first
        db_question = get_question_from_db(subject, difficulty, topics, grade)
        if db_question:
            return jsonify({
                'success': True,
                'question': db_question,
                'source': 'database',
                'grade': grade
            }), 200
        
        # Fallback to AI generation if no database question found and API key available
        if openai_api_key:
            ai_question = generate_ai_question(subject, difficulty, grade, topics, question_type)
            if ai_question:
                # Log AI interaction
                ai_interaction = AIInteraction(
                    user_id=current_user_id,
                    action='generate_question',
                    input_data=json.dumps({
                        'subject': subject,
                        'difficulty': difficulty,
                        'topics': topics,
                        'grade': grade,
                        'question_type': question_type
                    }),
                    output_data=json.dumps({
                        'question_id': ai_question.get('id'),
                        'subject': subject,
                        'difficulty': difficulty,
                        'grade': grade
                    }),
                    model_used='gpt-3.5-turbo'
                )
                db.session.add(ai_interaction)
                db.session.commit()
                
                return jsonify({
                    'success': True,
                    'question': ai_question,
                    'source': 'ai',
                    'grade': grade
                }), 200
        
        # Final fallback to static questions
        static_question = get_static_question(subject, difficulty, topics, grade)
        return jsonify({
            'success': True,
            'question': static_question,
            'source': 'static',
            'grade': grade
        }), 200
        
    except Exception as e:
        current_app.logger.error(f"Error generating question: {str(e)}")
        # Always return a fallback question
        grade = data.get('grade', '10') if 'data' in locals() else '10'
        fallback_question = create_fallback_question(subject, difficulty, topics, grade)
        return jsonify({
            'success': True,
            'question': fallback_question,
            'source': 'fallback',
            'grade': grade,
            'error': str(e)
        }), 200

@games_bp.route('/generate-ai', methods=['POST'])
@jwt_required()
def generate_ai_games_endpoint():
    """Generate AI-powered educational games and save to database"""
    try:
        if not openai_api_key:
            return jsonify({
                'success': False,
                'error': 'OpenAI API key not configured'
            }), 400
        
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        subject = data.get('subject', 'Mathematics')
        grade = data.get('grade', '10')
        count = data.get('count', 5)
        
        user_profile = UserProfile.query.filter_by(user_id=current_user_id).first()
        
        ai_games = generate_ai_games_with_openai(subject, grade, count, user_profile)
        
        if ai_games:
            # Save AI games to database
            saved_games = save_ai_games_to_db(ai_games)
            
            # Log AI interaction
            ai_interaction = AIInteraction(
                user_id=current_user_id,
                action='generate_games',
                input_data=json.dumps({
                    'subject': subject,
                    'grade': grade,
                    'count': count
                }),
                output_data=json.dumps({
                    'games_generated': len(saved_games),
                    'game_ids': [game['id'] for game in saved_games]
                }),
                model_used='gpt-3.5-turbo'
            )
            db.session.add(ai_interaction)
            db.session.commit()
            
            return jsonify({
                'success': True,
                'games': saved_games,
                'saved_to_database': True,
                'message': f'Generated and saved {len(saved_games)} AI games for {subject}'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Failed to generate AI games'
            }), 500
            
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error generating AI games: {str(e)}")
        return jsonify({'error': 'Failed to generate AI games'}), 500

@games_bp.route('/save', methods=['POST'])
@jwt_required()
def save_games():
    """Save games to database - REAL IMPLEMENTATION"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        games = data.get('games', [])
        
        if not games:
            return jsonify({
                'success': False,
                'error': 'No games provided to save'
            }), 400
        
        saved_count = 0
        skipped_count = 0
        
        for game_data in games:
            # Check if game already exists
            existing_game = Game.query.filter_by(name=game_data.get('title')).first()
            
            if existing_game:
                # Update existing game
                existing_game.description = game_data.get('description', existing_game.description)
                existing_game.category = game_data.get('category', existing_game.category)
                existing_game.difficulty_level = game_data.get('difficulty', existing_game.difficulty_level)
                
                # Update game data
                current_game_data = existing_game.get_game_data()
                current_game_data.update({
                    'duration': game_data.get('duration'),
                    'players': game_data.get('players'),
                    'icon': game_data.get('icon'),
                    'color': game_data.get('color'),
                    'topics': game_data.get('topics', []),
                    'rating': game_data.get('rating', 4.0),
                    'grade_level': game_data.get('grade_level', '10'),
                    'ai_generated': game_data.get('generated', False),
                    'locked': game_data.get('locked', False)
                })
                existing_game.set_game_data(current_game_data)
                
                saved_count += 1
            else:
                # Create new game
                game = Game(
                    id=game_data.get('id', str(uuid.uuid4())),
                    name=game_data.get('title', 'Untitled Game'),
                    description=game_data.get('description', ''),
                    category=game_data.get('category', 'General'),
                    difficulty_level=game_data.get('difficulty', 'Beginner'),
                    max_score=game_data.get('max_score', 1000),
                    is_active=True
                )
                
                # Set game data
                game.set_game_data({
                    'duration': game_data.get('duration', '10-15 mins'),
                    'players': game_data.get('players', 'Individual'),
                    'icon': game_data.get('icon', 'game-controller'),
                    'color': game_data.get('color', '#4ECDC4'),
                    'topics': game_data.get('topics', []),
                    'rating': game_data.get('rating', 4.0),
                    'grade_level': game_data.get('grade_level', '10'),
                    'ai_generated': game_data.get('generated', False),
                    'locked': game_data.get('locked', False),
                    'original_data': game_data
                })
                
                db.session.add(game)
                saved_count += 1
        
        db.session.commit()
        
        # Log activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='games_saved',
            activity_data=json.dumps({
                'saved_count': saved_count,
                'skipped_count': skipped_count,
                'total_games': len(games),
                'timestamp': datetime.utcnow().isoformat()
            })
        )
        db.session.add(activity)
        db.session.commit()
        
        current_app.logger.info(f"User {current_user_id} saved {saved_count} games to database")
        
        return jsonify({
            'success': True,
            'message': f'Successfully saved {saved_count} games to database',
            'saved_count': saved_count,
            'skipped_count': skipped_count,
            'total_processed': len(games)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error saving games to database: {str(e)}")
        return jsonify({
            'success': False,
            'error': f'Failed to save games to database: {str(e)}'
        }), 500

@games_bp.route('/progress/game-started', methods=['POST'])
@jwt_required()
def track_game_start():
    """Track when a game is started"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        game_id = data.get('game_id')
        game_title = data.get('game_title')
        category = data.get('category')
        difficulty = data.get('difficulty')
        grade = data.get('grade', '10')
        
        # Log the activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='game_started',
            activity_data=json.dumps({
                'game_id': game_id,
                'game_title': game_title,
                'category': category,
                'difficulty': difficulty,
                'grade': grade,
                'timestamp': datetime.utcnow().isoformat()
            })
        )
        
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Game start tracked successfully'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error tracking game start: {str(e)}")
        return jsonify({'error': 'Failed to track game start'}), 500

@games_bp.route('/start', methods=['POST'])
@jwt_required()
def start_game():
    """Start a new game session and save to database"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        game_id = data.get('game_id')
        grade = data.get('grade', '10')
        if not game_id:
            return jsonify({'error': 'Game ID is required'}), 400
        
        # Check if game exists in database
        db_game = Game.query.filter_by(id=game_id).first()
        if not db_game:
            # Try to find in sample games
            game = next((g for g in CAPS_GAMES if g['id'] == game_id), None)
            if not game:
                return jsonify({'error': 'Game not found'}), 404
            
            # Create game in database if it doesn't exist
            db_game = Game(
                id=game['id'],
                name=game['title'],
                description=game['description'],
                category=game['category'],
                difficulty_level=game['difficulty'],
                max_score=game.get('max_score', 1000),
                is_active=True
            )
            db_game.set_game_data({
                'duration': game.get('duration'),
                'players': game.get('players'),
                'icon': game.get('icon'),
                'color': game.get('color'),
                'topics': game.get('topics', []),
                'rating': game.get('rating', 4.0),
                'grade_level': game.get('grade_level', grade),
                'ai_generated': game.get('generated', False),
                'locked': game.get('locked', False)
            })
            db.session.add(db_game)
            db.session.commit()
        
        # Create game session
        game_session = GameSession(
            user_id=current_user_id,
            game_id=db_game.id,
            game_type=game_id,
            score=0,
            completed=False,
            started_at=datetime.utcnow(),
            game_data=json.dumps({
                'game_title': db_game.name,
                'category': db_game.category,
                'difficulty': db_game.difficulty_level,
                'grade': grade,
                'start_time': datetime.utcnow().isoformat(),
                'questions_attempted': []
            })
        )
        
        db.session.add(game_session)
        
        # Log activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='game_start',
            activity_data=json.dumps({
                'game_id': game_id,
                'game_title': db_game.name,
                'category': db_game.category,
                'grade': grade,
                'session_id': game_session.id
            })
        )
        db.session.add(activity)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Game started successfully',
            'game_session_id': game_session.id,
            'game': {
                'id': db_game.id,
                'title': db_game.name,
                'description': db_game.description,
                'category': db_game.category,
                'difficulty': db_game.difficulty_level,
                'grade_level': grade
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error starting game: {str(e)}")
        return jsonify({'error': 'Failed to start game'}), 500

@games_bp.route('/submit-answer', methods=['POST'])
@jwt_required()
def submit_answer():
    """Submit answer and track progress - REAL IMPLEMENTATION"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        game_session_id = data.get('game_session_id')
        question_data = data.get('question_data', {})
        selected_answer = data.get('selected_answer')
        is_correct = data.get('is_correct', False)
        points_earned = data.get('points_earned', 10)
        
        if not game_session_id:
            return jsonify({'error': 'Game session ID is required'}), 400
        
        # Update game session
        game_session = GameSession.query.get(game_session_id)
        if not game_session:
            return jsonify({'error': 'Game session not found'}), 404
        
        if game_session.user_id != current_user_id:
            return jsonify({'error': 'Unauthorized access to game session'}), 403
        
        # Update score
        if is_correct:
            game_session.score += points_earned
        
        # Update game data with the question attempt
        current_game_data = game_session.get_game_data()
        
        # Initialize questions array if not exists
        if 'questions_attempted' not in current_game_data:
            current_game_data['questions_attempted'] = []
        
        # Add current question attempt
        current_game_data['questions_attempted'].append({
            'question_data': question_data,
            'selected_answer': selected_answer,
            'is_correct': is_correct,
            'points_earned': points_earned if is_correct else 0,
            'timestamp': datetime.utcnow().isoformat()
        })
        
        game_session.set_game_data(current_game_data)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Answer submitted successfully',
            'score': game_session.score,
            'is_correct': is_correct,
            'points_earned': points_earned if is_correct else 0,
            'total_questions': len(current_game_data.get('questions_attempted', []))
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error submitting answer: {str(e)}")
        return jsonify({'error': 'Failed to submit answer'}), 500

@games_bp.route('/complete', methods=['POST'])
@jwt_required()
def complete_game():
    """Complete game session and award points - REAL IMPLEMENTATION"""
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        
        game_session_id = data.get('game_session_id')
        final_score = data.get('final_score', 0)
        
        if not game_session_id:
            return jsonify({'error': 'Game session ID is required'}), 400
        
        game_session = GameSession.query.get(game_session_id)
        if not game_session:
            return jsonify({'error': 'Game session not found'}), 404
        
        if game_session.user_id != current_user_id:
            return jsonify({'error': 'Unauthorized access to game session'}), 403
        
        # Update game session
        game_session.completed = True
        game_session.ended_at = datetime.utcnow()
        game_session.score = final_score
        
        # Update game data with completion info
        current_game_data = game_session.get_game_data()
        current_game_data['completed_at'] = datetime.utcnow().isoformat()
        current_game_data['final_score'] = final_score
        game_session.set_game_data(current_game_data)
        
        # Log activity
        activity = UserActivity(
            user_id=current_user_id,
            activity_type='game_complete',
            activity_data=json.dumps({
                'game_session_id': game_session_id,
                'game_type': game_session.game_type,
                'final_score': final_score,
                'duration_minutes': calculate_game_duration(game_session),
                'questions_attempted': len(current_game_data.get('questions_attempted', []))
            })
        )
        db.session.add(activity)
        
        # Check for achievements
        check_game_achievements(current_user_id, game_session)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Game completed successfully',
            'final_score': final_score,
            'game_session_id': game_session_id,
            'duration_minutes': calculate_game_duration(game_session)
        }), 200
        
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error completing game: {str(e)}")
        return jsonify({'error': 'Failed to complete game'}), 500

# Question Generation Helper Functions
def get_question_from_db(subject, difficulty, topics, grade):
    """Get question from database if available"""
    try:
        # For now, we'll return None to use the fallback system
        # In a full implementation, you would query a questions table
        return None
    except Exception as e:
        current_app.logger.error(f"Error getting question from DB: {e}")
        return None

def get_static_question(subject, difficulty, topics, grade):
    """Get static fallback question for specific grade"""
    try:
        subject_questions = STATIC_QUESTIONS.get(subject, {})
        grade_questions = subject_questions.get(grade, {})
        difficulty_questions = grade_questions.get(difficulty, [])
        
        if difficulty_questions:
            # Filter by topics if specified
            if topics:
                topic_questions = [q for q in difficulty_questions 
                                 if any(topic in q.get('topics', []) for topic in topics)]
                if topic_questions:
                    selected_question = random.choice(topic_questions)
                else:
                    selected_question = random.choice(difficulty_questions)
            else:
                selected_question = random.choice(difficulty_questions)
            
            return {
                'id': str(uuid.uuid4()),
                'question': selected_question['question'],
                'options': selected_question['options'],
                'correct_answer': selected_question['correct_answer'],
                'explanation': selected_question['explanation'],
                'subject': subject,
                'difficulty': difficulty,
                'grade': grade,
                'topics': selected_question.get('topics', []),
                'points': calculate_points(difficulty),
                'static': True
            }
        
        # If no questions found for this grade/difficulty, try other grades
        for g in ['10', '11', '12']:
            if g != grade and g in subject_questions:
                grade_fallback = subject_questions[g]
                if difficulty in grade_fallback:
                    fallback_question = random.choice(grade_fallback[difficulty])
                    return {
                        'id': str(uuid.uuid4()),
                        'question': fallback_question['question'],
                        'options': fallback_question['options'],
                        'correct_answer': fallback_question['correct_answer'],
                        'explanation': fallback_question['explanation'],
                        'subject': subject,
                        'difficulty': difficulty,
                        'grade': g,  # Note: different from requested grade
                        'topics': fallback_question.get('topics', []),
                        'points': calculate_points(difficulty),
                        'static': True,
                        'fallback_grade': True
                    }
        
        return create_fallback_question(subject, difficulty, topics, grade)
        
    except Exception as e:
        current_app.logger.error(f"Error getting static question: {e}")
        return create_fallback_question(subject, difficulty, topics, grade)

def generate_ai_question(subject, difficulty, grade, topics, question_type):
    """Generate question using OpenAI"""
    try:
        if not openai_api_key:
            return None
            
        prompt = f"""
        Create a {difficulty.lower()} level multiple choice question for {subject} for Grade {grade} students in South Africa (CAPS curriculum).
        
        Topics: {', '.join(topics) if topics else 'General concepts'}
        Question type: {question_type}
        
        Format the response as valid JSON:
        {{
            "question": "Clear and concise question text",
            "options": ["Option A", "Option B", "Option C", "Option D"],
            "correct_answer": "Exact text of the correct option",
            "explanation": "Brief explanation of why this answer is correct",
            "subject": "{subject}",
            "difficulty": "{difficulty}",
            "grade": "{grade}",
            "points": {calculate_points(difficulty)},
            "topics": {json.dumps(topics) if topics else "[]"}
        }}
        
        Make sure the question is appropriate for Grade {grade} CAPS curriculum.
        Return ONLY the JSON, no other text.
        """
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert educational content creator for South African CAPS curriculum. Create clear, accurate multiple choice questions that test understanding. Always respond with valid JSON only."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=500,
            temperature=0.7
        )
        
        if response.choices and response.choices[0]:
            ai_response = response.choices[0].message.content
            question_data = json.loads(ai_response)
            question_data['id'] = str(uuid.uuid4())
            question_data['ai_generated'] = True
            return question_data
            
    except Exception as e:
        current_app.logger.error(f"OpenAI question generation error: {e}")
        
    return None

def create_fallback_question(subject, difficulty, topics, grade):
    """Create a basic fallback question for specific grade"""
    base_questions = {
        'Mathematics': f'What is an important Grade {grade} mathematics concept?',
        'Physical Sciences': f'What scientific principle is fundamental in Grade {grade}?',
        'English': f'Which language concept is essential for Grade {grade} English?',
        'Accounting': f'What accounting principle is important in Grade {grade}?'
    }
    
    question = base_questions.get(subject, f'What is an important concept in {subject} for Grade {grade}?')
    
    return {
        'id': str(uuid.uuid4()),
        'question': question,
        'options': [
            'Basic principles and foundations',
            'Advanced theoretical concepts', 
            'Practical applications',
            'Historical development'
        ],
        'correct_answer': 'Basic principles and foundations',
        'explanation': f'This question covers fundamental {subject} concepts for Grade {grade} CAPS curriculum.',
        'subject': subject,
        'difficulty': difficulty,
        'grade': grade,
        'topics': topics,
        'points': calculate_points(difficulty),
        'fallback': True
    }

def calculate_points(difficulty):
    """Calculate points based on difficulty"""
    points_map = {
        'Easy': 10,
        'Intermediate': 15,
        'Hard': 20,
        'Beginner': 10,
        'Advanced': 20
    }
    return points_map.get(difficulty, 10)

# Database Helper Functions
def save_ai_games_to_db(ai_games):
    """Save AI-generated games to database"""
    saved_games = []
    
    for game_data in ai_games:
        try:
            # Check if game already exists
            existing_game = Game.query.filter_by(name=game_data['title']).first()
            
            if existing_game:
                # Update existing game
                existing_game.description = game_data.get('description', existing_game.description)
                existing_game.category = game_data.get('category', existing_game.category)
                existing_game.difficulty_level = game_data.get('difficulty', existing_game.difficulty_level)
                
                game_data_for_db = existing_game.get_game_data()
                game_data_for_db.update({
                    'duration': game_data.get('duration'),
                    'players': game_data.get('players'),
                    'icon': game_data.get('icon'),
                    'color': game_data.get('color'),
                    'topics': game_data.get('topics', []),
                    'rating': game_data.get('rating', 4.0),
                    'grade_level': game_data.get('grade_level', '10'),
                    'ai_generated': True,
                    'locked': game_data.get('locked', False)
                })
                existing_game.set_game_data(game_data_for_db)
                
                saved_game = {
                    'id': existing_game.id,
                    'title': existing_game.name,
                    'description': existing_game.description,
                    'category': existing_game.category,
                    'difficulty': existing_game.difficulty_level,
                    **game_data_for_db
                }
            else:
                # Create new game
                game = Game(
                    id=game_data.get('id', str(uuid.uuid4())),
                    name=game_data['title'],
                    description=game_data.get('description', ''),
                    category=game_data.get('category', 'General'),
                    difficulty_level=game_data.get('difficulty', 'Beginner'),
                    max_score=game_data.get('max_score', 1000),
                    is_active=True
                )
                
                game.set_game_data({
                    'duration': game_data.get('duration', '10-15 mins'),
                    'players': game_data.get('players', 'Individual'),
                    'icon': game_data.get('icon', 'game-controller'),
                    'color': game_data.get('color', '#4ECDC4'),
                    'topics': game_data.get('topics', []),
                    'rating': game_data.get('rating', 4.0),
                    'grade_level': game_data.get('grade_level', '10'),
                    'ai_generated': True,
                    'locked': game_data.get('locked', False),
                    'original_ai_data': game_data
                })
                
                db.session.add(game)
                
                saved_game = {
                    'id': game.id,
                    'title': game.name,
                    'description': game.description,
                    'category': game.category,
                    'difficulty': game.difficulty_level,
                    **game.get_game_data()
                }
            
            saved_games.append(saved_game)
            
        except Exception as e:
            current_app.logger.error(f"Error saving AI game {game_data.get('title')}: {str(e)}")
            continue
    
    try:
        db.session.commit()
        current_app.logger.info(f"Successfully saved {len(saved_games)} AI games to database")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Error committing AI games to database: {str(e)}")
    
    return saved_games

def generate_ai_games_with_openai(category=None, grade='10', count=8, user_profile=None):
    """Generate educational games using OpenAI API"""
    try:
        if not openai_api_key:
            return None
            
        user_context = ""
        if user_profile:
            user_context = f"""
            User Profile:
            - Grade: {user_profile.grade_level or grade}
            - School: {user_profile.school or 'High School'}
            - Subjects: {', '.join(user_profile.get_subjects()) if user_profile.get_subjects() else 'Not specified'}
            """
        
        prompt = f"""
        As an expert educational game designer for South African CAPS curriculum, create {count} engaging educational games for Grade {grade} students.
        
        {user_context}
        
        Subject Focus: {category if category else 'Mathematics, English, Physical Sciences, and Accounting'}
        Grade Level: {grade}
        CAPS Curriculum Alignment: Yes
        
        Create games that are:
        - Educational and aligned with CAPS curriculum for Grade {grade}
        - Cover {category if category else 'multiple subjects'}
        - Include different difficulty levels (Beginner, Intermediate, Advanced)
        - Have clear learning objectives
        - Are interactive and engaging
        - Suitable for high school students
        
        Format the response as a JSON array with exactly this structure for each game:
        {{
            "id": "unique_game_id",
            "title": "Creative Game Title",
            "description": "Clear game description with specific learning objectives",
            "category": "Mathematics/English/Accounting/Physical Sciences",
            "difficulty": "Beginner/Intermediate/Advanced",
            "duration": "e.g., 5-10 mins, 10-15 mins, 15-20 mins",
            "players": "1-2 players or Individual",
            "icon": "🎯",
            "color": "#4ECDC4",
            "topics": ["topic1", "topic2", "topic3"],
            "rating": 4.5,
            "generated": true,
            "locked": false,
            "grade_level": "{grade}",
            "max_score": 1000
        }}
        
        Ensure the games are specifically relevant to Grade {grade} CAPS curriculum.
        Return ONLY the JSON array, no other text.
        """
        
        response = openai.ChatCompletion.create(
            model="gpt-3.5-turbo",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert educational game designer specializing in South African CAPS curriculum. Create engaging, curriculum-aligned games for high school students. Always respond with valid JSON array only, no other text."
                },
                {
                    "role": "user",
                    "content": prompt
                }
            ],
            max_tokens=2000,
            temperature=0.7
        )
        
        if response.choices and response.choices[0]:
            ai_response = response.choices[0].message.content
            games = json.loads(ai_response)
            
            # Add AI generation metadata
            for game in games:
                game['generated'] = True
                game['ai_generated'] = True
                if 'id' not in game:
                    game['id'] = f"ai_{category.lower() if category else 'general'}_{uuid.uuid4().hex[:8]}"
            
            current_app.logger.info(f"Generated {len(games)} AI games")
            return games
            
    except Exception as e:
        current_app.logger.error(f"OpenAI API error: {str(e)}")
        
    return None

def calculate_game_duration(game_session):
    """Calculate game duration in minutes"""
    if game_session.started_at and game_session.ended_at:
        duration = game_session.ended_at - game_session.started_at
        return round(duration.total_seconds() / 60, 1)
    return 0

def check_game_achievements(user_id, game_session):
    """Check and award achievements for game performance"""
    try:
        # Check for high score achievement
        user_sessions = GameSession.query.filter_by(
            user_id=user_id, 
            game_type=game_session.game_type
        ).all()
        
        if len(user_sessions) >= 5:
            # Award "Game Enthusiast" achievement
            achievement = UserAchievement(
                user_id=user_id,
                achievement_type='game_enthusiast',
                achievement_data=json.dumps({
                    'game_type': game_session.game_type,
                    'sessions_played': len(user_sessions),
                    'earned_at': datetime.utcnow().isoformat()
                })
            )
            db.session.add(achievement)
        
        # Check for perfect score achievement
        game_data = game_session.get_game_data()
        max_score = 1000  # This should come from game definition
        if game_session.score >= max_score:
            achievement = UserAchievement(
                user_id=user_id,
                achievement_type='perfect_score',
                achievement_data=json.dumps({
                    'game_type': game_session.game_type,
                    'score': game_session.score,
                    'earned_at': datetime.utcnow().isoformat()
                })
            )
            db.session.add(achievement)
            
    except Exception as e:
        current_app.logger.error(f"Error checking game achievements: {str(e)}")

@games_bp.route('/debug', methods=['GET'])
def debug_games():
    """Debug endpoint to check games configuration"""
    db_games_count = Game.query.count()
    game_sessions_count = GameSession.query.count()
    
    return jsonify({
        'success': True,
        'openai_configured': bool(openai_api_key),
        'database_games_count': db_games_count,
        'game_sessions_count': game_sessions_count,
        'sample_games_count': len(CAPS_GAMES),
        'static_questions_available': sum(len(difficulties) for subject in STATIC_QUESTIONS.values() for grade in subject.values() for difficulties in grade.values()),
        'message': 'Games endpoint is working'
    }), 200

@games_bp.route('/debug/grades', methods=['GET'])
def debug_grades():
    """Debug endpoint to check grade-specific content"""
    grades_summary = {}
    for grade in ['10', '11', '12']:
        games_count = len([game for game in CAPS_GAMES if game.get('grade_level') == grade])
        questions_count = 0
        for subject in STATIC_QUESTIONS.values():
            if grade in subject:
                for difficulty_questions in subject[grade].values():
                    questions_count += len(difficulty_questions)
        grades_summary[grade] = {
            'games': games_count,
            'questions': questions_count
        }
    
    return jsonify({
        'success': True,
        'grades_summary': grades_summary,
        'total_games': len(CAPS_GAMES),
        'message': 'Grade-specific content summary'
    }), 200