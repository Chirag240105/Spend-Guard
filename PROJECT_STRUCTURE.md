# 📁 Project Structure & Navigation Guide

## Quick Navigation

```
spend-guard/                              ← Project root
│
├── 📄 START HERE
│   ├── README.md                         ← Start reading here (500+ lines)
│   ├── QUICKSTART.sh                     ← Setup in 5 minutes
│   └── HANDOFF.md                        ← Complete handoff document
│
├── 📚 DOCUMENTATION
│   ├── PHASE5_SUMMARY.md                 ← What's implemented in Phase 5
│   ├── IMPLEMENTATION.md                 ← Technical details
│   ├── DEVELOPER_GUIDE.md                ← How to extend the system
│   └── this file (PROJECT_STRUCTURE.md)
│
├── 🛠️ SETUP & CONFIG
│   ├── docker-compose.yml                ← PostgreSQL + Redis setup
│   ├── .env.example                      ← Template for environment variables
│   ├── .env.local                        ← Local development secrets
│   ├── .gitignore                        ← Git configuration
│   ├── package.json                      ← Dependencies & scripts
│   ├── tsconfig.json                     ← TypeScript configuration
│   ├── tailwind.config.js                ← Tailwind CSS setup
│   ├── eslint.config.mjs                 ← Linting configuration
│   └── vitest.config.ts                  ← Testing configuration
│
├── 💻 SOURCE CODE (src/)
│   │
│   ├── modules/                          ← Business logic & services
│   │   │
│   │   ├── ai/                           ← AI Policy Compilation
│   │   │   ├── claude-provider.ts        ← Real Claude API calls
│   │   │   ├── mock-provider.ts          ← Fallback mock provider
│   │   │   ├── compiler.ts               ← Orchestration & validation
│   │   │   ├── compiler.test.ts          ← Unit tests
│   │   │   └── mock-provider.test.ts     ← Mock provider tests
│   │   │
│   │   ├── policy/                       ← Policy Management
│   │   │   ├── policy.types.ts           ← Zod schemas & types
│   │   │   ├── policy.validator.ts       ← Validation & conflict detection
│   │   │   ├── policy.explainer.ts       ← Human-readable explanations
│   │   │   ├── policy.compiler.ts        ← Interface definition
│   │   │   ├── policy.service.ts         ← Database operations
│   │   │   └── policy.validator.test.ts  ← Validation tests
│   │   │
│   │   ├── transaction/                  ← Transaction Recording
│   │   │   ├── transaction.types.ts      ← Domain models
│   │   │   ├── transaction.service.ts    ← Database operations
│   │   │   └── transaction.evaluator.ts  ← Evaluation pipeline
│   │   │
│   │   ├── decision/                     ← Decision Making
│   │   │   ├── decision.types.ts         ← Domain models
│   │   │   ├── evaluator.ts              ← Core rule engine (400+ lines)
│   │   │   ├── evaluator.test.ts         ← Rule evaluation tests
│   │   │   └── decision.service.ts       ← Database operations
│   │   │
│   │   └── audit/                        ← Audit & Compliance
│   │       └── audit.service.ts          ← Event logging
│   │
│   └── infrastructure/                   ← External Services
│       ├── database.ts                   ← Prisma client
│       └── redis.ts                      ← Redis spending counters
│
├── 🔌 API ENDPOINTS (app/api/)
│   │
│   ├── policies/
│   │   ├── compile/route.ts              ← POST   /compile
│   │   ├── route.ts                      ← GET    /list
│   │   ├── [policyId]/route.ts           ← GET    /{id}
│   │   ├── [policyId]/transactions/route.ts      ← GET    /{id}/transactions
│   │   └── [policyId]/audit/route.ts    ← GET    /{id}/audit
│   │
│   ├── transactions/
│   │   ├── evaluate/route.ts             ← POST   /evaluate
│   │   └── [transactionId]/route.ts      ← GET    /{id}
│   │
│   └── health/route.ts                   ← GET    /health
│
├── 🎨 FRONTEND (app/)
│   ├── layout.tsx                        ← Root layout (to be updated in Phase 6)
│   ├── page.tsx                          ← Home page (to be updated in Phase 6)
│   ├── globals.css                       ← Global styles
│   └── public/                           ← Static assets
│
├── 🗄️ DATABASE (prisma/)
│   ├── schema.prisma                     ← Database schema definition
│   └── migrations/
│       └── 0_init/
│           └── migration.sql             ← Initial schema migration
│
└── 🚀 SCRIPTS (scripts/)
    ├── seed-demo.ts                      ← Demo data seeding
    ├── setup.sh                          ← One-command infrastructure setup
    └── package.json                      ← Updated with new scripts
```

