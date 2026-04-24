
import pool from './src/utils/db';

async function dumpCards() {
  try {
    const result = await pool.query(`
      SELECT id, title, content_type, created_at, metadata->>'original_name' as orig_name 
      FROM cards 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

dumpCards();
