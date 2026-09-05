# SpendGuard

### AI-Powered Payment Failure Diagnosis & Revenue Recovery Platform

SpendGuard is a payment-safety and recovery platform for agent-initiated
payments. It combines deterministic spending policies, payment
execution, failure diagnosis, recovery decisions, human approvals, retry
orchestration, idempotency, audit logging, and an append-only ledger.

> **Safety principle:** AI may recommend a failure diagnosis, but
> deterministic application logic decides the recovery action. AI does
> not directly move money or write financial records.

## 1. Problem

Automated payment systems need more than a checkout screen. They must
answer:

-   Was the payment allowed by policy?
-   What happened during the payment attempt?
-   Why did it fail?
-   Is the failure retryable?
-   Should retry require human approval?
-   How are duplicate requests prevented?
-   How is the financial history audited?
-   How are external provider events reconciled?

SpendGuard is designed around these requirements.

## 2. Product Flow

``` text
User / Agent
     |
     v
Spending Policy
     |
     +---- BLOCK ----> Stop
     |
     +---- HOLD -----> Human Approval
     |
     +---- ALLOW ----> Create Payment Order
                           |
                           v
                     Payment Attempt
                           |
                    +------+------+
                    |             |
                 SUCCESS        FAILURE
                    |             |
                    v             v
                 Ledger     Failure Diagnosis
                                  |
                           Recovery Policy
                                  |
                    +-------------+-------------+
                    |                           |
                 RETRY                   HUMAN APPROVAL
                    |                           |
                    +-------------+-------------+
                                  |
                                  v
                           New Payment Attempt
```

## 3. Architecture

``` text
                         User / Agent
                              |
                              v
                    Next.js UI + API Routes
                              |
          +-------------------+-------------------+
          |                   |                   |
          v                   v                   v
       Policy              Payments           Recovery
          |                   |                   |
          v                   v                   v
    Transactions        Provider Adapter    AI Diagnosis
                              |                   |
                       +------+-----+             v
                       |            |       Deterministic
                       v            v       Recovery Policy
                   Razorpay      Mock             |
                   Test Mode    Provider          v
                       |                    Human Approval
                       v                           |
                    Webhooks                       |
                       |                           |
                       +------------+--------------+
                                    v
                              Ledger + Audit
                                    |
                       +------------+------------+
                       |                         |
                       v                         v
                  PostgreSQL                  Redis
                   + Prisma              spend context /
                                         async processing
```

The application is organized around business domains rather than putting
business logic directly in route handlers.

### Core modules

``` text
src/modules/
├── auth/
├── policy/
├── transaction/
├── payments/
├── ledger/
├── recovery/
├── outbox/
└── agent/
```

## 4. Payment Lifecycle

Payment state transitions are explicitly guarded by the payment state
machine.

``` text
Order Created
     |
     v
Payment Created
     |
     v
Attempt Started
     |
     +----------------------+
     |                      |
     v                      v
  SUCCESS                 FAILURE
     |                      |
     v                      v
Ledger Post          Error Recorded
                            |
                            v
                     AI Diagnosis
                            |
                            v
                     Recovery Policy
                            |
                 +----------+----------+
                 |                     |
                 v                     v
              Retry              Human Review
```

State transition logic:

``` text
src/modules/payments/state-machine.ts
```

## 5. AI Safety Model

``` text
Payment Failure
      |
      v
AI Diagnosis
      |
      v
Structured Recommendation
      |
      v
Deterministic Recovery Policy
      |
      +---- BLOCK
      +---- REQUIRE_APPROVAL
      +---- RETRY
```

AI should diagnose failures such as transient network errors, gateway
timeouts, or insufficient funds. It should not bypass spending policies,
directly execute payments, modify ledger balances, or approve sensitive
recovery actions.

## 6. Razorpay Integration

SpendGuard uses a provider abstraction:

``` text
PaymentService
      |
      v
PaymentProvider
      |
      +-----------------------+
      |                       |
      v                       v
RazorpayAdapter       MockPaymentProvider
      |
      v
Razorpay Test Mode
```

The adapter supports order creation, payment capture, webhook
verification, and execution.

