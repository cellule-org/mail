import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import path from 'path';
import { RawData, WebSocket, WebSocketServer } from 'ws';
import { PrismaClient } from '@prisma/client'
import { existsSync } from 'fs';

const prisma = new PrismaClient();

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

const messageHandler = (message: RawData) => {
    const parsedMessage = JSON.parse(message.toString());
    switch (parsedMessage.type) {
        case 'message':
            console.log('Received message:', parsedMessage.data);
            break;
        default:
            console.warn(`Unknown message type: ${parsedMessage.type}`);
    }
}

const connectToWebSocketServer = async (url: string, retries: number = 50, delay: number = 3000): Promise<WebSocket> => {
    return new Promise((resolve, reject) => {
        const attempt = (retryCount: number) => {
            if (retryCount === 0) {
                return reject(new Error('Failed to connect to WebSocket server after multiple attempts'));
            }

            console.log(`Connecting to WebSocket server (attempt ${retries - retryCount + 1}/${retries})`);

            const ws = new WebSocket(url);

            ws.on('open', () => {
                console.log('Connected to WebSocket server');
                resolve(ws);
            });

            ws.on('error', (err) => {
                setTimeout(() => attempt(retryCount - 1), delay);
            });

            ws.on('close', () => {
                //console.log('WebSocket connection closed');
            });
        };

        attempt(retries);
    });
};

const createWebSocket = () => {
    const wss = new WebSocketServer({ server });

    wss.on('error', (err) => {
        console.error('WebSocket server error:', err);
    });


    return wss;
}

const start = async () => {
    try {
        core_ws = await connectToWebSocketServer(process.env.CORE_WS_URL || 'ws://core-app:3000');
        if (!core_ws) {
            throw new Error('Failed to connect to core WebSocket server');
        }
        mail_ws = createWebSocket() as WebSocketServer;

        mail_ws.on('connection', async (ws) => {
            ws.send(JSON.stringify({
                type: 'load_events',
                events: await prisma.event.findMany()
            }));

            ws.on('message', async (message) => {
                const parsedMessage = JSON.parse(message.toString());
                if (!core_ws) { // Can't happen, but TypeScript doesn't know that
                    return;
                }
                switch (parsedMessage.type) {
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
            server.listen(3001, () => {
                console.log('Server is running on http://localhost:3001');
                console.log('WebSocket server is running on ws://localhost:3001');
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
