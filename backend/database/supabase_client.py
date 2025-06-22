
# backend/database/supabase_client.py
import os
from supabase import create_client, Client
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class SupabaseClient:
    _instance: Optional[Client] = None
    
    @classmethod
    def get_client(cls) -> Client:
        if cls._instance is None:
            url = os.getenv('SUPABASE_URL')
            key = os.getenv('SUPABASE_ANON_KEY')
            
            if not url or not key:
                raise ValueError(
                    "Supabase credentials not found. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
                )
            
            try:
                cls._instance = create_client(url, key)
                logger.info("Supabase client initialized successfully")
            except Exception as e:
                logger.error(f"Failed to initialize Supabase client: {e}")
                raise
        
        return cls._instance
    
    @classmethod
    def reset_client(cls):
        """Reset client instance (useful for testing)"""
        cls._instance = None

def get_supabase() -> Client:
    """Get Supabase client instance"""
    return SupabaseClient.get_client()

# backend/database/migrations.py
"""
Database migration utilities
"""

def get_schema_sql():
    """Return the complete database schema"""
    return """
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(50) UNIQUE,
    email VARCHAR(255) UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    preferences JSONB DEFAULT '{}'::jsonb,
    is_anonymous BOOLEAN DEFAULT true
);

-- Typing sessions table
CREATE TABLE IF NOT EXISTS typing_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    session_type VARCHAR(50) DEFAULT 'practice',
    content_type VARCHAR(50) DEFAULT 'custom',
    content_preview TEXT,
    wpm INTEGER NOT NULL CHECK (wpm >= 0),
    accuracy INTEGER NOT NULL CHECK (accuracy >= 0 AND accuracy <= 100),
    duration_seconds FLOAT NOT NULL CHECK (duration_seconds > 0),
    characters_typed INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    corrections_count INTEGER DEFAULT 0,
    keystrokes JSONB DEFAULT '[]'::jsonb,
    session_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User statistics table
CREATE TABLE IF NOT EXISTS user_statistics (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    total_sessions INTEGER DEFAULT 0,
    total_practice_time_minutes INTEGER DEFAULT 0,
    average_wpm FLOAT DEFAULT 0,
    best_wpm INTEGER DEFAULT 0,
    average_accuracy FLOAT DEFAULT 0,
    best_accuracy INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_practice_date DATE,
    weekly_stats JSONB DEFAULT '[]'::jsonb,
    monthly_stats JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    criteria JSONB NOT NULL,
    target_value FLOAT NOT NULL,
    unit VARCHAR(20),
    icon VARCHAR(10) DEFAULT '🏆',
    points INTEGER DEFAULT 10,
    rarity VARCHAR(20) DEFAULT 'common',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User achievements table
CREATE TABLE IF NOT EXISTS user_achievements (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    achievement_id VARCHAR(50) REFERENCES achievements(id),
    progress_value FLOAT DEFAULT 0,
    progress_percentage FLOAT DEFAULT 0,
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'earned', 'locked')),
    earned_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, achievement_id)
);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL,
    target_value FLOAT NOT NULL,
    current_value FLOAT DEFAULT 0,
    unit VARCHAR(20),
    deadline TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'paused')),
    priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    progress_percentage FLOAT DEFAULT 0,
    reward_points INTEGER DEFAULT 50,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- PDF documents table
CREATE TABLE IF NOT EXISTS pdf_documents (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    file_size INTEGER,
    file_hash VARCHAR(64),
    metadata JSONB DEFAULT '{}'::jsonb,
    processing_status VARCHAR(20) DEFAULT 'pending',
    extracted_items JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_typing_sessions_user_id ON typing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_typing_sessions_created_at ON typing_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_typing_sessions_user_date ON typing_sessions(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON goals(status);
CREATE INDEX IF NOT EXISTS idx_pdf_documents_user_id ON pdf_documents(user_id);

-- Row Level Security (RLS) policies
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE typing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_statistics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_documents ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (allow all for now - can be tightened later)
CREATE POLICY IF NOT EXISTS "Allow all access to users" ON users FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all access to typing_sessions" ON typing_sessions FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all access to user_statistics" ON user_statistics FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all access to user_achievements" ON user_achievements FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all access to goals" ON goals FOR ALL USING (true);
CREATE POLICY IF NOT EXISTS "Allow all access to pdf_documents" ON pdf_documents FOR ALL USING (true);

-- Allow read access to achievements for all users
CREATE POLICY IF NOT EXISTS "Allow read access to achievements" ON achievements FOR SELECT USING (true);

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER IF NOT EXISTS update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_user_statistics_updated_at BEFORE UPDATE ON user_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER IF NOT EXISTS update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
"""

