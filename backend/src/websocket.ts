import { RawData, WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface User {
    id: string;
    username: string;
}


export const messageHandler = async (message: RawData) => {
    const parsedMessage = JSON.parse(message.toString());
    switch (parsedMessage.type) {
        case "core_users":
            let data = parsedMessage.users as User[];
            await prisma.user.createMany({
                data: data,
                skipDuplicates: true,
            });
            break;
        case 'message':
            //console.log('Received message:', parsedMessage.data);
            break;
        default:
            if (parsedMessage.type) console.warn(`core: Unknown message type: ${parsedMessage.type}`);
            else console.warn('core: Unknown message:', parsedMessage);
    }
}

export const connectToWebSocketServer = async (url: string, retries: number = 50, delay: number = 3000): Promise<WebSocket> => {
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

export const createWebSocket = (server: Server) => {
    const wss = new WebSocketServer({ server });

    wss.on('error', (err) => {
        console.error('WebSocket server error:', err);
    });

    return wss;
}
