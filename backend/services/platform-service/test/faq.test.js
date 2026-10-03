import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connect, disconnect, getApp } from './helpers/setup.js';

let app;
let Faq;
let faqService;

beforeAll(async () => {
  await connect();
  app = await getApp();
  ({ Faq } = await import('../src/models/Faq.js'));
  ({ faqService } = await import('../src/services/faq.service.js'));
}, 60000);

afterAll(disconnect);
beforeEach(() => Faq.deleteMany({}));

describe('Public FAQs', () => {
  it('auto-seeds default FAQs when empty and returns them', async () => {
    const res = await request(app).get('/faqs');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(6);
    expect(res.body.data[0]).toHaveProperty('q');
    expect(res.body.data[0]).toHaveProperty('a');
  });

  it('superadmin endpoints require authentication', async () => {
    const res = await request(app).get('/superadmin/faqs');
    expect([401, 403]).toContain(res.status);

    const postRes = await request(app).post('/superadmin/faqs').send({ question: 'Test?', answer: 'Yes.' });
    expect([401, 403]).toContain(postRes.status);
  });

  it('faqService creates, updates, and deletes FAQs', async () => {
    const created = await faqService.createFaq({
      question: 'Can I add a custom FAQ?',
      answer: 'Yes, through the super admin settings.',
      category: 'Custom',
      order: 10,
    });
    expect(created.question).toBe('Can I add a custom FAQ?');
    expect(created.isActive).toBe(true);

    const updated = await faqService.updateFaq(created.id, {
      question: 'Can I edit an FAQ?',
      isActive: false,
    });
    expect(updated.question).toBe('Can I edit an FAQ?');
    expect(updated.isActive).toBe(false);

    const deleted = await faqService.deleteFaq(created.id);
    expect(deleted.id).toBe(created.id);
    expect(await Faq.findById(created.id)).toBeNull();
  });
});
