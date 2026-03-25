import { ref } from 'vue';

const WS_URL = 'ws://localhost:3003/ws';

export function useWebSocket() {
  const socket = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const latestMessage = ref<any>(null);
  const messagesHistory = ref<string[]>([]);

  const connect = () => {
    if (isConnected.value && socket.value) {
      console.warn("WebSocket already connected.");
      return;
    }

    if (socket.value) {
      socket.value.close();
    }

    console.log(`[WebSocket] Attempting to connect to ${WS_URL}...`);
    
    try {
      socket.value = new WebSocket(WS_URL);

      socket.value.onopen = () => {
        isConnected.value = true;
        console.log('[WebSocket] Connected Successfully!');
        messagesHistory.value.push('Connected to WebSocket');
        
        sendMessage({ 
          type: 'INIT', 
          payload: { userId: 'demo_user' } 
        });
      };

      socket.value.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          latestMessage.value = data;
          
          const timestamp = new Date().toLocaleTimeString();
          messagesHistory.value.push(
            `[${timestamp}] ${data.type}: ${JSON.stringify(data.payload || {})}`
          );
          
          console.log('[WebSocket] Message received:', data);
        } catch (e) {
          messagesHistory.value.push(`[Raw] ${event.data}`);
          console.error('[WebSocket] Parse error:', e);
        }
      };

      socket.value.onclose = () => {
        isConnected.value = false;
        console.log('[WebSocket] Disconnected');
        messagesHistory.value.push('Disconnected from WebSocket');
      };

      socket.value.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        messagesHistory.value.push(`Error: ${error}`);
        isConnected.value = false;
      };

    } catch (error) {
      console.error('[WebSocket] Connection failed:', error);
      messagesHistory.value.push(`Connection failed: ${error}`);
    }
  };

  const sendMessage = (message: object) => {
    if (!isConnected.value || !socket.value) {
      console.warn('[WebSocket] Not connected, cannot send:', message);
      messagesHistory.value.push(`Not connected - message not sent`);
      return;
    }

    try {
      const payload = JSON.stringify(message);
      socket.value.send(payload);
      messagesHistory.value.push(`Sent: ${payload}`);
      console.log('[WebSocket] Message sent:', message);
    } catch (error) {
      console.error('[WebSocket] Send error:', error);
    }
  };

  const disconnect = () => {
    if (socket.value) {
      socket.value.close();
      socket.value = null;
      isConnected.value = false;
    }
  };

  return {
    isConnected,
    latestMessage,
    messagesHistory,
    connect,
    sendMessage,
    disconnect,
  };
}