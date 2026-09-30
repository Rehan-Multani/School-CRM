/**
 * Escapes regex special characters to prevent ReDoS (Regular Expression Denial of Service)
 * and syntax errors from raw user search inputs.
 *
 * @param {string} text - User provided search query
 * @returns {string} - Escaped safe regex string
 */
export function escapeRegex(text) {
  if (typeof text !== 'string') return '';
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Validates and sanitizes pagination parameters to prevent memory exhaustion
 * from unbounded limits (e.g. limit=100000).
 *
 * @param {Object} options
 * @param {number|string} [options.page=1]
 * @param {number|string} [options.limit=50]
 * @param {number} [options.maxLimit=100]
 * @param {number} [options.defaultLimit=50]
 * @returns {{ page: number, limit: number, skip: number }}
 */
export function sanitizePagination({ page = 1, limit = 50, maxLimit = 100, defaultLimit = 50 } = {}) {
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const parsedLimit = parseInt(limit, 10) || defaultLimit;
  const safeLimit = Math.min(maxLimit, Math.max(1, parsedLimit));
  const skip = (safePage - 1) * safeLimit;

  return {
    page: safePage,
    limit: safeLimit,
    skip,
  };
}

/**
 * A user-supplied link (homework attachment, leave document) that other apps
 * will open. Only absolute http(s) URLs or our own `/uploads/...` paths pass;
 * anything else (`javascript:`, `data:`, `file:`, `intent:` …) becomes ''.
 */
export function safeLinkUrl(value, maxLen = 1000) {
  const url = String(value || '').trim().slice(0, maxLen);
  if (/^https?:\/\/[^\s]+$/i.test(url)) return url;
  if (/^\/uploads\/[^\s]*$/.test(url) && !url.includes('..')) return url;
  return '';
}

/**
 * Query-string hardening for list endpoints: keep only plain string/number
 * values (drop arrays/objects from `?a=1&a=2` or bracket syntax) and cap
 * their length, so a crafted query can't reach Mongo as an operator or crash
 * a `.trim()`. Id-shaped keys must be 24-hex ObjectIds or they are dropped.
 */
export function scalarQuery(query = {}, idKeys = ['sectionId', 'classId', 'subjectId']) {
  const out = {};
  for (const [k, v] of Object.entries(query || {})) {
    if (typeof v !== 'string' && typeof v !== 'number') continue;
    const s = String(v).slice(0, 100);
    if (idKeys.includes(k) && !/^[a-f0-9]{24}$/i.test(s)) continue;
    out[k] = s;
  }
  return out;
}
