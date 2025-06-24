#!/bin/bash
# fix_backend_structure.sh - Create proper TypeTutor backend structure

echo "🔧 Fixing TypeTutor Backend Structure"
echo "====================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }

print_status "Creating proper backend directory structure..."

# Create all necessary directories
mkdir -p backend/services
mkdir -p backend/routes
mkdir -p backend/utils
mkdir -p backend/database
mkdir -p backend/config
mkdir -p backend/models

# Create __init__.py files for proper Python modules
touch backend/__init__.py
touch backend/services/__init__.py
touch backend/routes/__init__.py
touch backend/utils/__init__.py
touch backend/database/__init__.py
touch backend/config/__init__.py
touch backend/models/__init__.py

print_success "Directory structure created"

# Backup existing files
if [ -f "app.py" ]; then
    cp app.py app.py.backup
    print_warning "Backed up existing app.py to app.py.backup"
fi

if [ -f "backend/services/stats_service.py" ]; then
    print_success "Keeping existing stats_service.py"
fi

# Install supabase dependency if not present
print_status "Checking dependencies..."
if ! pip show supabase > /dev/null 2>&1; then
    print_status "Installing supabase dependency..."
    pip install supabase==2.3.4
    print_success "Supabase dependency installed"
fi

# Add supabase to requirements.txt if not present
if ! grep -q "supabase" requirements.txt 2>/dev/null; then
    echo "supabase==2.3.4" >> requirements.txt
    echo "asyncio-pool==0.6.0" >> requirements.txt
    print_success "Added supabase to requirements.txt"
fi

print_success "Backend structure preparation complete!"
print_status "Ready for enhanced files to be copied..."

echo ""
echo "📁 Created directory structure:"
echo "   backend/"
echo "   ├── __init__.py"
echo "   ├── services/"
echo "   │   ├── __init__.py"
echo "   │   └── stats_service.py (preserved)"
echo "   ├── routes/"
echo "   │   └── __init__.py"
echo "   ├── utils/"
echo "   │   └── __init__.py"
echo "   ├── database/"
echo "   │   └── __init__.py"
echo "   ├── config/"
echo "   │   └── __init__.py"
echo "   └── models/"
echo "       └── __init__.py"
echo ""
echo "🎯 Next: Copy the enhanced service files from the artifacts"