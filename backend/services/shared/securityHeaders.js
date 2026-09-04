/**
 * Minimal security-headers middleware (helmet-equivalent, no dependency).
 * These services return JSON / files only — never HTML documents — so the CSP
 * is a lockdown default rather than a page policy.
 */
export function securityHeaders({ isProd = false } = {}) {
  return function securityHeadersMw(req, res, next) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Origin-Agent-Cluster', '?1');
    res.setHeader(
      'Permissions-Policy',
      'camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()'
    );
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; img-src 'self' data:; media-src 'self'; style-src 'unsafe-inline'"
    );
    res.removeHeader('X-Powered-By');

    // HSTS only over real HTTPS (behind a TLS-terminating proxy or direct TLS).
    const proto = (req.headers['x-forwarded-proto'] || req.protocol || '').split(',')[0].trim();
    if (isProd && proto === 'https') {
      res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
    }
    next();
  };
}
