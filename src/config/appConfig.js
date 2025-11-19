const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:4173',
  'http://localhost:5173',
  'http://localhost:3000'
];

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const finalAllowedOrigins = allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS;

const corsOptions = {
  origin(origin, callback) {
    // allow mobile apps / curl (no origin) and configured origins
    if (!origin || finalAllowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} no autorizado`));
  },
  optionsSuccessStatus: 200,
  credentials: true
};

module.exports = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT) || 4000,
  corsOptions,
  allowedOrigins: finalAllowedOrigins,
  apiVersion: '1.0.0'
};
