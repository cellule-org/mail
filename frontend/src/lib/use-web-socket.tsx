import { useState, useEffect, useCallback, useRef } from 'react';

type ConnectionStatus = 'connecting' | 'open' | 'closing' | 'closed' | 'error';

interface WebSocketMessage {
    type: string;
    data: any;
}

interface UseWebSocketOptions {
    url: string;
    reconnectAttempts?: number;
    reconnectInterval?: number;
    onOpen?: (event: Event) => void;
    onClose?: (event: CloseEvent) => void;
    onError?: (event: Event) => void;
    onMessage?: (data: any) => void;
    protocols?: string | string[];
    autoConnect?: boolean;
}
export function useWebSocket({
    url,
    reconnectAttempts = 5,
    reconnectInterval = 3000,
    onOpen,
    onClose,
    onError,
    onMessage,
    protocols,
    autoConnect = true,
}: UseWebSocketOptions) {
    const [status, setStatus] = useState<ConnectionStatus>('closed');
    const [messages, setMessages] = useState<any[]>([]);
    const webSocketRef = useRef<WebSocket | null>(null);
    const reconnectCountRef = useRef(0);
    const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);

    const connect = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }

        if (webSocketRef.current) {
            webSocketRef.current.close();
        }

        try {
            setStatus('connecting');
            webSocketRef.current = new WebSocket(url, protocols);

            webSocketRef.current.onopen = (event) => {
                setStatus('open');
                reconnectCountRef.current = 0;
                if (onOpen) onOpen(event);
            };

            webSocketRef.current.onclose = (event) => {
                setStatus('closed');
                if (onClose) onClose(event);

                if (!event.wasClean && reconnectCountRef.current < reconnectAttempts) {
                    reconnectCountRef.current += 1;
                    reconnectTimerRef.current = setTimeout(() => {
                        connect();
                    }, reconnectInterval);
                }
            };

            webSocketRef.current.onerror = (event) => {
                setStatus('error');
                if (onError) onError(event);
            };

            webSocketRef.current.onmessage = (event) => {
                let parsedData;
                try {
                    parsedData = JSON.parse(event.data);
                } catch (error) {
                    parsedData = event.data;
                }

                setMessages((prev) => [...prev, parsedData]);
                if (onMessage) onMessage(parsedData);
            };
        } catch (error) {
            setStatus('error');
            console.error('WebSocket connection error:', error);
        }
    }, [url, protocols, reconnectAttempts, reconnectInterval, onOpen, onClose, onError, onMessage]);

    const sendMessage = useCallback((message: string | WebSocketMessage) => {
        if (webSocketRef.current && webSocketRef.current.readyState === WebSocket.OPEN) {
            const messageToSend = typeof message === 'string' ? message : JSON.stringify(message);
            webSocketRef.current.send(messageToSend);
            return true;
        }
        return false;
    }, []);

    const disconnect = useCallback(() => {
        if (reconnectTimerRef.current) {
            clearTimeout(reconnectTimerRef.current);
            reconnectTimerRef.current = null;
        }

        if (webSocketRef.current) {
            setStatus('closing');
            webSocketRef.current.close();
        }
    }, []);

    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        return () => {
            if (reconnectTimerRef.current) {
                clearTimeout(reconnectTimerRef.current);
            }
            if (webSocketRef.current) {
                webSocketRef.current.close();
            }
        };
    }, [connect, autoConnect]);

    return {
        status,
        messages,
        sendMessage,
        connect,
        disconnect,
        getWebSocket: () => webSocketRef.current,
        onMessage,
    };
}
