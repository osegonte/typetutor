#!/usr/bin/env python3
"""
Simple TypeTutor Verifier
No external dependencies required - just checks project structure and basic functionality
"""

import os
import sys
import json
import subprocess
from datetime import datetime

def print_status(message):
    print(f"🔍 {message}")

def print_success(message):
    print(f"✅ {message}")

def print_warning(message):
    print(f"⚠️  {message}")

def print_error(message):
    print(f"❌ {message}")

def print_info(message):
    print(f"ℹ️  {message}")

class SimpleVerifier:
    def __init__(self):
        self.project_root = os.getcwd()
        self.issues_found = []
        self.recommendations = []
    
    def check_project_structure(self):
        """Check if all expected files exist"""
        print_status("Checking project structure...")
        
        required_files = [
            'backend/app.py',
            'backend/models/__init__.py',
            'backend/models/achievement.py',
            'backend/models/goal.py',
            'backend/models/typing_session.py',
            'backend/models/user_stats.py',
            'backend/routes/__init__.py',
            'backend/routes/analytics_routes.py',
            'backend/services/enhanced_analytics_service.py',
            'requirements.txt'
        ]
        
        optional_files = [
            'backend/app_analytics.py',
            'backend/app_fallback.py',
            'data/user_stats.json',
            'backend/config/config.py',
            'backend/utils/logging_config.py'
        ]
        
        missing_required = []
        found_optional = []
        
        print("\n📁 Required Files:")
        for file_path in required_files:
            if os.path.exists(file_path):
                print_success(f"  {file_path}")
            else:
                missing_required.append(file_path)
                print_error(f"  {file_path}")
        
        print("\n📁 Optional Files:")
        for file_path in optional_files:
            if os.path.exists(file_path):
                found_optional.append(file_path)
                print_success(f"  {file_path}")
            else:
                print_info(f"  {file_path} (not found, but optional)")
        
        if missing_required:
            self.issues_found.append(f"Missing {len(missing_required)} required files")
            return False
        else:
            print_success(f"\nAll {len(required_files)} required files found!")
            return True
    
    def check_requirements(self):
        """Check requirements.txt for issues"""
        print_status("Checking requirements.txt...")
        
        if not os.path.exists('requirements.txt'):
            print_error("requirements.txt not found")
            return False
        
        try:
            with open('requirements.txt', 'r') as f:
                content = f.read()
            
            # Check for problematic packages
            problematic = ['mongoose==1.3.0', 'pymongo', 'motor']
            found_problematic = []
            
            for package in problematic:
                if package in content:
                    found_problematic.append(package)
            
            if found_problematic:
                print_warning(f"Found potentially problematic packages: {found_problematic}")
                self.recommendations.append("Consider cleaning requirements.txt")
                return False
            else:
                print_success("Requirements.txt looks clean")
                return True
                
        except Exception as e:
            print_error(f"Error reading requirements.txt: {e}")
            return False
    
    def test_basic_imports(self):
        """Test if basic Python imports work"""
        print_status("Testing basic imports...")
        
        try:
            # Add backend to path
            backend_path = os.path.join(self.project_root, 'backend')
            if backend_path not in sys.path:
                sys.path.insert(0, backend_path)
            
            # Test core imports
            try:
                import models
                print_success("  models package imports")
            except Exception as e:
                print_error(f"  models package: {e}")
                return False
            
            try:
                from models import TypingSession, UserStats
                print_success("  Core models import")
            except Exception as e:
                print_error(f"  Core models: {e}")
                return False
            
            try:
                from models import Achievement, Goal
                print_success("  Achievement and Goal models import")
            except Exception as e:
                print_warning(f"  Achievement/Goal models: {e}")
                print_info("    This might be OK if fallback mode is working")
            
            try:
                import routes
                print_success("  routes package imports")
            except Exception as e:
                print_error(f"  routes package: {e}")
                return False
            
            try:
                import services
                print_success("  services package imports")
            except Exception as e:
                print_error(f"  services package: {e}")
                return False
            
            return True
            
        except Exception as e:
            print_error(f"Import test failed: {e}")
            return False
    
    def check_data_directory(self):
        """Check if data directory exists and has proper structure"""
        print_status("Checking data directory...")
        
        directories = ['data', 'uploads', 'logs', 'cache']
        
        for directory in directories:
            if os.path.exists(directory):
                if os.access(directory, os.W_OK):
                    print_success(f"  {directory}/ (writable)")
                else:
                    print_warning(f"  {directory}/ (not writable)")
                    self.recommendations.append(f"Fix permissions for {directory}/")
            else:
                print_info(f"  {directory}/ (will be created when needed)")
        
        # Check for basic stats file
        stats_file = 'data/user_stats.json'
        if os.path.exists(stats_file):
            try:
                with open(stats_file, 'r') as f:
                    stats = json.load(f)
                print_success(f"  {stats_file} (valid JSON)")
            except:
                print_warning(f"  {stats_file} (invalid JSON)")
                self.recommendations.append("Reset user stats file")
        else:
            print_info(f"  {stats_file} (will be created on first use)")
        
        return True
    
    def check_virtual_environment(self):
        """Check if we're in a virtual environment and suggest setup"""
        print_status("Checking Python environment...")
        
        # Check if in virtual environment
        in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
        
        if in_venv:
            print_success(f"  Virtual environment active: {sys.prefix}")
        else:
            print_warning("  Not in a virtual environment")
            self.recommendations.append("Consider using a virtual environment")
        
        # Check Python version
        py_version = sys.version_info
        if py_version >= (3, 7):
            print_success(f"  Python version: {py_version.major}.{py_version.minor}.{py_version.micro}")
        else:
            print_error(f"  Python version too old: {py_version.major}.{py_version.minor}.{py_version.micro}")
            self.issues_found.append("Python version < 3.7")
        
        return True
    
    def suggest_next_steps(self):
        """Provide specific next steps based on findings"""
        print("\n" + "="*60)
        print("📋 NEXT STEPS RECOMMENDATION")
        print("="*60)
        
        if not self.issues_found:
            print_success("🎉 Your TypeTutor project looks great!")
            print("\n🚀 Ready to start:")
            print("1. Install dependencies:")
            print("   pip install -r requirements.txt")
            print("\n2. Start TypeTutor:")
            print("   python backend/app.py")
            print("\n3. Test it:")
            print("   Open browser to http://localhost:5001/api/health")
            
        else:
            print_warning("⚠️ Found some issues to address:")
            for issue in self.issues_found:
                print(f"   • {issue}")
            
            print("\n🔧 Recommended fixes:")
            if "Missing" in str(self.issues_found):
                print("   • Some files are missing - project may need setup")
                print("   • Check if you're in the correct directory")
                print("   • Consider running the full repair script")
        
        if self.recommendations:
            print("\n💡 Additional recommendations:")
            for rec in self.recommendations:
                print(f"   • {rec}")
        
        print("\n" + "="*60)
    
    def create_minimal_setup_script(self):
        """Create a minimal setup script for common issues"""
        setup_script = '''#!/bin/bash
# TypeTutor Minimal Setup Script

echo "🔧 TypeTutor Minimal Setup"
echo "========================="

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install basic dependencies
echo "Installing dependencies..."
pip install -q flask flask-cors pypdf psutil python-decouple requests

# Create necessary directories
echo "Creating directories..."
mkdir -p data uploads logs cache
chmod 755 data uploads logs cache

# Create basic stats file if it doesn't exist
if [ ! -f "data/user_stats.json" ]; then
    echo "Creating basic stats file..."
    cat > data/user_stats.json << 'EOF'
{
  "averageWpm": 0,
  "accuracy": 0,
  "practiceMinutes": 0,
  "currentStreak": 0,
  "totalSessions": 0,
  "recentSessions": []
}
EOF
fi

echo "✅ Setup complete!"
echo ""
echo "To start TypeTutor:"
echo "  source venv/bin/activate"
echo "  python backend/app.py"
'''
        
        with open('setup_typetutor.sh', 'w') as f:
            f.write(setup_script)
        os.chmod('setup_typetutor.sh', 0o755)
        
        print_success("Created setup_typetutor.sh script")
        print_info("Run: ./setup_typetutor.sh to set up environment")
    
    def run_verification(self):
        """Run the complete verification process"""
        print("🔍 TypeTutor Simple Verification")
        print(f"📁 Project directory: {self.project_root}")
        print("-" * 60)
        
        # Run all checks
        structure_ok = self.check_project_structure()
        requirements_ok = self.check_requirements()
        imports_ok = self.test_basic_imports()
        data_ok = self.check_data_directory()
        env_ok = self.check_virtual_environment()
        
        # Create setup script
        self.create_minimal_setup_script()
        
        # Provide recommendations
        self.suggest_next_steps()
        
        return all([structure_ok, requirements_ok, imports_ok, data_ok, env_ok])

def main():
    """Main function"""
    if not os.path.exists('backend'):
        print_error("❌ Please run this script from the TypeTutor project root directory")
        print_info("Expected structure: typetutor/backend/app.py")
        return 1
    
    verifier = SimpleVerifier()
    success = verifier.run_verification()
    
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())