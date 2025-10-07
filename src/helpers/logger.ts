import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const logger = pino({
  // In production, use 'warn' by default to reduce log volume
  // In development, use 'debug' for more verbose output
  level: process.env.LOG_LEVEL || (isProduction ? 'warn' : 'info'),

  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      headers: {
        host: req.headers.host,
        // Truncate user-agent to prevent extremely long headers
        userAgent: req.headers['user-agent']?.substring(0, 200),
      },
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
  redact: {
    paths: [
      'password',
      'accessToken',
      'idToken',
      'refreshToken',
      '*.password',
      'tokens.AccessToken',
      'tokens.IdToken',
      'tokens.RefreshToken',
    ],
    censor: '[REDACTED]',
  },
});
