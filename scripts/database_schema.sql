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

-- Insert default achievements
INSERT INTO achievements (id, title, description, category, criteria, target_value, unit, icon, points, rarity) VALUES
-- Speed achievements
('speed_20', 'Speed Novice', 'Reach 20 WPM', 'speed', '{"min_wpm": 20}', 20, 'WPM', '🐢', 10, 'common'),
('speed_40', 'Speed Apprentice', 'Reach 40 WPM', 'speed', '{"min_wpm": 40}', 40, 'WPM', '🏃', 20, 'common'),
('speed_60', 'Speed Expert', 'Reach 60 WPM', 'speed', '{"min_wpm": 60}', 60, 'WPM', '⚡', 50, 'rare'),
('speed_80', 'Speed Demon', 'Reach 80 WPM', 'speed', '{"min_wpm": 80}', 80, 'WPM', '🔥', 100, 'epic'),
('speed_100', 'Speed Master', 'Reach 100 WPM', 'speed', '{"min_wpm": 100}', 100, 'WPM', '🚀', 200, 'legendary'),

-- Accuracy achievements
('accuracy_90', 'Precision Rookie', 'Achieve 90% accuracy', 'accuracy', '{"min_accuracy": 90}', 90, '%', '🎯', 15, 'common'),
('accuracy_95', 'Accuracy Expert', 'Achieve 95% accuracy', 'accuracy', '{"min_accuracy": 95}', 95, '%', '💎', 30, 'rare'),
('accuracy_98', 'Near Perfect', 'Achieve 98% accuracy', 'accuracy', '{"min_accuracy": 98}', 98, '%', '🌟', 75, 'epic'),
('accuracy_100', 'Perfectionist', 'Achieve 100% accuracy', 'accuracy', '{"min_accuracy": 100}', 100, '%', '👑', 150, 'legendary'),

-- Streak achievements
('streak_3', 'Getting Started', 'Practice 3 days in a row', 'streak', '{"days": 3}', 3, 'days', '📅', 20, 'common'),
('streak_7', 'Week Warrior', 'Practice 7 days in a row', 'streak', '{"days": 7}', 7, 'days', '🗓️', 50, 'rare'),
('streak_30', 'Month Master', 'Practice 30 days in a row', 'streak', '{"days": 30}', 30, 'days', '📆', 200, 'legendary'),
('streak_100', 'Century Streak', 'Practice 100 days in a row', 'streak', '{"days": 100}', 100, 'days', '💯', 500, 'legendary'),

-- Milestone achievements
('milestone_1', 'First Steps', 'Complete your first session', 'milestone', '{"session_count": 1}', 1, 'sessions', '🎉', 5, 'common'),
('milestone_10', 'Dedicated Learner', 'Complete 10 sessions', 'milestone', '{"session_count": 10}', 10, 'sessions', '📚', 25, 'common'),
('milestone_50', 'Typing Enthusiast', 'Complete 50 sessions', 'milestone', '{"session_count": 50}', 50, 'sessions', '🏅', 100, 'rare'),
('milestone_100', 'Century Club', 'Complete 100 sessions', 'milestone', '{"session_count": 100}', 100, 'sessions', '💯', 250, 'epic'),
('milestone_500', 'Typing Legend', 'Complete 500 sessions', 'milestone', '{"session_count": 500}', 500, 'sessions', '🏆', 1000, 'legendary'),

-- Practice time achievements
('time_60', 'Hour Hero', 'Practice for 60 minutes total', 'practice_time', '{"minutes": 60}', 60, 'minutes', '⏰', 25, 'common'),
('time_300', 'Five Hour Focus', 'Practice for 5 hours total', 'practice_time', '{"minutes": 300}', 300, 'minutes', '⏳', 75, 'rare'),
('time_1200', 'Twenty Hour Titan', 'Practice for 20 hours total', 'practice_time', '{"minutes": 1200}', 1200, 'minutes', '🕐', 200, 'epic')

ON CONFLICT (id) DO NOTHING;

