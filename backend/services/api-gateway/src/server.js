import app from './app.js';
import { env } from './config/env.js';
import { enableGracefulShutdown } from '../../shared/gracefulShutdown.js';

const server = app.listen(env.port, '0.0.0.0', () => {
  console.log(`API Gateway running on http://127.0.0.1:${env.port}`);
  console.log(`  Auth     -> ${env.authServiceUrl}`);
  console.log(`  Platform -> ${env.platformServiceUrl}`);
});
server.on('error', (error) => {
  console.error('[api-gateway] Could not listen on port ' + env.port + ':', error.message);
  process.exit(1);
});
enableGracefulShutdown(server, 'api-gateway');

process.on('unhandledRejection', (error) => {
  console.error('[api-gateway] Unhandled rejection:', error?.stack || error);
  if (env.nodeEnv === 'production') {
    process.exit(1);
  }
});

// Always exit: after an uncaught exception the process state is undefined, and
// a process that is alive but no longer serving is worse than a quick restart
// (the backend supervisor / hosting platform restarts it).
process.on('uncaughtException', (error) => {
  console.error('[api-gateway] Uncaught exception:', error?.stack || error);
  process.exit(1);
});
