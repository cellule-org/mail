import { RawData, WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { PrismaClient } from '@prisma/client';
import { EventsController } from './controller/eventsController';
import { CoreEvents, EmailEvents } from './types/events';
import { config } from './config';
import { createLogger } from './utils/logger';
import { CoreUserHandler, UserDeletedHandler, UserRegisteredHandler } from './handlers';

// Initialize logger
const logger = createLogger('websocket');
const prisma = new PrismaClient();

interface MessageHandler {
    handleMessage(message: any): Promise<void>;
}

/**
 * Main event controller setup
 */
const setupEventController = (): EventsController => {
    const eventController = new EventsController();

    const coreUserHandler = new CoreUserHandler();
    const userRegisteredHandler = new UserRegisteredHandler();
    const userDeletedHandler = new UserDeletedHandler();

    eventController.assignFunction('core_users', coreUserHandler);
    eventController.assignFunction(CoreEvents.USER_REGISTERED, userRegisteredHandler);
    eventController.assignFunction(CoreEvents.USER_DELETED, userDeletedHandler);

    return eventController;
};

// Initialize event controller
const eventController = setupEventController();

/**
 * Handles incoming WebSocket messages
 */
export const messageHandler = async (message: RawData): Promise<void> => {
    try {
        const parsedMessage = JSON.parse(message.toString());
        logger.debug(parsedMessage)
        logger.debug('Received message', { type: parsedMessage.type });

        if (eventController.has(parsedMessage.type)) {
            await eventController.call(parsedMessage.type, parsedMessage);
            return;
        }

        // Log unknown message types
        if (parsedMessage.type) {
            logger.warn(`Unknown message type: ${parsedMessage.type}`);
        } else {
            logger.warn('Received message without type', parsedMessage);
        }
    } catch (error) {
        logger.error('Error processing message', error);
    }
};

/**
 * Connect to WebSocket server with retry mechanism
 */
export const connectToWebSocketServer = async (url: string = config.coreWsUrl, retries: number = config.retry.maxAttempts, delay: number = config.retry.delay): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
        const attempt = (retryCount: number) => {
            if (retryCount === 0) {
                const error = new Error('Failed to connect to WebSocket server after multiple attempts');
                logger.error(error.message);
                return reject(error);
            }

            logger.info(`Connecting to WebSocket server (attempt ${retries - retryCount + 1}/${retries})`);

            const ws = new WebSocket(url);

            ws.on('open', () => {
                logger.info('Connected to WebSocket server');
                resolve(ws);
            });

            ws.on('error', (err) => {
                logger.warn(`Connection attempt failed: ${err.message}`);
                setTimeout(() => attempt(retryCount - 1), delay);
            });

            ws.on('close', (code, reason) => {
                logger.warn(`Connection closed during connection attempt: ${code} - ${reason}`);
                setTimeout(() => attempt(retryCount - 1), delay);
            });
        };

        attempt(retries);
    });
};

/**
 * Create WebSocket Server
 */
export const createWebSocket = (server: Server): WebSocketServer => {
    const wss = new WebSocketServer({ server });

    wss.on('error', (err) => {
        logger.error('WebSocket server error:', err);
    });

    wss.on('listening', () => {
        logger.info('WebSocket server is listening');
    });

    return wss;
};

/**
 * Register events with the core server
 */
export const registerCoreEvents = (coreWs: WebSocket): void => {
    const events = [
        { id: EmailEvents.EMAIL_SENT, name: 'Mail sent' },
        { id: EmailEvents.EMAIL_RECEIVED, name: 'Mail received' },
    ];

    for (const event of events) {
        coreWs.send(JSON.stringify({
            type: 'create',
            data: event
        }));
    }
};

/**
 * Ping function to keep connection alive
 */
export const startHeartbeat = (ws: WebSocket, interval: number = 30000): NodeJS.Timeout => {
    return setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.ping();
            logger.debug('Sent ping to keep connection alive');
        }
    }, interval);
};
