import { createContext, useContext, ReactNode } from "react"
import { useWebSocket } from "./use-web-socket"

export interface WebSocketProviderConfig {
  url: string
  reconnectAttempts?: number
  reconnectInterval?: number
  protocols?: string | string[]
  autoConnect?: boolean
}
interface WebSocketContextType {
  status: "connecting" | "open" | "closing" | "closed" | "error"
  messages: any[]
  sendMessage: (message: string | { type: string; data: any }) => boolean
  connect: () => void
  disconnect: () => void
  getWebSocket: () => WebSocket | null
  onMessage?: (data: any) => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error("useWebSocketContext doit être utilisé à l'intérieur d'un WebSocketProvider")
  }
  return context
}

interface WebSocketProviderProps {
  children: ReactNode
  config: WebSocketProviderConfig
  onMessage?: (data: any) => void
  onOpen?: (event: Event) => void
  onClose?: (event: CloseEvent) => void
  onError?: (event: Event) => void
}

export function WebSocketProvider({
  children,
  config,
  onMessage,
  onOpen,
  onClose,
  onError,
}: WebSocketProviderProps) {
  const webSocket = useWebSocket({
    url: config.url,
    reconnectAttempts: config.reconnectAttempts,
    reconnectInterval: config.reconnectInterval,
    protocols: config.protocols,
    autoConnect: config.autoConnect,
    onMessage,
    onOpen,
    onClose,
    onError,
  })

  return (
    <WebSocketContext.Provider value={webSocket}>
      {children}
    </WebSocketContext.Provider>
  )
}
