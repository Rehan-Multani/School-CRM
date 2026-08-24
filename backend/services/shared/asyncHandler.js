/**
 * Wraps async controller functions to eliminate repetitive try-catch blocks
 * and automatically forward errors to the centralized errorHandler.
 *
 * @param {Function} fn - Async controller function (req, res, next)
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
