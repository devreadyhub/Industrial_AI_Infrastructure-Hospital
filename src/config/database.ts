import { Pool } from 'pg';
import dotenv from 'dotenv';
import { MockDatabaseService } from '../services/mockDatabase';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const useMockDB = !connectionString || connectionString.includes('username:password@localhost');

let pool: Pool | null = null;

if (!useMockDB) {
  pool = new Pool({ connectionString });
}

export const queryDatabase = async (text: string, params?: any[]) => {
  if (useMockDB) {
    console.log('Using mock database - PostgreSQL not configured');
    return await MockDatabaseService.query(text, params);
  }

  if (!pool) {
    throw new Error('Database pool not initialized');
  }

  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
};
