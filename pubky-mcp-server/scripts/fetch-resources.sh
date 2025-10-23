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
mkdir -p "$DATA_DIR/pkarr"
mkdir -p "$DATA_DIR/pkdns"
mkdir -p "$DATA_DIR/pubky-nexus"

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

# 4. Clone pkarr
echo "🔍 Fetching pkarr..."
if [ -d "$DATA_DIR/pkarr/.git" ]; then
    echo "   Updating existing pkarr..."
    cd "$DATA_DIR/pkarr"
    git pull origin main --depth 1
    cd - > /dev/null
else
    echo "   Cloning pkarr..."
    git clone --depth 1 --filter=blob:none --sparse https://github.com/pubky/pkarr.git "$DATA_DIR/pkarr"
    cd "$DATA_DIR/pkarr"
    git sparse-checkout set design pkarr bindings relay
    cd - > /dev/null
fi
echo "✅ pkarr downloaded"
echo ""

# 5. Clone pkdns
echo "🌐 Fetching pkdns (DNS resolver)..."
if [ -d "$DATA_DIR/pkdns/.git" ]; then
    echo "   Updating existing pkdns..."
    cd "$DATA_DIR/pkdns"
    git pull origin master --depth 1
    cd - > /dev/null
else
    echo "   Cloning pkdns..."
    git clone --depth 1 --filter=blob:none --sparse --branch master https://github.com/pubky/pkdns.git "$DATA_DIR/pkdns"
    cd "$DATA_DIR/pkdns"
    git sparse-checkout set docs cli server
    cd - > /dev/null
fi
echo "✅ pkdns downloaded"
echo ""

# 6. Clone pubky-nexus
echo "📡 Fetching pubky-nexus (social indexer)..."
if [ -d "$DATA_DIR/pubky-nexus/.git" ]; then
    echo "   Updating existing pubky-nexus..."
    cd "$DATA_DIR/pubky-nexus"
    git pull origin main --depth 1
    cd - > /dev/null
else
    echo "   Cloning pubky-nexus..."
    git clone --depth 1 --filter=blob:none --sparse https://github.com/pubky/pubky-nexus.git "$DATA_DIR/pubky-nexus"
    cd "$DATA_DIR/pubky-nexus"
    git sparse-checkout set docs examples nexus-common nexus-watcher nexus-webapi
    cd - > /dev/null
fi
echo "✅ pubky-nexus downloaded"
echo ""

# 7. Verify all files are present
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

if [ ! -f "$DATA_DIR/pkarr/README.md" ]; then
    echo "❌ Error: pkarr/README.md not found"
    exit 1
fi

if [ ! -d "$DATA_DIR/pkarr/design" ]; then
    echo "❌ Error: pkarr/design not found"
    exit 1
fi

if [ ! -f "$DATA_DIR/pkdns/README.md" ]; then
    echo "❌ Error: pkdns/README.md not found"
    exit 1
fi

if [ ! -d "$DATA_DIR/pkdns/docs" ]; then
    echo "❌ Error: pkdns/docs not found"
    exit 1
fi

if [ ! -f "$DATA_DIR/pubky-nexus/README.md" ]; then
    echo "❌ Error: pubky-nexus/README.md not found"
    exit 1
fi

if [ ! -d "$DATA_DIR/pubky-nexus/docs" ]; then
    echo "❌ Error: pubky-nexus/docs not found"
    exit 1
fi

echo "✅ All resources verified"
echo ""

# 8. Show summary
echo "📊 Resource Summary:"
echo "   • Nexus API spec: $(wc -c < "$DATA_DIR/nexus-webapi.json" | xargs) bytes"
echo "   • pubky-core docs: $(find "$DATA_DIR/pubky-core/docs" -type f | wc -l | xargs) files"
echo "   • pubky-core examples: $(find "$DATA_DIR/pubky-core/examples" -type f | wc -l | xargs) files"
echo "   • pubky-app-specs models: $(find "$DATA_DIR/pubky-app-specs/src/models" -name "*.rs" 2>/dev/null | wc -l | xargs) models"
echo "   • pkarr design docs: $(find "$DATA_DIR/pkarr/design" -name "*.md" 2>/dev/null | wc -l | xargs) files"
echo "   • pkarr examples: $(find "$DATA_DIR/pkarr/pkarr/examples" -name "*.rs" 2>/dev/null | wc -l | xargs) files"
echo "   • pkdns docs: $(find "$DATA_DIR/pkdns/docs" -name "*.md" 2>/dev/null | wc -l | xargs) files"
echo "   • pubky-nexus docs: $(find "$DATA_DIR/pubky-nexus/docs" -name "*.md" 2>/dev/null | wc -l | xargs) files"
echo "   • pubky-nexus examples: $(find "$DATA_DIR/pubky-nexus/examples" -type f -name "*.rs" 2>/dev/null | wc -l | xargs) files"
echo ""

echo "🎉 All resources fetched successfully!"
echo ""
echo "Next steps:"
echo "  1. Run: npm run build"
echo "  2. Test: node dist/index.js"
echo "  3. Publish: npm publish"

