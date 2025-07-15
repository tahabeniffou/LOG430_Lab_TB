const winston = require('winston');

// Create logger instance
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({
            format: 'YYYY-MM-DD HH:mm:ss'
        }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { 
        service: 'saga-orchestrator-service',
        version: '1.0.0'
    },
    transports: [
        // Write to all logs with level `info` and below to `combined.log`
        new winston.transports.File({ 
            filename: 'logs/error.log', 
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),
        new winston.transports.File({ 
            filename: 'logs/combined.log',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ]
});

// If we're not in production, log to the console with a simple format
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
                let metaStr = '';
                if (Object.keys(meta).length > 0) {
                    metaStr = ' ' + JSON.stringify(meta);
                }
                return `${timestamp} [${service}] ${level}: ${message}${metaStr}`;
            })
        )
    }));
}

module.exports = logger;
