import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPromoCodeUsageUserIndex1772000000001 implements MigrationInterface {
  name = 'AddPromoCodeUsageUserIndex1772000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE INDEX "IDX_promo_code_usages_code_user" ON "promo_code_usages" ("promo_code_id", "user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_promo_code_usages_code_user"`);
  }
}
