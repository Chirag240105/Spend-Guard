-- CreateEnum
CREATE TYPE "RecoveryStatus" AS ENUM ('PENDING', 'RETRYING', 'HUMAN_REVIEW', 'STOPPED', 'SUCCESS', 'DO_NOT_RETRY');

-- AlterTable
ALTER TABLE "AuditLog" ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "recoveryId" TEXT;

-- CreateTable
CREATE TABLE "PaymentRecovery" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "diagnosis" JSONB NOT NULL,
    "failureCategory" TEXT NOT NULL,
    "recommendedAction" TEXT NOT NULL,
    "executedAction" TEXT NOT NULL,
    "status" "RecoveryStatus" NOT NULL DEFAULT 'PENDING',
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "amountAtRisk" DECIMAL(18,2) NOT NULL,
    "recoveredAmount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "stopped" BOOLEAN NOT NULL DEFAULT false,
    "stopReason" TEXT,
    "escalated" BOOLEAN NOT NULL DEFAULT false,
    "recoveryWindowEndsAt" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecovery_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRecovery_paymentId_key" ON "PaymentRecovery"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentRecovery_status_createdAt_idx" ON "PaymentRecovery"("status", "createdAt");

-- CreateIndex
CREATE INDEX "PaymentRecovery_failureCategory_status_idx" ON "PaymentRecovery"("failureCategory", "status");

-- CreateIndex
CREATE INDEX "PaymentRecovery_executedAction_stopped_idx" ON "PaymentRecovery"("executedAction", "stopped");

-- CreateIndex
CREATE INDEX "AuditLog_paymentId_idx" ON "AuditLog"("paymentId");

-- CreateIndex
CREATE INDEX "AuditLog_recoveryId_idx" ON "AuditLog"("recoveryId");

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_recoveryId_fkey" FOREIGN KEY ("recoveryId") REFERENCES "PaymentRecovery"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecovery" ADD CONSTRAINT "PaymentRecovery_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
