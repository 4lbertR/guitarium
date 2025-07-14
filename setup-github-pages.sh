#!/bin/bash

# GitHub Pages Setup Script for Guitarium
# This script creates the gh-pages branch and sets up the GitHub Pages site

echo "🎸 Setting up GitHub Pages for Guitarium..."

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository"
    exit 1
fi

# Create and switch to gh-pages branch (orphan branch)
echo "📄 Creating gh-pages branch..."
git checkout --orphan gh-pages

# Remove all files from the new branch
echo "🧹 Cleaning up branch..."
git rm -rf . 2>/dev/null || true

# Copy the GitHub Pages index.html file
echo "📝 Adding GitHub Pages content..."
cp gh-pages-index.html index.html

# Add and commit the new content
git add index.html
git commit -m "Add GitHub Pages site with information about Guitarium project"

echo "✅ GitHub Pages setup complete!"
echo ""
echo "Next steps:"
echo "1. Push the gh-pages branch: git push origin gh-pages"
echo "2. Go to your repository settings on GitHub"
echo "3. Navigate to the Pages section"
echo "4. Select 'gh-pages' branch as the source"
echo "5. Your site will be available at: https://4lbertr.github.io/guitarium/"
echo ""
echo "🚀 Your GitHub Pages site is ready!"