# fix_password_methods.py - Fix password methods to use bcrypt consistently
import os
import re

def fix_password_methods():
    print("🔧 FIXING PASSWORD METHODS TO USE BCRYPT")
    print("=" * 50)
    
    models_path = 'app/models.py'
    
    with open(models_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the User class
    user_class_pattern = r'(class User\(.*?\):.*?)(?=\nclass|\Z)'
    user_class_match = re.search(user_class_pattern, content, re.DOTALL)
    
    if user_class_match:
        user_class_content = user_class_match.group(1)
        
        # Replace the check_password method to use bcrypt
        old_check_password = '''    def check_password(self, password):
        """Check if provided password matches the stored hash"""
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, password)'''
        
        new_check_password = '''    def check_password(self, password):
        """Check if provided password matches the stored hash"""
        return bcrypt.check_password_hash(self.password_hash, password)'''
        
        if old_check_password in user_class_content:
            user_class_content = user_class_content.replace(old_check_password, new_check_password)
            print("✅ Updated check_password to use bcrypt")
        else:
            print("❌ Could not find old check_password method")
        
        # Replace the entire User class
        new_content = content.replace(user_class_match.group(1), user_class_content)
        
        # Write back
        with open(models_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print("✅ Password methods now both use bcrypt")
        
    else:
        print("❌ Could not find User class")

if __name__ == '__main__':
    fix_password_methods()