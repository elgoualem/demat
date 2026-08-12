-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "sequenceNumber" SERIAL NOT NULL,
ADD COLUMN     "vatRate" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_sequenceNumber_key" ON "Invoice"("sequenceNumber");
