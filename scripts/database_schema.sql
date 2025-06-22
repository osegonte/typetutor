-- TypeTutor Database Schema for Supabase
-- Run this in your Supabase SQL Editor

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
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_statistics_updated_at ON user_statistics;
CREATE TRIGGER update_user_statistics_updated_at BEFORE UPDATE ON user_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goals_updated_at ON goals;
CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default achievements
INSERT INTO achievements (id, title, description, category, criteria, target_value, unit, icon, points, rarity) VALUES
('speed_20', 'Speed Novice', 'Reach 20 WPM', 'speed', '{"min_wpm": 20}', 20, 'WPM', '🐢', 10, 'common'),
('speed_40', 'Speed Apprentice', 'Reach 40 WPM', 'speed', '{"min_wpm": 40}', 40, 'WPM', '🏃', 20, 'common'),
('speed_60', 'Speed Expert', 'Reach 60 WPM', 'speed', '{"min_wpm": 60}', 60, 'WPM', '⚡', 50, 'rare'),
('speed_80', 'Speed Demon', 'Reach 80 WPM', 'speed', '{"min_wpm": 80}', 80, 'WPM', '🔥', 100, 'epic'),
('accuracy_90', 'Precision Rookie', 'Achieve 90% accuracy', 'accuracy', '{"min_accuracy": 90}', 90, '%', '🎯', 15, 'common'),
('accuracy_95', 'Accuracy Expert', 'Achieve 95% accuracy', 'accuracy', '{"min_accuracy": 95}', 95, '%', '💎', 30, 'rare'),
('accuracy_99', 'Near Perfect', 'Achieve 99% accuracy', 'accuracy', '{"min_accuracy": 99}', 99, '%', '🌟', 75, 'epic'),
('streak_3', 'Getting Started', 'Practice 3 days in a row', 'streak', '{"days": 3}', 3, 'days', '📅', 20, 'common'),
('streak_7', 'Week Warrior', 'Practice 7 days in a row', 'streak', '{"days": 7}', 7, 'days', '🗓️', 50, 'rare'),
('streak_30', 'Month Master', 'Practice 30 days in a row', 'streak', '{"days": 30}', 30, 'days', '📆', 200, 'legendary'),
('milestone_1', 'First Steps', 'Complete your first session', 'milestone', '{"session_count": 1}', 1, 'sessions', '🎉', 5, 'common'),
('milestone_10', 'Dedicated Learner', 'Complete 10 sessions', 'milestone', '{"session_count": 10}', 10, 'sessions', '📚', 25, 'common'),
('milestone_50', 'Typing Enthusiast', 'Complete 50 sessions', 'milestone', '{"session_count": 50}', 50, 'sessions', '🏅', 100, 'rare'),
('milestone_100', 'Century Club', 'Complete 100 sessions', 'milestone', '{"session_count": 100}', 100, 'sessions', '💯', 250, 'epic')
ON CONFLICT (id) DO NOTHING;