def get_default_achievements():
    """Return default achievements data"""
    return [
        {
            'id': 'speed_20',
            'title': 'Speed Novice',
            'description': 'Reach 20 WPM',
            'category': 'speed',
            'criteria': {'min_wpm': 20},
            'target_value': 20,
            'unit': 'WPM',
            'icon': '🐢',
            'points': 10,
            'rarity': 'common'
        },
        {
            'id': 'speed_40',
            'title': 'Speed Apprentice',
            'description': 'Reach 40 WPM',
            'category': 'speed',
            'criteria': {'min_wpm': 40},
            'target_value': 40,
            'unit': 'WPM',
            'icon': '🏃',
            'points': 20,
            'rarity': 'common'
        },
        {
            'id': 'speed_60',
            'title': 'Speed Expert',
            'description': 'Reach 60 WPM',
            'category': 'speed',
            'criteria': {'min_wpm': 60},
            'target_value': 60,
            'unit': 'WPM',
            'icon': '⚡',
            'points': 50,
            'rarity': 'rare'
        },
        {
            'id': 'speed_80',
            'title': 'Speed Demon',
            'description': 'Reach 80 WPM',
            'category': 'speed',
            'criteria': {'min_wpm': 80},
            'target_value': 80,
            'unit': 'WPM',
            'icon': '🔥',
            'points': 100,
            'rarity': 'epic'
        },
        {
            'id': 'accuracy_90',
            'title': 'Precision Rookie',
            'description': 'Achieve 90% accuracy',
            'category': 'accuracy',
            'criteria': {'min_accuracy': 90},
            'target_value': 90,
            'unit': '%',
            'icon': '🎯',
            'points': 15,
            'rarity': 'common'
        },
        {
            'id': 'accuracy_95',
            'title': 'Accuracy Expert',
            'description': 'Achieve 95% accuracy',
            'category': 'accuracy',
            'criteria': {'min_accuracy': 95},
            'target_value': 95,
            'unit': '%',
            'icon': '💎',
            'points': 30,
            'rarity': 'rare'
        },
        {
            'id': 'accuracy_99',
            'title': 'Near Perfect',
            'description': 'Achieve 99% accuracy',
            'category': 'accuracy',
            'criteria': {'min_accuracy': 99},
            'target_value': 99,
            'unit': '%',
            'icon': '🌟',
            'points': 75,
            'rarity': 'epic'
        },
        {
            'id': 'streak_3',
            'title': 'Getting Started',
            'description': 'Practice 3 days in a row',
            'category': 'streak',
            'criteria': {'days': 3},
            'target_value': 3,
            'unit': 'days',
            'icon': '📅',
            'points': 20,
            'rarity': 'common'
        },
        {
            'id': 'streak_7',
            'title': 'Week Warrior',
            'description': 'Practice 7 days in a row',
            'category': 'streak',
            'criteria': {'days': 7},
            'target_value': 7,
            'unit': 'days',
            'icon': '🗓️',
            'points': 50,
            'rarity': 'rare'
        },
        {
            'id': 'streak_30',
            'title': 'Month Master',
            'description': 'Practice 30 days in a row',
            'category': 'streak',
            'criteria': {'days': 30},
            'target_value': 30,
            'unit': 'days',
            'icon': '📆',
            'points': 200,
            'rarity': 'legendary'
        },
        {
            'id': 'milestone_1',
            'title': 'First Steps',
            'description': 'Complete your first session',
            'category': 'milestone',
            'criteria': {'session_count': 1},
            'target_value': 1,
            'unit': 'sessions',
            'icon': '🎉',
            'points': 5,
            'rarity': 'common'
        },
        {
            'id': 'milestone_10',
            'title': 'Dedicated Learner',
            'description': 'Complete 10 sessions',
            'category': 'milestone',
            'criteria': {'session_count': 10},
            'target_value': 10,
            'unit': 'sessions',
            'icon': '📚',
            'points': 25,
            'rarity': 'common'
        },
        {
            'id': 'milestone_50',
            'title': 'Typing Enthusiast',
            'description': 'Complete 50 sessions',
            'category': 'milestone',
            'criteria': {'session_count': 50},
            'target_value': 50,
            'unit': 'sessions',
            'icon': '🏅',
            'points': 100,
            'rarity': 'rare'
        },
        {
            'id': 'milestone_100',
            'title': 'Century Club',
            'description': 'Complete 100 sessions',
            'category': 'milestone',
            'criteria': {'session_count': 100},
            'target_value': 100,
            'unit': 'sessions',
            'icon': '💯',
            'points': 250,
            'rarity': 'epic'
        }
    ]