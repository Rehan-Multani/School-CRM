import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. Services Configuration
const SERVICES = [
  { name: 'Gateway', port: 5000, dir: 'api-gateway', color: '\x1b[36m' },
  { name: 'Auth', port: 5001, dir: 'auth-service', color: '\x1b[32m' },
  { name: 'Platform', port: 5002, dir: 'platform-service', color: '\x1b[35m' },
];

const children = [];

// 2. Start a Microservice
function startService({ name, port, dir, color }) {
  const cwd = path.join(__dirname, 'services', dir);
  const reset = '\x1b[0m';

  const child = spawn(process.execPath, ['--watch', 'src/server.js'], {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    env: process.env,
  });

  const print = (chunk, isError = false) => {
    chunk.toString().split(/\r?\n/).filter(Boolean).forEach((line) => {
      const output = `${color}[${name}:${port}]${reset} ${line}\n`;
      isError ? process.stderr.write(output) : process.stdout.write(output);
    });
  };

  child.stdout.on('data', (chunk) => print(chunk));
  child.stderr.on('data', (chunk) => print(chunk, true));

  children.push(child);
}

// 3. Graceful Shutdown
function stopAll() {
  children.forEach((child) => {
    if (child?.pid && !child.killed) {
      process.platform === 'win32'
        ? spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', shell: true })
        : child.kill('SIGTERM');
    }
  });
}

['SIGINT', 'SIGTERM', 'SIGUSR2', 'exit'].forEach((sig) => {
  process.on(sig, () => {
    stopAll();
    if (sig !== 'exit') process.exit(0);
  });
});

// 4. Launch Services
console.log('🚀 Starting School CRM Backend Services...\n');
SERVICES.forEach(startService);
console.log('🌐 Gateway: http://localhost:5000 | Auth: 5001 | Platform: 5002\n');
