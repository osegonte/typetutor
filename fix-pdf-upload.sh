#!/bin/bash

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}TypeTutor PDF Upload Fix Script${NC}"
echo "============================"

# Function to print status message
print_status() {
    echo -e "${BLUE}[STATUS]${NC} $1"
}

# Function to print success message
print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

# Function to print error message
print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to fix directory permissions
fix_directory_permissions() {
    dir="$1"
    if [ ! -d "$dir" ]; then
        print_status "Creating directory: $dir"
        mkdir -p "$dir"
    fi
    
    print_status "Setting permissions for $dir"
    chmod -R 755 "$dir"
    
    if [ -w "$dir" ]; then
        print_success "Directory $dir is now writable"
    else
        print_error "Failed to make $dir writable. Please check permissions."
    fi
}

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then
    print_status "This script is not running as root. You might need sudo for some operations."
    echo "Continue anyway? (y/n)"
    read -r response
    if [[ "$response" =~ ^([nN][oO]|[nN])$ ]]; then
        echo "Exiting. Please run with sudo if needed."
        exit 1
    fi
fi

# Fix directory permissions
print_status "Fixing directory permissions..."
fix_directory_permissions "uploads"
fix_directory_permissions "data"

# Check Python packages
print_status "Checking PyPDF2 installation..."
if python3 -c "import PyPDF2" &>/dev/null; then
    version=$(python3 -c "import PyPDF2; print(PyPDF2.__version__)")
    print_success "PyPDF2 is installed (version: $version)"
else
    print_error "PyPDF2 is not installed"
    print_status "Installing PyPDF2..."
    pip install -U PyPDF2
    if [ $? -eq 0 ]; then
        print_success "PyPDF2 installed successfully"
    else
        print_error "Failed to install PyPDF2"
    fi
fi

# Test PDF processing
print_status "Testing basic PDF operations..."
cat > test_pdf.py << 'EOF'
import PyPDF2
import io

# Create a simple PDF in memory
from PyPDF2 import PdfWriter
writer = PdfWriter()
page = writer.add_blank_page(width=612, height=792)
with open("test.pdf", "wb") as f:
    writer.write(f)

print("Created test PDF")

# Try to read it
reader = PyPDF2.PdfReader("test.pdf")
print(f"Successfully opened test PDF with {len(reader.pages)} pages")

print("Basic PDF operations are working correctly")
EOF

python3 test_pdf.py
if [ $? -eq 0 ]; then
    print_success "Basic PDF operations are working"
else
    print_error "Problem with basic PDF operations"
fi

rm -f test_pdf.py test.pdf

# Restart the application
print_status "Checking if TypeTutor is running..."
if pgrep -f "python.*app.py" > /dev/null; then
    print_status "Stopping TypeTutor application..."
    pkill -f "python.*app.py"
    sleep 2
    print_success "TypeTutor stopped"
else
    print_status "TypeTutor doesn't seem to be running"
fi

print_status "Fix complete!"
echo ""
echo "To restart TypeTutor, run:"
echo "./run.sh"
echo ""
echo "If you continue to have issues:"
echo "1. Make sure your PDF file is valid and not corrupted"
echo "2. Try a different PDF file to test"
echo "3. Check the backend logs: cat backend_server.log"
echo "4. Run the diagnostic script: ./diagnose.sh"
echo ""