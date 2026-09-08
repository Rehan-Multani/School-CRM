import { execSync } from 'child_process';

const PORTS = [5000, 5001, 5002];

console.log('🧹 Cleaning up ports 5000, 5001, 5002...');

for (const port of PORTS) {
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
          console.log(`  Killed PID ${pid} holding port ${port}`);
        } catch {}
      }
    } catch {
      // Port already free
    }
  } else {
    try {
      execSync(`lsof -t -i:${port} | xargs -r kill -9`, { stdio: 'ignore' });
    } catch {}
  }
}

console.log('✅ Ports 5000, 5001, 5002 are completely clean.');

