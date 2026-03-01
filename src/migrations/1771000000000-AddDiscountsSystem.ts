import { MigrationInterface, QueryRunner } from "typeorm";

export class AddDiscountsSystem1771000000000 implements MigrationInterface {
    name = 'AddDiscountsSystem1771000000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create discount_type enum
        await queryRunner.query(`CREATE TYPE "public"."product_discounts_discounttype_enum" AS ENUM('percentage', 'fixed')`);
        await queryRunner.query(`CREATE TYPE "public"."promo_codes_discounttype_enum" AS ENUM('percentage', 'fixed')`);

        // Create product_discounts table
        await queryRunner.query(`
            CREATE TABLE "product_discounts" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "discountType" "public"."product_discounts_discounttype_enum" NOT NULL,
                "value" numeric(10,2) NOT NULL,
                "startDate" TIMESTAMP,
                "endDate" TIMESTAMP,
                "isActive" boolean NOT NULL DEFAULT true,
                "product_id" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_product_discounts" PRIMARY KEY ("id")
            )
        `);

        // Create promo_codes table
        await queryRunner.query(`
            CREATE TABLE "promo_codes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "code" character varying(50) NOT NULL,
                "description" character varying(200),
                "discountType" "public"."promo_codes_discounttype_enum" NOT NULL,
                "value" numeric(10,2) NOT NULL,
                "startDate" TIMESTAMP,
                "endDate" TIMESTAMP,
                "isActive" boolean NOT NULL DEFAULT true,
                "maxUses" integer,
                "currentUses" integer NOT NULL DEFAULT 0,
                "maxUsesPerUser" integer,
                "minOrderAmount" numeric(10,2),
                "applicableProductIds" uuid[],
                "applicableCategoryIds" uuid[],
                "campaign_id" uuid,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_promo_codes_code" UNIQUE ("code"),
                CONSTRAINT "PK_promo_codes" PRIMARY KEY ("id")
            )
        `);

        // Create promo_code_usages table
        await queryRunner.query(`
            CREATE TABLE "promo_code_usages" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "promo_code_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "order_id" uuid NOT NULL,
                "discountAmount" numeric(10,2) NOT NULL,
                "usedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_promo_code_usages_code_order" UNIQUE ("promo_code_id", "order_id"),
                CONSTRAINT "PK_promo_code_usages" PRIMARY KEY ("id")
            )
        `);

        // Add discount columns to order_items
        await queryRunner.query(`ALTER TABLE "order_items" ADD "originalUnitPrice" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD "discountAmount" numeric(10,2) NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD "discountSource" character varying(20)`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD "discountCode" character varying(50)`);

        // Add discount columns to orders_details
        await queryRunner.query(`ALTER TABLE "orders_details" ADD "totalDiscount" numeric(10,2) NOT NULL DEFAULT 0`);
        await queryRunner.query(`ALTER TABLE "orders_details" ADD "promoCodeUsed" character varying(50)`);

        // Create indexes
        await queryRunner.query(`CREATE INDEX "IDX_product_discounts_product_active" ON "product_discounts" ("product_id", "isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_promo_codes_code" ON "promo_codes" ("code")`);
        await queryRunner.query(`CREATE INDEX "IDX_promo_codes_active" ON "promo_codes" ("isActive")`);
        await queryRunner.query(`CREATE INDEX "IDX_promo_code_usages_user" ON "promo_code_usages" ("user_id")`);
        await queryRunner.query(`CREATE INDEX "IDX_promo_code_usages_code" ON "promo_code_usages" ("promo_code_id")`);

        // Add foreign keys
        await queryRunner.query(`ALTER TABLE "product_discounts" ADD CONSTRAINT "FK_product_discounts_product" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promo_codes" ADD CONSTRAINT "FK_promo_codes_campaign" FOREIGN KEY ("campaign_id") REFERENCES "newsletter_campaigns"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promo_code_usages" ADD CONSTRAINT "FK_promo_code_usages_code" FOREIGN KEY ("promo_code_id") REFERENCES "promo_codes"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promo_code_usages" ADD CONSTRAINT "FK_promo_code_usages_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "promo_code_usages" ADD CONSTRAINT "FK_promo_code_usages_order" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign keys
        await queryRunner.query(`ALTER TABLE "promo_code_usages" DROP CONSTRAINT "FK_promo_code_usages_order"`);
        await queryRunner.query(`ALTER TABLE "promo_code_usages" DROP CONSTRAINT "FK_promo_code_usages_user"`);
        await queryRunner.query(`ALTER TABLE "promo_code_usages" DROP CONSTRAINT "FK_promo_code_usages_code"`);
        await queryRunner.query(`ALTER TABLE "promo_codes" DROP CONSTRAINT "FK_promo_codes_campaign"`);
        await queryRunner.query(`ALTER TABLE "product_discounts" DROP CONSTRAINT "FK_product_discounts_product"`);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "public"."IDX_promo_code_usages_code"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_promo_code_usages_user"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_promo_codes_active"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_promo_codes_code"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_product_discounts_product_active"`);

        // Drop columns from orders_details
        await queryRunner.query(`ALTER TABLE "orders_details" DROP COLUMN "promoCodeUsed"`);
        await queryRunner.query(`ALTER TABLE "orders_details" DROP COLUMN "totalDiscount"`);

        // Drop columns from order_items
        await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "discountCode"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "discountSource"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "discountAmount"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP COLUMN "originalUnitPrice"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "promo_code_usages"`);
        await queryRunner.query(`DROP TABLE "promo_codes"`);
        await queryRunner.query(`DROP TABLE "product_discounts"`);

        // Drop enums
        await queryRunner.query(`DROP TYPE "public"."promo_codes_discounttype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."product_discounts_discounttype_enum"`);
    }
}
