import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates the users table. Hand-written so the exact SQL is visible.
 * TypeORM records applied migrations in the `migrations` table, so this runs only once.
 */
export class CreateUsers1763740800000 implements MigrationInterface {
  name = 'CreateUsers1763740800000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id        UUID PRIMARY KEY,
        username  VARCHAR(64) NOT NULL
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE users`);
  }
}
