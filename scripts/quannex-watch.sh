#!/bin/bash
# QuanNex Watch Mode
# Monitors markdown files and validates them automatically

set -euo pipefail

WATCH_DIR="${1:-reports/}"
INTERVAL="${2:-5}"

echo "👀 QuanNex Watch Mode"
echo "📁 Watching directory: $WATCH_DIR"
echo "⏱️  Check interval: ${INTERVAL}s"
echo ""

# Function to validate all markdown files
validate_all() {
    local files
    files=$(find "$WATCH_DIR" -name "*.md" -type f 2>/dev/null || true)
    
    if [ -z "$files" ]; then
        echo "📭 No markdown files found in $WATCH_DIR"
        return 0
    fi
    
    echo "🔍 Validating $(echo "$files" | wc -l) markdown files..."
    
    local failed=0
    while IFS= read -r file; do
        echo ""
        echo "Validating: $file"
        if ! ./bin/quannex-review.sh "$file" >/dev/null 2>&1; then
            echo "❌ FAILED: $file"
            failed=$((failed + 1))
        else
            echo "✅ PASSED: $file"
        fi
    done <<< "$files"
    
    if [ $failed -eq 0 ]; then
        echo ""
        echo "🎉 All reports passed validation!"
    else
        echo ""
        echo "⚠️  $failed report(s) failed validation"
    fi
}

# Initial validation
validate_all

echo ""
echo "🔄 Starting watch mode... (Press Ctrl+C to stop)"

# Watch loop
while true; do
    sleep "$INTERVAL"
    
    # Check for new or modified files
    if find "$WATCH_DIR" -name "*.md" -newer /tmp/quannex-watch-timestamp 2>/dev/null | grep -q .; then
        echo ""
        echo "📝 Changes detected, re-validating..."
        validate_all
        touch /tmp/quannex-watch-timestamp
    fi
done
