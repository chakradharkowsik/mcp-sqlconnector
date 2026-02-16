import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import path from 'path';

/**
 * Audit Logger for Query Execution
 * Logs all database queries with metadata for compliance and debugging
 */

const logsDir = path.join(process.cwd(), 'logs');

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create daily rotate transport for audit logs
const auditTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'audit-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d', // Keep logs for 30 days
    format: logFormat,
    level: 'info'
});

// Create daily rotate transport for error logs
const errorTransport = new DailyRotateFile({
    filename: path.join(logsDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    maxSize: '20m',
    maxFiles: '30d',
    format: logFormat,
    level: 'error'
});

// Create the logger instance
const auditLogger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        auditTransport,
        errorTransport,
        // Also log to console in development
        ...(process.env.NODE_ENV !== 'production' ? [
            new winston.transports.Console({
                format: winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
            })
        ] : [])
    ]
});

export interface QueryAuditLog {
    type: 'query_execution';
    database: 'mssql' | 'sqlite';
    sql: string;
    params?: Record<string, any>;
    executionTimeMs?: number;
    success: boolean;
    error?: string;
    rowCount?: number;
}

export class AuditLogger {
    /**
     * Log a query execution
     */
    static logQuery(log: QueryAuditLog): void {
        const logEntry = {
            ...log,
            timestamp: new Date().toISOString()
        };

        if (log.success) {
            auditLogger.info('Query executed', logEntry);
        } else {
            auditLogger.error('Query failed', logEntry);
        }
    }

    /**
     * Log a general info message
     */
    static info(message: string, meta?: Record<string, any>): void {
        auditLogger.info(message, meta);
    }

    /**
     * Log an error
     */
    static error(message: string, error?: Error | unknown, meta?: Record<string, any>): void {
        auditLogger.error(message, {
            ...meta,
            error: error instanceof Error ? {
                message: error.message,
                stack: error.stack
            } : String(error)
        });
    }

    /**
     * Log a warning
     */
    static warn(message: string, meta?: Record<string, any>): void {
        auditLogger.warn(message, meta);
    }
}
