import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import { contextStorage } from '../utils/context.util';
import logger from '../utils/logger.util';

dotenv.config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'college_erp_db',
  process.env.DB_USER || 'erp_user',
  process.env.DB_PASSWORD || 'erp_password_123',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 10, // Increased slightly for RLS transactions
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
  }
);

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
