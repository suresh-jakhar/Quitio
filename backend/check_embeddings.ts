import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkEmbeddings() {
  const result = await pool.query('SELECT id, title, (embedding IS NULL) as is_null FROM cards ORDER BY created_at DESC LIMIT 20');
  console.log(JSON.stringify(result.rows, null, 2));
  await pool.end();
}

checkEmbeddings();
