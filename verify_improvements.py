#!/usr/bin/env python3
"""
TypeTutor Backend Improvements Verification Script
This script verifies that all improvements have been properly implemented.
"""

import os
import sys
import importlib.util
import json

def check_file_exists(file_path, description):
    """Check if a file exists"""
    if os.path.exists(file_path):
        print(f"✅ {description}: {file_path}")
        return True
    else:
        print(f"❌ {description}: {file_path} (NOT FOUND)")
        return False

def check_directory_exists(dir_path, description):
    """Check if a directory exists"""
    if os.path.exists(dir_path) and os.path.isdir(dir_path):
        print(f"✅ {description}: {dir_path}")
        return True
    else:
        print(f"❌ {description}: {dir_path} (NOT FOUND)")
        return False

def check_python_import(module_path, description):
    """Check if a Python module can be imported"""
    try:
        spec = importlib.util.spec_from_file_location("test_module", module_path)
        if spec is None:
            print(f"❌ {description}: Cannot create spec for {module_path}")
            return False
        
        module = importlib.util.module_from_spec(spec)
        sys.modules["test_module"] = module
        spec.loader.exec_module(module)
        print(f"✅ {description}: {module_path}")
        return True
    except Exception as e:
        print(f"❌ {description}: {module_path} - {str(e)}")
        return False

def main():
    print("TypeTutor Backend Improvements Verification")
    print("=" * 50)
    
    all_good = True
    
    # Check directory structure
    print("\n📁 Directory Structure:")
    directories = [
        ("backend/config", "Configuration directory"),
        ("backend/routes", "Routes directory"),
        ("backend/services", "Services directory"),
        ("backend/utils", "Utilities directory"),
        ("tests/unit", "Unit tests directory"),
        ("tests/integration", "Integration tests directory"),
        ("uploads", "Uploads directory"),
        ("data", "Data directory"),
        ("logs", "Logs directory"),
        ("cache", "Cache directory")
    ]
    
    for dir_path, description in directories:
        if not check_directory_exists(dir_path, description):
            all_good = False
    
    # Check configuration files
    print("\n⚙️ Configuration Files:")
    config_files = [
        ("backend/config/config.py", "Main configuration"),
        (".env", "Environment variables"),
        ("requirements.txt", "Python requirements"),
        ("requirements-dev.txt", "Development requirements"),
        ("pytest.ini", "Pytest configuration"),
        ("Dockerfile", "Docker configuration"),
        ("docker-compose.yml", "Docker Compose configuration")
    ]
    
    for file_path, description in config_files:
        if not check_file_exists(file_path, description):
            all_good = False
    
    # Check core application files
    print("\n🐍 Core Application Files:")
    core_files = [
        ("backend/app.py", "Main application file"),
        ("backend/config/__init__.py", "Config module init"),
        ("backend/routes/__init__.py", "Routes module init"),
        ("backend/services/__init__.py", "Services module init"),
        ("backend/utils/__init__.py", "Utils module init")
    ]
    
    for file_path, description in core_files:
        if not check_file_exists(file_path, description):
            all_good = False
    
    # Check service files
    print("\n🔧 Service Files:")
    service_files = [
        ("backend/services/pdf_service.py", "PDF service"),
        ("backend/services/stats_service.py", "Statistics service"),
        ("backend/routes/pdf_routes.py", "PDF routes"),
        ("backend/routes/stats_routes.py", "Statistics routes"),
        ("backend/routes/health_routes.py", "Health routes")
    ]
    
    for file_path, description in service_files:
        if not check_file_exists(file_path, description):
            all_good = False
    
    # Check utility files
    print("\n🛠️ Utility Files:")
    utility_files = [
        ("backend/utils/logging_config.py", "Logging configuration"),
        ("backend/utils/error_handlers.py", "Error handlers"),
        ("backend/utils/validators.py", "Input validators"),
        ("backend/utils/decorators.py", "Decorators"),
        ("backend/utils/cache.py", "Cache utilities"),
        ("backend/utils/text_processor.py", "Text processor")
    ]
    
    for file_path, description in utility_files:
        if not check_file_exists(file_path, description):
            all_good = False
    
    # Check test files
    print("\n🧪 Test Files:")
    test_files = [
        ("tests/conftest.py", "Test configuration"),
        ("tests/unit/test_pdf_service.py", "PDF service tests"),
        ("tests/integration/test_api_endpoints.py", "API endpoint tests"),
        ("tests/test_performance.py", "Performance tests")
    ]
    
    for file_path, description in test_files:
        if not check_file_exists(file_path, description):
            all_good = False
    
    # Try to import key modules
    print("\n🔍 Module Import Tests:")
    if os.path.exists("backend/app.py"):
        if not check_python_import("backend/app.py", "Main application"):
            all_good = False
    
    # Check if original app.py was backed up
    print("\n💾 Backup Verification:")
    if check_file_exists("backend_backup/app.py", "Original app.py backup"):
        print("  ℹ️  Original backend has been safely backed up")
    else:
        print("  ⚠️  Original backend backup not found")
    
    # Final result
    print("\n" + "=" * 50)
    if all_good:
        print("🎉 All improvements have been successfully implemented!")
        print("   Run './run_improved.sh' to start the enhanced backend")
    else:
        print("❌ Some improvements are missing or have issues")
        print("   Please re-run './improve_backend.sh' to fix any problems")
    
    return 0 if all_good else 1

if __name__ == "__main__":
    sys.exit(main())
