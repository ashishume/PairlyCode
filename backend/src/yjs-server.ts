// @ts-nocheck
import { setupWSConnection } from '@y-websocket/server';
import { WebSocketServer } from 'ws';

const port = parseInt(process.env.YJS_PORT || '1234', 10);
const wss = new WebSocketServer({ port });

wss.on('connection', (conn, req) => {
  setupWSConnection(conn, req);
});

console.log(`Yjs WebSocket server running on port ${port}`);
