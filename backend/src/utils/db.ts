import { Pool } from 'pg';
import config from '../config';

const pool = new Pool({
  connectionString: config.DATABASE_URL,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
});

export default pool;
