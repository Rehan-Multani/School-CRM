import app from './app.js';
import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { seedSuperAdmin } from './seedSuperAdmin.js';

async function start() {
  await connectDB(env.mongoUri);
  await seedSuperAdmin();

  app.listen(env.port, () => {
    console.log(`Auth service running on http://localhost:${env.port}`);
    console.log(`Super Admin seeded: ${env.superAdmin.email}`);
  });
}

start().catch((error) => {
  console.error('Auth service failed to start:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection in auth-service:', error);
  process.exit(1);
});
