#!/bin/bash

echo "🔧 Adding new Vercel URL to CORS..."

# Backup
cp app.py app.py.backup-$(date +%s)

# Add the new URL to allowed_origins
sed -i.bak '/typetutor-git-main-osegontes-projects.vercel.app/a\    "https://typetutor-nhvu62hto-osegontes-projects.vercel.app",' app.py

echo "✅ Added new Vercel URL to CORS"

# Show the change
echo "CORS origins now include:"
grep -A 10 "allowed_origins = \[" app.py | head -15

# Commit and push
git add app.py
git commit -m "fix: add new Vercel preview URL to CORS

- Added typetutor-nhvu62hto-osegontes-projects.vercel.app
- Fixes CORS error for current deployment"

git push origin main

echo ""
echo "🚀 Fix pushed! Wait 2 minutes for Railway to redeploy, then test again."
echo ""
echo "Current URL that should work: https://typetutor-nhvu62hto-osegontes-projects.vercel.app"