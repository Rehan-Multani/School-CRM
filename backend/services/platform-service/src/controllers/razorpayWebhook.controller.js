import { razorpayWebhookService } from '../services/razorpayWebhook.service.js';
import { AppError } from '../../../shared/AppError.js';

/**
 * POST /webhooks/razorpay
 *
 * Mounted with express.raw() so `req.body` is the exact Buffer Razorpay sent —
 * signature verification fails on anything re-serialized from a parsed object.
 */
export async function receiveRazorpayWebhook(req, res, next) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const headerEventId = req.headers['x-razorpay-event-id'];
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body || {}));

    const { event, alreadyProcessed } = await razorpayWebhookService.receive(rawBody, signature, headerEventId);

    // Always 200 once the signature is valid and the event is durably stored —
    // Razorpay retries on anything else, and duplicate delivery is exactly what
    // the eventId unique index exists to absorb.
    res.status(200).json({ success: true, alreadyProcessed });

    if (!alreadyProcessed) {
      // Process after responding — Razorpay's timeout budget is short, and our
      // own idempotent storage already guarantees at-most-once effects.
      razorpayWebhookService.process(event).catch((err) => {
        // process() already records failure on the event doc for the retry
        // cron to pick up — this only fires if that itself somehow threw.
        console.error(`[subscription-flow] webhook post-response processing crashed for event ${event._id}: ${err?.message}`);
      });
    }
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 401) {
      // Do not leak *why* verification failed.
      res.status(401).json({ success: false, message: 'Invalid signature', code: 'UNAUTHORIZED' });
      return;
    }
    next(error);
  }
}
