import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import app from './api/index.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Port assigned by cPanel Phusion Passenger or fallback to 5000
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[School-CRM] Server is running on port ${PORT}`);
});

server.on('error', (err) => {
  console.error('[School-CRM] Server failed to start:', err.message);
});

export default server;
