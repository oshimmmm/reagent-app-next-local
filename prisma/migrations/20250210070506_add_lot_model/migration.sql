-- CreateTable
CREATE TABLE "Lot" (
    "id" SERIAL NOT NULL,
    "lotNumber" TEXT NOT NULL,
    "expiryDate" TIMESTAMP(3),
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reagentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lot_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Lot" ADD CONSTRAINT "Lot_reagentId_fkey" FOREIGN KEY ("reagentId") REFERENCES "Reagent"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
