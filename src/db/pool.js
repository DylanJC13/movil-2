const { Pool } = require('pg');

const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_PORT'];
const hasAllVars = requiredVars.every((key) => Boolean(process.env[key]));

const useDatabase = hasAllVars;
let pool;

function getPool() {
  if (!useDatabase) {
    throw new Error('Base de datos no configurada (faltan variables de entorno)');
  }

  if (!pool) {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      ssl:
        process.env.DB_SSLMODE && process.env.DB_SSLMODE.toLowerCase() === 'require'
          ? { rejectUnauthorized: false }
          : undefined
    });
  }

  return pool;
}

module.exports = {
  useDatabase,
  getPool
};
