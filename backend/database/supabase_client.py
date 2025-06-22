# backend/database/supabase_client.py
import os
import logging
from typing import Optional, Dict, Any
from supabase import create_client, Client

logger = logging.getLogger(__name__)

class SupabaseManager:
    """Singleton Supabase client manager"""
    _instance: Optional[Client] = None
    _initialized = False
    
    @classmethod
    def get_client(cls) -> Client:
        """Get Supabase client instance"""
        if cls._instance is None:
            cls._initialize_client()
        return cls._instance
    
    @classmethod
    def _initialize_client(cls):
        """Initialize Supabase client with environment variables"""
        try:
            # Get credentials from environment
            supabase_url = os.getenv('SUPABASE_URL')
            supabase_key = os.getenv('SUPABASE_ANON_KEY')
            
            if not supabase_url:
                raise ValueError("SUPABASE_URL environment variable is required")
            
            if not supabase_key:
                raise ValueError("SUPABASE_ANON_KEY environment variable is required")
            
            # Validate URL format
            if not supabase_url.startswith('https://'):
                raise ValueError("SUPABASE_URL must start with https://")
            
            # Create client
            cls._instance = create_client(supabase_url, supabase_key)
            cls._initialized = True
            
            logger.info(f"Supabase client initialized successfully for: {supabase_url}")
            
        except Exception as e:
            logger.error(f"Failed to initialize Supabase client: {e}")
            raise
    
    @classmethod
    def test_connection(cls) -> Dict[str, Any]:
        """Test the Supabase connection"""
        try:
            client = cls.get_client()
            
            # Try a simple query to test connection
            result = client.table('users').select('count').limit(1).execute()
            
            return {
                'success': True,
                'message': 'Successfully connected to Supabase',
                'url': os.getenv('SUPABASE_URL', 'Not set'),
                'status': 'healthy'
            }
            
        except Exception as e:
            logger.error(f"Supabase connection test failed: {e}")
            return {
                'success': False,
                'message': f'Connection failed: {str(e)}',
                'url': os.getenv('SUPABASE_URL', 'Not set'),
                'status': 'error'
            }
    
    @classmethod
    def reset_client(cls):
        """Reset client instance (useful for testing)"""
        cls._instance = None
        cls._initialized = False

def get_supabase() -> Client:
    """Get Supabase client instance - main entry point"""
    return SupabaseManager.get_client()

def test_supabase_connection() -> Dict[str, Any]:
    """Test Supabase connection - convenience function"""
    return SupabaseManager.test_connection()

# Database health check function
def check_database_health() -> Dict[str, Any]:
    """Comprehensive database health check"""
    try:
        client = get_supabase()
        
        # Test basic connection
        health_data = {
            'database_connected': False,
            'tables_accessible': False,
            'sample_query_works': False,
            'error': None
        }
        
        # Test 1: Basic connection
        try:
            # This will throw an exception if client can't be created
            if client:
                health_data['database_connected'] = True
        except Exception as e:
            health_data['error'] = f"Client creation failed: {e}"
            return health_data
        
        # Test 2: Table access
        try:
            # Try to access users table schema
            result = client.table('users').select('count').limit(1).execute()
            health_data['tables_accessible'] = True
        except Exception as e:
            health_data['error'] = f"Table access failed: {e}"
            return health_data
        
        # Test 3: Sample query
        try:
            # Try a simple select query
            result = client.table('users').select('id').limit(1).execute()
            health_data['sample_query_works'] = True
        except Exception as e:
            health_data['error'] = f"Sample query failed: {e}"
            return health_data
        
        return health_data
        
    except Exception as e:
        return {
            'database_connected': False,
            'tables_accessible': False,
            'sample_query_works': False,
            'error': f"Health check failed: {e}"
        }