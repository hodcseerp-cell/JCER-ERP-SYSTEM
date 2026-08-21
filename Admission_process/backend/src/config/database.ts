import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { contextStorage } from '../utils/context.util';
import logger from '../utils/logger.util';

dotenv.config();

let rawDbUrl = process.env.DATABASE_URL || 
               process.env.DATABASE_PRIVATE_URL || 
               process.env.DATABASE_PUBLIC_URL || 
               process.env.POSTGRES_URL;

if (rawDbUrl) {
  rawDbUrl = rawDbUrl.trim().replace(/^["']|["']$/g, '');
  // Guard against unexpanded Railway template strings
  if (rawDbUrl.startsWith('${') || rawDbUrl.startsWith('$')) {
    console.warn(`⚠️ Warning: DATABASE_URL contains unexpanded template: "${rawDbUrl}". Check Railway variable references.`);
    rawDbUrl = undefined;
  }
}

const dbUrl = rawDbUrl;
const useSSL = process.env.DB_SSL === 'true' || (dbUrl ? dbUrl.includes('sslmode=require') : false);
const dialectOptions = useSSL
  ? {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    }
  : {};

const host = (process.env.PGHOST || process.env.DB_HOST || (process.env.NODE_ENV === 'production' ? '' : 'localhost')).trim().replace(/^["']|["']$/g, '');
const port = parseInt((process.env.PGPORT || process.env.DB_PORT || '5432').trim().replace(/^["']|["']$/g, ''), 10);
const dbName = (process.env.PGDATABASE || process.env.DB_NAME || process.env.POSTGRES_DB || 'college_erp_db').trim().replace(/^["']|["']$/g, '');
const dbUser = (process.env.PGUSER || process.env.DB_USER || process.env.POSTGRES_USER || 'erp_user').trim().replace(/^["']|["']$/g, '');
const dbPassword = (process.env.PGPASSWORD || process.env.DB_PASSWORD || process.env.POSTGRES_PASSWORD || 'erp_password_123').trim().replace(/^["']|["']$/g, '');

const sequelize = dbUrl
  ? new Sequelize(dbUrl, {
      dialect: 'postgres',
      dialectOptions,
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
      pool: {
        max: 50,
        min: 5,
        acquire: 30000,
        idle: 10000,
      },
    })
  : new Sequelize(
      dbName,
      dbUser,
      dbPassword,
      {
        host: host || 'localhost',
        port: port || 5432,
        dialect: 'postgres',
        dialectOptions,
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        pool: {
          max: 50,
          min: 5,
          acquire: 30000,
          idle: 10000,
        },
      }
    );

export function getSafeDatabaseTargetInfo(): string {
  if (dbUrl) {
    try {
      const parsed = new URL(dbUrl);
      return `${parsed.hostname}:${parsed.port || 5432}/${parsed.pathname.replace(/^\//, '')}`;
    } catch {
      return 'DATABASE_URL (remote)';
    }
  }
  return `${host || 'localhost'}:${port || 5432}/${dbName}`;
}

// RLS Hook: SET session variables before executing query
sequelize.addHook('beforeQuery', async (options: any) => {
  // Check if DB RLS is enabled
  if (process.env.DB_RLS_ENABLED !== 'true') return;

  const context = contextStorage.getStore();
  if (context && options.connection) {
    // Sanitize to prevent SQL injection in session setting
    const userId = context.userId.replace(/[^a-zA-Z0-9-]/g, '');
    const role = context.role.replace(/[^a-zA-Z0-9_-]/g, '');

    const isTransaction = !!options.transaction;
    const command = isTransaction ? 'SET LOCAL' : 'SET';

    try {
      await options.connection.query(`${command} app.current_user_id = '${userId}';`);
      await options.connection.query(`${command} app.current_user_role = '${role}';`);
    } catch (err: any) {
      logger.error(`RLS beforeQuery SET failed: ${err.message}`, { correlationId: options.correlationId });
    }
  }
});

// RLS Hook: RESET session variables after query completes to prevent pool leakage
sequelize.addHook('afterQuery', async (options: any) => {
  if (process.env.DB_RLS_ENABLED !== 'true') return;

  // We only need to manually RESET if it was set session-wide (outside a transaction)
  // Postgres automatically discards SET LOCAL when a transaction block finishes
  const isTransaction = !!options.transaction;
  const context = contextStorage.getStore();

  if (context && !isTransaction && options.connection) {
    try {
      await options.connection.query(`RESET app.current_user_id;`);
      await options.connection.query(`RESET app.current_user_role;`);
    } catch (err: any) {
      logger.error(`RLS afterQuery RESET failed: ${err.message}`);
    }
  }
});

export default sequelize;
