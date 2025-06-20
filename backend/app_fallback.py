#!/usr/bin/env python3
"""
TypeTutor Analytics Repair Script
Fixes broken imports, creates missing files, and ensures compatibility
"""

import os
import sys
import json
import shutil
from datetime import datetime

def print_status(message):
    print(f"🔧 {message}")

def print_success(message):
    print(f"✅ {message}")

def print_error(message):
    print(f"❌ {message}")

def print_warning(message):
    print(f"⚠️  {message}")

def backup_file(file_path):
    """Create a backup of an existing file"""
    if os.path.exists(file_path):
        backup_path = f"{file_path}.backup.{int(datetime.now().timestamp())}"
        shutil.copy2(file_path, backup_path)
        print_success(f"Backed up {file_path} to {backup_path}")
        return backup_path
    return None

def create_achievement_model():
    """Create the missing Achievement model"""
    achievement_content = '''from datetime import datetime
from typing import Dict, Optional
import uuid

class Achievement:
    """Simple achievement model for TypeTutor"""
    
    def __init__(self, data: Dict = None):
        if data is None:
            data = {}
        
        # Achievement identification
        self.id = data.get('id', str(uuid.uuid4()))
        self.title = data.get('title', '')
        self.description = data.get('description', '')
        self.category = data.get('category', 'general')
        
        # Achievement criteria
        self.criteria = data.get('criteria', {})
        self.target_value = data.get('targetValue', 0)
        self.unit = data.get('unit', '')
        
        # Status and progress
        self.status = data.get('status', 'available')
        self.progress_value = data.get('progressValue', 0)
        self.progress_percentage = data.get('progressPercentage', 0)
        
        # Metadata
        self.icon = data.get('icon', '🏆')
        self.points = data.get('points', 10)
        self.rarity = data.get('rarity', 'common')
        
        # Timestamps
        self.earned_at = data.get('earnedAt')
        self.created_at = data.get('createdAt', datetime.now().isoformat())
    
    def to_dict(self) -> Dict:
        """Convert achievement to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'category': self.category,
            'criteria': self.criteria,
            'targetValue': self.target_value,
            'unit': self.unit,
            'status': self.status,
            'progressValue': self.progress_value,
            'progressPercentage': self.progress_percentage,
            'icon': self.icon,
            'points': self.points,
            'rarity': self.rarity,
            'earnedAt': self.earned_at,
            'createdAt': self.created_at
        }
    
    @staticmethod
    def get_default_achievements():
        """Get list of default achievements"""
        return [
            Achievement({
                'id': 'speed_20', 'title': 'Speed Novice', 'description': 'Reach 20 WPM',
                'category': 'speed', 'targetValue': 20, 'unit': 'WPM', 'icon': '🐢'
            }),
            Achievement({
                'id': 'speed_40', 'title': 'Speed Apprentice', 'description': 'Reach 40 WPM',
                'category': 'speed', 'targetValue': 40, 'unit': 'WPM', 'icon': '🏃'
            }),
            Achievement({
                'id': 'accuracy_90', 'title': 'Precision Rookie', 'description': 'Achieve 90% accuracy',
                'category': 'accuracy', 'targetValue': 90, 'unit': '%', 'icon': '🎯'
            }),
            Achievement({
                'id': 'streak_3', 'title': 'Getting Started', 'description': 'Practice 3 days in a row',
                'category': 'streak', 'targetValue': 3, 'unit': 'days', 'icon': '📅'
            }),
            Achievement({
                'id': 'milestone_1', 'title': 'First Steps', 'description': 'Complete your first session',
                'category': 'milestone', 'targetValue': 1, 'unit': 'sessions', 'icon': '🎉'
            })
        ]
'''
    
    file_path = 'backend/models/achievement.py'
    with open(file_path, 'w') as f:
        f.write(achievement_content)
    print_success(f"Created {file_path}")