Configure Razorpay Test Mode with:

``` env
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

Secrets remain server-side. Test Mode is intended for development and
demonstrations, not real customer money.

### Webhook flow

``` text
Razorpay
   |
   v
/api/v1/razorpay/webhook
   |
   v
Raw Body
   |
   v
Signature Verification
   |
   v
Event Deduplication
   |
   v
Internal Payment State
   |
   v
Ledger / Audit / Recovery
```

## 7. Idempotency

Payment writes use database-backed idempotency. The unique identity is:

``` text
(key, endpoint)
```

A request-body hash is also stored so a retry with the same key but
different payload can be rejected.

Example:

``` http
Idempotency-Key: 6f5f2d4b-...
```

This protects payment APIs from duplicate execution caused by client
retries or network timeouts.

## 8. Ledger

Successful financial operations can create a corresponding debit/credit
pair:

``` text
Payment
   |
   v
Ledger Transaction
   |
   +---- Debit Entry
   |
   +---- Credit Entry
```

Ledger posting is designed to be append-only and auditable.

Run the invariant check with:

``` bash
npm run ledger:check
```

## 9. Data Layer

### PostgreSQL + Prisma

PostgreSQL stores durable application state including users, merchants,
policies, transactions, orders, payments, payment attempts, ledger
records, decisions, approvals, webhook records, outbox records, and
audit logs.

Useful commands:

``` bash
npx prisma validate
npx prisma generate
npx prisma migrate status
npx prisma migrate dev
```

### Redis

Redis supports spend-context helpers and asynchronous
processing/queue-related workflows.

## 10. API Surface

  ---------------------------------------------------------------------------------
  Method                  Endpoint                          Purpose
  ----------------------- --------------------------------- -----------------------
  POST                    `/api/v1/orders`                  Create an order

  POST                    `/api/v1/payments`                Create/attempt a
                                                            payment

  GET                     `/api/v1/payments/:id`            Retrieve payment
                                                            details

  POST                    `/api/v1/payments/:id/retry`      Request another attempt

  POST                    `/api/v1/razorpay/webhook`        Process verified
                                                            Razorpay webhooks

  GET                     `/api/v1/approvals`               List pending approvals

  POST                    `/api/v1/approvals/:id/approve`   Approve recovery

  POST                    `/api/v1/approvals/:id/reject`    Reject recovery

  GET                     `/api/health`                     Health check
  ---------------------------------------------------------------------------------

## 11. Frontend

The dashboard provides:

-   Overview
-   Payments
-   Policies
-   Transactions
-   Approvals
-   AI Decisions
-   Audit Log

The Payments area exposes the payment lifecycle and recovery state to an
operator.

## 12. Local Development

### Requirements

-   Node.js
-   npm
-   Docker Desktop

### Install

``` bash
npm install
```

### Start infrastructure

``` bash
docker compose up -d
```

Local services:

``` text
PostgreSQL -> localhost:5433
Redis      -> localhost:6379
```

### Environment

Create `.env.local` or `.env`:

``` env
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
RAZORPAY_WEBHOOK_SECRET=...
```

Never commit `.env` or `.env.local`.

### Database and application

``` bash
npx prisma validate
npx prisma migrate dev
npm run dev
```

Open:

``` text
http://localhost:3000
```

## 13. Useful Commands

``` bash
npm run dev

npm run lint
npm test
npm run build

npx prisma validate
npx prisma generate
npx prisma migrate status
npx prisma migrate dev

npm run seed:demo
npm run ledger:check

npm run worker:relay
npm run worker:diagnosis
npm run worker:both
```

## 14. CI/CD

GitHub Actions is used for automated verification and deployment.

``` text
Push / Pull Request
        |
        v
 GitHub Actions
        |
        +---- Install
        |
        +---- PostgreSQL + Redis
        |
        +---- Prisma validation/migrations
        |
        +---- Lint
        |
        +---- Tests
        |
        +---- Production build
        |
        v
    Deployment
