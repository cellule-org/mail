import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { handleReceiveEmail } from '../email';
import { ImapConfig, MailboxesConfig, SmtpConfig } from '../types/events';
import { getCookie } from '../utils/cookies';
import { createLogger } from '../utils/logger';
import { ImapFlow, ListResponse } from 'imapflow';

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

        res.json({ success: true, data: user });
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

const getInbox = (mailboxes: ListResponse[], flags: string[]): string | undefined => {
    // Find the first mailbox that doesn't have any of the specified flags
    const mailbox = mailboxes.find((m) =>
        !Array.from(m.flags).some(flag => flags.includes(flag))
    );
    if (mailbox) {
        return mailbox.path;
    }
    return undefined;
};

const getMailbox = (mailboxes: ListResponse[], flag: string): string | undefined => {
    const mailbox = mailboxes.find((m) => Array.from(m.flags).includes(flag));
    if (mailbox) {
        return mailbox.path;
    }
    return undefined;
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
            select: { imap: true, mailboxes: true }
        });

        // Test the connection and fetch mailboxes if possible
        const client = new ImapFlow({
            host: imapConfig.host,
            port: imapConfig.port,
            secure: imapConfig.secure,
            auth: {
                user: imapConfig.username,
                pass: imapConfig.password
            },
            logger: false
        });

        await client.connect();
        const mailboxes = await client.list();
        await client.logout();

        // Check if the mailboxes are valid
        const inbox = getInbox(mailboxes, ['\\Sent', '\\Drafts', '\\Trash', '\\Spam']);
        const sent = getMailbox(mailboxes, '\\Sent');
        const drafts = getMailbox(mailboxes, '\\Drafts');
        const trash = getMailbox(mailboxes, '\\Trash');
        const spam = getMailbox(mailboxes, '\\Spam');

        const mailboxData = {
            inbox: inbox || '',
            sent: sent || '',
            drafts: drafts || '',
            trash: trash || '',
            spam: spam || ''
        };

        // Update the mailboxes configuration
        await prisma.user.update({
            where: { id: userId },
            data: {
                mailboxes: {
                    upsert: {
                        create: mailboxData,
                        update: mailboxData
                    }
                }
            }
        });

        validateAllConfig(userId);

        res.json({ success: true, imap: updatedUser.imap });
    } catch (err: any) {
        logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/mailboxes', async (req: Request, res: Response): Promise<void> => {
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
        console.log(mailboxes);
        await client.logout();

        res.json({ success: true, data: mailboxes.map((m) => m.path) });
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

        res.json({ success: true, data: updatedUser.mailboxes });
    } catch (err: any) {
        logger.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
