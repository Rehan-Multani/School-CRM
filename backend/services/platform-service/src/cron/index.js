import cron from 'node-cron';
import {
  runReconciliationJob,
  runExpiryCheckJob,
  runPendingPlanChangeJob,
  runGracePeriodJob,
  runFailedPaymentRecoveryJob,
  runWebhookRecoveryJob,
  runStaleDetectionJob,
} from './subscriptionJobs.js';
import os from 'os';
import { feeScheduleService } from '../services/feeSchedule.service.js';
import { birthdayService } from '../services/birthday.service.js';
import { acquireCronLock, releaseCronLock } from '../models/CronLock.js';

// Birthday wishes: 07:00 IST, then hourly until 20:00 as a catch-up if the server
// was down at 7 (people already wished today are skipped, so repeats are harmless).
async function runBirthdayJob() {
  const got = await acquireCronLock('birthday-wishes', 10 * 60 * 1000, `${os.hostname()}:${process.pid}`).catch(() => false);
  if (!got) return;
  try {
    const r = await birthdayService.runForToday();
    // eslint-disable-next-line no-console
    if (r.sent) console.log(`[cron.birthday] wished ${r.sent} of ${r.checked}`);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[cron.birthday] failed:', err?.message || err);
  } finally {
    await releaseCronLock('birthday-wishes').catch(() => {});
  }
}

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
  cron.schedule('*/15 * * * *', () => runPendingPlanChangeJob());
  cron.schedule('7,22,37,52 * * * *', () => runGracePeriodJob());
  cron.schedule('*/15 * * * *', () => runFailedPaymentRecoveryJob());
  // Every 10 min — webhook recovery should catch up quickly after a transient failure.
  cron.schedule('*/10 * * * *', () => runWebhookRecoveryJob());
  // Once a day (01:30) — flip overdue fee invoices and apply the school's late fee.
  cron.schedule('30 1 * * *', () => feeScheduleService.runLateFeeJobForAllSchools().catch(() => {}));
  cron.schedule('0 7-20 * * *', () => runBirthdayJob(), { timezone: 'Asia/Kolkata' });
  // Once a day — stale-subscription detection is a low-urgency housekeeping scan.
  cron.schedule('0 3 * * *', () => runStaleDetectionJob());

  // eslint-disable-next-line no-console
  console.log('[cron] subscription background jobs scheduled');
}
