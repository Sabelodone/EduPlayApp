from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from datetime import datetime
import uuid
import json

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(db.Model):
    __tablename__ = 'user'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    profile_picture = db.Column(db.String(255))  # ADD THIS LINE for profile picture
    is_active = db.Column(db.Boolean, default=True)
    is_verified = db.Column(db.Boolean, default=False)
    is_guest = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    profile = db.relationship('UserProfile', backref='user', uselist=False, cascade='all, delete-orphan', lazy='select')
    password_resets = db.relationship('PasswordReset', backref='user', cascade='all, delete-orphan')
    password_reset_tokens = db.relationship('PasswordResetToken', backref='user', cascade='all, delete-orphan')  # ADD THIS LINE
    achievements = db.relationship('UserAchievement', backref='user', cascade='all, delete-orphan')
    activities = db.relationship('UserActivity', backref='user', cascade='all, delete-orphan')
    game_sessions = db.relationship('GameSession', backref='user', cascade='all, delete-orphan')
    lesson_progress = db.relationship('LessonProgress', backref='user', cascade='all, delete-orphan')
    challenge_attempts = db.relationship('ChallengeAttempt', backref='user', cascade='all, delete-orphan')
    challenge_progress = db.relationship('UserChallengeProgress', backref='user', cascade='all, delete-orphan')
    ai_interactions = db.relationship('AIInteraction', backref='user', cascade='all, delete-orphan')
    quiz_attempts = db.relationship('QuizAttempt', backref='user', cascade='all, delete-orphan')
    study_notes = db.relationship('StudyNote', backref='user', cascade='all, delete-orphan')
    video_progress = db.relationship('VideoProgress', backref='user', cascade='all, delete-orphan')
    resource_downloads = db.relationship('ResourceDownload', backref='user', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode('utf-8')
    
    def check_password(self, password):
        """Check if provided password matches the stored hash"""
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        profile_data = self.profile.to_dict() if self.profile else None
        return {
            'id': self.id,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'profile_picture': self.profile_picture,  # ADD THIS LINE
            'is_active': self.is_active,
            'is_verified': self.is_verified,
            'is_guest': self.is_guest,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'profile': profile_data
        }

# Fixed PasswordResetToken model to match your database schema
class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)  # Changed to String(36)
    token = db.Column(db.String(255), unique=True, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'token': self.token,
            'expires_at': self.expires_at.isoformat(),
            'is_used': self.is_used,
            'created_at': self.created_at.isoformat()
        }

class UserProfile(db.Model):
    __tablename__ = 'user_profile'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False, unique=True)
    grade_level = db.Column(db.String(50))
    school = db.Column(db.String(100))
    subjects = db.Column(db.Text)  # This stores JSON data
    is_minor = db.Column(db.Boolean, default=True)
    guardian_name = db.Column(db.String(100))
    guardian_email = db.Column(db.String(120))
    guardian_phone = db.Column(db.String(20))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_subjects(self, subjects_list):
        """Store subjects as JSON string"""
        if isinstance(subjects_list, list):
            self.subjects = json.dumps(subjects_list)
        else:
            self.subjects = json.dumps([])
    
    def get_subjects(self):
        """Retrieve subjects as list"""
        if self.subjects:
            try:
                return json.loads(self.subjects)
            except json.JSONDecodeError:
                # Fallback for old comma-separated format
                if ',' in self.subjects:
                    return [subject.strip() for subject in self.subjects.split(',') if subject.strip()]
                return [self.subjects] if self.subjects else []
        return []
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'grade_level': self.grade_level,
            'school': self.school,
            'subjects': self.get_subjects(),  # This will return a list
            'is_minor': self.is_minor,
            'guardian_name': self.guardian_name,
            'guardian_email': self.guardian_email,
            'guardian_phone': self.guardian_phone,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class PasswordReset(db.Model):
    __tablename__ = 'password_reset'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    token = db.Column(db.String(255), nullable=False, unique=True, index=True)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class UserAchievement(db.Model):
    __tablename__ = 'user_achievement'
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
    __tablename__ = 'user_activity'
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
    __tablename__ = 'game_session'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    game_id = db.Column(db.String(36), db.ForeignKey('games.id'), nullable=False)
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
            'game_id': self.game_id,
            'game_type': self.game_type,
            'score': self.score,
            'completed': self.completed,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'game_data': game_data
        }