def create_goal_model():
    """Create the missing Goal model"""
    goal_content = '''from datetime import datetime, timedelta
from typing import Dict, Optional
import uuid

class Goal:
    """Simple goal model for TypeTutor"""
    
    def __init__(self, data: Dict = None):
        if data is None:
            data = {}
        
        # Goal identification
        self.id = data.get('id', str(uuid.uuid4()))
        self.title = data.get('title', '')
        self.description = data.get('description', '')
        self.type = data.get('type', 'speed')
        
        # Goal targets
        self.target_value = data.get('targetValue', 0)
        self.current_value = data.get('currentValue', 0)
        self.unit = data.get('unit', '')
        
        # Timeline
        self.deadline = data.get('deadline')
        self.duration_days = data.get('durationDays', 30)
        
        # Status
        self.status = data.get('status', 'active')
        self.progress_percentage = data.get('progressPercentage', 0)
        
        # Metadata
        self.priority = data.get('priority', 'medium')
        self.category = data.get('category', 'general')
        self.reward_points = data.get('rewardPoints', 50)
        
        # Timestamps
        self.created_at = data.get('createdAt', datetime.now().isoformat())
        self.updated_at = data.get('updatedAt', datetime.now().isoformat())
        self.completed_at = data.get('completedAt')
        
        # Auto-calculate deadline if not provided
        if not self.deadline and self.duration_days:
            deadline_date = datetime.now() + timedelta(days=self.duration_days)
            self.deadline = deadline_date.isoformat()
    
    def to_dict(self) -> Dict:
        """Convert goal to dictionary"""
        return {
            'id': self.id,
            'title': self.title,
            'description': self.description,
            'type': self.type,
            'targetValue': self.target_value,
            'currentValue': self.current_value,
            'unit': self.unit,
            'deadline': self.deadline,
            'status': self.status,
            'progressPercentage': self.progress_percentage,
            'priority': self.priority,
            'category': self.category,
            'createdAt': self.created_at,
            'updatedAt': self.updated_at,
            'completedAt': self.completed_at
        }
    
    @staticmethod
    def create_speed_goal(target_wpm: int, days: int = 30):
        """Create a speed improvement goal"""
        return Goal({
            'title': f'Reach {target_wpm} WPM',
            'description': f'Improve your typing speed to {target_wpm} words per minute',
            'type': 'speed',
            'targetValue': target_wpm,
            'unit': 'WPM',
            'durationDays': days
        })
'''
    
    file_path = 'backend/models/goal.py'
    with open(file_path, 'w') as f:
        f.write(goal_content)
    print_success(f"Created {file_path}")

def fix_models_init():
    """Fix the models/__init__.py file to handle missing imports gracefully"""
    models_init_content = '''from .typing_session import TypingSession
from .user_stats import UserStats

# Import Achievement and Goal only if the files exist
try:
    from .achievement import Achievement
except ImportError:
    Achievement = None

try:
    from .goal import Goal
except ImportError:
    Goal = None

__all__ = ['TypingSession', 'UserStats']

# Add to __all__ only if successfully imported
if Achievement is not None:
    __all__.append('Achievement')
if Goal is not None:
    __all__.append('Goal')
'''
    
    file_path = 'backend/models/__init__.py'
    backup_file(file_path)
    
    with open(file_path, 'w') as f:
        f.write(models_init_content)
    print_success(f"Fixed {file_path}")

def clean_requirements():
    """Clean up requirements.txt to remove invalid packages"""
    clean_requirements_content = '''Flask==2.3.3
Flask-Cors==4.0.0
pypdf==3.17.1
Werkzeug==2.3.7
python-decouple==3.8
python-magic==0.4.27
psutil==5.9.5
gunicorn==21.2.0

# Development and Testing
pytest==7.4.0
pytest-cov==4.1.0
pytest-flask==1.2.0
black==23.7.0
flake8==6.0.0
coverage==7.2.7
pre-commit==3.3.3

# Basic Analytics (lightweight alternatives)
python-dateutil==2.8.2
requests==2.31.0
'''
    
    file_path = 'requirements.txt'
    backup_file(file_path)
    
    with open(file_path, 'w') as f:
        f.write(clean_requirements_content)
    print_success(f"Cleaned {file_path}")

def create_fallback_app():
    """Create a fallback app.py that gracefully handles analytics failures"""
    app_content = '''import os
import sys
from flask import Flask, send_from_directory
from flask_cors import CORS

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from config.config import DevelopmentConfig, ProductionConfig, TestingConfig
    CONFIG_AVAILABLE = True
except ImportError:
    CONFIG_AVAILABLE = False
    print("Warning: Config module not available, using basic configuration")

try:
    from routes import register_routes
    ROUTES_AVAILABLE = True
except ImportError:
    ROUTES_AVAILABLE = False
    print("Warning: Advanced routes not available, using basic routes")

try:
    from utils.logging_config import setup_logging
    from utils.error_handlers import register_error_handlers
    UTILS_AVAILABLE = True
except ImportError:
    UTILS_AVAILABLE = False
    print("Warning: Advanced utilities not available")

def create_app(config_name=None):
    """Application factory with fallback support"""
    app = Flask(__name__, static_folder='../frontend/dist')
    
    # Basic configuration
    if CONFIG_AVAILABLE:
        if config_name is None:
            config_name = os.environ.get('FLASK_ENV', 'development')
        
        if config_name == 'production':
            app.config.from_object(ProductionConfig)
        elif config_name == 'testing':
            app.config.from_object(TestingConfig)
        else:
            app.config.from_object(DevelopmentConfig)
    else:
        # Fallback configuration
        app.config.update({
            'SECRET_KEY': os.environ.get('SECRET_KEY', 'dev-secret-key'),
            'DEBUG': os.environ.get('FLASK_DEBUG', '1') == '1',
            'PORT': int(os.environ.get('PORT', 5001)),
            'HOST': os.environ.get('HOST', '0.0.0.0'),
            'UPLOAD_FOLDER': 'uploads',
            'STATS_FILE': 'data/user_stats.json',
            'MAX_CONTENT_LENGTH': 16 * 1024 * 1024
        })
    
    # Setup CORS
    port = app.config.get('PORT', 5001)
    allowed_origins = [
        "http://localhost:5173",
        f"http://localhost:{port}",
        "http://127.0.0.1:5173",
        f"http://127.0.0.1:{port}"
    ]
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
    
    # Setup logging if available
    if UTILS_AVAILABLE:
        setup_logging(app)
        register_error_handlers(app)
    else:
        # Basic logging
        import logging
        logging.basicConfig(level=logging.INFO)
        app.logger.setLevel(logging.INFO)
    
    # Register routes
    if ROUTES_AVAILABLE:
        register_routes(app)
    else:
        # Register basic routes
        register_basic_routes(app)
    
    # Create directories
    _create_directories(app)
    
    # Serve static files
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve_frontend(path):
        if path != "" and os.path.exists(app.static_folder + '/' + path):
            return send_from_directory(app.static_folder, path)
        else:
            return send_from_directory(app.static_folder, 'index.html')
    
    app.logger.info(f'TypeTutor backend initialized on port {port}')
    return app

def register_basic_routes(app):
    """Register basic routes when advanced routing is not available"""
    from flask import jsonify, request
    import json
    import math
    from datetime import datetime
    
    @app.route('/api/health', methods=['GET'])
    def health_check():
        return jsonify({
            'status': 'healthy',
            'mode': 'basic',
            'message': 'TypeTutor backend running in basic mode'
        })
    
    @app.route('/api/stats', methods=['GET'])
    def get_stats():
        try:
            stats_file = app.config.get('STATS_FILE', 'data/user_stats.json')
            with open(stats_file, 'r') as f:
                stats = json.load(f)
            return jsonify(stats)
        except:
            default_stats = {
                "averageWpm": 0, "accuracy": 0, "practiceMinutes": 0,
                "currentStreak": 0, "totalSessions": 0, "recentSessions": []
            }
            return jsonify(default_stats)
    
    @app.route('/api/save-stats', methods=['POST'])
    def save_stats():
        try:
            data = request.json
            wpm = int(data['wpm'])
            accuracy = int(data['accuracy'])
            duration = float(data['duration'])
            
            stats_file = app.config.get('STATS_FILE', 'data/user_stats.json')
            
            # Load existing stats
            try:
                with open(stats_file, 'r') as f:
                    stats = json.load(f)
            except:
                stats = {
                    "averageWpm": 0, "accuracy": 0, "practiceMinutes": 0,
                    "currentStreak": 0, "totalSessions": 0, "recentSessions": []
                }
            
            # Update stats
            stats['totalSessions'] += 1
            total_sessions = stats['totalSessions']
            
            # Update averages
            if stats['averageWpm'] == 0:
                stats['averageWpm'] = wpm
            else:
                total_wpm = (stats['averageWpm'] * (total_sessions - 1)) + wpm
                stats['averageWpm'] = round(total_wpm / total_sessions)
            
            if stats['accuracy'] == 0:
                stats['accuracy'] = accuracy
            else:
                total_accuracy = (stats['accuracy'] * (total_sessions - 1)) + accuracy
                stats['accuracy'] = round(total_accuracy / total_sessions)
            
            stats['practiceMinutes'] += math.ceil(duration / 60)
            
            # Add recent session
            session = {
                'date': datetime.now().isoformat(),
                'duration': f"{int(duration / 60)}m {int(duration % 60)}s",
                'wpm': wpm,
                'accuracy': accuracy,
                'mode': data.get('itemType', 'Practice')
            }
            
            stats['recentSessions'].insert(0, session)
            stats['recentSessions'] = stats['recentSessions'][:5]
            
            # Save stats
            with open(stats_file, 'w') as f:
                json.dump(stats, f, indent=2)
            
            return jsonify({'success': True, 'updated_stats': stats})
            
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    
    @app.route('/api/process-text', methods=['POST'])
    def process_text():
        try:
            data = request.json
            if not data or 'text' not in data:
                return jsonify({'error': 'No text provided'}), 400
            
            text = data['text']
            items = [{
                'id': 'custom-text-1',
                'prompt': 'Type this custom text:',
                'content': text,
                'type': 'text',
                'context': 'Custom Text'
            }]
            
            return jsonify({
                'success': True,
                'items': items,
                'item_count': len(items)
            })
        except Exception as e:
            return jsonify({'error': str(e)}), 500

def _create_directories(app):
    """Create necessary directories"""
    directories = [
        app.config.get('UPLOAD_FOLDER', 'uploads'),
        os.path.dirname(app.config.get('STATS_FILE', 'data/user_stats.json')),
        'cache', 'logs'
    ]
    
    for directory in directories:
        if directory and not os.path.exists(directory):
            try:
                os.makedirs(directory, exist_ok=True)
                app.logger.info(f'Created directory: {directory}')
            except OSError as e:
                app.logger.error(f'Failed to create directory {directory}: {e}')

if __name__ == '__main__':
    app = create_app()
    port = app.config.get('PORT', 5001)
    host = app.config.get('HOST', '0.0.0.0')
    debug = app.config.get('DEBUG', False)
    
    print(f"Starting TypeTutor backend on {host}:{port}")
    app.run(debug=debug, host=host, port=port)
'''
    
    file_path = 'backend/app_fallback.py'
    with open(file_path, 'w') as f:
        f.write(app_content)
    print_success(f"Created fallback app at {file_path}")

