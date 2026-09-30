/**
 * Graceful stop for a service's HTTP server.
 *
 * On a restart the dev supervisor (backend/index.js) sends the child an IPC
 * 'shutdown' message (on Windows there is no SIGTERM to a child); hosting
 * platforms send SIGTERM. Either way: stop accepting new connections at once —
 * the gateway then waits for the new instance instead of failing — let
 * requests already in flight finish, and exit. A request that never finishes
 * cannot block the restart: exit is forced after `graceMs`.
 */
export function enableGracefulShutdown(server, name, { graceMs = 5000 } = {}) {
  let stopping = false;
  const stop = (reason) => {
    if (stopping) return;
    stopping = true;
    console.log(`[${name}] ${reason} — finishing in-flight requests, then exiting`);
    server.close(() => process.exit(0));
    server.closeIdleConnections?.(); // idle keep-alive sockets would hold close() open
    setTimeout(() => process.exit(0), graceMs).unref();
  };
  process.on('message', (msg) => {
    if (msg === 'shutdown') stop('restart requested');
  });
  process.on('SIGTERM', () => stop('SIGTERM'));
}
