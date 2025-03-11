import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import path from 'path';
import { WebSocket, WebSocketServer } from 'ws';
import { existsSync } from 'fs';
import { connectToWebSocketServer, createWebSocket, messageHandler } from './websocket';
import { handleSendEmail, handleReceiveEmail } from './email';

const app = express();
const server = createServer(app);

let core_ws: WebSocket | null = null;
let mail_ws: WebSocketServer | null = null;

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Request error:', err);
    res.status(500).send({ error: 'Internal Server Error' });
});

app.get("/", (req: Request, res: Response) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
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

const start = async () => {
    try {
        core_ws = await connectToWebSocketServer(process.env.CORE_WS_URL || 'ws://core-app:3000');
        if (!core_ws) {
            throw new Error('Failed to connect to core WebSocket server');
        }
        mail_ws = createWebSocket(server) as WebSocketServer;
        handleReceiveEmail();
        mail_ws.on('connection', async (ws) => {
            ws.on('message', async (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (!core_ws) { // Can't happen, but TypeScript doesn't know that
                    return;
                }
                switch (parsedMessage.type) {
                    case 'send_email':
                        try {
                            handleSendEmail(ws, parsedMessage.data);
                        } catch (err) {
                            console.error('Error sending email:', err);
                        }
                        break;
                    default:
                        console.warn(`Unknown message type: ${parsedMessage.type}`);
                }
            });
        });

        core_ws.send(JSON.stringify({
            type: "create",
            data: {
                id: "send_email",
                name: "Send Email",
            }
        }));

        core_ws.send(JSON.stringify({
            type: "create",
            data: {
                id: "receive_email",
                name: "Receive Email",
            }
        }));

        core_ws.on('message', (message) => {
            messageHandler(message);
        });

        core_ws.on('close', () => {
            console.log('WebSocket connection closed, clearing event and restarting...');
            if (core_ws) {
                core_ws.removeAllListeners();
            }
            server.close();
            start();
        });

        try {
            server.listen(3002, () => {
                console.log('Server is running on http://localhost:3002');
                console.log('WebSocket server is running on ws://localhost:3002');
            });
        } catch (err) {
            //Do nothing
        }
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
};

start();
