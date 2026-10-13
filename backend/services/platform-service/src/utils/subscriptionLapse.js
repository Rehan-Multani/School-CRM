// A Razorpay subscription can stay `active` for days after its paid period
// ended (the renewal charge not processed / not yet reported). Razorpay's own
// status is not enough to call it "paid up": once the period end is behind us by
// more than the renewal buffer, nobody has paid for the current period.
//
//   period end ──(buffer 1d: renewal charge is processed, full access)──▶ EXPIRED
//   (access restricted, the school must buy a plan again)
//
// A payment that was ATTEMPTED and failed has its own flow (pending -> halted ->
// grace period); this rule is for a charge that never happened at all.
export const RENEWAL_BUFFER_DAYS = 1; // a charge normally lands within hours of the period end
export const LAPSE_GRACE_DAYS = 0;

const DAY = 86400000;
const LIVE_STATUSES = new Set(['active', 'authenticated']);

function periodEndMs(sub) {
  if (!sub?.currentPeriodEnd) return null;
  const end = new Date(sub.currentPeriodEnd).getTime();
  return Number.isFinite(end) ? end : null;
}

function applies(sub, now) {
  if (!sub || !LIVE_STATUSES.has(sub.status) || sub.cancelAtPeriodEnd) return false;
  if (sub.trialEnd && now < new Date(sub.trialEnd).getTime()) return false;
  return periodEndMs(sub) !== null;
}

/** true when the sub claims to be active but its paid period ended > buffer ago. */
export function isLapsed(sub, now = Date.now()) {
  if (!applies(sub, now)) return false;
  return now > periodEndMs(sub) + RENEWAL_BUFFER_DAYS * DAY;
}

/** true once buffer + grace have also passed: no renewal came, access must close. */
export function isLapseExpired(sub, now = Date.now()) {
  if (!applies(sub, now)) return false;
  return now > periodEndMs(sub) + (RENEWAL_BUFFER_DAYS + LAPSE_GRACE_DAYS) * DAY;
}

/** The paid period is over (renewal not yet received) - the school may pay again right now. */
export function periodEnded(sub, now = Date.now()) {
  if (!applies(sub, now)) return false;
  return now > periodEndMs(sub);
}

/**
 * The paid period is over, whatever the state of the subscription (active, cancel
 * scheduled, halted, pending...). A school in this state may pick ANY plan again -
 * it is not tied to the one it had.
 */
export function paidPeriodOver(sub, now = Date.now()) {
  if (!sub || !sub.currentPeriodEnd) return false;
  if (!['active', 'authenticated', 'pending', 'halted', 'paused', 'cancelled'].includes(sub.status)) return false;
  if (sub.trialEnd && now < new Date(sub.trialEnd).getTime()) return false;
  const end = new Date(sub.currentPeriodEnd).getTime();
  return Number.isFinite(end) && now > end;
}

/** The date access closes if nothing renews (for the school-facing banner). */
export function lapseDeadline(sub) {
  const end = periodEndMs(sub);
  return end === null ? null : new Date(end + (RENEWAL_BUFFER_DAYS + LAPSE_GRACE_DAYS) * DAY);
}
