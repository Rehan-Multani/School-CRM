export function healthCheck(req, res) {
  res.json({ success: true, service: 'platform-service' });
}

export function getServiceInfo(req, res) {
  res.json({
    success: true,
    service: 'platform-service',
    owns: [
      'schools',
      'subscriptions',
      'billings',
      'revenue',
      'reports',
      'privacy-policy',
      'support',
      'notifications',
      'settings',
    ],
  });
}

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}
