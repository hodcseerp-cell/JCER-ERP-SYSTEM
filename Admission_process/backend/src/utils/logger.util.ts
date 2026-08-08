import winston from 'winston';

const IS_PROD = process.env.NODE_ENV === 'production';

// Masking format for sensitive fields (e.g. passwords, tokens)
const maskFields = winston.format((info) => {
  const sensitiveKeys = ['password', 'passwordHash', 'token', 'refreshToken', 'accessToken', 'oldPassword', 'newPassword', 'signature'];
  
  const mask = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    const copy = { ...obj };
    for (const key of Object.keys(copy)) {
      if (sensitiveKeys.includes(key)) {
        copy[key] = '********';
      } else if (typeof copy[key] === 'object') {
        copy[key] = mask(copy[key]);
      }
    }
    return copy;
  };

  info.meta = mask(info.meta);
  if (info.message && typeof info.message === 'object') {
    info.message = mask(info.message);
  }
  
  return info;
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    maskFields(),
    IS_PROD ? winston.format.json() : winston.format.combine(
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
        const corrIdStr = correlationId ? ` [CorrelationID: ${correlationId}]` : '';
        const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
        return `${timestamp} [${level}]${corrIdStr}: ${typeof message === 'object' ? JSON.stringify(message) : message}${metaStr}`;
      })
    )
  ),
  transports: [
    new winston.transports.Console({
      silent: process.env.NODE_ENV === 'test',
    }),
  ],
});

export default logger;
