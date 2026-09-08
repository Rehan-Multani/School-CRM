import { createProxyMiddleware } from 'http-proxy-middleware';

function proxyError(serviceName, target) {
  return (err, req, res) => {
    console.error(
      `[Gateway] Proxy error for ${serviceName} (${target}) on ${req.method} ${req.originalUrl || req.url}:`,
      err.message || err.code
    );

    if (res.headersSent) return;

    res.status(502).json({
      success: false,
      message: `${serviceName} is currently unavailable. Please verify the service is running.`,
      code: err.code || 'SERVICE_UNAVAILABLE',
    });
  };
}

export function createServiceProxy(target, { stripPrefix, serviceName }) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    xfwd: true,
    timeout: 60000,
    proxyTimeout: 60000,
    pathRewrite: { [`^${stripPrefix}`]: '' },
    on: {
      error: proxyError(serviceName, target),
    },
  });
}
