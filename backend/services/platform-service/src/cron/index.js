import cron from 'node-cron';
import {
  runReconciliationJob,
  runExpiryCheckJob,
  runGracePeriodJob,
  runFailedPaymentRecoveryJob,
  runWebhookRecoveryJob,
  runStaleDetectionJob,
} from './subscriptionJobs.js';

/**
 * In-process scheduler (node-cron). If this service is ever run as more than
 * one instance, every instance schedules the same ticks, but each job's
 * `withLock()` (CronLock, a Mongo-backed atomic claim) ensures only one
 * instance actually executes the work per tick — no BullMQ/Redis required.
 */
export function startSubscriptionCronJobs() {
  // Every 30 min — reconciliation is the safety net, doesn't need to be tight.
  cron.schedule('*/30 * * * *', () => runReconciliationJob());
  // Every 15 min — expiry / grace-period / failed-payment jobs act on time-sensitive access.
  cron.schedule('*/15 * * * *', () => runExpiryCheckJob());
  cron.schedule('7,22,37,52 * * * *', () => runGracePeriodJob());
  cron.schedule('*/15 * * * *', () => runFailedPaymentRecoveryJob());
  // Every 10 min — webhook recovery should catch up quickly after a transient failure.
  cron.schedule('*/10 * * * *', () => runWebhookRecoveryJob());
  // Once a day — stale-subscription detection is a low-urgency housekeeping scan.
  cron.schedule('0 3 * * *', () => runStaleDetectionJob());

  // eslint-disable-next-line no-console
  console.log('[cron] subscription background jobs scheduled');
}
