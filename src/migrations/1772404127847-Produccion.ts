import { MigrationInterface, QueryRunner } from "typeorm";

export class Produccion1772404127847 implements MigrationInterface {
    name = 'Produccion1772404127847'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "role" RENAME COLUMN "updateAt" TO "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "imgUrls" SET DEFAULT ARRAY[]::text[]`);
        await queryRunner.query(`ALTER TABLE "newsletter_campaigns" ALTER COLUMN "featuredProductIds" SET DEFAULT ARRAY[]::text[]`);
        await queryRunner.query(`CREATE INDEX "IDX_32b41cdb985a296213e9a928b5" ON "payments" ("status") `);
        await queryRunner.query(`CREATE INDEX "IDX_d35cb3c13a18e1ea1705b2817b" ON "payments" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_b2f7b823a21562eeca20e72b00" ON "payments" ("order_id") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_b2f7b823a21562eeca20e72b00"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d35cb3c13a18e1ea1705b2817b"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_32b41cdb985a296213e9a928b5"`);
        await queryRunner.query(`ALTER TABLE "newsletter_campaigns" ALTER COLUMN "featuredProductIds" SET DEFAULT ARRAY[]`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "imgUrls" SET DEFAULT ARRAY[]`);
        await queryRunner.query(`ALTER TABLE "role" RENAME COLUMN "updatedAt" TO "updateAt"`);
    }

}
