const WebSocket = require('ws');

class WebSocketManager {
  constructor() {
    this.clients = new Set();
  }

  // Initialize WebSocket server attached to HTTP server
  initialize(server) {
    this.wss = new WebSocket.Server({ server });
    
    this.wss.on('connection', (ws) => {
      console.log('Client connected (total:', this.clients.size + 1, ')');
      this.clients.add(ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message);
          console.log('WS message received:', data.type);
          // Handle client messages if needed
        } catch (err) {
          console.error('WS parse error:', err.message);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        console.log('Client disconnected (total:', this.clients.size, ')');
      });

      ws.on('error', (err) => {
        console.error('WS error:', err.message);
      });

      // Send welcome message
      ws.send(JSON.stringify({ type: 'connect', message: 'Connected to safeSHEE alerts' }));
    });
  }

  // Broadcast alert update to all connected clients
  broadcastAlertUpdate(alert) {
    const message = JSON.stringify({
      type: 'alert_update',
      alert: alert,
      timestamp: Date.now()
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Broadcast new alert creation
  broadcastNewAlert(alert) {
    const message = JSON.stringify({
      type: 'new_alert',
      alert: alert,
      timestamp: Date.now()
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Broadcast alert status change
  broadcastStatusChange(alertId, status) {
    const message = JSON.stringify({
      type: 'status_change',
      alertId: alertId,
      status: status,
      timestamp: Date.now()
    });

    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }
}

module.exports = new WebSocketManager();
