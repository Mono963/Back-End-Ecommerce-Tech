import { MigrationInterface, QueryRunner } from "typeorm";

export class Repairs1772419257186 implements MigrationInterface {
    name = 'Repairs1772419257186'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."repairs_devicetype_enum" AS ENUM('laptop', 'desktop', 'monitor', 'hard-drive', 'component', 'other')`);
        await queryRunner.query(`CREATE TYPE "public"."repairs_urgency_enum" AS ENUM('low', 'medium', 'high')`);
        await queryRunner.query(`CREATE TYPE "public"."repairs_status_enum" AS ENUM('pending', 'reviewing', 'in_progress', 'completed', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "repairs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fullName" character varying(80) NOT NULL, "email" character varying(100) NOT NULL, "phone" character varying(20) NOT NULL, "deviceType" "public"."repairs_devicetype_enum" NOT NULL, "brand" character varying(100) NOT NULL, "model" character varying(100) NOT NULL, "issueDescription" text NOT NULL, "urgency" "public"."repairs_urgency_enum" NOT NULL, "status" "public"."repairs_status_enum" NOT NULL DEFAULT 'pending', "adminNotes" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_f075e413c4b1d29911f893b33e7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_095c58bd1b7c07a0511ee14552" ON "repairs" ("email") `);
        await queryRunner.query(`CREATE INDEX "IDX_7e8160bee6e119f84fc025179f" ON "repairs" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_f94100ddaa54673740fee9457b" ON "repairs" ("urgency") `);
        await queryRunner.query(`CREATE INDEX "IDX_9fc07e07a9a4e5c7bddac18c2d" ON "repairs" ("status") `);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "imgUrls" SET DEFAULT ARRAY[]::text[]`);
        await queryRunner.query(`ALTER TABLE "newsletter_campaigns" ALTER COLUMN "featuredProductIds" SET DEFAULT ARRAY[]::text[]`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "newsletter_campaigns" ALTER COLUMN "featuredProductIds" SET DEFAULT ARRAY[]`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "imgUrls" SET DEFAULT ARRAY[]`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9fc07e07a9a4e5c7bddac18c2d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f94100ddaa54673740fee9457b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_7e8160bee6e119f84fc025179f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_095c58bd1b7c07a0511ee14552"`);
        await queryRunner.query(`DROP TABLE "repairs"`);
        await queryRunner.query(`DROP TYPE "public"."repairs_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."repairs_urgency_enum"`);
        await queryRunner.query(`DROP TYPE "public"."repairs_devicetype_enum"`);
    }

}
