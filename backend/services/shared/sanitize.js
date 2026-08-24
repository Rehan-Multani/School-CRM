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
