import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import path from 'path';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import { existsSync } from 'fs';
import { connectToWebSocketServer, createWebSocket, messageHandler } from './websocket';
import { handleSendEmail, handleReceiveEmail, addFlag, removeFlag, createTransporter, createImapFlow } from './email';
import { PrismaClient } from '@prisma/client';
import jwt from 'jsonwebtoken';

import settingsRouter from './routes/settings';

import { Transporter } from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { ImapFlow } from 'imapflow';
import { createLogger } from './utils/logger';
import { checkIfLatestVersion } from './utils/version';



checkIfLatestVersion()
    .then((result) => {
        const versionLogger = createLogger('version');
        if (result.isLatest) {
            versionLogger.info(`Version ${process.env.APP_VERSION} is up to date.`);
        } else {
            versionLogger.warn(`Version ${process.env.APP_VERSION} is not the latest.`);
            versionLogger.warn(`Latest version: ${result.latestVersion}`);
            versionLogger.warn(`Current version: ${process.env.APP_VERSION}`);
            versionLogger.warn(`Latest digest: ${result.latestDigest}`);
            versionLogger.warn(`Current digest: ${result.currentDigest}`);
        }
    })
    .catch(err => {
        console.error('Error checking version:', err.message);
    });

const logger = createLogger('main');

const app = express();

app.use('/api/settings', settingsRouter);

const server = createServer(app);

const prisma = new PrismaClient();

interface UserConnections {
    transporter: Transporter<SMTPTransport.SentMessageInfo, SMTPTransport.Options>;
    imap_flow: ImapFlow;
}


export const userConnections = new Map<string, UserConnections>();

export let mail_ws: WebSocketServer | null = null;

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Request error:', err);
    res.status(500).send({ error: 'Internal Server Error' });
});

app.get("/assets/:filename", (req: Request, res: Response) => {
    const { filename } = req.params;
    res.sendFile(path.join(__dirname, 'dist', 'assets', filename));
});

app.get("/locales/:lng/translation.json", (req: Request, res: Response) => {
    const { lng } = req.params;
    const filePath = path.join(__dirname, 'dist', 'locales', lng, 'translation.json');

    if (!existsSync(filePath)) {
        const [primaryLng] = lng.split('-');
        const fallbackFilePath = path.join(__dirname, 'dist', 'locales', primaryLng, 'translation.json');
        if (existsSync(fallbackFilePath)) {
            return res.sendFile(fallbackFilePath);
        }
    }

    res.sendFile(filePath);
});

