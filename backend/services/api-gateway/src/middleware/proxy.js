import net from 'net';
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

// Is something accepting TCP connections on host:port right now?
function canConnect(host, port, timeoutMs = 400) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port });
    const done = (ok) => {
      socket.destroy();
      resolve(ok);
    };
    socket.setTimeout(timeoutMs, () => done(false));
    socket.once('connect', () => done(true));
    socket.once('error', () => done(false));
  });
}

/**
 * Rides out a service restart instead of failing the request.
 *
 * A local service (same machine) is briefly down whenever it restarts — a file
 * save in dev, or the supervisor recovering a crash. Rather than answering
 * 502 "service unavailable" during those seconds, hold the request and poll
 * the port until the service accepts connections again (up to WAIT_MS), then
 * proxy it. Nothing reached the service yet, so this is safe for every method.
 * A service that stays down still gets the normal 502 after the wait.
 *
 * Only for loopback targets, where the check costs well under 1 ms — so it runs
 * on every request (a cached "up" would miss a restart that just began).
 */
const WAIT_MS = 15000;
const POLL_MS = 250;

function waitForService(target) {
  const url = new URL(target);
  const host = url.hostname;
  const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
  const local = ['127.0.0.1', 'localhost', '::1'].includes(host);

  const gate = async (req, res, next) => {
    if (!local) return next();
    const deadline = Date.now() + WAIT_MS;
    while (Date.now() < deadline) {
      if (await canConnect(host, port)) return next();
      if (req.destroyed) return; // client gave up
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
    return next(); // still down: let the proxy answer with its 502
  };
  return gate;
}

export function createServiceProxy(target, { stripPrefix, serviceName }) {
  const gate = waitForService(target);
  const proxy = createProxyMiddleware({
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
  return (req, res, next) => gate(req, res, () => proxy(req, res, next));
}
