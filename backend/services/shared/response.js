/**
 * Standardized API response helpers for all backend microservices.
 */

export function sendSuccess(res, data = null, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    ...(data !== null ? { data } : {}),
  });
}

export function sendPaginated(res, items = [], pagination = {}, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data: items,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || items.length,
      total: pagination.total || items.length,
      totalPages: pagination.totalPages || Math.ceil((pagination.total || items.length) / (pagination.limit || 1)),
    },
  });
}
