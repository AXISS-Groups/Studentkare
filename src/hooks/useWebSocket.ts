import { useState, useEffect, useCallback, useRef } from 'react';

export interface UseWebSocketOptions {
  url: string;
  onOpen?: () => void;
  onClose?: (event: CloseEvent) => void;
  onMessage?: (event: MessageEvent) => void;
  onError?: (event: Event) => void;
  pingIntervalMs?: number;
  pongTimeoutMs?: number;
  maxRetries?: number;
}

export function useWebSocket({
  url,
  onOpen,
  onClose,
  onMessage,
  onError,
  pingIntervalMs = 30000,
  pongTimeoutMs = 5000,
  maxRetries = 10,
}: UseWebSocketOptions) {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttempts = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttempts.current = 0;
      onOpen?.();

      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
          
          pongTimeoutRef.current = setTimeout(() => {
            // Heartbeat timeout - connection dropped
            ws.close();
          }, pongTimeoutMs);
        }
      }, pingIntervalMs);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') {
          if (pongTimeoutRef.current) {
            clearTimeout(pongTimeoutRef.current);
            pongTimeoutRef.current = null;
          }
          return; // Handled internal ping/pong
        }
      } catch {
        // Not JSON or plain string, ignore parse error for raw messages
      }
      onMessage?.(event);
    };

    ws.onclose = (event) => {
      setIsConnected(false);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
      onClose?.(event);

      if (reconnectAttempts.current < maxRetries) {
        const backoffMs = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
        reconnectAttempts.current += 1;
        reconnectTimeoutRef.current = setTimeout(connect, backoffMs);
      }
    };

    ws.onerror = (event) => {
      onError?.(event);
    };
  }, [url, onOpen, onClose, onMessage, onError, pingIntervalMs, pongTimeoutMs, maxRetries]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (pongTimeoutRef.current) clearTimeout(pongTimeoutRef.current);
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((data: string | ArrayBuffer | Blob | ArrayBufferView) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(data);
    }
  }, []);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
    reconnectAttempts.current = maxRetries; // Prevent further reconnects
    if (wsRef.current) {
      wsRef.current.close();
    }
  }, [maxRetries]);

  return { isConnected, send, disconnect };
}
