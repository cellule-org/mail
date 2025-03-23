import express, { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { handleReceiveEmail } from '../email';

const router = express.Router();
router.use(express.json());
const prisma = new PrismaClient();

export const getCookie = (cookieHeader: string | undefined, name: string): string | null => {
    if (!cookieHeader) return null;
    const cookies = cookieHeader.split(';').map(v => v.trim());
    for (const cookie of cookies) {
        const [key, value] = cookie.split('=');
        if (key === name) return value;
    }
    return null;
};

type SmtpConfig = {
    host: string
    port: number
    username: string
    password: string
    secure: boolean
}

type ImapConfig = {
    host: string
    port: number
    username: string
    password: string
    secure: boolean
}

type MailboxesConfig = {
    inbox: string
    sent: string
    drafts: string
    trash: string
    spam: string
}
const getUserConfig = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    } catch (err) {
        console.error(err);
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

router.post('/imap', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/smtp', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/mailboxes', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
