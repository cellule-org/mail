import { config } from '../config';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
    private context: string;
    private logLevel: LogLevel;

    constructor(context: string) {
        this.context = context;
        this.logLevel = (config.logging?.level as LogLevel) || 'info';
    }

    private shouldLog(level: LogLevel): boolean {
        const levels: Record<LogLevel, number> = {
            'debug': 0,
            'info': 1,
            'warn': 2,
            'error': 3
        };

        return levels[level] >= levels[this.logLevel];
    }

    private formatMessage(level: LogLevel, message: string): string {
        const timestamp = new Date().toISOString();
        return `[${timestamp}] [${level.toUpperCase()}] [${this.context}] ${message}`;
    }

    private log(level: LogLevel, message: string, meta?: any): void {
        if (!this.shouldLog(level)) return;

        const formattedMessage = this.formatMessage(level, message);

        switch (level) {
            case 'debug':
                console.debug(formattedMessage, meta ? meta : '');
                break;
            case 'info':
                console.info(formattedMessage, meta ? meta : '');
                break;
            case 'warn':
                console.warn(formattedMessage, meta ? meta : '');
                break;
            case 'error':
                console.error(formattedMessage, meta ? meta : '');
                break;
        }
    }

    debug(message: string, meta?: any): void {
        this.log('debug', message, meta);
    }

    info(message: string, meta?: any): void {
        this.log('info', message, meta);
    }

    warn(message: string, meta?: any): void {
        this.log('warn', message, meta);
    }

    error(message: string, meta?: any): void {
        this.log('error', message, meta);
    }
}

export const createLogger = (context: string): Logger => {
    return new Logger(context);
};
