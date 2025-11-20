# fix_indentation.py - Fix the indentation issue
import os
import re

def fix_indentation():
    print("🔧 FIXING INDENTATION ISSUE")
    print("=" * 50)
    
    models_path = 'app/models.py'
    
    with open(models_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Find the User class and fix indentation
    user_class_pattern = r'(class User\(.*?\):.*?)(?=\nclass|\Z)'
    user_class_match = re.search(user_class_pattern, content, re.DOTALL)
    
    if user_class_match:
        user_class_content = user_class_match.group(1)
        
        # Fix the indentation for methods that are outside the class
        # The check_password and to_dict methods should be indented
        fixed_user_class = user_class_content
        
        # Fix check_password method indentation
        if 'def check_password(self, password):' in fixed_user_class:
            # Replace unindented with indented
            fixed_user_class = fixed_user_class.replace(
                '\ndef check_password(self, password):',
                '\n    def check_password(self, password):'
            )
        
        # Fix to_dict method indentation  
        if 'def to_dict(self):' in fixed_user_class:
            fixed_user_class = fixed_user_class.replace(
                '\ndef to_dict(self):',
                '\n    def to_dict(self):'
            )
        
        # Replace the old User class with the fixed one
        new_content = content.replace(user_class_content, fixed_user_class)
        
        # Write back
        with open(models_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print("✅ Fixed method indentation in User class")
        
        # Verify
        with open(models_path, 'r', encoding='utf-8') as f:
            verify_content = f.read()
            if '    def check_password(self, password):' in verify_content:
                print("✅ check_password is now properly indented")
            else:
                print("❌ check_password indentation not fixed")
                
            if '    def to_dict(self):' in verify_content:
                print("✅ to_dict is now properly indented")
            else:
                print("❌ to_dict indentation not fixed")
    
    else:
        print("❌ Could not find User class")

if __name__ == '__main__':
    fix_indentation()