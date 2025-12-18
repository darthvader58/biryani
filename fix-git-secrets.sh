#!/bin/bash

# Script to remove sensitive files from Git history
# WARNING: This will rewrite Git history!

echo "🔒 Git Secrets Cleanup Script"
echo "=============================="
echo ""
echo "⚠️  WARNING: This will rewrite your Git history!"
echo "⚠️  Make sure you have a backup before proceeding."
echo ""
read -p "Do you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 0
fi

echo ""
echo "📋 Step 1: Removing .env files from Git cache..."
git rm --cached .env 2>/dev/null || echo ".env not in cache"
git rm --cached backend/.env 2>/dev/null || echo "backend/.env not in cache"

echo ""
echo "📋 Step 2: Committing .gitignore changes..."
git add .gitignore
git commit -m "chore: add .env files to .gitignore for security"

echo ""
echo "📋 Step 3: Removing .env files from Git history..."
echo "This may take a few minutes..."

# Use git filter-branch to remove files from history
git filter-branch --force --index-filter \
  'git rm --cached --ignore-unmatch .env backend/.env' \
  --prune-empty --tag-name-filter cat -- --all

echo ""
echo "📋 Step 4: Cleaning up..."
rm -rf .git/refs/original/
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "✅ Git history cleaned!"
echo ""
echo "🚨 CRITICAL NEXT STEPS:"
echo "=============================="
echo ""
echo "1. IMMEDIATELY ROTATE ALL EXPOSED SECRETS:"
echo "   ❌ OpenAI API Key: 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"
echo "      → Go to: https://platform.openai.com/api-keys"
echo "      → Delete the old key and create a new one"
echo ""
echo "   ❌ Database Password: 0YSXsWrxlVlHeYs-SesRiA"
echo "      → Go to CockroachDB console"
echo "      → Reset the database password"
echo ""
echo "   ❌ Wolfram App ID: E8V372833V"
echo "      → Go to: https://developer.wolframalpha.com/portal/myapps/"
echo "      → Regenerate or create a new App ID"
echo ""
echo "   ❌ Google OAuth Client ID: 617340841658-e7qdbj280euvdt0pas95sqrjh0q5qmfp.apps.googleusercontent.com"
echo "      → Go to: https://console.cloud.google.com/apis/credentials"
echo "      → Create a new OAuth 2.0 Client ID"
echo ""
echo "2. Force push to remote (if already pushed):"
echo "   git push origin --force --all"
echo "   git push origin --force --tags"
echo ""
echo "3. Update your local .env files with NEW credentials"
echo ""
echo "4. Never commit .env files again!"
echo ""
echo "⚠️  Anyone who has cloned your repo may still have the old secrets!"
echo "⚠️  That's why rotating the secrets is CRITICAL!"
echo ""