import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 90000);
afterAll(disconnect);

// The public link carries a random token (from the staff form endpoint), never the school's slug.
const tokenOf = async (adminToken) => {
  const cfg = await request(app).get('/school-portal/student-enquiries/form').set(auth(adminToken));
  return cfg.body.data.path.replace('/enquiry/', '');
};

describe('Student enquiry', () => {
  let token;

  it('link is token-based: the school slug no longer opens the form, public data hides the slug', async () => {
    token = await tokenOf(ctx.a.adminToken);
    expect(token).toMatch(/^[A-Za-z0-9_-]{16,}$/);
    expect(token).not.toBe(ctx.a.schoolId);
    expect(await tokenOf(ctx.a.adminToken)).toBe(token); // stable between calls

    const bySlug = await request(app).get(`/student-enquiry/${ctx.a.schoolId}`);
    expect(bySlug.status).toBe(404);
    const pub = await request(app).get(`/student-enquiry/${token}`);
    expect(pub.status).toBe(200);
    expect(pub.body.data.schoolId).toBeUndefined();
    expect(pub.body.data.schoolName).toBeTruthy();
  });

  it('regenerating the link disables the old one', async () => {
    const res = await request(app).post('/school-portal/student-enquiries/form/regenerate-link').set(auth(ctx.a.adminToken));
    expect(res.status).toBe(200);
    const fresh = res.body.data.path.replace('/enquiry/', '');
    expect(fresh).not.toBe(token);
    expect((await request(app).get(`/student-enquiry/${token}`)).status).toBe(404);
    expect((await request(app).get(`/student-enquiry/${fresh}`)).status).toBe(200);
    token = fresh;
  });

  it('public form → submit → staff list/update/delete, tenant isolated', async () => {
    const form = await request(app).get(`/student-enquiry/${token}`);
    expect(form.status).toBe(200);
    expect(form.body.data.enabled).toBe(true);
    expect(form.body.data.fields.map((f) => f.key)).toEqual(expect.arrayContaining(['studentName', 'mobile']));

    const bad = await request(app).post(`/student-enquiry/${token}`).send({ answers: { studentName: 'Aarav' } });
    expect(bad.status).toBe(400);

    const ok = await request(app)
      .post(`/student-enquiry/${token}`)
      .send({ answers: { studentName: 'Aarav', parentName: 'Ravi', mobile: '9876543210', classApplying: 'Class 3', message: 'Fees?' } });
    expect(ok.status).toBe(201);

    const bot = await request(app).post(`/student-enquiry/${token}`).send({ website: 'spam.com', answers: {} });
    expect(bot.status).toBe(201);

    const list = await request(app).get('/school-portal/student-enquiries').set(auth(ctx.a.adminToken));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].extra[0]).toMatchObject({ key: 'message', value: 'Fees?' });
    expect(list.body.stats.TOTAL).toBe(1);
    const id = list.body.data[0].id;

    const other = await request(app).get('/school-portal/student-enquiries').set(auth(ctx.b.adminToken));
    expect(other.body.data).toHaveLength(0);
    const cross = await request(app).patch(`/school-portal/student-enquiries/${id}`).set(auth(ctx.b.adminToken)).send({ status: 'CLOSED' });
    expect(cross.status).toBe(404);

    const upd = await request(app).patch(`/school-portal/student-enquiries/${id}`).set(auth(ctx.a.adminToken)).send({ status: 'contacted', note: 'Called' });
    expect(upd.body.data.status).toBe('CONTACTED');

    const del = await request(app).delete(`/school-portal/student-enquiries/${id}`).set(auth(ctx.a.adminToken));
    expect(del.status).toBe(200);
  });

  it('school customises the form; required + select validation and closing it', async () => {
    const cfg = await request(app).get('/school-portal/student-enquiries/form').set(auth(ctx.a.adminToken));
    expect(cfg.body.data.path).toMatch(/^\/enquiry\//);
    const fields = cfg.body.data.fields.map((f) => (f.key === 'parentName' ? { ...f, enabled: false } : f));
    fields.push({ label: 'Transport needed?', type: 'select', options: ['Yes', 'No'], required: true });
    const save = await request(app).put('/school-portal/student-enquiries/form').set(auth(ctx.a.adminToken)).send({ fields, title: 'Join Us' });
    expect(save.status).toBe(200);
    const custom = save.body.data.fields.find((f) => f.label === 'Transport needed?');
    expect(custom.key).toMatch(/^c_/);

    const pub = await request(app).get(`/student-enquiry/${token}`);
    expect(pub.body.data.title).toBe('Join Us');
    expect(pub.body.data.fields.find((f) => f.key === 'parentName')).toBeUndefined();

    const missing = await request(app).post(`/student-enquiry/${token}`).send({ answers: { studentName: 'A', mobile: '9876543210' } });
    expect(missing.status).toBe(400);
    const wrong = await request(app).post(`/student-enquiry/${token}`).send({ answers: { studentName: 'A', mobile: '9876543210', [custom.key]: 'Maybe' } });
    expect(wrong.status).toBe(400);
    const good = await request(app).post(`/student-enquiry/${token}`).send({ answers: { studentName: 'A', mobile: '9876543210', [custom.key]: 'Yes' } });
    expect(good.status).toBe(201);

    await request(app).put('/school-portal/student-enquiries/form').set(auth(ctx.a.adminToken)).send({ enabled: false });
    const closed = await request(app).post(`/student-enquiry/${token}`).send({ answers: { studentName: 'A', mobile: '9876543210', [custom.key]: 'Yes' } });
    expect(closed.status).toBe(403);
  });
});
