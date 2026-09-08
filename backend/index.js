import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Services Configuration
const SERVICES = [
  { name: 'Gateway', port: 5000, dir: 'api-gateway', color: '\x1b[36m' },
  { name: 'Auth', port: 5001, dir: 'auth-service', color: '\x1b[32m' },
  { name: 'Platform', port: 5002, dir: 'platform-service', color: '\x1b[35m' },
];

const serviceMap = new Map();
let isShuttingDown = false;

// 2. Kill Zombie Processes on Specific Port (Windows & POSIX)
function freePort(port) {
  if (process.platform === 'win32') {
    try {
      const output = execSync(`netstat -ano | findstr :${port}`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'ignore'],
      });
      const lines = output.trim().split(/\r?\n/);
      const pids = new Set();
      for (const line of lines) {
        const parts = line.trim().split(/\s+/);
        // Look for LISTENING line: TCP [address]:[port] [peer] LISTENING [pid]
        if (parts.length >= 5 && parts[parts.length - 2] === 'LISTENING') {
          const localAddr = parts[1];
          if (localAddr.endsWith(`:${port}`)) {
            const pid = parseInt(parts[parts.length - 1], 10);
            if (pid && pid !== process.pid) {
              pids.add(pid);
            }
          }
        }
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
        } catch {
          // Process might have already exited
        }
      }
    } catch {
      // netstat returned no matches, port is already free
    }
  } else {
    try {
      execSync(`lsof -t -i:${port} | xargs -r kill -9`, { stdio: 'ignore' });
    } catch {
      // Port already free
    }
  }
}

// 3. Kill Service Process Tree
function killChild(child) {
  if (!child?.pid || child.killed) return;
  if (process.platform === 'win32') {
    try {
      execSync(`taskkill /pid ${child.pid} /T /F`, { stdio: 'ignore' });
    } catch {
      // Process already terminated
    }
  } else {
    try {
      child.kill('SIGTERM');
    } catch {
      // Process already terminated
    }
  }
}

// 4. Start a Microservice with Auto-Restart Supervision
function startService(svc) {
  if (isShuttingDown) return;

  const { name, port, dir, color } = svc;
  const cwd = path.join(__dirname, 'services', dir);
  const reset = '\x1b[0m';

  // Ensure port is free before starting
  freePort(port);

  const state = serviceMap.get(name) || { restarts: 0 };
  state.startedAt = Date.now();
  state.failedChecks = 0;
  serviceMap.set(name, state);

  const child = spawn(process.execPath, ['--watch', 'src/server.js'], {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: { ...process.env, PORT: String(port) },
  });

  state.child = child;

  const print = (chunk, isError = false) => {
    chunk
      .toString()
      .split(/\r?\n/)
      .filter(Boolean)
      .forEach((line) => {
        const output = `${color}[${name}:${port}]${reset} ${line}\n`;
        isError ? process.stderr.write(output) : process.stdout.write(output);
      });
  };

  child.stdout.on('data', (chunk) => print(chunk));
  child.stderr.on('data', (chunk) => print(chunk, true));

  child.on('error', (err) => {
    console.error(`${color}[${name}:${port}]${reset} ❌ Process failed to start:`, err.message);
  });

  child.on('exit', (code, signal) => {
    if (isShuttingDown) return;

    const codeDesc = code !== null ? `code ${code}` : `signal ${signal}`;
    console.warn(`${color}[${name}:${port}]${reset} ⚠️ Service exited (${codeDesc}). Auto-restarting in 1s...`);

    // Clean up port and debounce restart
    if (state.restartTimer) clearTimeout(state.restartTimer);
    state.restartTimer = setTimeout(() => {
      if (!isShuttingDown) {
        state.restarts += 1;
        startService(svc);
      }
    }, 1000);
  });
}

// 5. Active Health Monitor (detects paused node --watch workers)
const HEALTH_INTERVAL_MS = 4000;
const STARTUP_GRACE_MS = 10000;
const MAX_CONSECUTIVE_FAILURES = 3;

const healthTimer = setInterval(async () => {
  if (isShuttingDown) return;

  for (const svc of SERVICES) {
    const state = serviceMap.get(svc.name);
    if (!state || !state.child || state.child.killed) continue;

    // Allow grace period on fresh startup
    if (Date.now() - (state.startedAt || 0) < STARTUP_GRACE_MS) continue;

    try {
      const res = await fetch(`http://127.0.0.1:${svc.port}/health`, {
        signal: AbortSignal.timeout(2000),
      });
      if (res.ok) {
        state.failedChecks = 0;
      } else {
        state.failedChecks = (state.failedChecks || 0) + 1;
      }
    } catch {
      state.failedChecks = (state.failedChecks || 0) + 1;
    }

    if (state.failedChecks >= MAX_CONSECUTIVE_FAILURES) {
      console.warn(
        `${svc.color}[${svc.name}:${svc.port}]\x1b[0m ⚠️ Service unresponsive on /health. Auto-recovering...`
      );
      state.failedChecks = 0;
      killChild(state.child);
      freePort(svc.port);
      setTimeout(() => {
        if (!isShuttingDown) {
          startService(svc);
        }
      }, 500);
    }
  }
}, HEALTH_INTERVAL_MS);

// 6. Synchronous Graceful Shutdown
function stopAll() {
  isShuttingDown = true;
  clearInterval(healthTimer);

  for (const [name, state] of serviceMap.entries()) {
    if (state.restartTimer) clearTimeout(state.restartTimer);
    killChild(state.child);
  }

  // Double check all service ports are cleanly freed
  SERVICES.forEach((svc) => freePort(svc.port));
}

['SIGINT', 'SIGTERM', 'SIGUSR2'].forEach((sig) => {
  process.on(sig, () => {
    console.log(`\n🛑 Received ${sig}. Shutting down all services cleanly...`);
    stopAll();
    process.exit(0);
  });
});

process.on('exit', () => {
  stopAll();
});

// 7. Launch Services
console.log('🚀 Starting School CRM Backend Services...\n');
SERVICES.forEach(startService);
console.log('🌐 Gateway: http://127.0.0.1:5000 | Auth: 127.0.0.1:5001 | Platform: 127.0.0.1:5002\n');
