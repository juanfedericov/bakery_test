ALTER TABLE "Order"
ADD COLUMN "customerName" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "deliveryMethod" TEXT,
ADD COLUMN "address" TEXT,
ADD COLUMN "deliveryDateTime" TEXT,
ADD COLUMN "dedication" TEXT,
ADD COLUMN "total" DECIMAL(12,2),
ADD COLUMN "status" TEXT NOT NULL DEFAULT 'Pendiente';
