#!/bin/bash
# final_typo_fix.sh - Fix the last remaining wmp typo

echo "🔧 Final TypeTutor WMP Typo Fix"
echo "==============================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }

print_status "Fixing remaining 'wmp' reference in stats_service.py line 146..."

# Fix the specific line in stats_service.py
if [ -f "backend/services/stats_service.py" ]; then
    # Backup first
    cp backend/services/stats_service.py backend/services/stats_service.py.final-backup
    
    # Fix line 146 specifically - change 'wmp' variable to 'wpm'
    sed -i.bak "s/= wmp/= wpm/g" backend/services/stats_service.py
    sed -i.bak "s/stats\['personalBest'\]\['wpm'\] = wmp/stats['personalBest']['wpm'] = wpm/g" backend/services/stats_service.py
    
    print_success "Fixed stats_service.py"
    
    # Verify the fix
    if grep -n "wmp" backend/services/stats_service.py; then
        echo "Still found 'wmp' references - checking..."
        grep -n "wmp" backend/services/stats_service.py
    else
        print_success "All 'wmp' references removed from stats_service.py"
    fi
else
    echo "stats_service.py not found"
fi

# Also fix any remaining references in other service files
print_status "Checking other service files..."

for file in backend/services/*.py; do
    if [ -f "$file" ] && grep -q "wmp" "$file"; then
        echo "Fixing $file..."
        cp "$file" "${file}.final-backup"
        sed -i.bak "s/wmp/wpm/g" "$file"
        print_success "Fixed $file"
    fi
done

print_status "Final verification - searching for any remaining 'wmp' references..."
echo ""

# Search all Python files for any remaining wmp references
find . -name "*.py" -exec grep -l "wmp" {} \; 2>/dev/null | while read file; do
    echo "Found 'wmp' in: $file"
    grep -n "wmp" "$file"
done

echo ""
print_success "🎉 Final typo fix complete!"
echo ""
echo "Now restart your backend:"
echo "1. Press Ctrl+C in the backend terminal"
echo "2. Run: python app.py"
echo "3. The statistics saving should now work with Supabase!"