from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime
import uuid
import json

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    is_guest = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profile = db.relationship('UserProfile', backref='user', uselist=False, cascade='all, delete-orphan')
    password_resets = db.relationship('PasswordReset', backref='user', cascade='all, delete-orphan')
    achievements = db.relationship('UserAchievement', backref='user', cascade='all, delete-orphan')
    activities = db.relationship('UserActivity', backref='user', cascade='all, delete-orphan')
    game_sessions = db.relationship('GameSession', backref='user', cascade='all, delete-orphan')
    lesson_progress = db.relationship('LessonProgress', backref='user', cascade='all, delete-orphan')
    challenge_attempts = db.relationship('ChallengeAttempt', backref='user', cascade='all, delete-orphan')
    challenge_progress = db.relationship('UserChallengeProgress', backref='user', cascade='all, delete-orphan')
    ai_interactions = db.relationship('AIInteraction', backref='user', cascade='all, delete-orphan')
    quiz_attempts = db.relationship('QuizAttempt', backref='user', cascade='all, delete-orphan')
    study_notes = db.relationship('StudyNote', backref='user', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'is_guest': self.is_guest,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class UserProfile(db.Model):
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False, unique=True)
    grade_level = db.Column(db.String(50))
    school = db.Column(db.String(100))
    subjects = db.Column(db.Text)
    is_minor = db.Column(db.Boolean, default=True)
    guardian_name = db.Column(db.String(100))
    guardian_email = db.Column(db.String(120))
    guardian_phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_subjects(self, subjects_list):
        self.subjects = json.dumps(subjects_list)
    
    def get_subjects(self):
        if self.subjects:
            return json.loads(self.subjects)
        return []
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'grade_level': self.grade_level,
            'school': self.school,
            'subjects': self.get_subjects(),
            'is_minor': self.is_minor,
            'guardian_name': self.guardian_name,
            'guardian_email': self.guardian_email,
            'guardian_phone': self.guardian_phone,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class PasswordReset(db.Model):
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(255), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserAchievement(db.Model):
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    achievement_type = db.Column(db.String(100), nullable=False)
    achievement_data = db.Column(db.Text)
    earned_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'achievement_type': self.achievement_type,
            'achievement_data': self.achievement_data,
            'earned_at': self.earned_at.isoformat() if self.earned_at else None
        }

class UserActivity(db.Model):
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    activity_type = db.Column(db.String(100), nullable=False)
    activity_data = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        activity_data = {}
        if self.activity_data:
            try:
                activity_data = json.loads(self.activity_data)
            except:
                activity_data = {'raw_data': self.activity_data}
                
        return {
            'id': self.id,
            'user_id': self.user_id,
            'activity_type': self.activity_type,
            'activity_data': activity_data,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class GameSession(db.Model):
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    game_type = db.Column(db.String(100), nullable=False)
    score = db.Column(db.Integer, default=0)
    completed = db.Column(db.Boolean, default=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    ended_at = db.Column(db.DateTime)
    game_data = db.Column(db.Text)
    
    def to_dict(self):
        game_data = {}
        if self.game_data:
            try:
                game_data = json.loads(self.game_data)
            except:
                game_data = {'raw_data': self.game_data}
                
        return {
            'id': self.id,
            'user_id': self.user_id,
            'game_type': self.game_type,
            'score': self.score,
            'completed': self.completed,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'game_data': game_data
        }

class LessonProgress(db.Model):
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    lesson_id = db.Column(db.String(100), nullable=False)
    progress = db.Column(db.Float, default=0.0)
    completed = db.Column(db.Boolean, default=False)
    last_accessed = db.Column(db.DateTime, default=datetime.utcnow)
    data = db.Column(db.Text)
    
    def to_dict(self):
        progress_data = {}
        if self.data:
            try:
                progress_data = json.loads(self.data)
            except:
                progress_data = {'raw_data': self.data}
                
        return {
            'id': self.id,
            'user_id': self.user_id,
            'lesson_id': self.lesson_id,
            'progress': self.progress,
            'completed': self.completed,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'data': progress_data
        }

# NOTE: Consider renaming this to avoid confusion with UserChallengeProgress
class ChallengeParticipation(db.Model):
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    challenge_id = db.Column(db.String(100), nullable=False)
    score = db.Column(db.Integer, default=0)
    completed = db.Column(db.Boolean, default=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    data = db.Column(db.Text)
    
    def to_dict(self):
        participation_data = {}
        if self.data:
            try:
                participation_data = json.loads(self.data)
            except:
                participation_data = {'raw_data': self.data}
                
        return {
            'id': self.id,
            'user_id': self.user_id,
            'challenge_id': self.challenge_id,
            'score': self.score,
            'completed': self.completed,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'data': participation_data
        }

class BlacklistedToken(db.Model):
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    jti = db.Column(db.String(36), nullable=False, unique=True, index=True)
    token_type = db.Column(db.String(10), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Game(db.Model):
    __tablename__ = 'games'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text)
    category = db.Column(db.String(50))
    difficulty_level = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)
    max_score = db.Column(db.Integer, default=1000)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    game_sessions = db.relationship('GameSession', backref='game', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'category': self.category,
            'difficulty_level': self.difficulty_level,
            'is_active': self.is_active,
            'max_score': self.max_score,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Challenge(db.Model):
    __tablename__ = 'challenges'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    difficulty = db.Column(db.String(50), nullable=False)
    category = db.Column(db.String(100), nullable=False)
    points = db.Column(db.Integer, default=100)
    requirements = db.Column(db.Text)
    created_by = db.Column(db.String(50), default='system')
    is_ai_generated = db.Column(db.Boolean, default=False)
    ai_prompt = db.Column(db.Text)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    attempts = db.relationship('ChallengeAttempt', backref='challenge', cascade='all, delete-orphan')
    user_progress = db.relationship('UserChallengeProgress', backref='challenge', cascade='all, delete-orphan')
    
    def set_requirements(self, requirements_dict):
        self.requirements = json.dumps(requirements_dict)
    
    def get_requirements(self):
        if self.requirements:
            return json.loads(self.requirements)
        return {}
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'difficulty': self.difficulty,
            'category': self.category,
            'points': self.points,
            'requirements': self.get_requirements(),
            'created_by': self.created_by,
            'is_ai_generated': self.is_ai_generated,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat()
        }

class ChallengeAttempt(db.Model):
    __tablename__ = 'challenge_attempts'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    challenge_id = db.Column(db.String(36), db.ForeignKey('challenges.id'), nullable=False)
    solution_code = db.Column(db.Text, nullable=False)
    is_correct = db.Column(db.Boolean, default=False)
    submitted_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'challenge_id': self.challenge_id,
            'solution_code': self.solution_code,
            'is_correct': self.is_correct,
            'submitted_at': self.submitted_at.isoformat()
        }

class AIInteraction(db.Model):
    __tablename__ = 'ai_interactions'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    input_data = db.Column(db.Text)
    output_data = db.Column(db.Text)
    model_used = db.Column(db.String(50), default='gpt-3.5-turbo')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_input_data(self, input_dict):
        self.input_data = json.dumps(input_dict)
    
    def get_input_data(self):
        if self.input_data:
            return json.loads(self.input_data)
        return {}
    
    def set_output_data(self, output_dict):
        self.output_data = json.dumps(output_dict)
    
    def get_output_data(self):
        if self.output_data:
            return json.loads(self.output_data)
        return {}
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'input_data': self.get_input_data(),
            'output_data': self.get_output_data(),
            'model_used': self.model_used,
            'created_at': self.created_at.isoformat()
        }

