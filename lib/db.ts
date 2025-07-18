import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('sslmode=disable') ? false : 
       process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

export default pool;