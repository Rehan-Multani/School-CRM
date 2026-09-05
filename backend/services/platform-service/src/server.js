import app from './app.js';
import { connectDB } from '../../shared/connectDB.js';
import { env } from './config/env.js';
import { seedSubscriptionPlans, clearUnselectedSchoolPlans } from './seedPlans.js';
import { seedSchools } from './seedSchools.js';
import { seedLegalDocuments } from './seedLegal.js';
import { seedInvoices } from './seedInvoices.js';
import { seedSupportTickets } from './seedSupport.js';
import { seedAcademicTeachers } from './seedAcademic.js';
import { seedStaffUsers } from './seedStaffUsers.js';
import { seedLibraryData } from './seedLibrary.js';
import { seedRoles } from './seedRoles.js';
import { isFirebaseConfigured } from './config/firebase.js';
import { startSubscriptionCronJobs } from './cron/index.js';
import { razorpaySubscriptionService } from './services/razorpaySubscription.service.js';

async function start() {
  await connectDB(env.mongoUri);
  const plans = await seedSubscriptionPlans();
  await clearUnselectedSchoolPlans();
  const schools = await seedSchools();
  await seedLegalDocuments();
  const ticketCount = await seedSupportTickets();
  const invoices = await seedInvoices();
  await seedAcademicTeachers();
  await seedStaffUsers();
  await seedLibraryData();
  await seedRoles();

  app.listen(env.port, () => {
    console.log(`Platform service running on http://localhost:${env.port}`);
    console.log(`Subscription plans seeded: ${plans.map((plan) => plan.name).join(', ')}`);
    console.log(`Schools seeded: ${schools.map((school) => school.name).join(', ')}`);
    console.log('Legal documents seeded');
    console.log(`Support tickets seeded: ${ticketCount}`);
    console.log(`Invoices ${invoices.length ? `seeded: ${invoices.map((invoice) => invoice.invoiceNumber).join(', ')}` : 'already present'}`);
    console.log(`Firebase messaging: ${isFirebaseConfigured() ? 'configured' : 'not configured'}`);
    console.log(
      `Razorpay recurring subscriptions: ${razorpaySubscriptionService.isConfigured() ? 'configured' : 'NOT configured (set RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET)'}` +
        (razorpaySubscriptionService.webhookConfigured() ? '' : ' — RAZORPAY_WEBHOOK_SECRET not set, webhooks will 503')
    );
  });

  startSubscriptionCronJobs();
}

start().catch((error) => {
  console.error('Platform service failed to start:', error.message);
  process.exit(1);
});

process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection in platform-service:', error);
  process.exit(1);
});
