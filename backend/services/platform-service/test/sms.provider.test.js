import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { smsService, toGatewayNumber, render } from '../src/services/sms.service.js';
import { env } from '../src/config/env.js';

/**
 * SMS provider (SMSGatewayHub, India DLT). fetch is mocked — nothing is sent.
 */
const saved = {};
function useGateway(overrides = {}) {
  Object.assign(saved, {
    provider: env.smsProvider,
    sms: { ...env.sms, templates: { ...env.sms.templates } },
  });
  env.smsProvider = 'smsgatewayhub';
  env.sms.apiKey = 'KEY-SECRET-123';
  env.sms.baseUrl = 'https://www.smsgatewayhub.com/api/mt/SendSMS';
  env.sms.senderId = 'BGADPL';
  env.sms.entityId = '1001164203633432409';
  env.sms.templates.LOGIN_OTP = {
    id: '1077104580057767222',
    text: 'Welcome to {app}, powered by {powered}. Your OTP for registration {otp}. This OTP is valid for 10 minutes. Please do not share it with anyone.BGADPL',
  };
  env.sms.templates.SAFE_PICKUP_OTP = { id: '', text: '' };
  Object.assign(env.sms, overrides);
}

let fetchSpy;
beforeEach(() => {
  useGateway();
});
afterEach(() => {
  env.smsProvider = saved.provider;
  Object.assign(env.sms, saved.sms);
  env.sms.templates = saved.sms.templates;
  fetchSpy?.mockRestore();
});

const ok = (extra = {}) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ ErrorCode: '000', ErrorMessage: 'Done', JobId: 'job-1', MessageData: [{ Number: '919876543210', MessageId: 'm-1' }], ...extra }),
  });

describe('toGatewayNumber', () => {
  it('normalises Indian mobiles and rejects junk', () => {
    expect(toGatewayNumber('9876543210')).toBe('919876543210');
    expect(toGatewayNumber('+91 98765-43210')).toBe('919876543210');
    expect(toGatewayNumber('09876543210')).toBe('919876543210');
    expect(() => toGatewayNumber('12345')).toThrow(/valid Indian mobile/);
    expect(() => toGatewayNumber('5876543210')).toThrow(/valid Indian mobile/);
  });
});

describe('render', () => {
  it('fills slots and blanks unknown ones', () => {
    expect(render('a {x} b {y}', { x: 1 })).toBe('a 1 b ');
  });
});

describe('SMSGatewayHub provider', () => {
  it('sends the registered DLT text with entity id, template id and sender', async () => {
    fetchSpy = ok();
    const res = await smsService.sendSms({ phone: '9876543210', template: 'LOGIN_OTP', otp: '482913', message: 'ignored free text' });
    expect(res).toMatchObject({ delivered: true, provider: 'smsgatewayhub', ref: 'job-1' });

    const url = new URL(fetchSpy.mock.calls[0][0]);
    expect(url.origin + url.pathname).toBe('https://www.smsgatewayhub.com/api/mt/SendSMS');
    const q = url.searchParams;
    expect(q.get('APIKey')).toBe('KEY-SECRET-123');
    expect(q.get('senderid')).toBe('BGADPL');
    expect(q.get('EntityId')).toBe('1001164203633432409');
    expect(q.get('dltTemplateId')).toBe('1077104580057767222');
    expect(q.get('number')).toBe('919876543210');
    expect(q.get('channel')).toBe('2');
    expect(q.get('text')).toBe(
      'Welcome to School Sarthi, powered by School Sarthi. Your OTP for registration 482913. This OTP is valid for 10 minutes. Please do not share it with anyone.BGADPL'
    );
  });

  it('a purpose without its own template falls back to the login template (safe pickup still delivers)', async () => {
    fetchSpy = ok();
    await smsService.sendSms({ phone: '9876543210', template: 'SAFE_PICKUP_OTP', otp: '111222', vars: { student: 'Aarav' } });
    const q = new URL(fetchSpy.mock.calls[0][0]).searchParams;
    expect(q.get('dltTemplateId')).toBe('1077104580057767222');
    expect(q.get('text')).toContain('111222');
  });

  it('uses a dedicated pickup template when one is configured, including the {student} slot', async () => {
    env.sms.templates.SAFE_PICKUP_OTP = { id: '999', text: 'Pickup of {student}: OTP {otp}. Share only with school staff.' };
    fetchSpy = ok();
    await smsService.sendSms({ phone: '9876543210', template: 'SAFE_PICKUP_OTP', otp: '654321', vars: { student: 'Aarav' } });
    const q = new URL(fetchSpy.mock.calls[0][0]).searchParams;
    expect(q.get('dltTemplateId')).toBe('999');
    expect(q.get('text')).toBe('Pickup of Aarav: OTP 654321. Share only with school staff.');
  });

  it('a gateway rejection surfaces as an error and never leaks the API key', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ ErrorCode: '006', ErrorMessage: 'Template mismatch' }),
    });
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const err = await smsService.sendSms({ phone: '9876543210', template: 'LOGIN_OTP', otp: '123456' }).catch((e) => e);
    spy.mockRestore();
    expect(err.code).toBe('SMS_SEND_FAILED');
    expect(err.message).toContain('Template mismatch');
    expect(JSON.stringify([err.message, err.code])).not.toContain('KEY-SECRET-123');
  });

  it('network failure and missing config fail closed', async () => {
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
    const net = await smsService.sendSms({ phone: '9876543210', template: 'LOGIN_OTP', otp: '123456' }).catch((e) => e);
    expect(net.code).toBe('SMS_UNREACHABLE');
    expect(net.message).not.toContain('KEY-SECRET-123');

    fetchSpy.mockRestore();
    env.sms.apiKey = '';
    const miss = await smsService.sendSms({ phone: '9876543210', template: 'LOGIN_OTP', otp: '123456' }).catch((e) => e);
    expect(miss.code).toBe('SMS_PROVIDER_NOT_CONFIGURED');
  });

  it('refuses to send without an OTP (a DLT template cannot be rendered from free text)', async () => {
    const err = await smsService.sendSms({ phone: '9876543210', template: 'LOGIN_OTP', message: 'hello' }).catch((e) => e);
    expect(err.code).toBe('SMS_BAD_REQUEST');
  });
});
