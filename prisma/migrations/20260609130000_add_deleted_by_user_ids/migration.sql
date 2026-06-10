-- AlterTable
ALTER TABLE "Message" ADD COLUMN "deletedByUserIds" TEXT[] DEFAULT E'{}';
