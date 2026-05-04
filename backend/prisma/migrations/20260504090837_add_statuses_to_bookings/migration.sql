/*
  Warnings:

  - Added the required column `status` to the `Bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `userAvailability` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "status" AS ENUM ('confirmed', 'pending', 'declined');

-- AlterTable
ALTER TABLE "Bookings" ADD COLUMN     "status" "status" NOT NULL;

-- AlterTable
ALTER TABLE "userAvailability" ADD COLUMN     "userId" TEXT NOT NULL;

-- AddForeignKey
ALTER TABLE "userAvailability" ADD CONSTRAINT "userAvailability_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
