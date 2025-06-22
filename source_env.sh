#!/bin/bash
# Source this script to load environment variables
export SUPABASE_URL="https://bmciszynbqnkilsbxguh.supabase.co"
export SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJtY2lzenluYnFua2lsc2J4Z3VoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA1NDk3NTAsImV4cCI6MjA2NjEyNTc1MH0.Pd9rz2RUGryTAZfv-qcnwKCzKIWKBGWWpGyYzE-42_I"
export USE_DATABASE=true
export SECRET_KEY="dev-secret-key-change-in-production"
export FLASK_ENV=development
export FLASK_DEBUG=1
export PORT=5001

echo "✅ TypeTutor environment variables loaded"
echo "   SUPABASE_URL: ${SUPABASE_URL:0:50}..."
echo "   USE_DATABASE: $USE_DATABASE"
echo "   PORT: $PORT"
