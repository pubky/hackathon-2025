/**
 * Simple logging utility
 */

const LOG_PREFIX = '[Booky]';

export const logger = {
  log: (...args) => console.log(LOG_PREFIX, ...args),
  error: (...args) => console.error(LOG_PREFIX, ...args),
  warn: (...args) => console.warn(LOG_PREFIX, ...args),
  info: (...args) => console.info(LOG_PREFIX, ...args)
};

