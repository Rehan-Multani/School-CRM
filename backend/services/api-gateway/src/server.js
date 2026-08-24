import app from './app.js';
import { env } from './config/env.js';

app.listen(env.port, () => {
  console.log(`API Gateway running on http://localhost:${env.port}`);
  console.log(`  Auth     -> ${env.authServiceUrl}`);
  console.log(`  Platform -> ${env.platformServiceUrl}`);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection in api-gateway:', error);
  process.exit(1);
});
