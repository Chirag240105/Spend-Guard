ALTER TABLE "Order" ADD COLUMN "gatewayOrderId" TEXT;
ALTER TABLE "Order" ADD CONSTRAINT "Order_gatewayOrderId_key" UNIQUE ("gatewayOrderId");
ALTER TABLE "Payment" ADD COLUMN "gatewayPaymentId" TEXT;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_gatewayPaymentId_key" UNIQUE ("gatewayPaymentId");
