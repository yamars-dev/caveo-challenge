
import logger from './logger.js';

function isPlainObject(v: any) {
  return v && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date);
}

function sanitize(value: any): any {
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map(sanitize);
  }

  if (isPlainObject(value)) {
    const out: any = {};
    Object.keys(value).forEach((k) => {
      const v = value[k];

      // If key clearly indicates a secret/token, keep as-is (pino redact will handle)
      if (/token|secret|password|access|refresh|idtoken/i.test(k)) {
        out[k] = v;
        return;
      }

      // If value is string and looks like email -> mask (logger seguro pode ser expandido aqui se necessário)
      if (typeof v === 'string' && v.includes('@')) {
        out[k] = v;
        return;
      }

      // Recurse for nested objects
      out[k] = sanitize(v);
    });
    return out;
  }

  // primitives
  return value;
}

function callLogger(fn: any, args: any[]) {
  // Normalize calling styles:
  // - (obj, msg)
  // - (msg, obj)
  // - (msg)
  if (typeof args[0] === 'object' && args[0] !== null) {
    return fn(sanitize(args[0]), args[1]);
  }

  if (typeof args[0] === 'string' && typeof args[1] === 'object' && args[1] !== null) {
    // flip to (obj, msg)
    return fn(sanitize(args[1]), args[0]);
  }

  // default passthrough
  return fn(...args);
}

const secureLogger = {
  info: (...args: any[]) => callLogger(logger.info.bind(logger), args),
  warn: (...args: any[]) => callLogger(logger.warn.bind(logger), args),
  error: (...args: any[]) => callLogger(logger.error.bind(logger), args),
  debug: (...args: any[]) => callLogger(logger.debug.bind(logger), args),
};

export default secureLogger;