class UserChallengeProgress(db.Model):
    __tablename__ = 'user_challenge_progress'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    challenge_id = db.Column(db.String(36), db.ForeignKey('challenges.id'), nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed = db.Column(db.Boolean, default=False)
    completed_at = db.Column(db.DateTime)
    attempts_count = db.Column(db.Integer, default=0)
    last_attempt_at = db.Column(db.DateTime)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'challenge_id': self.challenge_id,
            'started_at': self.started_at.isoformat(),
            'completed': self.completed,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'attempts_count': self.attempts_count,
            'last_attempt_at': self.last_attempt_at.isoformat() if self.last_attempt_at else None
        }

class Lesson(db.Model):
    __tablename__ = 'lessons'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    content = db.Column(db.Text, nullable=False)
    difficulty = db.Column(db.String(50), default='beginner')
    category = db.Column(db.String(100))
    order_index = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    quizzes = db.relationship('Quiz', backref='lesson', cascade='all, delete-orphan')
    progress_records = db.relationship('LessonProgress', backref='lesson', cascade='all, delete-orphan')
    study_notes = db.relationship('StudyNote', backref='lesson', cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'content': self.content,
            'difficulty': self.difficulty,
            'category': self.category,
            'order_index': self.order_index,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class Quiz(db.Model):
    __tablename__ = 'quizzes'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lesson_id = db.Column(db.String(36), db.ForeignKey('lessons.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    questions = db.Column(db.Text)  # JSON string
    passing_score = db.Column(db.Integer, default=70)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    attempts = db.relationship('QuizAttempt', backref='quiz', cascade='all, delete-orphan')
    
    def set_questions(self, questions_list):
        self.questions = json.dumps(questions_list)
    
    def get_questions(self):
        if self.questions:
            return json.loads(self.questions)
        return []
    
    def to_dict(self):
        return {
            'id': self.id,
            'lesson_id': self.lesson_id,
            'title': self.title,
            'questions': self.get_questions(),
            'passing_score': self.passing_score,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class QuizAttempt(db.Model):
    __tablename__ = 'quiz_attempts'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    quiz_id = db.Column(db.String(36), db.ForeignKey('quizzes.id'), nullable=False)
    score = db.Column(db.Float, default=0.0)
    completed = db.Column(db.Boolean, default=False)
    answers = db.Column(db.Text)  # JSON string
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    
    def set_answers(self, answers_dict):
        self.answers = json.dumps(answers_dict)
    
    def get_answers(self):
        if self.answers:
            return json.loads(self.answers)
        return {}
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'quiz_id': self.quiz_id,
            'score': self.score,
            'completed': self.completed,
            'answers': self.get_answers(),
            'started_at': self.started_at.isoformat(),
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }

class StudyNote(db.Model):
    __tablename__ = 'study_notes'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    lesson_id = db.Column(db.String(100), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    tags = db.Column(db.Text)
    is_public = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def set_tags(self, tags_list):
        self.tags = json.dumps(tags_list)
    
    def get_tags(self):
        if self.tags:
            return json.loads(self.tags)
        return []
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'lesson_id': self.lesson_id,
            'title': self.title,
            'content': self.content,
            'tags': self.get_tags(),
            'is_public': self.is_public,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }