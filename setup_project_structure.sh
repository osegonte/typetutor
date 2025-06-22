#!/bin/bash
# setup_project_structure.sh
# Creates all necessary directories and placeholder files for Supabase + Railway integration

echo "🏗️  Setting up TypeTutor project structure for Supabase + Railway"
echo "=================================================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[0;33m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[CREATING]${NC} $1"; }
print_success() { echo -e "${GREEN}[CREATED]${NC} $1"; }
print_info() { echo -e "${YELLOW}[INFO]${NC} $1"; }

# Create backend database directory
print_status "Backend database directory..."
mkdir -p backend/database
touch backend/database/__init__.py
print_success "backend/database/"

# Create scripts directory
print_status "Scripts directory..."
mkdir -p scripts
print_success "scripts/"

# Create docs directory (optional)
print_status "Documentation directory..."
mkdir -p docs
print_success "docs/"

# Create necessary directories if they don't exist
print_status "Ensuring other directories exist..."
mkdir -p backend/config backend/models backend/routes backend/services backend/utils
mkdir -p frontend/src/services
mkdir -p data uploads cache logs tests
print_success "All directories verified"

# Create placeholder files for new backend files
print_status "Backend database files..."

cat > backend/database/__init__.py << 'EOF'
from .supabase_client import get_supabase

__all__ = ['get_supabase']
EOF

# Create placeholder for supabase_client.py
cat > backend/database/supabase_client.py << 'EOF'
# Supabase client configuration
# Copy content from the artifacts provided by Claude

import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class SupabaseClient:
    _instance = None
    
    @classmethod
    def get_client(cls):
        if cls._instance is None:
            # TODO: Add Supabase client initialization
            # Copy implementation from Claude's artifacts
            pass
        return cls._instance

def get_supabase():
    return SupabaseClient.get_client()
EOF

cat > backend/database/migrations.py << 'EOF'
# Database migration utilities
# Copy content from the artifacts provided by Claude

def get_schema_sql():
    """Return the complete database schema"""
    # TODO: Copy schema SQL from Claude's artifacts
    return ""

def get_default_achievements():
    """Return default achievements data"""
    # TODO: Copy achievements data from Claude's artifacts
    return []
EOF

cat > backend/services/database_service.py << 'EOF'
# Complete database service layer
# Copy content from the artifacts provided by Claude

from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)

class DatabaseService:
    def __init__(self):
        # TODO: Copy implementation from Claude's artifacts
        pass
    
    async def get_or_create_user(self, user_identifier: str = "anonymous") -> Dict:
        # TODO: Implement user management
        pass
    
    async def save_typing_session(self, session_data: Dict) -> Dict:
        # TODO: Implement session saving
        pass
    
    async def get_user_statistics(self, user_id: str = "anonymous") -> Dict:
        # TODO: Implement statistics retrieval
        pass
EOF

cat > backend/routes/database_routes.py << 'EOF'
# Database-specific API routes
# Copy content from the artifacts provided by Claude

from flask import Blueprint, request, jsonify
from utils.decorators import handle_errors, rate_limit

database_bp = Blueprint('database', __name__)

@database_bp.route('/db-health', methods=['GET'])
@handle_errors
def database_health():
    """Check database connection health"""
    # TODO: Copy implementation from Claude's artifacts
    return jsonify({'status': 'placeholder'})

# TODO: Add more database routes from Claude's artifacts
EOF

print_success "Backend database files created"

# Create script files
print_status "Script files..."

cat > scripts/migrate_to_supabase.py << 'EOF'
#!/usr/bin/env python3
"""
Migration script to move existing JSON data to Supabase
Copy content from the artifacts provided by Claude
"""

import asyncio
import sys

async def main():
    print("🚀 Starting TypeTutor Migration to Supabase")
    print("TODO: Copy implementation from Claude's artifacts")
    return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)
EOF

cat > scripts/database_schema.sql << 'EOF'
-- TypeTutor Database Schema for Supabase
-- Copy content from the artifacts provided by Claude

-- TODO: Copy complete schema from Claude's artifacts
-- This file should contain:
-- - Table definitions
-- - Indexes
-- - RLS policies  
-- - Default data inserts
EOF

cat > scripts/quick_deploy.sh << 'EOF'
#!/bin/bash
# Complete automated deployment script
# Copy content from the artifacts provided by Claude

echo "🚀 TypeTutor: Automated Supabase + Railway Deployment"
echo "TODO: Copy implementation from Claude's artifacts"
EOF

cat > scripts/setup_railway.sh << 'EOF'
#!/bin/bash
# Railway setup automation
# Copy content from the artifacts provided by Claude

echo "🚂 TypeTutor Railway Deployment Setup"
echo "TODO: Copy implementation from Claude's artifacts"
EOF

# Make scripts executable
chmod +x scripts/*.sh
chmod +x scripts/migrate_to_supabase.py

print_success "Script files created and made executable"

# Create deployment configuration files
print_status "Deployment configuration files..."

cat > railway.json << 'EOF'
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "pip install -r requirements.txt"
  },
  "deploy": {
    "startCommand": "gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 --access-logfile - --error-logfile - 'backend.app:create_app()'",
    "healthcheckPath": "/api/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
EOF

cat > Procfile << 'EOF'
web: gunicorn --bind 0.0.0.0:$PORT --workers 4 --timeout 120 --access-logfile - --error-logfile - 'backend.app:create_app()'
EOF

cat > .railwayignore << 'EOF'
node_modules/
frontend/
*.log
.git/
.env.local
.env.development
__pycache__/
*.pyc
tests/
.pytest_cache/
.coverage
htmlcov/
venv/
cache/
logs/
*.backup
.DS_Store
EOF

cat > .env.example << 'EOF'
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# Application Configuration
SECRET_KEY=your-secret-key-for-development
FLASK_ENV=development
FLASK_DEBUG=1
PORT=5001
USE_DATABASE=true

# File Upload Settings
UPLOAD_FOLDER=uploads
MAX_CONTENT_LENGTH=16777216

# Rate Limiting
RATE_LIMIT_REQUESTS=30
RATE_LIMIT_WINDOW=60

# Legacy Settings (fallback when database is disabled)
STATS_FILE=data/user_stats.json
CACHE_DIR=cache
LOG_DIR=logs
EOF

print_success "Deployment configuration files created"

# Create frontend environment files
print_status "Frontend environment files..."

cat > frontend/.env.production << 'EOF'
# Production API URL (update with your Railway deployment URL)
VITE_API_URL=https://your-app.railway.app/api
VITE_APP_TITLE=TypeTutor
VITE_DEBUG_MODE=false
EOF

if [ ! -f "frontend/.env.development" ]; then
cat > frontend/.env.development << 'EOF'
# Development API URL
VITE_API_URL=http://localhost:5001/api
VITE_APP_TITLE=TypeTutor Development
VITE_DEBUG_MODE=true
EOF
fi

print_success "Frontend environment files created"

# Create documentation files
print_status "Documentation files..."

cat > docs/deployment.md << 'EOF'
# TypeTutor Deployment Guide

This guide covers deploying TypeTutor with Supabase database and Railway hosting.

## TODO: Copy deployment guide from Claude's artifacts

## Quick Start
1. Set up Supabase project
2. Run database schema
3. Configure environment variables
4. Deploy to Railway
5. Update frontend

See the complete guide in Claude's artifacts.
EOF

cat > docs/api.md << 'EOF'
# TypeTutor API Documentation

## Database Endpoints (when USE_DATABASE=true)
- `GET /api/db-stats` - Get user statistics from database
- `POST /api/db-save-stats` - Save session to database
- `GET /api/db-achievements` - Get user achievements
- `GET /api/db-health` - Database health check

## TODO: Copy complete API documentation from Claude's artifacts
EOF

cat > docs/database.md << 'EOF'
# TypeTutor Database Schema

## Tables
- users
- typing_sessions  
- user_statistics
- achievements
- user_achievements
- goals
- pdf_documents

## TODO: Copy complete database documentation from Claude's artifacts
EOF

print_success "Documentation files created"

# Update requirements.txt if it exists
print_status "Updating requirements.txt..."

if [ -f "requirements.txt" ]; then
    if ! grep -q "supabase" requirements.txt; then
        echo "" >> requirements.txt
        echo "# Supabase" >> requirements.txt
        echo "supabase==1.3.0" >> requirements.txt
        echo "postgrest==0.13.0" >> requirements.txt
        print_success "Added Supabase to requirements.txt"
    else
        print_info "Supabase already in requirements.txt"
    fi
else
    print_info "requirements.txt not found - you'll need to create it"
fi

# Create file completion checklist
cat > SETUP_CHECKLIST.md << 'EOF'
# 📋 TypeTutor Supabase + Railway Setup Checklist

## ✅ File Creation Status

### 🏗️ Project Structure Created
- [x] backend/database/ directory
- [x] scripts/ directory  
- [x] docs/ directory
- [x] Placeholder files created

### 📝 Next Steps - Copy Content from Claude's Artifacts

1. **Copy Database Layer Code:**
   - [ ] Copy content to `backend/database/supabase_client.py`
   - [ ] Copy content to `backend/database/migrations.py`
   - [ ] Copy content to `backend/services/database_service.py`
   - [ ] Copy content to `backend/routes/database_routes.py`

2. **Copy Script Content:**
   - [ ] Copy content to `scripts/migrate_to_supabase.py`
   - [ ] Copy content to `scripts/database_schema.sql`
   - [ ] Copy content to `scripts/quick_deploy.sh`
   - [ ] Copy content to `scripts/setup_railway.sh`

3. **Update Existing Files:**
   - [ ] Update `backend/config/config.py` with Supabase config
   - [ ] Update `backend/routes/__init__.py` to include database routes
   - [ ] Update `README.md` with deployment instructions

4. **Configuration:**
   - [ ] Copy `.env.example` to `.env` and add your Supabase credentials
   - [ ] Update `frontend/.env.production` with your Railway URL

## 🚀 Ready to Deploy

Once all content is copied from Claude's artifacts:

```bash
# Set up your environment
cp .env.example .env
# Edit .env with your Supabase credentials

# Run automated deployment
./scripts/quick_deploy.sh
```

## 📖 Reference

All the implementation code is provided in Claude's artifacts. Simply copy the content from each artifact into the corresponding file listed above.
EOF

print_success "Setup checklist created: SETUP_CHECKLIST.md"

echo ""
echo "🎉 Project structure setup complete!"
echo ""
echo "📋 What was created:"
echo "  • backend/database/ - Database layer (placeholder files)"
echo "  • scripts/ - Migration and deployment scripts"
echo "  • docs/ - Documentation files"
echo "  • Deployment config files (railway.json, Procfile, etc.)"
echo "  • Environment templates (.env.example)"
echo "  • Frontend environment files"
echo ""
echo "📝 Next steps:"
echo "  1. Copy content from Claude's artifacts into the placeholder files"
echo "  2. Follow the checklist in SETUP_CHECKLIST.md"
echo "  3. Set up your Supabase project and get credentials"
echo "  4. Run: cp .env.example .env and add your credentials"
echo "  5. Run: ./scripts/quick_deploy.sh for automated deployment"
echo ""
echo "📖 See SETUP_CHECKLIST.md for detailed next steps"