# 🛠️ SpendGuard Developer's Guide

## Architecture Overview

SpendGuard implements a **modular monolith** with clear service boundaries:

```
┌─────────────────────────────────────┐
│   Next.js API Routes (8 endpoints)  │
└──────────────────┬──────────────────┘
                   │
        ┌──────────┼──────────┐
        ▼          ▼          ▼
    ┌────────┬──────────┬──────────┐
    │ Policy │Transaction│ Decision │
    │ Service│  Service  │ Service  │
    └───┬────┴────┬─────┴────┬─────┘
        │         │          │
   ┌────▼────┬────▼────┬─────▼──────┐
   │PostgreSQL│ Redis   │  Audit Log │
   └─────────┴────────┴────────────┘
        │
   ┌────▼──────────────────┐
   │ AI Module             │
   │ ├─ Claude API         │
   │ └─ Mock Provider      │
   └─────────────────────┘
```

---

## Key Design Decisions

### 1. **Deterministic Authorization**

**Decision:** All financial decisions made by deterministic code, not AI

**Rationale:**

- Financial transactions require auditability
- AI can misinterpret edge cases
- Hard rules ensure consistent enforcement
- Every decision is explainable

**Implementation:**

- `src/modules/decision/evaluator.ts` - Pure, stateless logic
- 9 distinct rule categories evaluated in deterministic order
- No AI involved in final authorization

### 2. **AI for Interpretation Only**

**Decision:** Claude compiles natural language to JSON, not makes decisions

**Rationale:**

- Separates policy compilation from enforcement
- Policy can be reviewed before execution
- Easy to audit what policy user intended
- Fallback to mock provider possible

**Implementation:**

- `src/modules/ai/compiler.ts` - Orchestrates compilation
- `src/modules/ai/claude-provider.ts` - Real Claude
- `src/modules/ai/mock-provider.ts` - Fallback mock
- Zod validation of all AI output

### 3. **Spend Tracking in Redis, Audit in PostgreSQL**

**Decision:** Use Redis for fast spending counters, PostgreSQL for audit trail

**Rationale:**

- Redis: Sub-millisecond operations for high-frequency spending checks
- PostgreSQL: Permanent, queryable audit trail
- Redis failure → HOLD (safe default)
- PostgreSQL is source of truth

**Implementation:**

- `src/infrastructure/redis.ts` - Spending counter abstraction
- Atomic operations with TTL expiry
- Daily/weekly/monthly tracking via date-based keys

### 4. **Service Layer Over Domain Model**

**Decision:** Services handle persistence, domain models are pure

**Rationale:**

- Easy to test (mock services in tests)
- Easy to swap implementations (PostgreSQL → MongoDB)
- Clean separation of concerns
- Type safety with Prisma + Zod

**Implementation:**

- `src/modules/policy/policy.service.ts` - Policy operations
- `src/modules/transaction/transaction.service.ts` - Transaction recording
- `src/modules/decision/decision.service.ts` - Decision persistence
- Domain models in `*.types.ts` files

### 5. **Fail-Safe Defaults**

**Decision:** When in doubt, HOLD (require human review)

**Rationale:**

- Better to delay payment than allow illegal one
- Humans can override if needed
- Logging provides audit trail
- No financial loss from false positives

**Implementation:**