app.get('*', (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const initializeWebSocket = async (): Promise<void> => {
    try {
        const core_ws = await connectToWebSocketServer(process.env.CORE_WS_URL || 'ws://core-app:3000');
        if (!core_ws) throw new Error('Failed to connect to core WebSocket server');

        const mail_ws = createWebSocket(server) as WebSocketServer;

        mail_ws.on('connection', (ws: WebSocket) => handleConnection(ws));

        registerCoreEvents(core_ws);

        core_ws.on('message', messageHandler);
        core_ws.on('close', handleWebSocketClose);

        try {
            startServer();
        } catch (err) {
            //the server is already running
        }
    } catch (err) {
        logger.error('Failed to initialize WebSocket server');
        process.exit(1);
    }
};

const handleConnection = async (ws: WebSocket): Promise<void> => {
    logger.info('New WebSocket connection');
    ws.on('message', (message: RawData) => handleMessage(ws, message));
};

const handleMessage = async (ws: WebSocket, message: RawData): Promise<void> => {
    const parsedMessage = parseMessage(message);
    if (!parsedMessage) return;
    let { type, data, auth } = parsedMessage;
    if (auth && auth.accessToken) {
        const decodedToken = jwt.decode(auth.accessToken) as { id: string } | null;
        if (decodedToken?.id) {
            data.userId = decodedToken.id;
        }
    }

    switch (type) {
        case 'user_auth':
            await handleUserAuth(ws, data);
            break;
        case 'send_email':
            safeExecute(() => handleSendEmail(ws, data, false), 'sending email');
            break;
        case 'reply_email':
            safeExecute(() => handleSendEmail(ws, data, true), 'replying to email');
            break;
        case 'load_mails':
            loadMails(ws, data.userId, data.pagination, data.mailbox);
            break;
        case 'delete':
            deleteMail(ws, data.id, data.userId);
            break;
        case 'mark_as_read':
            modifyFlag(ws, data.id, data.userId, '\\Seen', addFlag);
            break;
        case 'mark_as_unread':
            modifyFlag(ws, data.id, data.userId, '\\Seen', removeFlag);
            break;
        default:
            logger.warn(`Unknown message type: ${type}`);
    }
};

const parseMessage = (message: RawData): { type: string, data: any, auth: { accessToken: string | null } | null } | null => {
    try {
        return JSON.parse(message.toString());
    } catch {
        return null;
    }
};

const handleUserAuth = async (ws: WebSocket, data: { accessToken: string }): Promise<void> => {
    const jwtObject = jwt.decode(data.accessToken) as { id: string };
    const { id } = jwtObject;
    const userConfig = await prisma.user.findUnique({ where: { id }, include: { imap: true, smtp: true } });

    if (!userConfig?.imap || !userConfig?.smtp) {
        sendData(ws, 'missing_mail_config', { imap: !userConfig?.imap, smtp: !userConfig?.smtp });
    } else {
        if (!userConnections.has(id)) {
            userConnections.set(id, { transporter: createTransporter(userConfig.smtp), imap_flow: createImapFlow(userConfig.imap) });
            ws.send(JSON.stringify({
                type: 'message',
                data: {
                    type: 'info',
                    title: 'notifications.email_sync_start.title',
                    message: 'notifications.email_sync_start.message'
                }
            }));
            await handleReceiveEmail(id);
            ws.send(JSON.stringify({
                type: 'message',
                data: {
                    type: 'success',
                    title: 'notifications.email_sync_complete.title',
                    message: 'notifications.email_sync_complete.message'
                }
            }));
        }
        sendInitialData(ws, id);
        const mails = await prisma.mail.findMany({
            where: { userId: id },
            take: 20,
            orderBy: { date: 'desc' }
        });
        sendData(ws, 'load_mails', mails);
    }
};

const loadMails = async (ws: WebSocket, userId: string, pagination = 0, mailbox?: string): Promise<void> => {
    const query: any = { userId };
    if (mailbox) {
        query.mailboxId = mailbox;
    }

    const mails = await prisma.mail.findMany({
        where: query,
        take: 20,
        skip: 20 * pagination,
        orderBy: { date: 'desc' }
    });

    sendData(ws, 'load_mails', mails);
};

const deleteMail = async (ws: WebSocket, id: string, user_id: string): Promise<void> => {
    if (!user_id) {
        return;
    }
    try {
        await prisma.mail.delete({
            where: {
                id: {
                    mailId: id,
                    userId: user_id
                }
            }
        });
        sendData(ws, 'delete_success', { id });
    } catch (err) {
        logger.error('Error deleting mail:', err);
    }
};

const modifyFlag = (ws: WebSocket, uid: string, user_id: string, flag: string, action: Function): void => {
    safeExecute(() => action(ws, { uid, user_id, flag }), `modifying flag: ${flag}`);
};

const safeExecute = (func: Function, description: string): void => {
    try {
        func();
    } catch (err) {
        logger.error(`Error ${description}:`, err);
    }
};

const sendInitialData = async (ws: WebSocket, user_id: string) => {
    let user = await prisma.user.findUnique({ where: { id: user_id }, include: { mailboxes: true } });
    if (!user || !user.mailboxes) return;
    sendData(ws, 'mailboxes_variables', {
        INBOX: user.mailboxes.inbox,
        SENT: user.mailboxes.sent,
        DRAFTS: user.mailboxes.drafts,
        TRASH: user.mailboxes.trash,
        SPAM: user.mailboxes.spam
    });
};

const sendData = (ws: WebSocket, type: string, data: any): void => {
    ws.send(JSON.stringify({ type, data }));
};

const registerCoreEvents = (core_ws: WebSocket): void => {
    ['send_email', 'receive_email'].forEach((id) => {
        id = "cellule_mail_" + id;
        core_ws.send(JSON.stringify({ type: 'create', data: { id, name: id.replace('_', ' ').toUpperCase() } }));
    });
};

const handleWebSocketClose = (): void => {
    logger.warn('WebSocket connection closed, clearing event and restarting...');
    initializeWebSocket();
};

const startServer = (): void => {
    server.listen(3002, () => {
        logger.info('Server is running on http://localhost:3002');
        logger.info('WebSocket server is running on ws://localhost:3002');
    });
};

initializeWebSocket();

