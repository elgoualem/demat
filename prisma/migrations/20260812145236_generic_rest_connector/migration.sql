-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "apiAuthHeader" TEXT NOT NULL DEFAULT 'Authorization',
ADD COLUMN     "apiAuthPrefix" TEXT NOT NULL DEFAULT 'Bearer ',
ADD COLUMN     "apiBaseUrl" TEXT,
ADD COLUMN     "apiConfirmedValue" TEXT NOT NULL DEFAULT 'confirmed',
ADD COLUMN     "apiKey" TEXT,
ADD COLUMN     "apiOrderIdField" TEXT NOT NULL DEFAULT 'provider_order_id',
ADD COLUMN     "apiOrderPath" TEXT NOT NULL DEFAULT '/orders',
ADD COLUMN     "apiStatusField" TEXT NOT NULL DEFAULT 'status';
