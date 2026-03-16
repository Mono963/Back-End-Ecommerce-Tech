import { MigrationInterface, QueryRunner } from "typeorm";

export class Refund1773413792815 implements MigrationInterface {
    name = 'Refund1773413792815'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."refund_requests_status_enum" AS ENUM('pending', 'approved', 'rejected')`);
        await queryRunner.query(`CREATE TABLE "refund_requests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "order_id" uuid NOT NULL, "user_id" uuid NOT NULL, "reason" character varying(100) NOT NULL, "description" text NOT NULL, "status" "public"."refund_requests_status_enum" NOT NULL DEFAULT 'pending', "adminResponse" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_00c88ecd40a63abe92a3dc69897" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_9f21b0381a4d58a3167d8237bc" ON "refund_requests" ("user_id", "status") `);
        await queryRunner.query(`CREATE INDEX "IDX_15e48bdd230ba036163e5b958f" ON "refund_requests" ("createdAt") `);
        await queryRunner.query(`CREATE INDEX "IDX_d230e5f0bf833679b68a8ffe13" ON "refund_requests" ("status") `);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "imgUrls" SET DEFAULT ARRAY[]::text[]`);
        await queryRunner.query(`ALTER TABLE "newsletter_campaigns" ALTER COLUMN "featuredProductIds" SET DEFAULT ARRAY[]::text[]`);
        await queryRunner.query(`ALTER TABLE "refund_requests" ADD CONSTRAINT "FK_41ecc6daf51bf70bb55597e2f03" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refund_requests" ADD CONSTRAINT "FK_228d14156b20be394872d6c3aaa" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refund_requests" DROP CONSTRAINT "FK_228d14156b20be394872d6c3aaa"`);
        await queryRunner.query(`ALTER TABLE "refund_requests" DROP CONSTRAINT "FK_41ecc6daf51bf70bb55597e2f03"`);
        await queryRunner.query(`ALTER TABLE "newsletter_campaigns" ALTER COLUMN "featuredProductIds" SET DEFAULT ARRAY[]`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "imgUrls" SET DEFAULT ARRAY[]`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d230e5f0bf833679b68a8ffe13"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_15e48bdd230ba036163e5b958f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_9f21b0381a4d58a3167d8237bc"`);
        await queryRunner.query(`DROP TABLE "refund_requests"`);
        await queryRunner.query(`DROP TYPE "public"."refund_requests_status_enum"`);
    }

}
