#!/usr/bin/env bash

# SpendGuard — Quick Start Guide (5 minutes)

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 SpendGuard — Quick Start${NC}"
echo "================================"
echo ""

# Check prerequisites
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
  echo -e "${RED}✗ Docker not found. Please install Docker.${NC}"
  exit 1
fi

if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js not found. Please install Node.js 18+.${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Docker and Node.js found${NC}"
echo ""

# Step 1: Start infrastructure
echo -e "${YELLOW}⏱️  Step 1/4: Starting Docker services...${NC}"
cd "$(dirname "$0")"
docker compose up -d
echo -e "${GREEN}✓ Services started (PostgreSQL, Redis)${NC}"
sleep 3
echo ""

# Step 2: Install dependencies
echo -e "${YELLOW}⏱️  Step 2/4: Installing dependencies...${NC}"
npm install --legacy-peer-deps > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"
echo ""

# Step 3: Database setup
echo -e "${YELLOW}⏱️  Step 3/4: Setting up database...${NC}"
npx prisma migrate deploy --skip-generate > /dev/null 2>&1
echo -e "${GREEN}✓ Database ready${NC}"
echo ""

# Step 4: Seed demo data
echo -e "${YELLOW}⏱️  Step 4/4: Seeding demo data...${NC}"
npx ts-node scripts/seed-demo.ts > /dev/null 2>&1
echo -e "${GREEN}✓ Demo data loaded${NC}"
echo ""

# Summary
echo -e "${GREEN}✅ SpendGuard is ready!${NC}"
echo ""
echo -e "${BLUE}📝 Next steps:${NC}"
echo "  1. Start dev server:"
echo -e "     ${YELLOW}npm run dev${NC}"
echo ""
echo "  2. Open browser:"
echo -e "     ${YELLOW}http://localhost:3000${NC}"
echo ""
echo "  3. Test API:"
echo -e "     ${YELLOW}curl http://localhost:3000/api/health${NC}"
echo ""
echo -e "${BLUE}📚 Documentation:${NC}"
echo "  - README.md - Full documentation"
echo "  - PHASE5_SUMMARY.md - What's implemented"
echo "  - IMPLEMENTATION.md - Technical details"
echo ""
echo -e "${BLUE}🐳 Docker services:${NC}"
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo ""
echo -e "${BLUE}🔗 API Endpoints:${NC}"
echo "  - POST   /api/policies/compile - Compile natural language policy"
echo "  - POST   /api/transactions/evaluate - Evaluate a transaction"
echo "  - GET    /api/policies - List policies"
echo "  - GET    /api/health - Health check"
echo ""
echo -e "${BLUE}💡 Try this:${NC}"
echo ""
echo "Compile a policy:"
echo -e "${YELLOW}curl -X POST http://localhost:3000/api/policies/compile \\${NC}"
echo -e "${YELLOW}  -H 'Content-Type: application/json' \\${NC}"
echo -e "${YELLOW}  -d '{${NC}"
echo -e "${YELLOW}    \"naturalLanguage\": \"My agent can spend ₹2,000 per day on groceries. Block gaming. Approve amounts over ₹500.\"${NC}"
echo -e "${YELLOW}  }'${NC}"
echo ""
echo "Then evaluate a transaction using the policy ID from above:"
echo -e "${YELLOW}curl -X POST http://localhost:3000/api/transactions/evaluate \\${NC}"
echo -e "${YELLOW}  -H 'Content-Type: application/json' \\${NC}"
echo -e "${YELLOW}  -d '{${NC}"
echo -e "${YELLOW}    \"policyId\": \"<policy-id-from-above>\",${NC}"
echo -e "${YELLOW}    \"amount\": 350,${NC}"
echo -e "${YELLOW}    \"merchant\": \"Grocery Mart\",${NC}"
echo -e "${YELLOW}    \"category\": \"Groceries\",${NC}"
echo -e "${YELLOW}    \"agentId\": \"agent_001\"${NC}"
echo -e "${YELLOW}  }'${NC}"
echo ""
echo -e "${GREEN}Happy coding! 🎉${NC}"
