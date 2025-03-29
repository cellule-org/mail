import { PrismaClient } from '@prisma/client';
import { MessageHandler } from '../messageHandler';
import { createLogger } from '../../utils/logger';
import { User } from '../../types/user';

const prisma = new PrismaClient();
const logger = createLogger('UserDeletedHandler');

/**
 * Handles the 'user_deleted' message type
 * Deletes a user from the database
 */
export class UserDeletedHandler implements MessageHandler {
    async handleMessage(user: User): Promise<void> {
        logger.info(`User deleted: ${user.id}`);

        try {
            await prisma.mail.deleteMany({
                where: {
                    userId: user.id,
                },
            });
            await prisma.mailboxes.deleteMany({
                where: {
                    id: user.id,
                },
            });
            await prisma.sMTP.deleteMany({
                where: {
                    id: user.id,
                },
            });
            await prisma.iMAP.deleteMany({
                where: {
                    id: user.id,
                },
            });

            await prisma.user.delete({
                where: {
                    id: user.id,
                },
            });
            logger.debug(`Successfully deleted user: ${user.id}`);
        } catch (error) {
            logger.error(`Error deleting user: ${user.id}`, error);
            throw error;
        }
    }
}
