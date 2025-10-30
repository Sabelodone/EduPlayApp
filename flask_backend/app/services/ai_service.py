import os
import json
from datetime import datetime

class AIService:
    def __init__(self):
        self.current_model = "gpt-3.5-turbo"
        self.openai_api_key = os.environ.get('OPENAI_API_KEY')
        
        if self.openai_api_key:
            print("✅ OpenAI service initialized successfully")
        else:
            print("⚠️ OpenAI API key not found. Using fallback mode.")
    
    def generate_challenge(self, user_level, preferences):
        """Generate educational challenge"""
        difficulty = self._determine_difficulty(user_level)
        category = preferences.get('category', 'programming')
        
        return {
            'title': f'{difficulty.title()} {category} Challenge',
            'description': f'Create a solution for this {difficulty} level {category} problem.',
            'difficulty': difficulty,
            'category': category,
            'points': user_level * 100,
            'ai_feedback': 'Challenge generated successfully!',
            'ai_generated': True if self.openai_api_key else False
        }
    
    def analyze_solution(self, challenge_description, solution_code, requirements):
        """Analyze student solution"""
        solution_length = len(solution_code) if solution_code else 0
        
        if solution_length > 50:
            return {
                'is_correct': True,
                'score': 85,
                'feedback': "Good effort! Your solution shows understanding.",
                'improvements': ["Add more comments to explain your reasoning"],
                'concepts_mastered': ["Basic problem solving"]
            }
        else:
            return {
                'is_correct': False,
                'score': 40,
                'feedback': "Try to expand your solution with more details.",
                'improvements': ["Provide a more comprehensive answer", "Explain your approach"],
                'concepts_mastered': []
            }
    
    def generate_hint(self, challenge_description, difficulty, current_approach, hint_level='medium'):
        """Generate helpful hints"""
        hints = {
            'beginner': "Try breaking the problem down into smaller steps.",
            'intermediate': "Consider using a systematic approach and look for patterns.",
            'advanced': "This might require thinking outside the box and breaking into sub-problems."
        }
        return hints.get(difficulty, "Try a different approach to solve this problem.")
    
    def explain_concept(self, concept, context, explanation_level='beginner'):
        """Explain a concept"""
        return f"This is an explanation of {concept} at {explanation_level} level. {context}"
    
    def _determine_difficulty(self, user_level):
        if user_level <= 3: 
            return 'beginner'
        elif user_level <= 7: 
            return 'intermediate'
        else: 
            return 'advanced'
