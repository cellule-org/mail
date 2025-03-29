/**
 * Application configuration
 * Loads variables from environment and provides defaults
 */
export const config = {
    port: parseInt(process.env.PORT || '3002'),
    coreWsUrl: process.env.CORE_WS_URL || 'ws://core-app:3000',
    database: {
        url: process.env.DATABASE_URL
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-key-for-dev'
    },
    logging: {
        level: process.env.LOG_LEVEL || 'info'
    },
    retry: {
        maxAttempts: 50,
        delay: 3000
    }
};

// Validate essential config
if (!config.database.url) {
    throw new Error('DATABASE_URL environment variable is required');
}
