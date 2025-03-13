import { createRoot } from 'react-dom/client'
import { Routes } from '@generouted/react-router'
import './i18n/config';

import './index.css'
import { ThemeProvider } from '@/components/theme-provider';
import { WebSocketProvider } from '@/lib/websocket-context';

const currentUrl = window.location.href
const wsUrl = currentUrl.replace('http', 'ws').replace('https', 'wss')

const websocketConfig = {
    url: wsUrl,
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    autoConnect: true,
}

const handleGlobalMessage = (_data: any) => {
    return
}

const handleLoadEvents = (data: any) => {
    if (data.type === 'mailboxes_variables') {
        const { INBOX, SENT, DRAFTS, TRASH, SPAM } = data.data;
        sessionStorage.setItem('mailboxes', JSON.stringify({ INBOX, SENT, DRAFTS, TRASH, SPAM }));
    } else if (data.type === 'load_mails') {
        const event = new CustomEvent('load_mails', { detail: data.data });
        window.dispatchEvent(event);
    }
}

createRoot(document.getElementById('root')!).render(
    <WebSocketProvider
        config={websocketConfig}
        onMessage={(data) => {
            handleGlobalMessage(data);
            handleLoadEvents(data);
        }}
        onOpen={(event) => console.log("WebSocket connecté", event)}
        onError={(event) => console.error("Erreur WebSocket", event)}
    >
        <ThemeProvider>
            <Routes />
        </ThemeProvider>
    </WebSocketProvider>
)