-- Create a view for user achievement progress
CREATE OR REPLACE VIEW user_achievement_progress AS
SELECT 
    ua.user_id,
    ua.achievement_id,
    a.title,
    a.description,
    a.category,
    a.icon,
    a.points,
    a.rarity,
    a.target_value,
    a.unit,
    ua.progress_value,
    ua.progress_percentage,
    ua.status,
    ua.earned_at,
    CASE 
        WHEN ua.status = 'earned' THEN true 
        ELSE false 
    END as is_earned
FROM user_achievements ua
JOIN achievements a ON ua.achievement_id = a.id
WHERE a.is_active = true;

-- Create a function to update achievement progress
CREATE OR REPLACE FUNCTION update_achievement_progress(
    p_user_id UUID,
    p_session_wpm INTEGER,
    p_session_accuracy INTEGER,
    p_current_streak INTEGER,
    p_total_sessions INTEGER,
    p_total_practice_minutes INTEGER
)
RETURNS JSONB AS $
DECLARE
    achievement RECORD;
    new_achievements JSONB := '[]'::jsonb;
    progress_value FLOAT;
    should_earn BOOLEAN;
BEGIN
    -- Loop through all active achievements
    FOR achievement IN 
        SELECT * FROM achievements WHERE is_active = true
    LOOP
        -- Calculate progress based on achievement category
        CASE achievement.category
            WHEN 'speed' THEN
                progress_value := p_session_wpm;
            WHEN 'accuracy' THEN
                progress_value := p_session_accuracy;
            WHEN 'streak' THEN
                progress_value := p_current_streak;
            WHEN 'milestone' THEN
                progress_value := p_total_sessions;
            WHEN 'practice_time' THEN
                progress_value := p_total_practice_minutes;
            ELSE
                progress_value := 0;
        END CASE;
        
        -- Check if achievement should be earned
        should_earn := progress_value >= achievement.target_value;
        
        -- Insert or update user achievement
        INSERT INTO user_achievements (
            user_id, 
            achievement_id, 
            progress_value, 
            progress_percentage,
            status,
            earned_at
        ) VALUES (
            p_user_id,
            achievement.id,
            progress_value,
            LEAST(100, (progress_value / achievement.target_value * 100)),
            CASE WHEN should_earn THEN 'earned' ELSE 'available' END,
            CASE WHEN should_earn THEN NOW() ELSE NULL END
        )
        ON CONFLICT (user_id, achievement_id) 
        DO UPDATE SET
            progress_value = GREATEST(user_achievements.progress_value, EXCLUDED.progress_value),
            progress_percentage = LEAST(100, (GREATEST(user_achievements.progress_value, EXCLUDED.progress_value) / achievement.target_value * 100)),
            status = CASE 
                WHEN GREATEST(user_achievements.progress_value, EXCLUDED.progress_value) >= achievement.target_value 
                    AND user_achievements.status != 'earned' 
                THEN 'earned' 
                ELSE user_achievements.status 
            END,
            earned_at = CASE 
                WHEN GREATEST(user_achievements.progress_value, EXCLUDED.progress_value) >= achievement.target_value 
                    AND user_achievements.status != 'earned' 
                THEN NOW() 
                ELSE user_achievements.earned_at 
            END;
        
        -- If this is a new achievement, add to result
        IF should_earn AND NOT EXISTS (
            SELECT 1 FROM user_achievements 
            WHERE user_id = p_user_id 
            AND achievement_id = achievement.id 
            AND status = 'earned'
        ) THEN
            new_achievements := new_achievements || jsonb_build_object(
                'id', achievement.id,
                'title', achievement.title,
                'description', achievement.description,
                'icon', achievement.icon,
                'points', achievement.points,
                'rarity', achievement.rarity
            );
        END IF;
    END LOOP;
    
    RETURN new_achievements;
END;
$ LANGUAGE plpgsql;

-- Create sample anonymous user (optional)
DO $
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE username = 'anonymous') THEN
        INSERT INTO users (username, email, is_anonymous, preferences)
        VALUES ('anonymous', NULL, true, '{}'::jsonb);
    END IF;
END $; TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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
    created_at