def create_run_script():
    """Create a working run script"""
    script_content = '''#!/bin/bash

echo "TypeTutor Repair and Launch Script"
echo "================================="

# Colors for output
GREEN='\\033[0;32m'
YELLOW='\\033[0;33m'
RED='\\033[0;31m'
NC='\\033[0m' # No Color

print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check Python
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is required but not found!"
    exit 1
fi

# Activate virtual environment if it exists
if [ -d "venv" ]; then
    source venv/bin/activate
    print_success "Virtual environment activated"
else
    print_warning "No virtual environment found. Creating one..."
    python3 -m venv venv
    source venv/bin/activate
    print_success "Virtual environment created and activated"
fi

# Install dependencies
print_success "Installing dependencies..."
pip install -q -r requirements.txt

# Create necessary directories
mkdir -p uploads data logs cache
chmod 755 uploads data logs cache

# Try to start the main app, fallback to basic app if it fails
print_success "Starting TypeTutor backend..."

PORT=5001
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    print_warning "Port $PORT in use, trying port 5002..."
    PORT=5002
    export PORT=$PORT
fi

# Try main app first
if python backend/app.py > backend_server.log 2>&1 &
then
    BACKEND_PID=$!
    sleep 2
    
    if ps -p $BACKEND_PID > /dev/null; then
        print_success "Backend started successfully on port $PORT (PID: $BACKEND_PID)"
    else
        print_warning "Main backend failed, trying fallback..."
        python backend/app_fallback.py &
        BACKEND_PID=$!
        sleep 2
        
        if ps -p $BACKEND_PID > /dev/null; then
            print_success "Fallback backend started on port $PORT (PID: $BACKEND_PID)"
        else
            print_error "Both backends failed to start. Check backend_server.log"
            exit 1
        fi
    fi
else
    print_warning "Main backend failed to start, using fallback..."
    python backend/app_fallback.py &
    BACKEND_PID=$!
    sleep 2
    
    if ps -p $BACKEND_PID > /dev/null; then
        print_success "Fallback backend started on port $PORT (PID: $BACKEND_PID)"
    else
        print_error "Fallback backend also failed. Check your Python installation."
        exit 1
    fi
fi

# Cleanup function
cleanup() {
    print_success "Shutting down backend..."
    kill $BACKEND_PID 2>/dev/null
    print_success "Backend stopped"
    exit 0
}

trap cleanup SIGINT SIGTERM

print_success "TypeTutor is running!"
echo ""
echo "Backend: http://localhost:$PORT"
echo "Health check: http://localhost:$PORT/api/health"
echo "Stats API: http://localhost:$PORT/api/stats"
echo ""
print_warning "Press Ctrl+C to stop the server"

wait
'''
    
    file_path = 'run_fixed.sh'
    with open(file_path, 'w') as f:
        f.write(script_content)
    os.chmod(file_path, 0o755)  # Make executable
    print_success(f"Created executable run script: {file_path}")

