import { PrismaClient } from '@prisma/client';
import { MessageHandler } from '../messageHandler';
import { createLogger } from '../../utils/logger';
import { User } from '../../types/user';

const prisma = new PrismaClient();
const logger = createLogger('UserRegisteredHandler');

/**
 * Handles the 'user_registered' message type
 * Creates a single new user
 */
export class UserRegisteredHandler implements MessageHandler {
    async handleMessage(user: User): Promise<void> {
        logger.info(`User registered: ${user.username} (${user.id})`);

        try {
            await prisma.user.create({
                data: user,
            });
            logger.debug(`Successfully created user: ${user.id}`);
        } catch (error) {
            logger.error(`Error creating user: ${user.id}`, error);
            throw error;
        }
    }
}
