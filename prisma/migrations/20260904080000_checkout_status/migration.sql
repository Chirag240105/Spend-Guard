ALTER TABLE "Payment" ADD COLUMN "razorpayOrderId" TEXT;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_razorpayOrderId_key" UNIQUE ("razorpayOrderId");
ALTER TABLE "Payment" ADD COLUMN "razorpayPaymentId" TEXT;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_razorpayPaymentId_key" UNIQUE ("razorpayPaymentId");
ALTER TABLE "Payment" ADD COLUMN "razorpaySignature" TEXT;
ALTER TABLE "Payment" ADD COLUMN "checkoutStatus" TEXT NOT NULL DEFAULT 'INITIALIZED';
ALTER TABLE "Payment" ADD COLUMN "verifiedAt" TIMESTAMP(3);
