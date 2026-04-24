import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function checkEdges() {
  const userId = '78f8a0c1-c308-4afa-837d-fe16344b4bfb';
  const result = await pool.query('SELECT count(*) FROM graph_edges WHERE source_card_id IN (SELECT id FROM cards WHERE user_id = $1)', [userId]);
  console.log(`Total edges for user ${userId}: ${result.rows[0].count}`);
  
  const samples = await pool.query(`
    SELECT source_card_id, target_card_id, similarity_score, edge_type 
    FROM graph_edges 
    WHERE source_card_id IN (SELECT id FROM cards WHERE user_id = $1)
    LIMIT 5
  `, [userId]);
  console.log('Sample edges:', JSON.stringify(samples.rows, null, 2));
  
  await pool.end();
}

checkEdges();