class LessonProgress(db.Model):
    __tablename__ = 'lesson_progress'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    lesson_id = db.Column(db.String(36), db.ForeignKey('lessons.id'), nullable=False)
    progress = db.Column(db.Float, default=0.0)
    completed = db.Column(db.Boolean, default=False)
    last_accessed = db.Column(db.DateTime, default=datetime.utcnow)
    data = db.Column(db.Text)
    
    # New fields for curriculum tracking
    subject = db.Column(db.String(100))
    grade = db.Column(db.String(10))
    topic = db.Column(db.String(100))
    video_id = db.Column(db.String(50))  # YouTube video ID
    
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
            'subject': self.subject,
            'grade': self.grade,
            'topic': self.topic,
            'video_id': self.video_id,
            'data': progress_data
        }

class ChallengeParticipation(db.Model):
    __tablename__ = 'challenge_participation'
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
    __tablename__ = 'blacklisted_token'
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
    
    # New fields for curriculum integration
    subject = db.Column(db.String(100))
    grade = db.Column(db.String(10))
    topic = db.Column(db.String(100))
    video_id = db.Column(db.String(50))  # YouTube video ID
    duration = db.Column(db.String(20))  # Video duration like '15:30'
    channel = db.Column(db.String(100))  # YouTube channel name
    content_type = db.Column(db.String(20), default='video')  # video, text, interactive
    
    # Relationships - FIXED: Now properly linked with foreign keys
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
            'subject': self.subject,
            'grade': self.grade,
            'topic': self.topic,
            'video_id': self.video_id,
            'duration': self.duration,
            'channel': self.channel,
            'content_type': self.content_type,
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
    lesson_id = db.Column(db.String(36), db.ForeignKey('lessons.id'), nullable=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    tags = db.Column(db.Text)
    is_public = db.Column(db.Boolean, default=False)
    
    # New fields for curriculum integration
    subject = db.Column(db.String(100))
    grade = db.Column(db.String(10))
    topic = db.Column(db.String(100))
    
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
            'subject': self.subject,
            'grade': self.grade,
            'topic': self.topic,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class VideoProgress(db.Model):
    __tablename__ = 'video_progress'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    video_id = db.Column(db.String(50), nullable=False)  # YouTube video ID
    subject = db.Column(db.String(100), nullable=False)
    grade = db.Column(db.String(10), nullable=False)
    topic = db.Column(db.String(100), nullable=False)
    completed = db.Column(db.Boolean, default=False)
    progress = db.Column(db.Float, default=0.0)  # Watch progress 0.0 to 1.0
    last_position = db.Column(db.Integer, default=0)  # Last watched position in seconds
    watched_duration = db.Column(db.Integer, default=0)  # Total watched duration in seconds
    last_accessed = db.Column(db.DateTime, default=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Unique constraint to prevent duplicate progress entries
    __table_args__ = (
        db.UniqueConstraint('user_id', 'video_id', name='unique_user_video_progress'),
    )
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'video_id': self.video_id,
            'subject': self.subject,
            'grade': self.grade,
            'topic': self.topic,
            'completed': self.completed,
            'progress': self.progress,
            'last_position': self.last_position,
            'watched_duration': self.watched_duration,
            'last_accessed': self.last_accessed.isoformat() if self.last_accessed else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ExamPaper(db.Model):
    __tablename__ = 'exam_papers'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title = db.Column(db.String(200), nullable=False)
    subject = db.Column(db.String(100), nullable=False)
    grade = db.Column(db.String(10), nullable=False)
    year = db.Column(db.String(10), nullable=False)
    questions = db.Column(db.Integer, default=0)
    duration = db.Column(db.String(50))  # e.g., '2 hours'
    download_url = db.Column(db.Text)
    file_path = db.Column(db.Text)  # Local file path if downloaded
    file_size = db.Column(db.Integer)  # File size in bytes
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'subject': self.subject,
            'grade': self.grade,
            'year': self.year,
            'questions': self.questions,
            'duration': self.duration,
            'download_url': self.download_url,
            'file_path': self.file_path,
            'file_size': self.file_size,
            'is_active': self.is_active,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }

class ResourceDownload(db.Model):
    __tablename__ = 'resource_downloads'
    __table_args__ = {'extend_existing': True}
    
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.String(36), db.ForeignKey('user.id'), nullable=False)
    resource_type = db.Column(db.String(50), nullable=False)  # 'exam_paper', 'study_notes', 'video'
    resource_id = db.Column(db.String(100), nullable=False)
    downloaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    file_path = db.Column(db.Text)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'downloaded_at': self.downloaded_at.isoformat() if self.downloaded_at else None,
            'file_path': self.file_path
        }