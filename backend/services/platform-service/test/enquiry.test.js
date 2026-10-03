import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { connect, disconnect, getApp } from './helpers/setup.js';

let app;
let Enquiry;
let enquiryService;
let enquiryRepository;

const form = (over = {}) => ({
  name: 'Asha Verma',
  email: 'asha@greenfield.edu',
  school: 'Greenfield Public School',
  phone: '+91 98765 43210',
  message: 'We have 800 students and need fees + attendance.',
  ...over,
});

beforeAll(async () => {
  await connect();
  app = await getApp();
  ({ Enquiry } = await import('../src/models/Enquiry.js'));
  ({ enquiryService } = await import('../src/services/enquiry.service.js'));
  ({ enquiryRepository } = await import('../src/repositories/enquiry.repository.js'));
}, 60000);
afterAll(disconnect);
beforeEach(() => Enquiry.deleteMany({}));

describe('Public contact form', () => {
  it('saves a real enquiry as Pending', async () => {
    const res = await request(app).post('/enquiries').send(form());
    expect(res.status).toBe(201);
    const saved = await Enquiry.find({});
    expect(saved).toHaveLength(1);
    expect(saved[0].status).toBe('Pending');
    expect(saved[0].schoolName).toBe('Greenfield Public School');
  });

  it('rejects an invalid phone number that is not 10 digits', async () => {
    const res = await request(app).post('/enquiries').send(form({ phone: '12345' }));
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Contact phone must be exactly 10 digits');
  });

  it('allows submitting an enquiry without phone since it is optional', async () => {
    const res = await request(app).post('/enquiries').send(form({ phone: '' }));
    expect(res.status).toBe(201);
  });

  it('a bot that fills the hidden "website" field gets a success answer but nothing is saved', async () => {
    const res = await request(app).post('/enquiries').send(form({ website: 'http://spam.example' }));
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(await Enquiry.countDocuments()).toBe(0);
  });

  it('the Super Admin list is not public', async () => {
    const res = await request(app).get('/superadmin/enquiries');
    expect([401, 403]).toContain(res.status);
  });

  it('one IP cannot flood the inbox', async () => {
    let limited = 0;
    for (let i = 0; i < 8; i += 1) {
      const res = await request(app).post('/enquiries').send(form({ email: `bot${i}@x.test` }));
      if (res.status === 429) limited += 1;
    }
    expect(limited).toBeGreaterThan(0);
    expect(await Enquiry.countDocuments()).toBeLessThanOrEqual(5);
  });
});

describe('Follow-up workflow', () => {
  it('saving notes alone never changes the status or the contacted record', async () => {
    const created = await enquiryService.submitEnquiry({ ...form(), schoolName: 'Greenfield' });

    const noted = await enquiryService.updateEnquiryStatus(created.id, { notes: '  Called, wants a demo.  ' });
    expect(noted.status).toBe('Pending');
    expect(noted.notes).toBe('Called, wants a demo.');
    expect(noted.contactedAt).toBeNull();

    const contacted = await enquiryService.updateEnquiryStatus(created.id, { status: 'Contacted', contactedBy: 'Rehan' });
    expect(contacted.status).toBe('Contacted');
    expect(contacted.contactedBy).toBe('Rehan');
    expect(contacted.notes).toBe('Called, wants a demo.');
    const firstContactedAt = new Date(contacted.contactedAt).getTime();

    await new Promise((r) => setTimeout(r, 15));
    // Same status + new notes, sent by someone else: the original record stays.
    const again = await enquiryService.updateEnquiryStatus(created.id, { status: 'Contacted', contactedBy: 'Someone else', notes: 'Demo done.' });
    expect(again.notes).toBe('Demo done.');
    expect(again.contactedBy).toBe('Rehan');
    expect(new Date(again.contactedAt).getTime()).toBe(firstContactedAt);
  });

  it('a contacted enquiry can be moved back to Pending', async () => {
    const created = await enquiryService.submitEnquiry({ ...form(), schoolName: 'Greenfield' });
    await enquiryService.updateEnquiryStatus(created.id, { status: 'Contacted', contactedBy: 'Rehan' });
    const reopened = await enquiryService.updateEnquiryStatus(created.id, { status: 'Pending' });
    expect(reopened.status).toBe('Pending');
    expect(reopened.contactedAt).toBeNull();
    expect(reopened.contactedBy).toBeNull();
  });

  it('rejects an unknown status', async () => {
    const created = await enquiryService.submitEnquiry({ ...form(), schoolName: 'Greenfield' });
    await expect(enquiryService.updateEnquiryStatus(created.id, { status: 'Won' })).rejects.toMatchObject({ statusCode: 400 });
  });
});

describe('List, search, sort and stats', () => {
  beforeEach(async () => {
    const hours = (n) => new Date(Date.now() - n * 60 * 60 * 1000);
    await Enquiry.insertMany([
      { name: 'Old Pending', email: 'old@a.test', phone: '9000000001', message: 'm', status: 'Pending', createdAt: hours(24 * 10) },
      { name: 'Yesterday Pending', email: 'y@a.test', phone: '9000000002', message: 'm', status: 'Pending', createdAt: hours(30) },
      { name: 'Fresh Pending', email: 'f@a.test', phone: '9811122233', message: 'm', status: 'Pending', createdAt: hours(1) },
      { name: 'Done', email: 'd@a.test', phone: '9000000004', message: 'm', status: 'Contacted', createdAt: hours(48) },
    ]);
  });

  it('finds an enquiry by phone number', async () => {
    const { items } = await enquiryRepository.list({ search: '98111' });
    expect(items.map((i) => i.name)).toEqual(['Fresh Pending']);
  });

  it('sorts newest first by default and oldest first for the follow-up queue', async () => {
    const newest = await enquiryRepository.list({});
    expect(newest.items[0].name).toBe('Fresh Pending');
    const oldest = await enquiryRepository.list({ status: 'Pending', sort: 'oldest' });
    expect(oldest.items.map((i) => i.name)).toEqual(['Old Pending', 'Yesterday Pending', 'Fresh Pending']);
  });

  it('ignores a status that is not a real status (no query injection)', async () => {
    const res = await enquiryRepository.list({ status: { $ne: 'Pending' } });
    expect(res.total).toBe(4);
  });

  it('counts the last 7 days and pending enquiries waiting over 24 hours', async () => {
    expect(await enquiryRepository.stats()).toEqual({ total: 4, pending: 3, contacted: 1, last7Days: 3, overdue: 2 });
  });
});
