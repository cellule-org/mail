import { Routes } from '@generouted/react-router';
import './i18n/config';
import { ThemeProvider } from '@/components/theme-provider';
import { WebSocketProvider } from '@/lib/websocket-context';
import { TooltipProvider } from './components/ui/tooltip';
import { Toaster } from 'sonner';
import { toast } from 'sonner';
import { useTheme } from '@/components/theme-provider';


const currentUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port}`;
const wsUrl = currentUrl.replace('http', 'ws').replace('https', 'wss');

const websocketConfig = {
    url: wsUrl,
    reconnectAttempts: 5,
    reconnectInterval: 3000,
    autoConnect: true,
}

interface GlobalMessage {
    type: string;
    title: string;
    message: string;
}

interface MessageEvent {
    type: string;
    data: any | GlobalMessage;
}

const handleGlobalMessage = (data: MessageEvent) => {
    if (data.type === "message") {
        data = data as { type: string, data: GlobalMessage };
        if (data.data.type === 'success') {
            toast.success(data.data.message, data.data.title);
        } else if (data.data.type === 'info') {
            toast.info(data.data.message, data.data.title);
        } else if (data.data.type === 'error') {
            toast.error(data.data.message, data.data.title);
        }
    }
    return;
}

const handleLoadEvents = (data: any) => {
    if (data.type === 'mailboxes_variables') {
        const { INBOX, SENT, DRAFTS, TRASH, SPAM } = data.data as { INBOX: string, SENT: string, DRAFTS: string, TRASH: string, SPAM: string };
        const event = new CustomEvent('mailboxes_variables', { detail: { INBOX, SENT, DRAFTS, TRASH, SPAM } });
        window.dispatchEvent(event);
    } else if (data.type === 'load_mails') {
        const event = new CustomEvent('load_mails', { detail: data.data });
        window.dispatchEvent(event);
    } else if (data.type === 'missing_mail_config') {
        const event = new CustomEvent('missing_mail_config', { detail: data.data });
        window.dispatchEvent(event);
    }
}

const App = () => {
    const { theme } = useTheme();

    return (
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
                <TooltipProvider>
                    <Routes />
                    <Toaster richColors={true} theme={theme} />
                </TooltipProvider>
            </ThemeProvider>
        </WebSocketProvider>
    );
}

export default App;
