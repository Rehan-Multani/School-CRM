import { env } from '../config/env.js';
import { createServiceProxy } from '../middleware/proxy.js';

export async function healthCheck(req, res) {
  res.json({
    success: true,
    service: 'api-gateway',
    status: 'HEALTHY',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
}

export async function readyCheck(req, res) {
  const checkService = async (url) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2000);
      const resp = await fetch(`${url}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      return resp.ok ? 'UP' : 'DOWN';
    } catch {
      return 'DOWN';
    }
  };

  const [authStatus, platformStatus] = await Promise.all([
    checkService(env.authServiceUrl),
    checkService(env.platformServiceUrl),
  ]);

  const isReady = authStatus === 'UP' && platformStatus === 'UP';

  res.status(isReady ? 200 : 503).json({
    success: isReady,
    status: isReady ? 'READY' : 'DEGRADED',
    services: {
      auth: authStatus,
      platform: platformStatus,
    },
    timestamp: new Date().toISOString(),
  });
}

export function notFound(req, res) {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
}

export const authProxy = createServiceProxy(env.authServiceUrl, {
  stripPrefix: '/api/v1/platform/auth',
  serviceName: 'Auth service',
});

export const platformProxy = createServiceProxy(env.platformServiceUrl, {
  stripPrefix: '/api/v1/platform',
  serviceName: 'Platform service',
});
