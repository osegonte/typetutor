#!/bin/bash
cd /Users/osegonte/typetutor

echo "🔧 Fixing Nixpacks Configuration..."

# Fix: Add explicit pip package
cat > backend/nixpacks.toml << 'EOF2'
[phases.setup]
nixPkgs = ['python310', 'python310Packages.pip']

[phases.install]
cmds = ['python -m pip install --upgrade pip', 'pip install -r requirements.txt']

[start]
cmd = 'gunicorn --bind 0.0.0.0:$PORT app:app --timeout 120 --worker-class sync --workers 2'
EOF2

echo "✅ Fixed nixpacks.toml with explicit pip package"
echo "📄 New config:"
cat backend/nixpacks.toml

git add backend/nixpacks.toml
git commit -m "Fix nixpacks - add explicit pip package for Railway"
git push origin main

echo "✅ Pushed! Wait 3-5 minutes then test."
