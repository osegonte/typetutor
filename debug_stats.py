#!/usr/bin/env python3
"""
TypeTutor Stats Debug Script
Test the stats service and diagnose duration issues
"""

import json
import os
import sys
from datetime import datetime
import tempfile

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

try:
    from services.stats_service import StatsService
    from utils.validators import validate_stats_data, create_validation_report
    BACKEND_AVAILABLE = True
except ImportError as e:
    print(f"⚠️  Backend modules not available: {e}")
    BACKEND_AVAILABLE = False

def print_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_section(title):
    print(f"\n--- {title} ---")

def test_duration_formatting():
    """Test duration formatting with various inputs"""
    print_section("Testing Duration Formatting")
    
    test_cases = [
        (0, "0m 1s"),          # Edge case: 0 seconds
        (0.5, "0m 1s"),        # Less than 1 second
        (1, "0m 1s"),          # Exactly 1 second
        (30, "0m 30s"),        # 30 seconds
        (60, "1m 0s"),         # 1 minute
        (90, "1m 30s"),        # 1.5 minutes
        (180.7, "3m 0s"),      # 3 minutes with decimals
        (3661, "61m 1s"),      # Over 1 hour
    ]
    
    def format_duration(seconds):
        if seconds <= 0:
            return "0m 1s"
        minutes = int(seconds // 60)
        secs = int(seconds % 60)
        if minutes == 0 and secs == 0:
            return "0m 1s"
        return f"{minutes}m {secs}s"
    
    for duration, expected in test_cases:
        result = format_duration(duration)
        status = "✅" if result == expected else "❌"
        print(f"{status} {duration}s -> '{result}' (expected: '{expected}')")

def test_stats_service():
    """Test the stats service with various session data"""
    if not BACKEND_AVAILABLE:
        print("❌ Backend not available, skipping stats service tests")
        return
    
    print_section("Testing Stats Service")
    
    # Create temporary stats file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
        temp_stats_file = f.name
    
    try:
        stats_service = StatsService(temp_stats_file)
        
        # Test cases with different duration values
        test_sessions = [
            {
                "name": "Normal Session",
                "data": {
                    "wpm": 45,
                    "accuracy": 92,
                    "duration": 180.5,  # 3 minutes
                    "itemType": "Custom Text",
                    "totalCharacters": 250,
                    "timestamp": datetime.now().isoformat()
                }
            },
            {
                "name": "Zero Duration (PROBLEM CASE)",
                "data": {
                    "wpm": 35,
                    "accuracy": 88,
                    "duration": 0,  # This causes "0m 0s"
                    "itemType": "PDF Practice",
                    "totalCharacters": 200
                }
            },
            {
                "name": "Very Short Duration",
                "data": {
                    "wpm": 25,
                    "accuracy": 85,
                    "duration": 0.5,  # Half second
                    "itemType": "Practice"
                }
            },
            {
                "name": "Null/Missing Duration",
                "data": {
                    "wpm": 30,
                    "accuracy": 90,
                    # duration missing
                    "itemType": "Test"
                }
            }
        ]
        
        for i, test_case in enumerate(test_sessions, 1):
            print(f"\n🧪 Test {i}: {test_case['name']}")
            
            # Validate data first
            validation = validate_stats_data(test_case['data'])
            print(f"Validation: {'✅ PASS' if validation['valid'] else '❌ FAIL'}")
            
            if validation['errors']:
                print(f"Errors: {', '.join(validation['errors'])}")
            if validation['warnings']:
                print(f"Warnings: {', '.join(validation['warnings'])}")
            
            # Try to save session
            try:
                result = stats_service.save_session(test_case['data'])
                if result['success']:
                    print("✅ Session saved successfully")
                    recent = result['updated_stats']['recentSessions'][0]
                    print(f"   Duration: {recent['duration']}")
                    print(f"   WPM: {recent['wpm']}")
                    print(f"   Date: {recent['date']}")
                else:
                    print(f"❌ Session save failed: {result.get('message', 'Unknown error')}")
            except Exception as e:
                print(f"❌ Exception during save: {e}")
        
        # Show final stats
        print_section("Final Stats Summary")
        final_stats = stats_service.get_stats()
        recent_sessions = final_stats.get('recentSessions', [])
        
        print(f"Total sessions: {final_stats.get('totalSessions', 0)}")
        print(f"Average WPM: {final_stats.get('averageWpm', 0)}")
        print(f"Recent sessions count: {len(recent_sessions)}")
        
        if recent_sessions:
            print("\nRecent Sessions:")
            for i, session in enumerate(recent_sessions[:3], 1):
                print(f"  {i}. {session.get('date', 'Unknown')} - "
                      f"{session.get('duration', 'No duration')} - "
                      f"{session.get('wpm', 0)} WPM - "
                      f"{session.get('accuracy', 0)}% - "
                      f"{session.get('mode', 'Unknown mode')}")
    
    finally:
        # Clean up temp file
        try:
            os.unlink(temp_stats_file)
        except OSError:
            pass

def simulate_frontend_issues():
    """Simulate common frontend timing issues"""
    print_section("Simulating Frontend Issues")
    
    frontend_scenarios = [
        {
            "name": "Timer never started",
            "description": "startTime is null, duration becomes 0",
            "data": {"wpm": 40, "accuracy": 90, "duration": 0}
        },
        {
            "name": "Timer reset mid-session", 
            "description": "Timer gets reset, very short duration",
            "data": {"wpm": 45, "accuracy": 85, "duration": 0.1}
        },
        {
            "name": "Calculation error",
            "description": "endTime - startTime = NaN becomes 0",
            "data": {"wpm": 50, "accuracy": 95, "duration": float('nan')}
        },
        {
            "name": "String duration",
            "description": "Duration passed as string",
            "data": {"wpm": 35, "accuracy": 88, "duration": "0"}
        },
        {
            "name": "Negative duration",
            "description": "endTime < startTime somehow",
            "data": {"wpm": 42, "accuracy": 92, "duration": -5}
        }
    ]
    
    for scenario in frontend_scenarios:
        print(f"\n🔍 Scenario: {scenario['name']}")
        print(f"   {scenario['description']}")
        
        validation = validate_stats_data(scenario['data'])
        print(f"   Validation: {'✅ PASS' if validation['valid'] else '❌ FAIL'}")
        
        if validation['errors']:
            print(f"   Errors: {validation['errors']}")
        if validation['warnings']:
            print(f"   Warnings: {validation['warnings']}")
        
        # Show what the fixed duration formatting would produce
        duration = scenario['data'].get('duration', 0)
        try:
            dur_float = float(duration)
            if dur_float <= 0:
                formatted = "0m 1s"  # Fixed minimum
            else:
                minutes = int(dur_float // 60)
                seconds = int(dur_float % 60)
                formatted = f"{minutes}m {seconds}s"
            print(f"   Fixed duration display: '{formatted}'")
        except (ValueError, TypeError):
            print(f"   Duration not convertible: {duration} ({type(duration)})")

def generate_validation_reports():
    """Generate detailed validation reports for debugging"""
    print_section("Detailed Validation Reports")
    
    test_data_sets = [
        {
            "name": "Good Data",
            "data": {
                "wpm": 45,
                "accuracy": 92, 
                "duration": 180,
                "timestamp": "2025-06-20T14:30:00Z",
                "itemType": "Custom Text",
                "totalCharacters": 900
            }
        },
        {
            "name": "Problem Data (Zero Duration)",
            "data": {
                "wpm": 0,
                "accuracy": 0,
                "duration": 0,
                "itemType": "",
                "totalCharacters": 0
            }
        },
        {
            "name": "Partial Data",
            "data": {
                "wpm": 35,
                "accuracy": 88
                # missing duration, timestamp, etc.
            }
        }
    ]
    
    for dataset in test_data_sets:
        print(f"\n📋 Report for: {dataset['name']}")
        report = create_validation_report(dataset['data'])
        print(report)

def check_existing_stats():
    """Check existing stats file if it exists"""
    print_section("Checking Existing Stats File")
    
    stats_file_path = 'data/user_stats.json'
    if os.path.exists(stats_file_path):
        try:
            with open(stats_file_path, 'r') as f:
                stats = json.load(f)
            
            print(f"✅ Stats file found: {stats_file_path}")
            print(f"📊 Total sessions: {stats.get('totalSessions', 0)}")
            print(f"📊 Average WPM: {stats.get('averageWpm', 0)}")
            print(f"📊 Current streak: {stats.get('currentStreak', 0)}")
            
            recent_sessions = stats.get('recentSessions', [])
            print(f"📊 Recent sessions: {len(recent_sessions)}")
            
            if recent_sessions:
                print("\n🕒 Recent Session Details:")
                for i, session in enumerate(recent_sessions[:5], 1):
                    duration = session.get('duration', 'Unknown')
                    wpm = session.get('wpm', 0)
                    date = session.get('date', 'Unknown')
                    mode = session.get('mode', 'Unknown')
                    
                    # Check for the "0m 0s" problem
                    problem_indicator = "🚨" if duration == "0m 0s" else "✅"
                    
                    print(f"   {problem_indicator} {i}. {date} | {duration} | {wpm} WPM | {mode}")
                    
                    # If this is a problem session, show raw data
                    if duration == "0m 0s":
                        print(f"      🔍 Raw session data: {session}")
        
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"❌ Error reading stats file: {e}")
    else:
        print(f"ℹ️  No stats file found at {stats_file_path}")

def main():
    print_header("TypeTutor Stats Service Debug Tool")
    print("This script helps diagnose the 'Recent Sessions' duration and WPM issues.")
    
    # Run all tests
    test_duration_formatting()
    
    if BACKEND_AVAILABLE:
        test_stats_service()
    
    simulate_frontend_issues()
    generate_validation_reports()
    check_existing_stats()
    
    print_header("Summary and Recommendations")
    print("""
🔧 KEY FINDINGS:

1. DURATION ISSUE: If you see "0m 0s" in recent sessions, the frontend is 
   sending duration: 0 to the backend.

2. FRONTEND TIMER: Check these in your React/JavaScript code:
   - startTime initialization
   - endTime calculation  
   - Timer state management
   - Session completion logic

3. BACKEND FIX: The enhanced StatsService now:
   - Validates all input data
   - Sets minimum 1 second for zero duration
   - Logs debug information
   - Handles edge cases gracefully

🚀 NEXT STEPS:

1. Replace your backend/services/stats_service.py with the enhanced version
2. Replace your backend/utils/validators.py with the enhanced version  
3. Check frontend timer logic in PracticeScreen.jsx
4. Look for console errors in browser dev tools
5. Add logging to frontend timer calculations

💡 FRONTEND DEBUG TIP:
Add this to your frontend before calling saveStats():
console.log('Duration being sent:', totalTime);
console.log('Start time:', startTime);  
console.log('End time:', endTime);
""")

if __name__ == "__main__":
    main()