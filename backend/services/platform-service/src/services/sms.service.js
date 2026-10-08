import { env } from '../config/env.js';

/**
 * SMS provider abstraction.
 *
 * Providers:
 *   mock           dev only — logs the message (phone masked) and reports success.
 *   smsindiahub    real delivery through SMSIndiaHub's HTTP API (cloud.smsindiahub.in), India DLT compliant.
 *   smsgatewayhub  the same API dialect on SMSGatewayHub's host.
 *
 * DLT (TRAI) rule: the text that goes out must match a REGISTERED template
 * character for character, with only the {#var#} slots filled in, and the call
 * must carry the entity (PE) id and the template id. Free-form text is dropped
 * by the operator. So for a real provider the caller passes the OTP (and any
 * extra values) and this service renders the registered template; the free-text
 * `message` is only what the mock provider prints.
 *
 * IMPORTANT: a failed send MUST surface to the caller (throw / delivered:false).
 * The pickup flow only advances a session to OTP_SENT when this resolves
 * `delivered: true`, so an SMS outage can never silently "verify" a pickup.
 */
function maskPhone(p) {
  const d = String(p || '').replace(/\D/g, '');
  return d ? `${'*'.repeat(Math.max(2, d.length - 4))}${d.slice(-4)}` : '(none)';
}

function smsError(message, code) {
  const err = new Error(message);
  err.code = code;
  return err;
}

/** Indian mobile → 91XXXXXXXXXX (the format SMS gateways expect, no '+'). */
function toGatewayNumber(raw) {
  const digits = String(raw || '').replace(/\D/g, '');
  let ten = '';
  if (digits.length === 10) ten = digits;
  else if (digits.length === 11 && digits.startsWith('0')) ten = digits.slice(1);
  else if (digits.length === 12 && digits.startsWith('91')) ten = digits.slice(2);
  if (!/^[6-9]\d{9}$/.test(ten)) {
    throw smsError('SMS recipient is not a valid Indian mobile number', 'SMS_BAD_RECIPIENT');
  }
  return `91${ten}`;
}

/** Fill `{name}` slots; an unknown slot is left empty rather than leaking "{name}". */
function render(text, values) {
  return String(text).replace(/\{(\w+)\}/g, (_, key) => (values[key] === undefined || values[key] === null ? '' : String(values[key])));
}

/**
 * Registered DLT templates, keyed by the `template` name the callers use.
 * A purpose without its own template id falls back to the login template, so
 * every OTP still reaches the phone until a dedicated template is registered
 * (set SMS_TEMPLATE_ID_<PURPOSE> + SMS_TEMPLATE_TEXT_<PURPOSE> to switch).
 */
function resolveTemplate(name) {
  const t = env.sms.templates;
  const specific = t[name];
  if (specific?.id && specific?.text) return specific;
  const fallback = t.LOGIN_OTP;
  if (fallback?.id && fallback?.text) return fallback;
  throw smsError('No DLT template is configured for OTP messages (SMS_TEMPLATE_ID_LOGIN)', 'SMS_PROVIDER_NOT_CONFIGURED');
}

class SmsService {
  get provider() {
    return env.smsProvider || 'mock';
  }

  /**
   * @param {object} p
   * @param {string} p.phone
   * @param {string} [p.message]   free text (mock provider only)
   * @param {string} [p.template]  LOGIN_OTP | PASSWORD_RESET_OTP | SAFE_PICKUP_OTP
   * @param {string} [p.otp]       the code; required for real providers
   * @param {object} [p.vars]      extra template values, e.g. { student }
   */
  async sendSms({ phone, message, template = '', otp, vars = {} } = {}) {
    const to = String(phone || '').trim();
    if (!to) throw smsError('SMS recipient phone is required', 'SMS_NO_RECIPIENT');

    switch (this.provider) {
      case 'mock': {
        // The mock provider prints the message and claims success — fine in dev,
        // dangerous in production twice over: it would write live pickup OTPs
        // into the server log, and it would report an undelivered code as sent.
        // Refuse instead, so a missing provider fails the pickup closed with a
        // clear error rather than quietly issuing codes nobody receives.
        if (env.nodeEnv === 'production') {
          throw smsError('SMS_PROVIDER=mock cannot be used in production. Configure a real SMS provider.', 'SMS_PROVIDER_NOT_CONFIGURED');
        }
        // eslint-disable-next-line no-console
        console.log(`[sms:mock] -> ${maskPhone(to)} :: ${message}`);
        return { delivered: true, provider: 'mock', ref: `mock-${Date.now()}`, template };
      }

      case 'smsindiahub':
      case 'smsgatewayhub':
        return this.#sendViaSmsGatewayHub({ to, template, otp, vars });

      case 'twilio':
      case 'msg91':
      case 'textlocal':
      case 'sns':
        throw smsError(`SMS provider "${this.provider}" is not configured yet`, 'SMS_PROVIDER_NOT_CONFIGURED');

      default:
        throw smsError(`Unknown SMS provider "${this.provider}"`, 'SMS_PROVIDER_UNKNOWN');
    }
  }

  async #sendViaSmsGatewayHub({ to, template, otp, vars }) {
    const cfg = env.sms;
    if (!cfg.apiKey || !cfg.senderId || !cfg.entityId) {
      throw smsError('SMS provider is missing SMS_API_KEY / SMS_SENDER_ID / SMS_ENTITY_ID', 'SMS_PROVIDER_NOT_CONFIGURED');
    }
    if (!otp) throw smsError('An OTP is required to render the DLT template', 'SMS_BAD_REQUEST');

    const tpl = resolveTemplate(template);
    const text = render(tpl.text, { app: cfg.appName, powered: cfg.poweredBy, otp, ...vars });

    const params = new URLSearchParams({
      APIKey: cfg.apiKey,
      senderid: cfg.senderId,
      channel: '2', // 2 = transactional
      DCS: '0',
      flashsms: '0',
      number: toGatewayNumber(to),
      text,
      EntityId: cfg.entityId,
      dltTemplateId: tpl.id,
    });
    if (cfg.route) params.set('route', cfg.route);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
    let res;
    let body = null;
    try {
      // The API key travels in the query string (the gateway's documented
      // format), so the URL is never logged or put into an error message.
      res = await fetch(`${cfg.baseUrl}?${params.toString()}`, { signal: controller.signal });
      body = await res.json().catch(() => null);
    } catch (error) {
      throw smsError(error?.name === 'AbortError' ? 'SMS gateway timed out' : 'SMS gateway is unreachable', 'SMS_UNREACHABLE');
    } finally {
      clearTimeout(timer);
    }

    if (!res.ok || !body || String(body.ErrorCode) !== '000') {
      // eslint-disable-next-line no-console
      console.error(`[sms] gateway rejected message to ${maskPhone(to)}: ${body?.ErrorCode ?? res.status} ${body?.ErrorMessage ?? ''}`.trim());
      throw smsError(`SMS gateway rejected the message${body?.ErrorMessage ? `: ${body.ErrorMessage}` : ''}`, 'SMS_SEND_FAILED');
    }
    return {
      delivered: true,
      provider: this.provider,
      ref: body.JobId || body.MessageData?.[0]?.MessageId || '',
      template,
    };
  }
}

export const smsService = new SmsService();
export { maskPhone, toGatewayNumber, render };
