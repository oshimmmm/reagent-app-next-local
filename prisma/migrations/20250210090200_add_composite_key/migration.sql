/*
  Warnings:

  - A unique constraint covering the columns `[reagentId,lotNumber]` on the table `Lot` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Lot_reagentId_lotNumber_key" ON "Lot"("reagentId", "lotNumber");
