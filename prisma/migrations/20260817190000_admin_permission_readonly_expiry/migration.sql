-- AlterTable
ALTER TABLE "AdminPermission" ADD COLUMN     "readOnly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "expiresAt" TIMESTAMP(3);