- Redis unavailable → HOLD
- Claude API unavailable → Mock provider (still works)
- Invalid policy input → Validation error (don't save)
- Unknown category → HOLD

### 6. **No External Orchestration**

**Decision:** Keep it simple - no Kafka, no message queues, no microservices

**Rationale:**

- MVP requirement is simplicity
- Direct API calls are synchronous and reliable
- Single transaction → single request/response
- Easy to deploy and operate
- Can be refactored later if needed

**Implementation:**

- Synchronous evaluation in `transaction.evaluator.ts`
- All operations complete within single HTTP request
- Direct service-to-service calls

---

## Adding New Features

### Adding a New Decision Rule

Example: Add a merchant category whitelist

**1. Update Policy Schema** (`src/modules/policy/policy.types.ts`)

```typescript
export const CategoriesSchema = z.object({
  allowed: z.array(z.string()).optional(),
  blocked: z.array(z.string()).optional(),
  merchantCategoryWhitelist: z.array(z.string()).optional(), // NEW
});
```

**2. Update Evaluator** (`src/modules/decision/evaluator.ts`)

```typescript
// Add new rule evaluation
if (policy.categories.merchantCategoryWhitelist) {
  const isAllowed = policy.categories.merchantCategoryWhitelist.includes(
    transaction.merchantCategory,
  );
  rules.push({
    rule: 'Merchant category whitelist',
    passed: isAllowed,
    message: isAllowed ? '✓ Allowed' : '✕ Not in whitelist',
  });
  if (!isAllowed) explanations.push(rules[rules.length - 1].message);
}
```

**3. Update Mock Provider** (`src/modules/ai/mock-provider.ts`)

```typescript
function extractMerchantCategories(text: string) {
  // Add keyword extraction for merchant categories
}
```

**4. Update Claude Prompt** (`src/modules/ai/claude-provider.ts`)

```typescript
// Add merchantCategoryWhitelist to prompt
```

**5. Add Tests** (`src/modules/decision/evaluator.test.ts`)

```typescript
it('should BLOCK if merchant category not in whitelist', () => {
  // New test case
});
```

---

### Adding a New API Endpoint

Example: Add endpoint to approve a HOLD transaction

**1. Create Route Handler** (`app/api/transactions/[transactionId]/approve/route.ts`)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { TransactionEvaluator } from '@/src/modules/transaction/transaction.evaluator';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> },
) {
  try {
    const { transactionId } = await params;
    await TransactionEvaluator.approveTransaction(transactionId);

    return NextResponse.json({
      success: true,
      message: 'Transaction approved',
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
```

**2. Add to Service Layer**

```typescript
// Already implemented in transaction.evaluator.ts
TransactionEvaluator.approveTransaction(transactionId, policyId);
```

**3. Test the Endpoint**

```bash
curl -X POST http://localhost:3000/api/transactions/{id}/approve
```

---

### Adding a New Database Model

Example: Add spending limits history

**1. Update Prisma Schema** (`prisma/schema.prisma`)

```prisma
model SpendingHistory {
  id String @id @default(cuid())
  agentId String
  date DateTime
  dailySpent Float
  weeklySpent Float
  monthlySpent Float
  createdAt DateTime @default(now())

  @@index([agentId])
  @@index([date])
}
```

**2. Create Migration**

```bash
npx prisma migrate dev --name add_spending_history
```

**3. Create Service**

```typescript
export class SpendingHistoryService {
  static async recordSnapshot(agentId: string) {
    // Implementation
  }
}
```

---

## Testing Strategy

### Unit Tests

Test individual functions without dependencies:

```typescript
// ✓ Pure function evaluation
evaluateTransaction(tx, policy, context) → DecisionResult

// ✓ Validation logic
validateCompiledPolicy(policy) → Valid | Invalid

// ✓ Mock provider extraction
mockCompilePolicy(text) → CompiledPolicy
```

### Integration Tests (Future)

Test multiple services together:

```typescript
// Compile policy → Evaluate transactions → Check audit
```

### End-to-End Tests (Future)

Test complete flows via API:

```typescript
// POST /compile → POST /evaluate → GET /audit
```

### Running Tests

```bash
npm test                    # Run all tests
npm test -- --coverage     # With coverage
npm test -- --watch        # Watch mode
```

---

## Performance Considerations

### Redis Keys

- `spend:daily:{agentId}:{date}` - Daily spending
- `spend:weekly:{agentId}:{weekStart}` - Weekly spending
- `spend:monthly:{agentId}:{yearMonth}` - Monthly spending

**TTL Strategy:**

- Daily keys expire in 24 hours
- Weekly keys expire in 7 days
- Monthly keys expire at month boundary

**Concurrency:**

- Uses Redis WATCH/MULTI/EXEC
- Handles concurrent transactions atomically
- Could upgrade to Lua scripts for higher throughput

### Database Indexes

- `Transaction.agentId` - Query by agent
- `Transaction.policyId` - Query by policy
- `Decision.policyId` - Statistics by policy
- `AuditLog.policyId`, `AuditLog.transactionId` - Event querying

### API Response Times

- Policy compilation: ~500ms (Claude) or ~100ms (mock)
- Transaction evaluation: ~50-100ms (Redis + DB reads)
- Health check: <10ms

---

## Debugging

### Enable Prisma Query Logging

```env
NODE_ENV=development
```

Will log all SQL queries to console

### Inspect Database

```bash
npx prisma studio
```

Opens interactive database browser

### Redis CLI

```bash
docker exec -it spendguard-redis redis-cli
KEYS spend:*
GET spend:daily:agent_001:2026-09-01
```

### View Logs

```bash
npm run dev
# Check terminal for request logs
```

### Test API Locally

```bash
# Health check
curl http://localhost:3000/api/health

# Compile policy
curl -X POST http://localhost:3000/api/policies/compile \
  -H "Content-Type: application/json" \
  -d '{"naturalLanguage":"..."}'

# Evaluate transaction
curl -X POST http://localhost:3000/api/transactions/evaluate \
  -H "Content-Type: application/json" \
  -d '{"policyId":"...","amount":350,...}'
```

---

## Deployment

### Vercel (Recommended)

```bash
vercel deploy
```

Sets up environment variables:

```env
DATABASE_URL=...
REDIS_URL=...
ANTHROPIC_API_KEY=...
```

### Docker

```bash
docker build -t spendguard .
docker run -p 3000:3000 -e DATABASE_URL=... spendguard
```

### Local

```bash
docker compose up -d
npm run build
npm run start
```

---

## Common Issues & Solutions

| Issue                       | Cause                  | Solution                          |
| --------------------------- | ---------------------- | --------------------------------- |
| Redis connection error      | Redis not running      | `docker compose up -d`            |
| Database not initialized    | Migration not run      | `npx prisma migrate deploy`       |
| API 500 error               | Claude API key invalid | Use mock provider or get real key |
| Transaction evaluation slow | Redis timeout          | Check Redis connection            |
| Policy validation fails     | Conflicting rules      | Check policy constraints          |

---

## Code Style

### TypeScript

- Strict mode enabled
- No `any` types
- Explicit function signatures
- Prefer interfaces over types for objects

### File Organization

```
src/modules/
├── feature/
│   ├── feature.types.ts      # Domain models + schemas
│   ├── feature.service.ts    # Database operations
│   ├── feature.logic.ts      # Business logic
│   └── feature.test.ts       # Unit tests
```

### Naming Conventions

- Files: `snake_case` or `kebab-case`
- Functions/variables: `camelCase`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Routes: `/api/resource/action`

### Error Handling

```typescript
try {
  // operation
} catch (error) {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error('Context:', message);
  return NextResponse.json({ error: `Human-readable error: ${message}` }, { status: 500 });
}
```

---

## Future Enhancements

### Phase 6: Dashboard

- React components for policy composition
- Transaction feed UI
- Decision details
- Audit log viewer

### Phase 7: Payment Integration

- RazorpayAdapter
- PaymentProvider interface
- Payment execution

### Post-MVP Improvements

- Merchant category database
- Fuzzy matching for merchants
- Cron-like time windows
- Lua scripts for Redis concurrency
- Machine learning for category detection
- Multi-policy support per agent
- Spending insights & analytics
- Email notifications
- Rate limiting

---

## Resources

- Next.js: https://nextjs.org/docs
- Prisma: https://www.prisma.io/docs
- Redis: https://redis.io/docs
- Zod: https://zod.dev
- Anthropic: https://docs.anthropic.com
- TypeScript: https://www.typescriptlang.org/docs

---

## Support

### Quick Links

- Bugs/Issues: Check PHASE5_SUMMARY.md known limitations
- API Docs: See README.md
- Implementation Details: IMPLEMENTATION.md
- Questions: See inline code comments

### Testing

```bash
npm test              # Run all tests
npm test -- evaluator.test.ts  # Specific test file
```

### Linting

```bash
npm run lint
```

---

**Happy coding! 🚀**
