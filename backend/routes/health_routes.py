from flask import Blueprint, jsonify, current_app
import psutil
import os
from datetime import datetime
from utils.decorators import handle_errors

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
@handle_errors
def health_check():
    """Comprehensive health check endpoint"""
    try:
        # System metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('.')
        
        # Directory checks
        upload_dir = current_app.config.get('UPLOAD_FOLDER', 'uploads')
        cache_dir = current_app.config.get('CACHE_DIR', 'cache')
        log_dir = current_app.config.get('LOG_DIR', 'logs')
        
        directories = {
            'uploads': {
                'exists': os.path.exists(upload_dir),
                'writable': os.access(upload_dir, os.W_OK) if os.path.exists(upload_dir) else False,
                'path': upload_dir
            },
            'cache': {
                'exists': os.path.exists(cache_dir),
                'writable': os.access(cache_dir, os.W_OK) if os.path.exists(cache_dir) else False,
                'path': cache_dir
            },
            'logs': {
                'exists': os.path.exists(log_dir),
                'writable': os.access(log_dir, os.W_OK) if os.path.exists(log_dir) else False,
                'path': log_dir
            }
        }
        
        # Service checks
        services = {
            'pdf_parser': True,  # PyPDF2 should be available
            'stats_service': True,
            'cache_system': os.path.exists(cache_dir)
        }
        
        # Overall health
        all_dirs_ok = all(d['exists'] and d['writable'] for d in directories.values())
        system_ok = cpu_percent < 90 and memory.percent < 90
        overall_status = 'healthy' if all_dirs_ok and system_ok else 'degraded'
        
        return jsonify({
            'status': overall_status,
            'timestamp': datetime.utcnow().isoformat(),
            'system': {
                'cpu_percent': round(cpu_percent, 1),
                'memory_percent': round(memory.percent, 1),
                'disk_percent': round((disk.used / disk.total) * 100, 1),
                'available_memory_mb': round(memory.available / (1024 * 1024))
            },
            'directories': directories,
            'services': services,
            'config': {
                'debug_mode': current_app.debug,
                'max_content_length': current_app.config.get('MAX_CONTENT_LENGTH'),
                'upload_folder': current_app.config.get('UPLOAD_FOLDER')
            }
        })
        
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'timestamp': datetime.utcnow().isoformat(),
            'error': str(e)
        }), 500

@health_bp.route('/debug-info', methods=['GET'])
@handle_errors
def debug_info():
    """Extended debug information"""
    import sys
    import platform
    
    try:
        info = {
            'python_version': sys.version,
            'platform': platform.platform(),
            'architecture': platform.architecture(),
            'processor': platform.processor(),
            'current_working_directory': os.getcwd(),
            'environment_variables': {
                'FLASK_ENV': os.environ.get('FLASK_ENV', 'not set'),
                'FLASK_DEBUG': os.environ.get('FLASK_DEBUG', 'not set')
            },
            'installed_packages': {}
        }
        
        # Check key packages
        packages_to_check = ['flask', 'PyPDF2', 'psutil', 'python-magic']
        for package in packages_to_check:
            try:
                module = __import__(package.replace('-', '_'))
                info['installed_packages'][package] = {
                    'available': True,
                    'version': getattr(module, '__version__', 'unknown')
                }
            except ImportError:
                info['installed_packages'][package] = {
                    'available': False,
                    'version': None
                }
        
        return jsonify(info)
        
    except Exception as e:
        return jsonify({
            'error': str(e),
            'message': 'Error gathering debug information'
        }), 500
