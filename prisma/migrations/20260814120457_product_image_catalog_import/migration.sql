-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "apiCatalogPath" TEXT NOT NULL DEFAULT '/catalog';