def main():
    """Main repair function"""
    print_status("Starting TypeTutor Analytics Repair...")
    
    # Check if we're in the right directory
    if not os.path.exists('backend'):
        print_error("Please run this script from the TypeTutor root directory")
        return False
    
    try:
        # Ensure models directory exists
        os.makedirs('backend/models', exist_ok=True)
        
        # Step 1: Clean requirements.txt
        print_status("Cleaning requirements.txt...")
        clean_requirements()
        
        # Step 2: Create missing model files
        print_status("Creating missing Achievement model...")
        create_achievement_model()
        
        print_status("Creating missing Goal model...")
        create_goal_model()
        
        # Step 3: Fix models __init__.py
        print_status("Fixing models/__init__.py...")
        fix_models_init()
        
        # Step 4: Create fallback app
        print_status("Creating fallback application...")
        create_fallback_app()
        
        # Step 5: Create working run script
        print_status("Creating fixed run script...")
        create_run_script()
        
        # Step 6: Create necessary directories
        print_status("Creating necessary directories...")
        for directory in ['uploads', 'data', 'logs', 'cache']:
            os.makedirs(directory, exist_ok=True)
            print_success(f"Ensured directory exists: {directory}")
        
        # Step 7: Create basic data files
        print_status("Creating basic data files...")
        
        # Basic stats file
        stats_file = 'data/user_stats.json'
        if not os.path.exists(stats_file):
            basic_stats = {
                "averageWpm": 0,
                "accuracy": 0,
                "practiceMinutes": 0,
                "currentStreak": 0,
                "totalSessions": 0,
                "recentSessions": []
            }
            with open(stats_file, 'w') as f:
                json.dump(basic_stats, f, indent=2)
            print_success(f"Created {stats_file}")
        
        print_success("\\n🎉 TypeTutor Analytics Repair Complete!")
        print_success("\\nTo start the application:")
        print_success("  ./run_fixed.sh")
        print_success("\\nOr manually:")
        print_success("  source venv/bin/activate")
        print_success("  pip install -r requirements.txt")
        print_success("  python backend/app.py")
        print_success("\\nThe backend will be available at: http://localhost:5001")
        
        return True
        
    except Exception as e:
        print_error(f"Repair failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

            '