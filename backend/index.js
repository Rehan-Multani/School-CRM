import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/*
 * Dev/prod supervisor for the three backend services.
 *
 * Exactly ONE process per service. Each service runs as plain `node
 * src/server.js` (not `node --watch`): `--watch` never exits when the server
 * crashes — it waits for a file change — so a crash used to leave a live
 * watcher with a dead server, and the old double restart path (exit handler +
 * health monitor) stacked duplicate watchers that fought over the port on
 * every save ("<X> service is currently unavailable").
 *
 * Here the supervisor does both jobs itself:
 *   - file change in the service's src/, .env or services/shared → restart it
 *   - crash → restart with backoff (1s, 2s, 4s … 10s; reset after 30s up)
 *   - /health stops answering → restart
 * and every restart goes through one function, so there is never a second copy.
 */
const SERVICES = [
  { name: 'Gateway', port: 5000, dir: 'api-gateway', color: '\x1b[36m' },
  { name: 'Auth', port: 5001, dir: 'auth-service', color: '\x1b[32m' },
  { name: 'Platform', port: 5002, dir: 'platform-service', color: '\x1b[35m' },
];
const RESET = '\x1b[0m';
const WATCH = process.env.NODE_ENV !== 'production' && !process.argv.includes('--no-watch');

const state = new Map(); // name -> { child, startedAt, backoff, timer, failedChecks, restarting, reloads }
let isShuttingDown = false;

const log = (svc, msg) => console.log(`${svc.color}[${svc.name}:${svc.port}]${RESET} ${msg}`);

// Kill whatever still listens on the port (a leftover from a previous run).
function freePort(port) {
  if (process.platform === 'win32') {
    try {
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
      const pids = new Set();
      for (const line of output.trim().split(/\r?\n/)) {
        const parts = line.trim().split(/\s+/);
        if (parts.length >= 5 && parts[parts.length - 2] === 'LISTENING' && parts[1].endsWith(`:${port}`)) {
          const pid = parseInt(parts[parts.length - 1], 10);
          if (pid && pid !== process.pid) pids.add(pid);
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
        } catch {
          // already gone
        }
      }
    } catch {
      // nothing listening
    }
  } else {
    try {
      execSync(`lsof -t -i:${port} -sTCP:LISTEN | xargs -r kill -9`, { stdio: 'ignore' });
    } catch {
      // nothing listening
    }
  }
}

function killTree(child) {
  if (!child?.pid || child.exitCode !== null) return;
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // already gone
    }
  } else {
    try {
      child.kill('SIGTERM');
    } catch {
      // already gone
    }
  }
}

function start(svc, { reload = false } = {}) {
  if (isShuttingDown) return;
  const s = state.get(svc.name);
  clearTimeout(s.timer);
  freePort(svc.port);

  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: path.join(__dirname, 'services', svc.dir),
    stdio: ['inherit', 'pipe', 'pipe', 'ipc'], // ipc: graceful 'shutdown' message on restart
    // A file-change reload skips the platform boot seeders (idempotent; they
    // already ran on the first start) so the service is back in ~1–2s.
    env: { ...process.env, PORT: String(svc.port), ...(reload ? { SKIP_BOOT_SEEDS: '1' } : {}) },
  });
  Object.assign(s, { child, startedAt: Date.now(), failedChecks: 0, restarting: false });

  const print = (chunk, isError) => {
    for (const line of chunk.toString().split(/\r?\n/).filter(Boolean)) {
      (isError ? process.stderr : process.stdout).write(`${svc.color}[${svc.name}:${svc.port}]${RESET} ${line}\n`);
    }
  };
  child.stdout.on('data', (c) => print(c, false));
  child.stderr.on('data', (c) => print(c, true));
  child.on('error', (err) => log(svc, `❌ failed to start: ${err.message}`));

  child.on('exit', (code, signal) => {
    if (isShuttingDown || s.child !== child) return; // a replaced/stale child — ignore
    s.child = null;
    if (s.restarting) {
      // We killed it on purpose (file change / health) — come back right away.
      start(svc, { reload: s.pendingReload });
      return;
    }
    const upFor = Date.now() - s.startedAt;
    s.backoff = upFor > 30000 ? 1000 : Math.min((s.backoff || 500) * 2, 10000);
    log(svc, `⚠️ exited (${code !== null ? `code ${code}` : `signal ${signal}`}). Restarting in ${s.backoff / 1000}s…`);
    s.timer = setTimeout(() => start(svc, { reload: true }), s.backoff);
  });
}

