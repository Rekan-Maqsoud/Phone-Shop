#!/bin/bash

# Script to count lines of code in the project
# Excludes node_modules, .git, dist, build directories and common generated files

echo "=== Phone Shop Project - Lines of Code Count ==="
echo "Date: $(date)"
echo ""

# Count lines in different file types
echo "📱 JavaScript/TypeScript Files:"
find . -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.cjs" -o -name "*.mjs" | \
  grep -v node_modules | grep -v .git | grep -v dist | grep -v build | grep -v .next | \
  xargs wc -l | tail -n 1

echo ""
echo "🎨 CSS/Style Files:"
find . -name "*.css" -o -name "*.scss" -o -name "*.sass" -o -name "*.less" | \
  grep -v node_modules | grep -v .git | grep -v dist | grep -v build | \
  xargs wc -l | tail -n 1

echo ""
echo "📄 HTML/Template Files:"
find . -name "*.html" -o -name "*.htm" -o -name "*.vue" | \
  grep -v node_modules | grep -v .git | grep -v dist | grep -v build | \
  xargs wc -l | tail -n 1

echo ""
echo "📋 Configuration Files:"
find . -name "*.json" -o -name "*.yml" -o -name "*.yaml" -o -name "*.toml" -o -name "*.xml" | \
  grep -v node_modules | grep -v .git | grep -v dist | grep -v build | grep -v package-lock.json | \
  xargs wc -l | tail -n 1

echo ""
echo "📝 Documentation Files:"
find . -name "*.md" -o -name "*.txt" -o -name "*.rst" | \
  grep -v node_modules | grep -v .git | \
  xargs wc -l | tail -n 1

echo ""
echo "🔧 SQL/Database Files:"
find . -name "*.sql" -o -name "*.sqlite" -o -name "*.db" | \
  grep -v node_modules | grep -v .git | \
  xargs wc -l 2>/dev/null | tail -n 1

echo ""
echo "📊 TOTAL PROJECT LINES (excluding node_modules, .git, and build files):"
find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.cjs" -o -name "*.mjs" \
  -o -name "*.css" -o -name "*.scss" -o -name "*.sass" -o -name "*.less" \
  -o -name "*.html" -o -name "*.htm" -o -name "*.vue" \
  -o -name "*.json" -o -name "*.yml" -o -name "*.yaml" -o -name "*.toml" -o -name "*.xml" \
  -o -name "*.md" -o -name "*.txt" -o -name "*.rst" \
  -o -name "*.sql" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/build/*" ! -path "*/.next/*" \
  ! -name "package-lock.json" ! -name "yarn.lock" ! -name "pnpm-lock.yaml" \
  ! -name "*.min.js" ! -name "*.min.css" \
  | xargs wc -l | tail -n 1

echo ""
echo "💾 Most significant files by line count:"
find . -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.cjs" -o -name "*.mjs" \) \
  ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" ! -path "*/build/*" \
  | xargs wc -l | sort -nr | head -10

echo ""
echo "🗂️  Directory breakdown:"
echo "Source files (src/):"
find ./src -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" -o -name "*.css" \) 2>/dev/null | xargs wc -l 2>/dev/null | tail -n 1

echo "Database files (database/):"
find ./database -type f \( -name "*.js" -o -name "*.cjs" -o -name "*.sql" \) 2>/dev/null | xargs wc -l 2>/dev/null | tail -n 1

echo "Configuration files:"
find . -maxdepth 1 -name "*.json" -o -name "*.js" -o -name "*.cjs" -o -name "*.config.*" | xargs wc -l 2>/dev/null | tail -n 1

echo ""
echo "✅ Count completed! Use this script anytime with: ./count-lines.sh"
