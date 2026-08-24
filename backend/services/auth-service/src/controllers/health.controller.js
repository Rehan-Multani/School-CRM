export function healthCheck(req, res) {
  res.json({ success: true, service: 'auth-service' });
}
