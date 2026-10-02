import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './api/index.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Port or Unix socket assigned by cPanel Phusion Passenger (or fallback to 5000)
const PORT = process.env.PORT || 5000;

// Passenger passes a socket path in PORT on Linux; omit host parameter for socket compatibility
const server = app.listen(PORT, () => {
  console.log(`[School-CRM] Server is listening on ${PORT}`);
});

server.on('error', (err) => {
  console.error('[School-CRM] Server failed to start:', err.message);
});

export default server;
