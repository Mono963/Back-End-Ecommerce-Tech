import { MigrationInterface, QueryRunner } from "typeorm";

export class NombreMigracion1770628232631 implements MigrationInterface {
    name = 'NombreMigracion1770628232631'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "cart_item_variants" DROP CONSTRAINT "FK_eaad53f808d2f460532fa156dea"`);
        await queryRunner.query(`ALTER TABLE "order_item_variants" DROP CONSTRAINT "FK_6e83648a3857ef7b7c3c38ea23e"`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "imgUrls" SET DEFAULT ARRAY[]::text[]`);
        await queryRunner.query(`ALTER TABLE "newsletter_campaigns" ALTER COLUMN "featuredProductIds" SET DEFAULT ARRAY[]::text[]`);
        await queryRunner.query(`ALTER TABLE "cart_item_variants" ADD CONSTRAINT "FK_eaad53f808d2f460532fa156dea" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_item_variants" ADD CONSTRAINT "FK_6e83648a3857ef7b7c3c38ea23e" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "order_item_variants" DROP CONSTRAINT "FK_6e83648a3857ef7b7c3c38ea23e"`);
        await queryRunner.query(`ALTER TABLE "cart_item_variants" DROP CONSTRAINT "FK_eaad53f808d2f460532fa156dea"`);
        await queryRunner.query(`ALTER TABLE "newsletter_campaigns" ALTER COLUMN "featuredProductIds" SET DEFAULT ARRAY[]`);
        await queryRunner.query(`ALTER TABLE "products" ALTER COLUMN "imgUrls" SET DEFAULT ARRAY[]`);
        await queryRunner.query(`ALTER TABLE "order_item_variants" ADD CONSTRAINT "FK_6e83648a3857ef7b7c3c38ea23e" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "cart_item_variants" ADD CONSTRAINT "FK_eaad53f808d2f460532fa156dea" FOREIGN KEY ("variant_id") REFERENCES "product_variants"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

}
