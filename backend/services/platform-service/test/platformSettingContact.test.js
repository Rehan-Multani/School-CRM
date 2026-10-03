import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, getApp } from './helpers/setup.js';

let app;
let platformSettingService;

beforeAll(async () => {
  await connect();
  app = await getApp();
  ({ platformSettingService } = await import('../src/services/platformSetting.service.js'));
}, 60000);

afterAll(disconnect);

describe('Platform Contact Settings', () => {
  it('GET /app-config returns contact details with defaults', async () => {
    const res = await request(app).get('/app-config');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('contact');
    expect(res.body.data.contact.salesEmail).toBeDefined();
    expect(res.body.data.contact.supportEmail).toBeDefined();
    expect(res.body.data.contact.privacyEmail).toBeDefined();
    expect(res.body.data.contact.phone).toBeDefined();
    expect(res.body.data.contact.address).toBeDefined();
  });

  it('updates contact info dynamically and validates email formats', async () => {
    // Invalid email test
    await expect(
      platformSettingService.updateSettings({
        salesEmail: 'invalid-email-address',
      })
    ).rejects.toThrow(/valid email address/i);

    // Valid update
    const updated = await platformSettingService.updateSettings({
      salesEmail: 'custom-sales@myschool.org',
      supportEmail: 'help@myschool.org',
      privacyEmail: 'legal@myschool.org',
      phone: '+1 555 123 4567',
      address: '100 Innovation Way, Suite 400, San Francisco, CA',
    }, 'test-admin');

    expect(updated.contact.salesEmail).toBe('custom-sales@myschool.org');
    expect(updated.contact.supportEmail).toBe('help@myschool.org');
    expect(updated.contact.privacyEmail).toBe('legal@myschool.org');
    expect(updated.contact.phone).toBe('+1 555 123 4567');
    expect(updated.contact.address).toBe('100 Innovation Way, Suite 400, San Francisco, CA');

    // Verify GET /app-config reflects it
    const res = await request(app).get('/app-config');
    expect(res.body.data.contact.salesEmail).toBe('custom-sales@myschool.org');
    expect(res.body.data.contact.phone).toBe('+1 555 123 4567');
  });
});
