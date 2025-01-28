-- CreateTable
CREATE TABLE "Reagent" (
    "id" SERIAL NOT NULL,
    "productNumber" TEXT NOT NULL,
    "currentLot" TEXT,
    "location" TEXT,
    "maxExpiry" TIMESTAMP(3),
    "name" TEXT,
    "noOrderOnZeroStock" BOOLEAN NOT NULL DEFAULT false,
    "orderDate" TIMESTAMP(3),
    "orderQuantity" INTEGER NOT NULL DEFAULT 0,
    "orderTriggerExpiry" BOOLEAN NOT NULL DEFAULT false,
    "orderTriggerStock" INTEGER NOT NULL DEFAULT 0,
    "orderTriggerValueStock" INTEGER,
    "orderValue" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "valueStock" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reagent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "History" (
    "id" SERIAL NOT NULL,
    "actionType" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "productNumber" TEXT NOT NULL,
    "reagentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "History_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Reagent_productNumber_key" ON "Reagent"("productNumber");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- AddForeignKey
ALTER TABLE "History" ADD CONSTRAINT "History_reagentId_fkey" FOREIGN KEY ("reagentId") REFERENCES "Reagent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
