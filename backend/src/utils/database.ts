import fs from 'fs';
import path from 'path';
import pool from './db';

interface Migration {
  name: string;
  executed_at?: string;
}

class Database {
  private migrationsDir: string;

  constructor() {
    this.migrationsDir = path.join(__dirname, '../../migrations');
  }

  /**
   * Initialize database: create migrations table if it doesn't exist
   */
  async init(): Promise<void> {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) UNIQUE NOT NULL,
          executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `);
      console.log('✓ Migrations table initialized');
    } catch (err) {
      console.error('✗ Failed to initialize migrations table:', err);
      throw err;
    }
  }

  /**
   * Get list of executed migrations
   */
  async getExecutedMigrations(): Promise<Migration[]> {
    const result = await pool.query('SELECT name, executed_at FROM migrations ORDER BY executed_at ASC');
    return result.rows;
  }

  /**
   * Get list of pending migrations
   */
  async getPendingMigrations(): Promise<string[]> {
    const files = this.getMigrationFiles();
    const executed = await this.getExecutedMigrations();
    const executedNames = new Set(executed.map((m) => m.name));
    return files.filter((f) => !executedNames.has(f));
  }

  /**
   * Get all migration files from migrations directory
   */
  private getMigrationFiles(): string[] {
    if (!fs.existsSync(this.migrationsDir)) {
      return [];
    }
    return fs
      .readdirSync(this.migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();
  }

  /**
   * Run all pending migrations
   */
  async runPendingMigrations(): Promise<void> {
    try {
      console.log('\n📋 Starting database migrations...\n');

      await this.init();

      const pending = await this.getPendingMigrations();

      if (pending.length === 0) {
        console.log('✓ No pending migrations. Database is up to date.\n');
        return;
      }

      console.log(`Found ${pending.length} pending migration(s):\n`);

      for (const migrationFile of pending) {
        await this.runMigration(migrationFile);
      }

      console.log('\n✅ All migrations completed successfully!\n');
    } catch (err) {
      console.error('\n❌ Migration failed:', err);
      throw err;
    }
  }

  /**
   * Run a single migration
   */
  private async runMigration(migrationFile: string): Promise<void> {
    const migrationPath = path.join(this.migrationsDir, migrationFile);
    const sql = fs.readFileSync(migrationPath, 'utf-8');

    const client = await pool.connect();

    try {
      console.log(`▶ Running: ${migrationFile}`);

      await client.query('BEGIN');
      await client.query(sql);
      await client.query(
        'INSERT INTO migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
        [migrationFile]
      );
      await client.query('COMMIT');

      console.log(`✓ Completed: ${migrationFile}\n`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`✗ Failed: ${migrationFile}`);
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Health check: verify database connection
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await pool.query('SELECT NOW()');
      return !!result.rows[0];
    } catch (err) {
      console.error('Database health check failed:', err);
      return false;
    }
  }

  /**
   * Get database statistics
   */
  async getStats(): Promise<void> {
    try {
      const usersCount = await pool.query('SELECT COUNT(*) FROM users');
      const cardsCount = await pool.query('SELECT COUNT(*) FROM cards');
      const tagsCount = await pool.query('SELECT COUNT(*) FROM tags');

      console.log('\n📊 Database Statistics:');
      console.log(`  Users: ${usersCount.rows[0].count}`);
      console.log(`  Cards: ${cardsCount.rows[0].count}`);
      console.log(`  Tags: ${tagsCount.rows[0].count}\n`);
    } catch (err) {
      console.error('Failed to get database stats:', err);
    }
  }

  /**
   * Reset database (development only)
   */
  async reset(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot reset database in production!');
    }

    const client = await pool.connect();

    try {
      console.log('⚠ Resetting database...');

      // Drop all tables in reverse order of dependencies
      await client.query('DROP TABLE IF EXISTS graph_edges CASCADE');
      await client.query('DROP TABLE IF EXISTS card_tags CASCADE');
      await client.query('DROP TABLE IF EXISTS cards CASCADE');
      await client.query('DROP TABLE IF EXISTS tags CASCADE');
      await client.query('DROP TABLE IF EXISTS users CASCADE');
      await client.query('DROP TABLE IF EXISTS migrations CASCADE');

      console.log('✓ Database reset complete\n');
    } finally {
      client.release();
    }
  }
}

export default new Database();
