/**
 * Safe-pickup OTP mode resolution.
 *
 * `static` mode issues a fixed, publicly known code — fine for QA, catastrophic
 * for a child-handover control. The guard has to hold in both directions:
 * production must never *fall back* to static when the var is simply unset, and
 * must refuse to boot when someone sets it explicitly.
 *
 * `env` is resolved once at import time, so each case needs a fresh process.
 */
import { describe, it, expect } from 'vitest';
import { execFileSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serviceRoot = path.resolve(__dirname, '..');

// A 32+ char secret so config validation is not what fails.
const JWT_SECRET = 'x'.repeat(40);

function readOtpMode(extraEnv) {
  return execFileSync(
    process.execPath,
    ['-e', "import('./src/config/env.js').then(m => console.log(m.env.safePickup.otpMode))"],
    {
      cwd: serviceRoot,
      encoding: 'utf8',
      env: { ...process.env, VITEST: '', JWT_SECRET, SAFE_PICKUP_OTP_MODE: '', ...extraEnv },
    }
  ).trim();
}

describe('safe-pickup OTP mode config', () => {
  it('defaults to static in development (QA can run the flow without SMS)', () => {
    expect(readOtpMode({ NODE_ENV: 'development' })).toBe('static');
  });

  it('honours an explicit random in development', () => {
    expect(readOtpMode({ NODE_ENV: 'development', SAFE_PICKUP_OTP_MODE: 'random' })).toBe('random');
  });

  it('upgrades an unset value to random in production (fails safe, not open)', () => {
    expect(readOtpMode({ NODE_ENV: 'production' })).toBe('random');
  });

  it('refuses to boot in production when static is set explicitly', () => {
    let threw = false;
    let output = '';
    try {
      readOtpMode({ NODE_ENV: 'production', SAFE_PICKUP_OTP_MODE: 'static' });
    } catch (err) {
      threw = true;
      output = `${err.stdout || ''}${err.stderr || ''}`;
    }
    expect(threw).toBe(true);
    expect(output).toContain('SAFE_PICKUP_OTP_MODE=static is not allowed in production');
  });
});
