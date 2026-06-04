/**
 * Prints log messages only when running in development/local mode
 * and the URL contains "192.168.1.".
 */
export const PrintLog = (...args: any[]): void => {
  if (
    process.env.NODE_ENV === 'development' &&
    typeof window !== 'undefined' &&
    window.location.href.includes('192.168.1.')
  ) {
    console.log(...args);
  }
};
