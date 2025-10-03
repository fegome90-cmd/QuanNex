#!/bin/bash
# QuanNex Report Publisher
# Validates and publishes reports with automatic quality checks

set -euo pipefail

if [ $# -eq 0 ]; then
    echo "Usage: $0 <report.md> [options]"
    echo ""
    echo "Options:"
    echo "  --skip-validation    Skip QuanNex validation"
    echo "  --auto-commit        Automatically commit if validation passes"
    echo "  --push               Push to remote after commit"
    echo ""
    echo "Examples:"
    echo "  $0 reports/my-report.md"
    echo "  $0 reports/my-report.md --auto-commit --push"
    exit 1
fi

REPORT_FILE="$1"
SKIP_VALIDATION=false
AUTO_COMMIT=false
PUSH=false

# Parse options
shift
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-validation)
            SKIP_VALIDATION=true
            shift
            ;;
        --auto-commit)
            AUTO_COMMIT=true
            shift
            ;;
        --push)
            PUSH=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "📄 Publishing report: $REPORT_FILE"
echo ""

# Step 1: Validate with QuanNex
if [ "$SKIP_VALIDATION" = false ]; then
    echo "🔍 Step 1: QuanNex validation..."
    if ! ./bin/quannex-review.sh "$REPORT_FILE"; then
        echo ""
        echo "❌ Validation failed. Report not published."
        echo "💡 Fix the issues above and try again."
        exit 1
    fi
    echo "✅ Validation passed!"
else
    echo "⏭️  Step 1: Skipping validation"
fi

# Step 2: Generate report artifacts
echo ""
echo "📊 Step 2: Generating report artifacts..."
REPORT_DIR=".reports/published"
mkdir -p "$REPORT_DIR"

REPORT_NAME=$(basename "$REPORT_FILE" .md)
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")

# Copy report to published directory
cp "$REPORT_FILE" "$REPORT_DIR/${REPORT_NAME}-${TIMESTAMP}.md"

# Generate QuanNex validation report
QUANNEX_JSON=1 ./bin/quannex-review.sh "$REPORT_FILE" > "$REPORT_DIR/${REPORT_NAME}-${TIMESTAMP}-validation.json"

echo "✅ Artifacts generated in $REPORT_DIR/"

# Step 3: Auto-commit if requested
if [ "$AUTO_COMMIT" = true ]; then
    echo ""
    echo "📝 Step 3: Auto-committing..."
    
    git add "$REPORT_FILE"
    git add "$REPORT_DIR/${REPORT_NAME}-${TIMESTAMP}.md"
    git add "$REPORT_DIR/${REPORT_NAME}-${TIMESTAMP}-validation.json"
    
    git commit -m "📊 Publish report: $REPORT_NAME

- Report: $REPORT_FILE
- Validation: Passed QuanNex quality gates
- Artifacts: Generated in $REPORT_DIR/
- Timestamp: $TIMESTAMP"
    
    echo "✅ Report committed successfully"
    
    # Step 4: Push if requested
    if [ "$PUSH" = true ]; then
        echo ""
        echo "🚀 Step 4: Pushing to remote..."
        git push
        echo "✅ Report pushed to remote"
    fi
fi

echo ""
echo "🎉 Report published successfully!"
echo "📁 Location: $REPORT_DIR/${REPORT_NAME}-${TIMESTAMP}.md"
echo "📊 Validation: $REPORT_DIR/${REPORT_NAME}-${TIMESTAMP}-validation.json"
