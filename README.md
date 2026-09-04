# LedgerFlow

LedgerFlow is a Next.js/PostgreSQL payment-safety prototype. It retains the original SpendGuard policy-authorisation workflow while adding a LedgerFlow payment domain: orders, payment attempts, recovery decisions, ledger records, idempotency records, and an outbox.

> Safety model: AI may recommend a failure diagnosis; deterministic code decides the recovery action. Payment execution and financial writes are not exposed to the diagnosis interface.

## What is implemented

### SpendGuard policy flow

- Policy creation, compilation, validation, versioning, and retrieval.
- Deterministic transaction evaluation with `ALLOW`, `HOLD`, and `BLOCK` outcomes.
- Decision and audit-log persistence.
- Existing dashboard, transaction, policy, approval, and audit pages/API routes.
- Redis-backed daily, weekly, and monthly spend-context helpers.
- Seed script for the original deterministic policy demonstration: `npm run seed:demo`.

### LedgerFlow payment foundation

- Prisma models and migrations for merchants, orders, payments, payment attempts, ledger accounts/transactions/entries, idempotency keys, agent decisions, approvals, webhook records, and two outbox representations.
- Explicit payment-state transition guard in `src/modules/payments/state-machine.ts`.
- Payment attempts that persist outcome/error code and create a debit/credit pair for successful mock payments.
- Append-only ledger posting helper and an invariant-check command: `npm run ledger:check`.
- Database-backed idempotency record with unique `(key, endpoint)` and request-body hash.
- Payment/order endpoints under `/api/v1`, including idempotency-key enforcement on write routes.
- Human approval endpoints under `/api/v1/approvals`.
- Structured system-diagnosis report for database, Redis, AI-key presence, and provider selection.
- Local mock payment provider and a Razorpay adapter boundary.
- Simple Redis-list outbox relay/worker scripts and a database outbox service.

### Static quality checks present

- ESLint configuration and `npm run lint`.
- Vitest test files for legacy policy evaluation/validation and newer payment-state/recovery-policy rules.
- Next.js production build command: `npm run build`.
- Prisma schema validation command: `npx prisma validate`.

## Architecture

```text
Next.js UI + API routes
        |
Domain modules: policy / transaction / payment / ledger / recovery / outbox
        |
PostgreSQL (Prisma) ---- Redis (spend context and simple queue)
        |
Relay worker -> diagnosis request queue
```

The repository currently contains both the original SpendGuard modules and LedgerFlow modules. They are not yet fully unified into one production payment lifecycle.

## Local setup

```bash
npm install
docker compose up -d
npx prisma migrate dev
npm run dev
```

Docker starts PostgreSQL on `localhost:5433` and Redis on `localhost:6379`.

Useful commands:

```bash
npm run lint
npm test
npm run build
npx prisma validate
npm run seed:demo
npm run ledger:check
npm run worker:relay
npm run worker:diagnosis
npm run worker:both
```

## API surface

The existing application exposes legacy policy/transaction routes plus these LedgerFlow routes:

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/v1/orders` | Create an order; idempotency key required. |
| POST | `/api/v1/payments` | Create and attempt a payment; idempotency key required. |
| GET | `/api/v1/payments/:id` | Read payment details. |
| POST | `/api/v1/payments/:id/retry` | Request another payment attempt; idempotency key required. |
| GET | `/api/v1/approvals` | List pending recovery approvals. |
| POST | `/api/v1/approvals/:id/approve` | Approve a recovery attempt. |
| POST | `/api/v1/approvals/:id/reject` | Reject recovery. |
| GET | `/api/health` | Existing application health endpoint. |

Write routes use `SPEND_GUARD_API_KEY` when it is configured.

## Environment variables

```env
DATABASE_URL=postgresql://...
REDIS_URL=redis://localhost:6379
SPEND_GUARD_API_KEY=...
GROQ_API_KEY=...
GROQ_MODEL=...
GEMINI_API_KEY=...
GEMINI_MODEL=...
XAI_API_KEY=...
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
```

Do not commit `.env` or `.env.local`. The current system-diagnosis implementation checks `XAI_API_KEY` and `GEMINI_API_KEY`; the payment adapter switches to Razorpay only when both Razorpay credentials are present.

## CI/CD readiness

The project has the right basic commands for a CI workflow, but it is **not yet ready for required green CI gates** as of the latest local verification.

| Check | Command | Latest result | CI status |
| --- | --- | --- | --- |
| Lint | `npm run lint` | Completed with 6 unused-variable warnings and no errors. | Usable; warnings should be cleaned up. |
| Unit tests | `npm test` | Did not start: Vitest/esbuild could not resolve `vitest.config.ts` because of a filesystem access error. | Blocked. |
| Production build | `npm run build` | Failed TypeScript checks: payment/diagnosis modules export incompatible interfaces used by LedgerFlow files. | Blocked. |
| Prisma schema | `npx prisma validate` | Passed: `prisma/schema.prisma` is valid. | Ready to include in CI. |
| Database migration | `npx prisma migrate dev` | Not executed in this verification pass. | Requires PostgreSQL. |
| Integration checks | seed/outbox/ledger scripts | Present but not run in this verification pass. | Requires PostgreSQL and Redis. |

### Recommended CI pipeline after blockers are fixed

```bash
npm ci
npx prisma generate --no-engine
npx prisma validate
npm run lint
npm test
npm run build
```

For integration CI, provision PostgreSQL and Redis, then run migrations and explicitly run the seed, ledger, and outbox verification scripts. Do not add the integration steps as required checks until they are stable and deterministic in CI.

## Known gaps before CI/CD can be enabled as required

1. Reconcile `src/modules/agent/diagnosis.ts` with the LedgerFlow diagnosis worker and recovery-policy imports. The worker expects `AgentDiagnosisSchema`, `AIProvider`, `MockDiagnosisProvider`, and `humanReviewDiagnosis`, but the current module exports system-diagnosis functionality instead.
2. Reconcile the two incompatible `PaymentProvider` designs. `PaymentService` expects `execute`, while the current provider module offers `createOrder` and `capturePayment`.
3. Fix the Prisma JSON typing in `src/modules/outbox/outbox.service.ts`.
4. Repair the Vitest/esbuild configuration/path issue so `npm test` can execute.
5. Remove lint warnings, then make lint warning-free before using `--max-warnings=0` in CI.
6. Run and document database/Redis integration verification. The current outbox worker is a Redis-list relay, not a BullMQ consumer despite BullMQ being declared as a dependency.
7. Implement Razorpay webhook HMAC verification before production use; the current adapter returns `true`.

## Operational status

### Good for local development

- Legacy policy management and deterministic transaction evaluation.
- Next.js UI/API development.
- Local PostgreSQL/Redis Docker services.
- Mock provider development and manual inspection of ledger/outbox code.

### Not production-ready

- CI must not be configured to require passing tests/build until the blockers above are corrected.
- Live AI diagnosis/recovery integration is incomplete and should not automatically move money.
- Razorpay webhook validation is a placeholder.
- Webhook delivery, Prometheus metrics, load/concurrency testing, and deployment automation are incomplete.

## CI/CD

CI/CD workflows are not included in this repository. Add them only after `npm test` and `npm run build` are green locally and the integration scripts have been verified against disposable PostgreSQL and Redis services.
