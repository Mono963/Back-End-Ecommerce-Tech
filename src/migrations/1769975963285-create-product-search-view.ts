import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductSearchView1769975963285 implements MigrationInterface {
  name = 'CreateProductSearchView1769975963285';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE OR REPLACE VIEW product_search AS
      SELECT
        p.id,
        p.name,
        p."basePrice" AS price,
        p.description,
        p.brand,
        c.category_name AS category
      FROM products p
      JOIN categories c ON c.id = p.category_id
      WHERE p.deleted_at IS NULL
        AND p."isActive" = true;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP VIEW IF EXISTS product_search;');
  }
}
