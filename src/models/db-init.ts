import { Pool } from 'pg';
import fs from 'fs';
import util from 'util';
import config from '../config';

const readFile = util.promisify(fs.readFile);

const pgPool = new Pool({ connectionString: config.servicePG });

export async function init() {
  const client = await pgPool.connect();
  try {
    const sqlSchema = await readFile('./data/schema.sql', 'utf-8');
    await client.query(sqlSchema, []);
  } finally {
    client.release();
  }
}
