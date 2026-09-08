import app from './app.js';
import { env } from './config/env.js';

app.listen(env.port, '0.0.0.0', () => {
  console.log(`API Gateway running on http://127.0.0.1:${env.port}`);
  console.log(`  Auth     -> ${env.authServiceUrl}`);
  console.log(`  Platform -> ${env.platformServiceUrl}`);
});

process.on('unhandledRejection', (error) => {
  console.error('[api-gateway] Unhandled rejection:', error?.stack || error);
  if (env.nodeEnv === 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (error) => {
  console.error('[api-gateway] Uncaught exception:', error?.stack || error);
  if (env.nodeEnv === 'production') {
    process.exit(1);
  }
});
