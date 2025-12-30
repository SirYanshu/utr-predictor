#!/bin/bash

# Pre-Deployment Checklist for Render
# Run this before deploying to make sure everything is configured

set -e

echo "╔════════════════════════════════════════════╗"
echo "║   Render Deployment Checklist ✅           ║"
echo "╚════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# Check 1: render.yaml exists
echo -n "Checking for render.yaml... "
if [ -f "render.yaml" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Missing!${NC}"
    echo "  → Copy render.yaml to your project root"
    ERRORS=$((ERRORS + 1))
fi

# Check 2: proxy-server.production.js exists
echo -n "Checking for proxy server... "
if [ -f "utr-proxy/proxy-server.production.js" ]; then
    echo -e "${GREEN}✓${NC}"
else
    echo -e "${RED}✗ Missing!${NC}"
    echo "  → Copy proxy-server.production.js to utr-proxy/ directory"
    ERRORS=$((ERRORS + 1))
fi

# Check 3: Proxy uses PORT environment variable
echo -n "Checking proxy PORT configuration... "
if [ -f "utr-proxy/proxy-server.production.js" ]; then
    if grep -q "process.env.PORT" utr-proxy/proxy-server.production.js; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${YELLOW}⚠ Warning${NC}"
        echo "  → Proxy should use process.env.PORT"
        echo "  → Add: const PORT = process.env.PORT || 10000;"
    fi
fi

# Check 4: Angular service configuration
echo -n "Checking Angular proxy configuration... "
if [ -f "src/app/utr-api.service.ts" ]; then
    if grep -q "USE_PROXY = true" src/app/utr-api.service.ts; then
        echo -e "${GREEN}✓${NC}"
        
        # Check if proxy URL needs updating
        if grep -q "localhost" src/app/utr-api.service.ts; then
            echo -e "  ${YELLOW}⚠ Still using localhost${NC}"
            echo "  → After deploying proxy, update PROXY_URL to:"
            echo "     https://utr-proxy.onrender.com/api"
        fi
    else
        echo -e "${RED}✗${NC}"
        echo "  → Set USE_PROXY = true in src/app/utr-api.service.ts"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗ File not found!${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Check 5: Node modules (warn if present)
echo -n "Checking for node_modules... "
if [ -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ Present${NC}"
    echo "  → Consider adding node_modules to .gitignore"
    echo "  → Render will install fresh dependencies"
else
    echo -e "${GREEN}✓ Not in repo${NC}"
fi

# Check 6: Git repository
echo -n "Checking git repository... "
if [ -d ".git" ]; then
    echo -e "${GREEN}✓${NC}"
    
    # Check for uncommitted changes
    if [[ -n $(git status -s) ]]; then
        echo -e "  ${YELLOW}⚠ Uncommitted changes${NC}"
        echo "  → Commit your changes before deploying"
    fi
else
    echo -e "${RED}✗${NC}"
    echo "  → Initialize git: git init"
    ERRORS=$((ERRORS + 1))
fi

# Check 7: package.json has correct scripts
echo -n "Checking package.json scripts... "
if [ -f "package.json" ]; then
    if grep -q '"build":' package.json; then
        echo -e "${GREEN}✓${NC}"
    else
        echo -e "${RED}✗${NC}"
        echo "  → Add build script to package.json"
        ERRORS=$((ERRORS + 1))
    fi
else
    echo -e "${RED}✗${NC}"
    ERRORS=$((ERRORS + 1))
fi

# Summary
echo ""
echo "════════════════════════════════════════════"
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✅ All checks passed!${NC}"
    echo ""
    echo "Ready to deploy! Next steps:"
    echo ""
    echo "1. Push to GitHub:"
    echo "   git add ."
    echo "   git commit -m 'Prepare for Render deployment'"
    echo "   git push"
    echo ""
    echo "2. Go to https://dashboard.render.com"
    echo "3. Click 'New +' → 'Blueprint' (or 'Web Service')"
    echo "4. Connect your GitHub repository"
    echo "5. Render will deploy both services automatically!"
    echo ""
    echo "📖 See RENDER_DEPLOYMENT.md for detailed instructions"
else
    echo -e "${RED}❌ ${ERRORS} issue(s) found${NC}"
    echo ""
    echo "Please fix the issues above before deploying."
fi
echo "════════════════════════════════════════════"
