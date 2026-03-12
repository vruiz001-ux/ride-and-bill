#!/bin/sh
# Push to GitHub and deploy to Netlify
set -e
echo "📦 Pushing to GitHub..."
git push
echo "🚀 Building & deploying to Netlify..."
npx netlify-cli deploy --build --prod --message "Deploy: $(git log -1 --format=%s)"
echo "✅ Done! Live at https://ride-and-bill.netlify.app"
