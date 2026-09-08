import { env } from '../config/env.js';

/**
 * SMS provider abstraction.
 *
 * TODO(prod): implement a real provider (Twilio / MSG91 / Textlocal / AWS SNS),
 * configure DLT template ids + sender, add delivery monitoring + retry. Until
 * then `SMS_PROVIDER=mock` logs the message (phone masked) and reports success.
 *
 * IMPORTANT: a failed send MUST surface to the caller (throw / delivered:false).
 * The pickup flow only advances a session to OTP_SENT when this resolves
 * `delivered: true`, so an SMS outage can never silently "verify" a pickup.
 */
function maskPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  return d ? `${'*'.repeat(Math.max(2, d.length - 4))}${d.slice(-4)}` : '(none)';
}

class SmsService {
  get provider() {
    return env.smsProvider || 'mock';
  }

  async sendSms({ phone, message, template = '' } = {}) {
    const to = String(phone || '').trim();
    if (!to) {
      const err = new Error('SMS recipient phone is required');
      err.code = 'SMS_NO_RECIPIENT';
      throw err;
    }

    switch (this.provider) {
      case 'mock': {
        // The mock provider prints the message and claims success — fine in dev,
        // dangerous in production twice over: it would write live pickup OTPs
        // into the server log, and it would report an undelivered code as sent.
        // Refuse instead, so a missing provider fails the pickup closed with a
        // clear error rather than quietly issuing codes nobody receives.
        if (env.nodeEnv === 'production') {
          const err = new Error(
            'SMS_PROVIDER=mock cannot be used in production. Configure a real SMS provider.'
          );
          err.code = 'SMS_PROVIDER_NOT_CONFIGURED';
          throw err;
        }
        // eslint-disable-next-line no-console
        console.log(`[sms:mock] -> ${maskPhone(to)} :: ${message}`);
        return { delivered: true, provider: 'mock', ref: `mock-${Date.now()}`, template };
      }

      case 'twilio':
      case 'msg91':
      case 'textlocal':
      case 'sns': {
        const err = new Error(`SMS provider "${this.provider}" is not configured yet`);
        err.code = 'SMS_PROVIDER_NOT_CONFIGURED';
        throw err;
      }

      default: {
        const err = new Error(`Unknown SMS provider "${this.provider}"`);
        err.code = 'SMS_PROVIDER_UNKNOWN';
        throw err;
      }
    }
  }
}

export const smsService = new SmsService();
export { maskPhone };
