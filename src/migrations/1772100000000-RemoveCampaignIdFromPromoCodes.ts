import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveCampaignIdFromPromoCodes1772100000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the foreign key constraint first
    const table = await queryRunner.getTable('promo_codes');
    const foreignKey = table?.foreignKeys.find((fk) => fk.columnNames.includes('campaign_id'));
    if (foreignKey) {
      await queryRunner.dropForeignKey('promo_codes', foreignKey);
    }

    await queryRunner.dropColumn('promo_codes', 'campaign_id');
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "promo_codes" ADD "campaign_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "promo_codes" ADD CONSTRAINT "FK_promo_codes_campaign" FOREIGN KEY ("campaign_id") REFERENCES "newsletter_campaigns"("id") ON DELETE SET NULL`,
    );
  }
}