---

## 📊 Code Statistics

| Directory | Files | Purpose |
|-----------|-------|---------|
| `src/modules/` | 20+ | Business logic & services |
| `src/infrastructure/` | 2 | Database & cache clients |
| `app/api/` | 8 | REST API endpoints |
| `prisma/` | 2 | Database schema & migrations |
| `scripts/` | 2 | Automation & seeding |

---

## 🔑 Key Files by Purpose

### 🎓 Learning & Documentation
- `README.md` - Complete project guide
- `PHASE5_SUMMARY.md` - What's implemented
- `IMPLEMENTATION.md` - Technical deep-dive
- `DEVELOPER_GUIDE.md` - Extension guide
- `HANDOFF.md` - Complete handoff

### 🚀 Getting Started
- `QUICKSTART.sh` - Setup in 5 minutes
- `docker-compose.yml` - Infrastructure
- `.env.example` - Configuration template
- `scripts/setup.sh` - Automated setup

### 💼 Core Business Logic
- `src/modules/ai/compiler.ts` - Policy compilation
- `src/modules/decision/evaluator.ts` - Decision engine (400+ lines)
- `src/modules/transaction/transaction.evaluator.ts` - Evaluation pipeline
- `src/modules/policy/policy.validator.ts` - Validation & conflicts

### 🔌 APIs
- `app/api/policies/compile/route.ts` - Compile natural language
- `app/api/transactions/evaluate/route.ts` - Evaluate transaction
- `app/api/policies/[policyId]/route.ts` - Get policy
- `app/api/policies/[policyId]/audit/route.ts` - Audit log

### 🗄️ Data Layer
- `prisma/schema.prisma` - Database schema
- `src/infrastructure/database.ts` - Prisma client
- `src/infrastructure/redis.ts` - Redis operations
- `src/modules/*/[name].service.ts` - Database operations

### 🧪 Testing
- `src/modules/decision/evaluator.test.ts` - Core logic tests
- `src/modules/policy/policy.validator.test.ts` - Validation tests
- `src/modules/ai/mock-provider.test.ts` - AI fallback tests
- `vitest.config.ts` - Test configuration

---

## 🔄 Data Flow

### Policy Compilation Flow
```
Natural Language Input
    ↓
app/api/policies/compile/route.ts (API Handler)
    ↓
src/modules/ai/compiler.ts (Orchestrator)
    ├─ Claude API or Mock Provider
    ├─ Zod Validation
    └─ Conflict Detection
    ↓
src/modules/policy/policy.service.ts (Persistence)
    ↓
PostgreSQL (Database)
```

### Transaction Evaluation Flow
```
Transaction Input
    ↓
app/api/transactions/evaluate/route.ts (API Handler)
    ↓
src/modules/transaction/transaction.evaluator.ts (Pipeline)
    ├─ Load Policy (Database)
    ├─ Get Spending Context (Redis)
    ├─ Evaluate Rules (evaluator.ts)
    ├─ Record Decision (Database)
    ├─ Update Counters (Redis)
    └─ Log Event (Audit Log)
    ↓
Response with ALLOW/HOLD/BLOCK
```

---

## 📋 Configuration Files

### Environment Variables (.env.local)
```
DATABASE_URL=postgresql://...        # PostgreSQL connection
REDIS_URL=redis://...                # Redis connection
ANTHROPIC_API_KEY=sk-ant-...        # Claude API (optional)
NODE_ENV=development                 # Environment
```

