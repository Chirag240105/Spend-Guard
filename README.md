# SpendGuard — AI Policy & Authorization Layer

**The policy and authorization layer for agentic payments.**

> **AI can decide what to buy. SpendGuard decides whether it's allowed to pay.**

---

## 🎯 Current Status

### ✅ Completed
- **Phase 1**: Repository inspection
- **Phase 2**: Infrastructure setup
  - Docker Compose (PostgreSQL + Redis)
  - Prisma ORM configuration
  - Database schema with Policy, Transaction, Decision, AuditLog models
  - Redis abstraction for spending counters
  - Environment configuration (.env.example)

- **Phase 3**: Core domain implementation
  - Policy schema and validation
  - Transaction types
  - Decision types and deterministic evaluator
  - Spending context management
  - Service layers (Policy, Transaction, Decision, Audit)

### ⏳ In Progress
- Phase 4: Spending Counters (Redis abstraction) — Ready
- Phase 5: AI Policy Compiler — Next
- Phase 6: Dashboard UI
- Phase 7: Payment Adapter
- Phase 8: Unit & Integration Tests
- Phase 9: CI/CD (GitHub Actions)
- Phase 10: Deployment
- Phase 11: Demo Polish

---

## 📋 Prerequisites

- Node.js 18+
- Docker & Docker Compose
- npm or yarn

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Infrastructure
```bash
docker compose up -d
```

This starts:
- PostgreSQL (port 5432)
- Redis (port 6379)

### 3. Set up Database
```bash
npx prisma migrate dev
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the application.

---

## ⚠️ Manual Setup Required

### Anthropic API Key

**Status:** ⚠️ Manual action required

**Why:**
Required for the AI policy compiler to convert natural language policies to structured policies.

**What you need to do:**
1. Get an Anthropic API key from [console.anthropic.com](https://console.anthropic.com)
2. Add it to `.env.local`:
```env
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxxx
```

**Required for:**
- ✅ Local development (with mock fallback)
- ✅ Production demo (for live AI)

**Verification:**
Run the policy compiler endpoint and confirm that natural language policies are compiled successfully.

---

### Razorpay Test Mode Integration

**Status:** ⚠️ Manual action required (optional)

**Why:**
Used for transaction execution and payment processing demonstration in Test Mode.

**What you need to do:**
1. Create a Razorpay account
2. Get your Test Mode API keys
3. Add to `.env.local`:
```env
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxxx
```

**Required for:**
- ❌ Local development (mock provider included)
- ✅ Production demo (if integrating real payments)

**Verification:**
Test payment adapter integration via the transaction API.

---

## 📊 Architecture

```
                         Next.js Frontend
                            │
                    API Routes (Next.js)
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
    Policy Module      Transaction         Decision
                         Module            Module
                           │                 │
                  ┌────────┴──────────┐      │
                  ▼                   ▼      ▼
                Redis             PostgreSQL
            (Spending Counters)  (Source of Truth)
                           
                        Audit Log (DB)
                        
                    Claude API (Phase 5)
```

---

## 📁 Project Structure

```
spend-guard/
├── src/
│   ├── modules/
│   │   ├── policy/          # Policy compilation & validation
│   │   ├── transaction/     # Transaction recording
│   │   ├── decision/        # Decision evaluation & recording
│   │   └── audit/           # Audit logging
│   ├── infrastructure/      # Database & Redis utilities
│   └── lib/                 # Shared utilities
├── app/                     # Next.js App Router
│   ├── api/                 # API routes
│   ├── layout.tsx
│   └── page.tsx
├── prisma/
│   └── schema.prisma        # Database schema
├── docker-compose.yml       # Infrastructure
├── .env.example            # Template variables
└── .env.local              # Local secrets (not committed)
```

---

## � API Endpoints

### Policy Management

#### Compile a Policy
```
POST /api/policies/compile
Content-Type: application/json

{
  "naturalLanguage": "My agent can spend up to ₹2,000 per day on groceries and school supplies. Never spend more than ₹500 at once. Block gaming and entertainment. Anything above ₹500 needs my approval."
}
```

Response:
```json
{
  "success": true,
  "policy": {
    "id": "cluxxxxx",
    "name": "Policy from AI Compiler - 2026-09-01T...",
    "naturalLanguage": "...",
    "compiledPolicy": {
      "name": "...",
      "limits": {
        "perTransaction": 500,
        "daily": 2000
      },
      "categories": {
        "allowed": ["groceries", "school_supplies"],
        "blocked": ["gaming", "entertainment"]
      },
      "approval": {
        "aboveAmount": 500
      }
    },
    "version": 1,
    "active": true,
    "createdAt": "2026-09-01T..."
  },
  "warnings": [],
  "usedMock": false
}
```

#### Get a Policy
```
GET /api/policies/{policyId}
```

#### List All Policies
```
GET /api/policies
```

### Transaction Evaluation

#### Evaluate a Transaction
```
POST /api/transactions/evaluate
Content-Type: application/json

