#!/bin/bash

# Pubky MCP Server - Fetch Public Resources
# This script downloads all required resources from public URLs

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DATA_DIR="$SCRIPT_DIR/../data"

echo "🚀 Fetching public Pubky resources..."
echo ""

# Create data directories
mkdir -p "$DATA_DIR/pubky-core"
mkdir -p "$DATA_DIR/pubky-app-specs"

# 1. Fetch Nexus Web API OpenAPI spec
echo "📡 Fetching Nexus Web API specification..."
curl -fsSL https://nexus.pubky.app/api-docs/v0/openapi.json -o "$DATA_DIR/nexus-webapi.json"
echo "✅ Nexus API spec downloaded"
echo ""

# 2. Clone pubky-core (docs and examples only)
echo "📚 Fetching pubky-core documentation and examples..."
if [ -d "$DATA_DIR/pubky-core/.git" ]; then
    echo "   Updating existing pubky-core..."
    cd "$DATA_DIR/pubky-core"
    git pull origin main --depth 1
    cd - > /dev/null
else
    echo "   Cloning pubky-core..."
    git clone --depth 1 --filter=blob:none --sparse https://github.com/pubky/pubky-core.git "$DATA_DIR/pubky-core"
    cd "$DATA_DIR/pubky-core"
    git sparse-checkout set docs examples
    cd - > /dev/null
fi
echo "✅ pubky-core resources downloaded"
echo ""

# 3. Clone pubky-app-specs
echo "📋 Fetching pubky-app-specs..."
if [ -d "$DATA_DIR/pubky-app-specs/.git" ]; then
    echo "   Updating existing pubky-app-specs..."
    cd "$DATA_DIR/pubky-app-specs"
    git pull origin main --depth 1
    cd - > /dev/null
else
    echo "   Cloning pubky-app-specs..."
    git clone --depth 1 https://github.com/pubky/pubky-app-specs.git "$DATA_DIR/pubky-app-specs"
fi
echo "✅ pubky-app-specs downloaded"
echo ""

# 4. Verify all files are present
echo "🔍 Verifying downloaded resources..."

if [ ! -f "$DATA_DIR/nexus-webapi.json" ]; then
    echo "❌ Error: nexus-webapi.json not found"
    exit 1
fi

if [ ! -d "$DATA_DIR/pubky-core/docs" ]; then
    echo "❌ Error: pubky-core/docs not found"
    exit 1
fi

if [ ! -d "$DATA_DIR/pubky-core/examples" ]; then
    echo "❌ Error: pubky-core/examples not found"
    exit 1
fi

if [ ! -d "$DATA_DIR/pubky-app-specs/src" ]; then
    echo "❌ Error: pubky-app-specs/src not found"
    exit 1
fi

if [ ! -f "$DATA_DIR/pubky-app-specs/README.md" ]; then
    echo "❌ Error: pubky-app-specs/README.md not found"
    exit 1
fi

echo "✅ All resources verified"
echo ""

# 5. Show summary
echo "📊 Resource Summary:"
echo "   • Nexus API: $(wc -c < "$DATA_DIR/nexus-webapi.json" | xargs) bytes"
echo "   • pubky-core docs: $(find "$DATA_DIR/pubky-core/docs" -type f | wc -l | xargs) files"
echo "   • pubky-core examples: $(find "$DATA_DIR/pubky-core/examples" -type f | wc -l | xargs) files"
echo "   • pubky-app-specs models: $(find "$DATA_DIR/pubky-app-specs/src/models" -name "*.rs" 2>/dev/null | wc -l | xargs) models"
echo ""

echo "🎉 All resources fetched successfully!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run build"
echo "  2. Test: node dist/index.js"
echo "  3. Publish: npm publish"

