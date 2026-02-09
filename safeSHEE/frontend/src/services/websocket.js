// WebSocket service for real-time alert updates
class WebSocketService {
  constructor() {
    this.ws = null;
    this.url = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectDelay = 3000;
    this.listeners = {};
  }

  connect(wsUrl = null) {
    this.url = wsUrl || this.getWebSocketUrl();
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('✅ WebSocket connected:', this.url);
          this.reconnectAttempts = 0;
          this.emit('connect');
          resolve(this);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📨 WS message:', data.type);
            this.emit(data.type, data);
          } catch (err) {
            console.error('WS parse error:', err);
          }
        };

        this.ws.onerror = (err) => {
          console.error('❌ WebSocket error:', err);
          this.emit('error', err);
          reject(err);
        };

        this.ws.onclose = () => {
          console.log('⚠️ WebSocket disconnected');
          this.emit('disconnect');
          this.attemptReconnect();
        };
      } catch (err) {
        console.error('WebSocket connection error:', err);
        reject(err);
      }
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`🔄 Reconnecting (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      setTimeout(() => {
        this.connect().catch(() => {});
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
      this.emit('reconnect_failed');
    }
  }

  getWebSocketUrl() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;
    const port = 5000;
    return `${protocol}//${host}:${port}`;
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
    }
  }

  // Register event listener
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  // Unregister event listener
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  // Emit event to all listeners
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (err) {
          console.error(`Error in ${event} listener:`, err);
        }
      });
    }
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }
}

export default new WebSocketService();
