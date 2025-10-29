import re
from datetime import datetime
from flask import current_app

class Validators:
    """Collection of validation utilities for the application"""
    
    @staticmethod
    def validate_email(email):
        """
        Validate email format
        Returns: (is_valid, error_message)
        """
        if not email or not isinstance(email, str):
            return False, "Email is required"
        
        email = email.strip().lower()
        
        # Basic email format validation
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(pattern, email):
            return False, "Invalid email format"
        
        # Check for disposable email domains (optional)
        disposable_domains = [
            'tempmail.com', 'guerrillamail.com', 'mailinator.com', 
            'throwawaymail.com', '10minutemail.com', 'yopmail.com'
        ]
        
        domain = email.split('@')[1]
        if domain in disposable_domains:
            return False, "Disposable email addresses are not allowed"
        
        return True, "Email is valid"
    
    @staticmethod
    def validate_password(password):
        """
        Validate password strength
        Returns: (is_valid, error_message)
        """
        if not password or not isinstance(password, str):
            return False, "Password is required"
        
        if len(password) < 8:
            return False, "Password must be at least 8 characters long"
        
        if len(password) > 128:
            return False, "Password must be less than 128 characters"
        
        # Check for common weak passwords
        weak_passwords = [
            'password', '12345678', 'qwerty', 'letmein', 'welcome',
            'admin', 'password1', '123456789', '1234567890'
        ]
        
        if password.lower() in weak_passwords:
            return False, "Password is too common, please choose a stronger one"
        
        # Check character requirements
        checks = {
            'uppercase': r'[A-Z]',
            'lowercase': r'[a-z]',
            'digit': r'\d',
            'special': r'[!@#$%^&*(),.?":{}|<>]'
        }
        
        missing_requirements = []
        for requirement, pattern in checks.items():
            if not re.search(pattern, password):
                missing_requirements.append(requirement)
        
        if missing_requirements:
            requirements_map = {
                'uppercase': 'uppercase letter',
                'lowercase': 'lowercase letter', 
                'digit': 'digit',
                'special': 'special character'
            }
            missing_list = [requirements_map[req] for req in missing_requirements]
            return False, f"Password must contain at least one {', '.join(missing_list)}"
        
        return True, "Password is strong"
    
    @staticmethod
    def validate_name(name, field_name="Name"):
        """
        Validate name fields (first name, last name, etc.)
        Returns: (is_valid, error_message)
        """
        if not name or not isinstance(name, str):
            return False, f"{field_name} is required"
        
        name = name.strip()
        
        if len(name) < 2:
            return False, f"{field_name} must be at least 2 characters long"
        
        if len(name) > 50:
            return False, f"{field_name} must be less than 50 characters"
        
        # Check for valid characters (letters, spaces, hyphens, apostrophes)
        if not re.match(r'^[a-zA-Z\s\-\'\.]+$', name):
            return False, f"{field_name} can only contain letters, spaces, hyphens, and apostrophes"
        
        # Check for consecutive special characters
        if re.search(r'[\-\'\\.]{2,}', name):
            return False, f"{field_name} cannot have consecutive special characters"
        
        return True, f"{field_name} is valid"
    
    @staticmethod
    def validate_phone(phone):
        """
        Validate phone number format
        Returns: (is_valid, error_message)
        """
        if not phone:
            return True, "Phone is optional"  # Phone is optional
        
        phone = re.sub(r'[\s\-\(\)]', '', str(phone))
        
        # Basic phone validation (adjust based on your requirements)
        if not re.match(r'^\+?[0-9]{10,15}$', phone):
            return False, "Invalid phone number format"
        
        return True, "Phone number is valid"
    
    @staticmethod
    def validate_date(date_string, date_format='%Y-%m-%d'):
        """
        Validate date string format
        Returns: (is_valid, error_message, datetime_object)
        """
        if not date_string:
            return True, "Date is optional", None
        
        try:
            date_obj = datetime.strptime(date_string, date_format)
            
            # Check if date is in the future (for birth dates, etc.)
            if date_obj > datetime.now():
                return False, "Date cannot be in the future", None
            
            # Check if date is reasonable (not too old, e.g., before 1900)
            if date_obj.year < 1900:
                return False, "Date seems too far in the past", None
            
            return True, "Date is valid", date_obj
            
        except ValueError:
            return False, f"Invalid date format. Expected {date_format}", None
    
    @staticmethod
    def validate_grade_level(grade):
        """
        Validate grade level
        Returns: (is_valid, error_message)
        """
        if not grade:
            return False, "Grade level is required"
        
        valid_grades = ['Grade 10', 'Grade 11', 'Grade 12', 'Grade 10', 'Grade 11', 'Grade 12']
        
        if grade not in valid_grades:
            return False, "Invalid grade level"
        
        return True, "Grade level is valid"
    
    @staticmethod
    def validate_subjects(subjects):
        """
        Validate subjects array
        Returns: (is_valid, error_message)
        """
        if not subjects or not isinstance(subjects, list):
            return False, "Subjects must be a list"
        
        if len(subjects) == 0:
            return False, "At least one subject must be selected"
        
        if len(subjects) > 10:
            return False, "Cannot select more than 10 subjects"
        
        valid_subjects = [
            'Mathematics', 'Physical Sciences', 'Accounting', 'English',
            'Life Sciences', 'Geography', 'History', 'Economics',
            'Business Studies', 'Computer Science', 'Biology', 'Chemistry',
            'Physics', 'Literature', 'Arts', 'Music'
        ]
        
        for subject in subjects:
            if subject not in valid_subjects:
                return False, f"Invalid subject: {subject}"
        
        return True, "Subjects are valid"
    
    @staticmethod
    def validate_bio(bio):
        """
        Validate user bio
        Returns: (is_valid, error_message)
        """
        if not bio:
            return True, "Bio is optional"  # Bio is optional
        
        bio = bio.strip()
        
        if len(bio) < 10:
            return False, "Bio must be at least 10 characters long"
        
        if len(bio) > 500:
            return False, "Bio must be less than 500 characters"
        
        # Check for excessive special characters or spam-like patterns
        if re.search(r'[!@#$%^&*()]{3,}', bio):
            return False, "Bio contains too many special characters"
        
        return True, "Bio is valid"
    
    @staticmethod
    def validate_social_link(platform, url):
        """
        Validate social media links
        Returns: (is_valid, error_message)
        """
        if not url:
            return True, f"{platform} link is optional"
        
        url = url.strip()
        
        # Basic URL validation
        if not re.match(r'^https?://', url):
            return False, f"{platform} link must start with http:// or https://"
        
        # Platform-specific validation
        platform_patterns = {
            'instagram': r'instagram\.com',
            'twitter': r'twitter\.com',
            'facebook': r'facebook\.com',
            'linkedin': r'linkedin\.com',
            'youtube': r'youtube\.com'
        }
        
        if platform in platform_patterns:
            if not re.search(platform_patterns[platform], url, re.IGNORECASE):
                return False, f"Invalid {platform} URL"
        
        return True, f"{platform} link is valid"
    
    @staticmethod
    def validate_file_upload(file, allowed_types=None, max_size_mb=5):
        """
        Validate file upload
        Returns: (is_valid, error_message)
        """
        if not file:
            return False, "No file provided"
        
        if allowed_types is None:
            allowed_types = {'image/jpeg', 'image/png', 'image/gif'}
        
        # Check file type
        if file.mimetype not in allowed_types:
            return False, f"File type not allowed. Allowed types: {', '.join(allowed_types)}"
        
        # Check file size
        max_size_bytes = max_size_mb * 1024 * 1024
        file.seek(0, 2)  # Seek to end to get file size
        file_size = file.tell()
        file.seek(0)  # Reset file pointer
        
        if file_size > max_size_bytes:
            return False, f"File too large. Maximum size: {max_size_mb}MB"
        
        if file_size == 0:
            return False, "File is empty"
        
        return True, "File is valid"
    
    @staticmethod
    def sanitize_input(input_string, max_length=None, allow_html=False):
        """
        Sanitize user input to prevent XSS and other attacks
        Returns: sanitized_string
        """
        if not input_string:
            return ""
        
        if not isinstance(input_string, str):
            input_string = str(input_string)
        
        # Trim whitespace
        sanitized = input_string.strip()
        
        # Remove or encode HTML tags if not allowed
        if not allow_html:
            sanitized = re.sub(r'<[^>]*>', '', sanitized)
        
        # Limit length if specified
        if max_length and len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
        
        # Escape special characters for database safety
        sanitized = sanitized.replace('"', '\\"').replace("'", "\\'")
        
        return sanitized
    
    @staticmethod
    def validate_guardian_info(guardian_data, is_minor=True):
        """
        Validate guardian information
        Returns: (is_valid, error_message)
        """
        if not is_minor:
            return True, "Guardian info not required for adults"
        
        if not guardian_data:
            return False, "Guardian information is required for minors"
        
        # Validate guardian name
        name_valid, name_error = Validators.validate_name(
            guardian_data.get('guardian_name'), 
            "Guardian name"
        )
        if not name_valid:
            return False, name_error
        
        # Validate guardian email
        email_valid, email_error = Validators.validate_email(
            guardian_data.get('guardian_email')
        )
        if not email_valid:
            return False, f"Guardian {email_error}"
        
        # Validate guardian phone (optional)
        phone_valid, phone_error = Validators.validate_phone(
            guardian_data.get('guardian_phone')
        )
        if not phone_valid and phone_error != "Phone is optional":
            return False, f"Guardian {phone_error}"
        
        return True, "Guardian information is valid"

# Convenience functions
def validate_email(email):
    return Validators.validate_email(email)

def validate_password(password):
    return Validators.validate_password(password)

def validate_name(name, field_name="Name"):
    return Validators.validate_name(name, field_name)

def sanitize_input(input_string, max_length=None, allow_html=False):
    return Validators.sanitize_input(input_string, max_length, allow_html)