{
  "policyId": "cluxxxxx",
  "amount": 350,
  "merchant": "Grocery Mart",
  "category": "Groceries",
  "agentId": "agent_001",
  "currency": "INR",
  "metadata": {}
}
```

Response:
```json
{
  "success": true,
  "transaction": {
    "transactionId": "txn_xxxxx",
    "decision": "ALLOW",
    "explanation": "Transaction approved by policy rules",
    "reasons": [
      {
        "rule": "Per-transaction limit: ₹500",
        "passed": true,
        "message": "✓ Amount (₹350) within limit"
      },
      {
        "rule": "Daily limit: ₹2000",
        "passed": true,
        "message": "✓ Daily total (₹350) within limit"
      },
      {
        "rule": "Allowed category check",
        "passed": true,
        "message": "✓ Category \"Groceries\" is allowed"
      }
    ],
    "source": "DETERMINISTIC",
    "spendingContext": {
      "dailySpent": 350,
      "weeklySpent": 350,
      "monthlySpent": 350
    },
    "requiresApproval": false
  }
}
```

#### Get Transactions for a Policy
```
GET /api/policies/{policyId}/transactions
```

#### Get Transaction Details
```
GET /api/transactions/{transactionId}
```

### Audit & History

#### Get Policy Audit Log
```
GET /api/policies/{policyId}/audit
```

---

## 📊 Decision Types

### ALLOW
✅ Transaction is explicitly allowed by policy
- All rules pass
- No approval threshold exceeded
- Amount is within all limits

### HOLD
⚠️ Transaction requires human review
- Amount exceeds approval threshold
- Category is unknown/ambiguous
- Spending state could not be verified
- AI reasoning needed

### BLOCK
❌ Transaction is explicitly prohibited
- Category is in blocked list
- Exceeds hard limits
- Merchant is blocked
- Violates time window

---

## 🧠 AI Policy Compiler

### How It Works

1. **Input**: Natural language policy description
2. **Processing**: Claude (or mock) interprets the text
3. **Validation**: Zod validates the structured output
4. **Conflict Detection**: Checks for contradictions
5. **Persistence**: Saves to PostgreSQL
6. **Output**: Structured policy with metadata

### Fallback Strategy

If Anthropic API key is not configured:
- System automatically uses **mock provider**
- Mock provider uses keyword extraction
- Works for demo/testing without Claude
- Graceful degradation

### Supported Policy Constraints

```
Limits:
  - Per Transaction: "₹500 at once"
  - Daily: "₹2,000 per day"
  - Weekly: "₹10,000 per week"
  - Monthly: "₹50,000 per month"

Categories:
  - Allowed: "groceries, education, pharmacy"
  - Blocked: "gaming, entertainment, luxury"

Merchants:
  - Allowed: "Tesco, Sainsbury's"
  - Blocked: "Casino.com, Liquor World"

Time Windows:
  - "Only between 8:00 AM and 5:00 PM"

Approval:
  - "Anything above ₹500 needs my approval"
```

---

## 📋 Complete Flow Example

### 1. Create a Policy
```bash
curl -X POST http://localhost:3000/api/policies/compile \
  -H "Content-Type: application/json" \
  -d '{
    "naturalLanguage": "My agent can spend ₹2,000/day on groceries. Never spend more than ₹500 at once. Block gaming. Approve amounts over ₹500."
  }'
```

### 2. Record a Transaction
```bash
POLICY_ID="<from-step-1>"

curl -X POST http://localhost:3000/api/transactions/evaluate \
  -H "Content-Type: application/json" \
  -d '{
    "policyId": "'$POLICY_ID'",
    "amount": 350,
    "merchant": "Grocery Mart",
    "category": "Groceries",
    "agentId": "agent_001"
  }'
```

### 3. Review Decision
```bash
TRANSACTION_ID="<from-step-2>"

