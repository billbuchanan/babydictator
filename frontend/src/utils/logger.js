const LOG_FILE = 'frontend.log';

class Logger {
  static log(type, message, data = null) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      type,
      message,
      data
    };

    // Log to console with color coding
    const consoleMessage = `[${timestamp}] ${type}: ${message}`;
    switch (type) {
      case 'ERROR':
        console.error(consoleMessage, data);
        break;
      case 'WARN':
        console.warn(consoleMessage, data);
        break;
      case 'INFO':
      default:
        console.log(consoleMessage, data);
    }

    // Write to file if running in development
    if (process.env.NODE_ENV === 'development') {
      const logMessage = JSON.stringify(logEntry, null, 2) + '\n';
      // In browser environment, we'll keep logs in localStorage
      const logs = localStorage.getItem('app_logs') || '';
      localStorage.setItem('app_logs', logs + logMessage);
    }
  }

  static error(message, data = null) {
    this.log('ERROR', message, data);
  }

  static warn(message, data = null) {
    this.log('WARN', message, data);
  }

  static info(message, data = null) {
    this.log('INFO', message, data);
  }

  static getLogs() {
    return localStorage.getItem('app_logs') || '';
  }

  static clearLogs() {
    localStorage.removeItem('app_logs');
  }
}

export default Logger; 