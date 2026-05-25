-- AlterTable: widen profile_picture_url to text for data URLs
ALTER TABLE "submissions" ALTER COLUMN "profile_picture_url" TYPE TEXT USING "profile_picture_url"::TEXT;
ALTER TABLE "candidates" ALTER COLUMN "profile_picture_url" TYPE TEXT USING "profile_picture_url"::TEXT;