### Package Scripts (package.json)
```bash
npm run dev                  # Start dev server
npm run build               # Production build
npm run start               # Production server
npm run lint                # Run ESLint
npm test                    # Run tests
npm run db:migrate          # Run migrations
npm run db:studio           # Open Prisma Studio
npm run seed:demo           # Seed demo data
npm run setup               # Full setup
```

---

## 🎯 Finding What You Need

### "How do I...?"

| Question | File |
|----------|------|
| Get started? | `QUICKSTART.sh` or `README.md` |
| Understand the API? | `README.md` → "API Endpoints" section |
| Add a new rule? | `DEVELOPER_GUIDE.md` → "Adding New Features" |
| Compile a policy? | `app/api/policies/compile/route.ts` |
| Evaluate a transaction? | `app/api/transactions/evaluate/route.ts` |
| See what rules apply? | `src/modules/decision/evaluator.ts` |
| Track spending? | `src/infrastructure/redis.ts` |
| Check policy conflicts? | `src/modules/policy/policy.validator.ts` |
| View audit trail? | `app/api/policies/[policyId]/audit/route.ts` |
| Understand the schema? | `prisma/schema.prisma` |
| Run tests? | `npm test` (see `vitest.config.ts`) |

---

## 🚀 Quick Navigation Tips

### Want to Understand the System?
1. Start with `README.md` (overview)
2. Read `PHASE5_SUMMARY.md` (what's built)
3. Check `DEVELOPER_GUIDE.md` (how it works)

### Want to Run It?
1. Run `bash scripts/setup.sh` (5 minutes)
2. Run `npm run dev` (start server)
3. Test APIs in terminal or Postman

### Want to Extend It?
1. Read `DEVELOPER_GUIDE.md` (how to add features)
2. Find the relevant module in `src/modules/`
3. Add tests alongside your changes
4. Run `npm test` to verify

### Want to Debug Something?
1. Check error message in terminal
2. Look at relevant service file (e.g., `policy.service.ts`)
3. Check `IMPLEMENTATION.md` for architecture
4. Add debug logging and run `npm run dev`

---

## 📦 Module Dependencies

```
┌─────────────────────────────────────┐
│        Next.js API Routes           │
└──────────────────┬──────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
   ┌────────┬──────────┬──────────┐
   │ Policy │Transaction│ Decision │
   │Service │ Service   │ Service  │
   └───┬────┴────┬─────┴────┬─────┘
       │         │          │
   ┌───▼────┬────▼────┬─────▼──────┐
   │PostgreSQL│ Redis  │  Audit Log │
   └────────┴────────┴────────────┘
```

---

## ✨ File Naming Conventions

- `*.types.ts` - Type definitions & Zod schemas
- `*.service.ts` - Database operations & business logic
- `*.validator.ts` - Validation & checking logic
- `*.evaluator.ts` - Core evaluation/decision logic
- `*.test.ts` - Unit tests
- `*.explainer.ts` - Human-readable explanations
- `route.ts` - Next.js API route handlers

---

## 🔍 Finding Files by Function

| Function | Primary File | Related Files |
|----------|--------------|---------------|
| Compile policies | `src/modules/ai/compiler.ts` | `claude-provider.ts`, `mock-provider.ts` |
| Validate policies | `src/modules/policy/policy.validator.ts` | `policy.types.ts` |
| Evaluate transactions | `src/modules/decision/evaluator.ts` | `decision.types.ts` |
| Manage spending | `src/infrastructure/redis.ts` | `transaction.evaluator.ts` |
| Log events | `src/modules/audit/audit.service.ts` | All services |
| Save decisions | `src/modules/decision/decision.service.ts` | `evaluator.ts` |
| Database access | `src/infrastructure/database.ts` | `*.service.ts` files |

---

## 🎯 Next Steps

### For Phase 6 (Dashboard):
→ Check `DEVELOPER_GUIDE.md` for how to add React components

### For Deployment:
→ See `DEVELOPER_GUIDE.md` → "Deployment" section

### For Testing:
→ Run `npm test` to execute all tests

### For Debugging:
→ Use `docker-compose logs` to see service logs
→ Use `npx prisma studio` to inspect database

---

**Happy coding! 🚀**

*For more help, see `README.md` or `DEVELOPER_GUIDE.md`*
