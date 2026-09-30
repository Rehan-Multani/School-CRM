import app from './app.js';
import { connectDB } from '../../shared/connectDB.js';
import { enableGracefulShutdown } from '../../shared/gracefulShutdown.js';
import { env } from './config/env.js';
import { seedSubscriptionPlans, clearUnselectedSchoolPlans } from './seedPlans.js';
import { seedSchools } from './seedSchools.js';
import { seedLegalDocuments } from './seedLegal.js';
import { seedInvoices } from './seedInvoices.js';
import { seedSupportTickets } from './seedSupport.js';
import { seedAcademicTeachers } from './seedAcademic.js';
import { seedStaffUsers } from './seedStaffUsers.js';
import { seedTeachers } from './seedTeachers.js';
import { seedLibraryData } from './seedLibrary.js';
import { seedRoles } from './seedRoles.js';
import { isFirebaseConfigured } from './config/firebase.js';
import { startSubscriptionCronJobs } from './cron/index.js';
import { razorpaySubscriptionService } from './services/razorpaySubscription.service.js';

function logIntegrationStatus() {
  const yes = 'CONFIGURED';
  const no = 'NOT configured';

  const firebaseOk = isFirebaseConfigured();
  const razorpayOk = razorpaySubscriptionService.isConfigured();
  const razorpayWebhookOk = razorpaySubscriptionService.webhookConfigured();

  console.log('──────────────── Integrations ────────────────');
  console.log(
    `  Firebase (push notifications): ${firebaseOk ? yes : no}` +
      (firebaseOk ? '' : ' — set FIREBASE_SERVICE_ACCOUNT_BASE64')
  );
  console.log(
    `  Razorpay (payments/subscriptions): ${razorpayOk ? yes : no}` +
      (razorpayOk ? '' : ' — set RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET')
  );
  console.log(
    `  Razorpay webhook signature: ${razorpayWebhookOk ? yes : no}` +
      (razorpayWebhookOk ? '' : ' — set RAZORPAY_WEBHOOK_SECRET (webhooks will 503 until then)')
  );
  console.log('──────────────────────────────────────────────');
}

async function runSeeds() {
  try {
    const plans = await seedSubscriptionPlans();
    await clearUnselectedSchoolPlans();
    const schools = await seedSchools();
    await seedLegalDocuments();
    const ticketCount = await seedSupportTickets();
    const invoices = await seedInvoices();
    await seedAcademicTeachers();
    await seedStaffUsers();
    await seedTeachers();
    await seedLibraryData();
    await seedRoles();

    console.log(`[platform-service:seed] Initialization complete: ${plans.length} plans, ${schools.length} schools, ${ticketCount} tickets, ${invoices.length} invoices`);
  } catch (seedErr) {
    console.error('[platform-service:seed] Background seed notice (non-fatal):', seedErr.message);
  }
}

async function start() {
  await connectDB(env.mongoUri);

  const server = app.listen(env.port, '0.0.0.0', () => {
    console.log(`Platform service running on http://127.0.0.1:${env.port}`);
    logIntegrationStatus();
  });
  server.on('error', (error) => {
    console.error('[platform-service] Could not listen on port ' + env.port + ':', error.message);
    process.exit(1);
  });
  enableGracefulShutdown(server, 'platform-service');

  // Run seeding asynchronously in the background so HTTP port is available immediately.
  // The dev supervisor sets SKIP_BOOT_SEEDS on file-change reloads: the seeders
  // are idempotent and already ran on the first start.
  if (process.env.SKIP_BOOT_SEEDS !== '1') runSeeds();

  startSubscriptionCronJobs();

  return server;
}

start().catch((error) => {
  console.error('Platform service failed to start:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('[platform-service] Unhandled rejection:', error?.stack || error);
  if (env.nodeEnv === 'production') {
    process.exit(1);
  }
});

// Always exit: after an uncaught exception the process state is undefined, and
// a process that is alive but no longer serving is worse than a quick restart
// (the backend supervisor / hosting platform restarts it).
process.on('uncaughtException', (error) => {
  console.error('[platform-service] Uncaught exception:', error?.stack || error);
  process.exit(1);
});
