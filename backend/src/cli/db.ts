#!/usr/bin/env ts-node
import database from '../utils/database';

const args = process.argv.slice(2);
const command = args[0];

async function main() {
  try {
    switch (command) {
      case 'migrate':
        await database.runPendingMigrations();
        break;

      case 'reset':
        const confirm = args[1];
        if (confirm !== '--force') {
          console.log('⚠  This will DELETE all data. Use: npm run db:reset -- --force');
          process.exit(1);
        }
        await database.reset();
        console.log('Starting fresh migrations...');
        await database.runPendingMigrations();
        break;

      case 'stats':
        await database.getStats();
        break;

      case 'health':
        const isHealthy = await database.healthCheck();
        console.log(isHealthy ? '✓ Database is healthy' : '✗ Database is unhealthy');
        process.exit(isHealthy ? 0 : 1);
        break;

      default:
        console.log(`
QUITIO Database CLI

Commands:
  npm run db:migrate              Run pending migrations
  npm run db:reset -- --force     Reset database (DEV ONLY)
  npm run db:stats                Show database statistics
  npm run db:health               Check database health
        `);
    }

    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

main();