```

Recommended CI sequence:

``` bash
npm ci
npx prisma generate --no-engine
npx prisma validate
npm run lint
npm test
npm run build
```

Production migrations should use:

``` bash
npx prisma migrate deploy
```

## 15. Security

The architecture includes:

-   bcrypt password hashing
-   JWT authentication
-   request validation
-   API-key protection for write APIs
-   idempotency
-   webhook signature verification
-   webhook deduplication
-   audit logging
-   deterministic authorization
-   separation of AI diagnosis from payment execution
-   server-side secret handling

Never expose these to browser code:

``` text
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
DATABASE_URL
AI provider secret keys
JWT signing secrets
```

## 16. Project Structure

``` text
Spend-Gaurd/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── orders/
│   │       ├── payments/
│   │       ├── approvals/
│   │       └── razorpay/
│   ├── payments/
│   ├── policies/
│   └── transactions/
│
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── policy/
│   │   ├── transaction/
│   │   ├── payments/
│   │   ├── ledger/
│   │   ├── recovery/
│   │   ├── outbox/
│   │   └── agent/
│   └── infrastructure/
│
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│
├── scripts/
├── tests/
├── .github/workflows/
├── docker-compose.yml
├── package.json
└── README.md
```

## 17. Current Status

### Implemented

-   Policy creation, validation, compilation, and versioning
-   Deterministic `ALLOW`, `HOLD`, and `BLOCK` evaluation
-   Transaction, payment, order, and recovery domain foundation
-   Payment state-machine protection
-   Idempotency records
-   Ledger posting foundation and invariant checks
-   Human approval endpoints
-   Razorpay Test Mode checkout integration
-   Razorpay callback/signature verification
-   Razorpay webhook verification and deduplication
-   PostgreSQL/Prisma persistence
-   Redis integration
-   Dashboard pages
-   ESLint configuration
-   Vitest tests
-   Production build workflow
-   CI/CD workflow structure

### Production hardening still required

-   Complete AI diagnosis/recovery integration
-   Broader provider-specific webhook event handling
-   Webhook delivery retry strategy
-   Production reconciliation
-   Strong observability and monitoring
-   Full integration-test coverage
-   Final lint/test cleanup
-   Production deployment verification
-   Consolidation of legacy/new payment-provider abstractions

The project intentionally distinguishes between **implemented**,
**tested**, and **production-hardened** functionality.

## 18. Demo Flow

A concise judge/demo flow:

``` text
Login
  ↓
Dashboard
  ↓
Spending Policy
  ↓
Create / Initiate Payment
  ↓
Deterministic Authorization
  ↓
Razorpay Test Mode Checkout
  ↓
Payment Success / Failure
  ↓
Failure Diagnosis
  ↓
Recovery Policy
  ↓
Retry OR Human Approval OR Block
  ↓
Audit Log
  ↓
Ledger
```

This demonstrates that SpendGuard is not only a payment UI. It is a
control and recovery layer around the payment lifecycle.

## 19. Design Principles

1.  **Deterministic financial control** --- financial actions are
    governed by deterministic rules.
2.  **AI as an advisor** --- AI diagnoses and recommends; it does not
    independently move money.
3.  **Provider abstraction** --- payment-provider-specific code stays
    behind an interface.
4.  **Idempotent writes** --- payment requests are protected against
    retries and duplicates.
5.  **Auditable state** --- important payment and recovery decisions
    leave an audit trail.
6.  **Explicit state transitions** --- invalid payment transitions are
    rejected.
7.  **Asynchronous processing** --- diagnosis and downstream work can be
    processed independently.

## 20. Vision

``` text
             Autonomous Agent
                    |
                    v
          +-------------------+
          |     SpendGuard    |
          |                   |
          | Policy            |
          | Authorization     |
          | Payment           |
          | Diagnosis         |
          | Recovery          |
          | Approval          |
          | Ledger            |
          | Audit             |
          +---------+---------+
                    |
                    v
              Payment Provider
```

The goal is to make automated payments **controlled, explainable,
recoverable, and auditable**.

## Built With

Next.js · TypeScript · Node.js · PostgreSQL · Prisma · Redis · Razorpay
· JWT · bcrypt · Zod · Vitest · Supertest · Docker · GitHub Actions