curl http://localhost:3000/api/transactions/$TRANSACTION_ID
```

### 4. Check Audit Log
```bash
curl http://localhost:3000/api/policies/$POLICY_ID/audit
```

---

## 🚀 Running Demo Transactions

After setting up the database:

```bash
npx ts-node scripts/seed-demo.ts
```

This will:
1. Create a sample policy
2. Run 8 pre-configured transactions
3. Show decision results
4. Demonstrate ALLOW, HOLD, and BLOCK decisions

---

## 💾 Database Schema

### Policy
- `id`: Unique policy identifier
- `name`: Human-readable policy name
- `naturalLanguage`: Original user intent
- `compiledPolicy`: Structured JSON schema
- `version`: Schema version
- `active`: Whether policy is in use
- `createdAt`, `updatedAt`: Timestamps

### Transaction
- `id`: Unique transaction ID
- `amount`: Transaction amount
- `merchant`: Merchant name
- `category`: Transaction category
- `agentId`: Agent making the transaction
- `policyId`: Associated policy
- `metadata`: Additional data
- `timestamp`: When transaction occurred

### Decision
- `id`: Unique decision ID
- `transactionId`: Associated transaction (1:1)
- `decision`: "ALLOW" | "HOLD" | "BLOCK"
- `reason`: Human-readable explanation
- `ruleResults`: Array of rule evaluations
- `source`: "DETERMINISTIC" | "AI" | "HUMAN_OVERRIDE"
- `confidence`: AI confidence score (if applicable)

### AuditLog
- `id`: Unique audit log ID
- `event`: Event type (e.g., "POLICY_CREATED", "TRANSACTION_RECEIVED")
- `actor`: Who triggered the event
- `details`: Event metadata
- `transactionId`, `policyId`: Associated records

---

## ⚙️ Configuration

### Environment Variables

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://postgres:postgres@localhost:5432/spendguard` | ✅ |
| `REDIS_URL` | Redis connection | `redis://localhost:6379` | ✅ |
| `ANTHROPIC_API_KEY` | Claude API key | Not set | ❌ (mock used if absent) |
| `NODE_ENV` | Environment | `development` | Optional |

### Docker Services

PostgreSQL:
- Host: `localhost`
- Port: `5432`
- Database: `spendguard`
- User: `postgres`
- Password: `postgres`

Redis:
- Host: `localhost`
- Port: `6379`
- No authentication (development)

---

## 🧪 Testing the API

Health check:
```bash
curl http://localhost:3000/api/health
```

Should return:
```json
{
  "status": "healthy",
  "message": "SpendGuard API is running",
  "timestamp": "2026-09-01T..."
}
```

---

### Phase 2: Infrastructure ✅
- Docker Compose services
- Prisma migrations
- Database schema
- Redis utilities

### Phase 3: Core Domain ✅
- Policy types and validation
- Transaction types
- Decision evaluator (deterministic)
- Services layer

### Phase 4: Spending Counters ✅
- Redis abstraction
- Daily/weekly/monthly spending tracking
- Atomic operations

### Phase 5: AI Policy Compiler ✅
- Claude API integration (with mock fallback)
- Natural language → Structured policy compilation
- Zod validation of AI output
- Error handling and fallback strategies
- Complete API endpoints for policy management
- Transaction evaluation service
- Spending counter integration
- Audit logging throughout

### Phase 6: Dashboard
- Policy composer UI
- Transaction feed
- Decision details
- Audit log viewer
- Human override

### Phase 7: Payment Adapter
- PaymentProvider interface
- MockPaymentProvider
- RazorpayAdapter (optional)

### Phase 8: Testing
- Unit tests with Vitest
- Decision evaluator tests
- Redis operations tests
- Policy validation tests

### Phase 9: CI/CD
- GitHub Actions workflow
- Lint, build, test pipeline

### Phase 10: Deployment
- Vercel configuration
- Environment setup

### Phase 11: Demo Polish
- UX refinement
- Responsive design
- Loading states
- Error handling

---

## 🧪 Testing

```bash
npm test
```

Tests are mocked to avoid requiring:
- Real Anthropic API keys
- Real Razorpay credentials
- External services

---

## 🔍 Database Migrations

View pending migrations:
```bash
npx prisma migrate status
```

Create a new migration:
```bash
npx prisma migrate dev --name your_migration_name
```

View database in Prisma Studio:
```bash
npx prisma studio
```

---

## 🔌 Infrastructure Commands

Start services:
```bash
docker compose up -d
```

Stop services:
```bash
docker compose down
```

Reset database:
```bash
docker compose down -v
docker compose up -d
npx prisma migrate dev
```

---

## 📝 Environment Variables

Create `.env.local` from `.env.example`:

```bash
cp .env.example .env.local
```

Then edit `.env.local` with your secrets.

**Never commit `.env.local`** — it's in `.gitignore`.

---

## 🛠️ Available Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm start` | Run production server |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |
| `npx prisma migrate dev` | Create/apply database migrations |
| `npx prisma studio` | Open Prisma Studio |

---

## ✨ Next Steps

1. **Implement Claude integration** (Phase 5)
   - Natural language policy compilation
   - Validate output with Zod
   - Handle API failures gracefully

2. **Build Dashboard** (Phase 6)
   - Policy composer
   - Transaction feed with decision details
   - Audit log viewer
   - Human approval flow

3. **Add Tests** (Phase 8)
   - Decision evaluator tests
   - Policy validation tests
   - Concurrency tests
   - Redis operation tests

4. **Implement CI/CD** (Phase 9)
   - GitHub Actions workflow
   - Automated testing on push

5. **Deploy** (Phase 10)
   - Vercel deployment
   - Production environment setup

---

## 📚 Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Redis Documentation](https://redis.io/docs)
- [Anthropic API](https://docs.anthropic.com)
- [Razorpay Documentation](https://razorpay.com/docs)

---

## 📄 License

MIT
