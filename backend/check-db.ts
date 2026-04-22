import pool from './src/utils/db';

async function check() {
  try {
    const userId = 'b750c82e-cd1e-41e7-8007-0fe840795ecb'; // testuser@quitio.com
    const cards = await pool.query('SELECT * FROM cards WHERE user_id = $1', [userId]);
    console.log('Cards for testuser:', cards.rows);
    
    const tags = await pool.query('SELECT * FROM tags WHERE user_id = $1', [userId]);
    console.log('Tags for testuser:', tags.rows);
    
    const cardTags = await pool.query('SELECT ct.* FROM card_tags ct JOIN cards c ON ct.card_id = c.id WHERE c.user_id = $1', [userId]);
    console.log('CardTags for testuser:', cardTags.rows);
    
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

check();
