#!/bin/bash

# Colors for better output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}TypeTutor Diagnostic Tool${NC}"
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

# Function to print warning message
print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Function to check if a command exists
check_command() {
    if command -v $1 &> /dev/null; then
        print_success "$1 is installed ✓"
        $1 --version
        return 0
    else
        print_error "$1 is not installed ✗"
        return 1
    fi
}

# Function to check directory permissions
check_directory_permission() {
    dir_path="$1"
    if [ -d "$dir_path" ]; then
        if [ -w "$dir_path" ]; then
            print_success "Directory '$dir_path' exists and is writable ✓"
            return 0
        else
            print_error "Directory '$dir_path' exists but is not writable! ✗"
            echo "  Owner: $(ls -ld "$dir_path" | awk '{print $3}')"
            echo "  Permissions: $(ls -ld "$dir_path" | awk '{print $1}')"
            return 1
        fi
    else
        print_error "Directory '$dir_path' does not exist! ✗"
        return 1
    fi
}

# Function to test network connectivity
test_network() {
    host="$1"
    port="$2"
    timeout 1 bash -c "cat < /dev/null > /dev/tcp/$host/$port" 2>/dev/null
    if [ $? -eq 0 ]; then
        print_success "Connection to $host:$port successful ✓"
        return 0
    else
        print_error "Connection to $host:$port failed ✗"
        return 1
    fi
}

# Check system information
print_status "Checking system information..."
echo "OS: $(uname -s)"
echo "Architecture: $(uname -m)"
echo "Hostname: $(hostname)"
echo "Current user: $(whoami)"
echo "Current directory: $(pwd)"

# Check Python
print_status "Checking Python installation..."
check_command python3
if [ $? -eq 0 ]; then
    # Check Python modules
    print_status "Checking required Python modules..."
    python3 -c "import PyPDF2; print(f'PyPDF2 version: {PyPDF2.__version__}')" 2>/dev/null
    if [ $? -ne 0 ]; then
        print_error "PyPDF2 module not found or not working properly ✗"
    else
        print_success "PyPDF2 module is working ✓"
    fi
    
    python3 -c "import flask; print(f'Flask version: {flask.__version__}')" 2>/dev/null
    if [ $? -ne 0 ]; then
        print_error "Flask module not found or not working properly ✗"
    else
        print_success "Flask module is working ✓"
    fi
    
    python3 -c "import flask_cors; print('Flask-CORS is installed')" 2>/dev/null
    if [ $? -ne 0 ]; then
        print_error "Flask-CORS module not found or not working properly ✗"
    else
        print_success "Flask-CORS module is working ✓"
    fi
fi

# Check Node.js and npm
print_status "Checking Node.js and npm installation..."
check_command node
check_command npm

# Check directory structure and permissions
print_status "Checking directory structure and permissions..."
check_directory_permission "."
check_directory_permission "backend"
check_directory_permission "frontend"
check_directory_permission "uploads"
check_directory_permission "data"

# Check for backend server
print_status "Checking if backend server is running..."
test_network "localhost" "5000"

# Check for frontend server
print_status "Checking if frontend server is running..."
test_network "localhost" "5173"

# Test file handling
print_status "Testing file handling..."
test_file="uploads/test_file.txt"
echo "This is a test file for TypeTutor diagnostics" > "$test_file"
if [ -f "$test_file" ]; then
    print_success "Created test file successfully ✓"
    rm "$test_file"
    if [ ! -f "$test_file" ]; then
        print_success "Removed test file successfully ✓"
    else
        print_error "Failed to remove test file ✗"
    fi
else
    print_error "Failed to create test file ✗"
fi

# Additional PDF-specific tests
print_status "Testing PDF handling (basic)..."
if python3 -c "import PyPDF2; PyPDF2.PdfReader(PyPDF2.PdfWriter().output)" 2>/dev/null; then
    print_success "Basic PDF handling test passed ✓"
else
    print_error "Basic PDF handling test failed ✗"
fi

# Make an HTTP request to the debug endpoint
print_status "Fetching debug information from backend API..."
if command -v curl &> /dev/null; then
    echo "Sending request to http://localhost:5000/api/debug-info"
    curl -s http://localhost:5000/api/debug-info | python3 -m json.tool
elif command -v wget &> /dev/null; then
    echo "Sending request to http://localhost:5000/api/debug-info"
    wget -q -O - http://localhost:5000/api/debug-info | python3 -m json.tool
else
    print_error "Neither curl nor wget is installed. Cannot make HTTP request."
fi

echo ""
print_status "Diagnostics complete!"
echo "If you're having issues with file uploads, check:"
echo "1. Directory permissions for 'uploads' directory"
echo "2. PyPDF2 installation and compatibility"
echo "3. Network connectivity between frontend and backend"
echo "4. Browser console errors (open developer tools in your browser)"
echo ""
print_warning "To fix permissions issues, you might need to run:"
echo "chmod -R 755 uploads data"
echo ""