-- AlterEnum
ALTER TYPE "ReturnStatus" ADD VALUE 'REFUNDED';

-- AlterTable
ALTER TABLE "order_returns" ADD COLUMN     "refundReference" TEXT,
ADD COLUMN     "refundedAt" TIMESTAMP(3),
ADD COLUMN     "refundedById" TEXT,
ADD COLUMN     "resolution" TEXT NOT NULL DEFAULT 'REFUND';
