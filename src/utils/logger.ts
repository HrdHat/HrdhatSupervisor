const isProd = import.meta.env.MODE === 'production';

/**
 * Centralized logger utility for the application.
 * All logging must go through this utility.
 *
 * @example
 * logger.log('User created', userObj);
 * logger.error('Something went wrong', errorObj);
 */
export const logger = {
  /**
   * Log a message in development mode only.
   */
  log: (message: string, ...optionalParams: unknown[]) => {
    if (!isProd) console.log(message, ...optionalParams);
  },
  /**
   * Log a warning in development mode only.
   */
  warn: (message: string, ...optionalParams: unknown[]) => {
    if (!isProd) console.warn(message, ...optionalParams);
  },
  /**
   * Always log errors, even in production.
   */
  error: (message: string, ...optionalParams: unknown[]) => {
    console.error(message, ...optionalParams);
  },
  /**
   * Log info in development mode only.
   */
  info: (message: string, ...optionalParams: unknown[]) => {
    if (!isProd) console.info(message, ...optionalParams);
  },
};
