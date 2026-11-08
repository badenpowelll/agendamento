-- Endereço opcional da cliente (preenchido pelo CEP)
ALTER TABLE "Customer" ADD COLUMN "addressCep" TEXT;
ALTER TABLE "Customer" ADD COLUMN "addressStreet" TEXT;
ALTER TABLE "Customer" ADD COLUMN "addressNumber" TEXT;
ALTER TABLE "Customer" ADD COLUMN "addressComplement" TEXT;
ALTER TABLE "Customer" ADD COLUMN "addressDistrict" TEXT;
ALTER TABLE "Customer" ADD COLUMN "addressCity" TEXT;
ALTER TABLE "Customer" ADD COLUMN "addressState" TEXT;
