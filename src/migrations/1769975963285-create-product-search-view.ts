import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProductSearchView1700000000000 implements MigrationInterface {
  name = 'CreateProductSearchView1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE VIEW product_search AS
      SELECT
        p.id,
        p.name,
        p.price,
        c.name AS category
      FROM products p
      JOIN categories c ON c.id = p.category_id;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP VIEW IF EXISTS product_search;
    `);
  }
}