// The single restart path: kill the current child; its exit handler starts the next one.
function restart(svc, reason, { reload = true } = {}) {
  const s = state.get(svc.name);
  if (isShuttingDown || s.restarting) return;
  log(svc, `↻ ${reason}`);
  if (!s.child) {
    start(svc, { reload });
    return;
  }
  s.restarting = true;
  s.pendingReload = reload;
  // Graceful first: the service stops accepting, finishes in-flight requests
  // and exits (shared/gracefulShutdown.js). Hard kill if it doesn't in time
  // (e.g. hung — the health-monitor case).
  const child = s.child;
  try {
    child.send('shutdown');
  } catch {
    killTree(child);
    return;
  }
  setTimeout(() => {
    if (child.exitCode === null && child.signalCode === null) killTree(child);
  }, 6000);
}

// ---- file watching (dev)
function watch(dir, onChange) {
  if (!fs.existsSync(dir)) return;
  try {
    fs.watch(dir, { recursive: true }, (_event, file) => {
      const f = String(file || '');
      if (!f || /node_modules|uploads|[\\/]\.|\.log$/.test(f)) return;
      if (!/\.(m?js|cjs|json)$|(^|[\\/])\.env$/.test(f)) return;
      onChange(f);
    });
  } catch (err) {
    console.warn(`File watching unavailable for ${dir}: ${err.message}`);
  }
}

function debounced(fn, ms = 300) {
  let t = null;
  let files = new Set();
  return (file) => {
    files.add(file);
    clearTimeout(t);
    t = setTimeout(() => {
      const list = [...files];
      files = new Set();
      fn(list);
    }, ms);
  };
}

if (WATCH) {
  for (const svc of SERVICES) {
    const root = path.join(__dirname, 'services', svc.dir);
    const onChange = debounced((files) => restart(svc, `changed: ${files.slice(0, 3).join(', ')}${files.length > 3 ? ' …' : ''}`));
    watch(path.join(root, 'src'), onChange);
  }
  // Watch root .env for all services
  const rootEnv = path.join(__dirname, '.env');
  if (fs.existsSync(rootEnv)) {
    fs.watch(rootEnv, () => SERVICES.forEach((svc) => restart(svc, 'root .env changed')));
  }
  // Shared code is imported by every service.
  watch(
    path.join(__dirname, 'services', 'shared'),
    debounced((files) => SERVICES.forEach((svc) => restart(svc, `shared changed: ${files[0]}`))),
  );
}

// ---- health monitor: catches a process that is alive but not answering (hung)
const HEALTH_INTERVAL_MS = 5000;
const STARTUP_GRACE_MS = 30000; // Atlas connect + boot can take a while
const MAX_FAILURES = 3;
const healthTimer = setInterval(async () => {
  if (isShuttingDown) return;
  for (const svc of SERVICES) {
    const s = state.get(svc.name);
    if (!s?.child || s.restarting || Date.now() - s.startedAt < STARTUP_GRACE_MS) continue;
    let ok = false;
    try {
      ok = (await fetch(`http://127.0.0.1:${svc.port}/health`, { signal: AbortSignal.timeout(3000) })).ok;
    } catch {
      ok = false;
    }
    s.failedChecks = ok ? 0 : s.failedChecks + 1;
    if (s.failedChecks >= MAX_FAILURES) restart(svc, 'not answering /health — restarting', { reload: true });
  }
}, HEALTH_INTERVAL_MS);

function stopAll() {
  if (isShuttingDown) return;
  isShuttingDown = true;
  clearInterval(healthTimer);
  for (const s of state.values()) {
    clearTimeout(s.timer);
    killTree(s.child);
  }
  SERVICES.forEach((svc) => freePort(svc.port));
}

['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach((sig) => {
  process.on(sig, () => {
    console.log(`\n🛑 Received ${sig}. Shutting down all services cleanly...`);
    stopAll();
    process.exit(0);
  });
});
process.on('exit', stopAll);

console.log(`🚀 Starting School CRM Backend Services${WATCH ? ' (auto-reload on file change)' : ''}...\n`);
for (const svc of SERVICES) {
  state.set(svc.name, { backoff: 0, failedChecks: 0 });
  start(svc);
}
console.log('🌐 Gateway: http://127.0.0.1:5000 | Auth: 127.0.0.1:5001 | Platform: 127.0.0.1:5002\n');
