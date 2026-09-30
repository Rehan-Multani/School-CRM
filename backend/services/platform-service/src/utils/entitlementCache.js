/**
 * Short-lived, per-process cache of each school's latest SchoolSubscription,
 * read by the subscription gate on EVERY role-guarded request.
 *
 * Only the raw subscription is cached — the access state is re-derived from it
 * on every read, so time-based transitions (trial end, grace period end) are
 * never delayed. Any write to SchoolSubscription / SubscriptionPlan clears the
 * whole cache (model hooks), so a renewal or expiry made in this process
 * applies immediately; writes from another process apply within the TTL.
 */
const TTL_MS = 15_000;
const entries = new Map(); // schoolId -> { at, promise }

export async function cachedSubscription(schoolId, load) {
  const key = String(schoolId);
  const hit = entries.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  // Cache the promise so concurrent requests for one school share one query.
  const promise = Promise.resolve().then(load);
  entries.set(key, { at: Date.now(), promise });
  try {
    return await promise;
  } catch (error) {
    entries.delete(key);
    throw error;
  }
}

export function clearEntitlementCache() {
  entries.clear();
}

/** Mongoose plugin: any write to the collection drops every cached entry. */
export function invalidateEntitlementOnWrite(schema) {
  schema.post('save', clearEntitlementCache);
  schema.post(
    ['findOneAndUpdate', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany', 'findOneAndDelete', 'replaceOne'],
    clearEntitlementCache
  );
  schema.post('insertMany', clearEntitlementCache);
}
