-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "FreightChargeType" AS ENUM ('PIECE', 'WEIGHT');

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "freightTemplateId" TEXT,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "status" "ProductStatus" NOT NULL DEFAULT 'DRAFT',
    "basePrice" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSKU" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "skuCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "attributes" JSONB NOT NULL DEFAULT '{}',
    "price" DECIMAL(12,2) NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProductSKU_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FreightTemplate" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "chargeType" "FreightChargeType" NOT NULL DEFAULT 'PIECE',
    "firstUnit" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "firstFee" DECIMAL(12,2) NOT NULL,
    "additionalUnit" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "additionalFee" DECIMAL(12,2) NOT NULL,
    "freeShippingThreshold" DECIMAL(12,2),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FreightTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Store_roomId_ownerId_key" ON "Store"("roomId", "ownerId");
CREATE INDEX "Store_roomId_status_idx" ON "Store"("roomId", "status");
CREATE INDEX "Product_storeId_status_idx" ON "Product"("storeId", "status");
CREATE INDEX "Product_freightTemplateId_idx" ON "Product"("freightTemplateId");
CREATE INDEX "Product_storeId_updatedAt_idx" ON "Product"("storeId", "updatedAt");
CREATE UNIQUE INDEX "ProductSKU_productId_skuCode_key" ON "ProductSKU"("productId", "skuCode");
CREATE INDEX "ProductSKU_productId_enabled_idx" ON "ProductSKU"("productId", "enabled");
CREATE UNIQUE INDEX "FreightTemplate_storeId_name_key" ON "FreightTemplate"("storeId", "name");
CREATE INDEX "FreightTemplate_storeId_isDefault_idx" ON "FreightTemplate"("storeId", "isDefault");

-- AddForeignKey
ALTER TABLE "Store" ADD CONSTRAINT "Store_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "TrainingRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_freightTemplateId_fkey" FOREIGN KEY ("freightTemplateId") REFERENCES "FreightTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductSKU" ADD CONSTRAINT "ProductSKU_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FreightTemplate" ADD CONSTRAINT "FreightTemplate_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

