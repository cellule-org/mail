import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { handleReceiveEmail } from '../email';
import { ImapConfig, MailboxesConfig, SmtpConfig } from '../types/events';
import { getCookie } from '../utils/cookies';
import { createLogger } from '../utils/logger';
import { ImapFlow } from 'imapflow';

const router = express.Router();
router.use(express.json());
const prisma = new PrismaClient();
const logger = createLogger('settings');

const getUserConfig = async (req: Request, res: Response): Promise<void> => {
    try {
        const token = getCookie(req.headers.cookie, 'accessToken');
        if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
        const jwtObject = jwt.decode(token) as { id: string } | null;
        if (!jwtObject) { res.status(401).json({ error: 'Unauthorized' }); return; }
        const userId = jwtObject.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { smtp: true, imap: true, mailboxes: true }
        });

        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }

        if (user.smtp) user.smtp.password = '';
        if (user.imap) user.imap.password = '';

        res.json({ success: true, ...user });
    } catch (err: any) {
        logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

router.get('/', getUserConfig);

const validateAllConfig = async (user_id: string) => {
    const user = await prisma.user.findUnique({
        where: { id: user_id },
        select: { smtp: true, imap: true, mailboxes: true }
    });
    if (user && user.smtp && user.imap && user.mailboxes) {
        handleReceiveEmail(user_id);
    }
};

router.post('/imap', async (req: Request, res: Response): Promise<void> => {
    try {
        const token = getCookie(req.headers.cookie, 'accessToken');
        if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
        const jwtObject = jwt.decode(token) as { id: string } | null;
        if (!jwtObject) { res.status(401).json({ error: 'Unauthorized' }); return; }
        const userId = jwtObject.id;

        const imapConfig = req.body as ImapConfig;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                imap: {
                    upsert: {
                        create: imapConfig,
                        update: imapConfig
                    }
                }
            },
            select: { imap: true }
        });

        validateAllConfig(userId);

        res.json({ success: true, imap: updatedUser.imap });
    } catch (err: any) {
        logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/mailboxes-list', async (req: Request, res: Response): Promise<void> => {
    try {
        const token = getCookie(req.headers.cookie, 'accessToken');
        if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
        const jwtObject = jwt.decode(token) as { id: string } | null;
        if (!jwtObject) { res.status(401).json({ error: 'Unauthorized' }); return; }
        const userId = jwtObject.id;

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { imap: true }
        });

        if (!user?.imap) {
            res.status(404).json({ error: 'IMAP configuration not found' });
            return;
        }

        const client = new ImapFlow({
            host: user.imap.host,
            port: user.imap.port,
            secure: user.imap.secure,
            auth: {
                user: user.imap.username,
                pass: user.imap.password
            },
            logger: false
        });

        await client.connect();

        const mailboxes = await client.list();

        await client.logout();

        res.json({ success: true, mailboxes });
    } catch (err: any) {
        logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/smtp', async (req: Request, res: Response): Promise<void> => {
    try {
        const token = getCookie(req.headers.cookie, 'accessToken');
        if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
        const jwtObject = jwt.decode(token) as { id: string } | null;
        if (!jwtObject) { res.status(401).json({ error: 'Unauthorized' }); return; }
        const userId = jwtObject.id;

        const smtpConfig = req.body as SmtpConfig;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                smtp: {
                    upsert: {
                        create: smtpConfig,
                        update: smtpConfig
                    }
                }
            },
            select: { smtp: true }
        });

        validateAllConfig(userId);

        res.json({ success: true, smtp: updatedUser.smtp });
    } catch (err: any) {
        logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/mailboxes', async (req: Request, res: Response): Promise<void> => {
    try {
        const token = getCookie(req.headers.cookie, 'accessToken');
        if (!token) { res.status(401).json({ error: 'Unauthorized' }); return; }
        const jwtObject = jwt.decode(token) as { id: string } | null;
        if (!jwtObject) { res.status(401).json({ error: 'Unauthorized' }); return; }
        const userId = jwtObject.id;

        const mailboxesConfig = req.body as MailboxesConfig;

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                mailboxes: {
                    upsert: {
                        create: mailboxesConfig,
                        update: mailboxesConfig
                    }
                }
            },
            select: { mailboxes: true }
        });

        validateAllConfig(userId);

        res.json({ success: true, mailboxes: updatedUser.mailboxes });
    } catch (err: any) {
        logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
