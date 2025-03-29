import { PrismaClient } from '@prisma/client';
import { MessageHandler } from '../messageHandler';
import { createLogger } from '../../utils/logger';
import { User } from '../../types/user';

const prisma = new PrismaClient();
const logger = createLogger('CoreUserHandler');

/**
 * Handles the 'core_users' message type
 * Creates multiple users at once
 */
export class CoreUserHandler implements MessageHandler {
    async handleMessage(data: { type: string, users: User[] }): Promise<void> {
        const { users } = data;
        logger.info(`Received core_users with ${users.length} users`);

        try {
            await prisma.user.createMany({
                data: users,
                skipDuplicates: true,
            });
            logger.debug(`Successfully created/updated ${users.length} users`);
        } catch (error) {
            logger.error('Error processing core_users message', error);
            throw error;
        }
    }
}
