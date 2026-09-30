import mongoose from 'mongoose';
import app from './app.js';
import { connectDB } from '../../shared/connectDB.js';
import { enableGracefulShutdown } from '../../shared/gracefulShutdown.js';
import { env } from './config/env.js';
import { seedSuperAdmin } from './seedSuperAdmin.js';

async function start() {
  await connectDB(env.mongoUri, mongoose);

  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`Auth service running on http://127.0.0.1:${env.port}`);
  });
  server.on('error', (error) => {
    console.error('[auth-service] Could not listen on port ' + env.port + ':', error.message);
    process.exit(1);
  });
  enableGracefulShutdown(server, 'auth-service');

  seedSuperAdmin()
    .then(() => {
      console.log(`[auth-service:seed] Super Admin ready: ${env.superAdmin.email}`);
    })
    .catch((err) => {
      console.error('[auth-service:seed] Super Admin seed notice (non-fatal):', err.message);
    });

  return server;
}

start().catch((error) => {
  console.error('Auth service failed to start:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('[auth-service] Unhandled rejection:', error?.stack || error);
  if (env.nodeEnv === 'production') {
    process.exit(1);
  }
});

// Always exit: after an uncaught exception the process state is undefined, and
// a process that is alive but no longer serving is worse than a quick restart
// (the backend supervisor / hosting platform restarts it).
process.on('uncaughtException', (error) => {
  console.error('[auth-service] Uncaught exception:', error?.stack || error);
  process.exit(1);
});
