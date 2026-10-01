/**
 * withIdempotency must let exactly ONE request per (actor, scope, key) run the
 * handler — including two that arrive at the same moment (a double tap). The
 * handler here stands in for one with an external side effect (creating a
 * Razorpay order): running it twice is the bug.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import express from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { connect, disconnect } from './helpers/setup.js';
import { withIdempotency } from '../src/middleware/idempotency.js';
import { IdempotencyKey } from '../src/models/IdempotencyKey.js';

let app;
let runs = 0;
let failNext = false;
const user = { sub: new mongoose.Types.ObjectId().toString(), schoolId: new mongoose.Types.ObjectId().toString() };

beforeAll(async () => {
  await connect();
  await IdempotencyKey.init(); // the unique index is what makes the reservation atomic
  app = express();
  app.use((req, _res, next) => {
    req.user = user;
    next();
  });
  app.post('/order', withIdempotency('test.order'), async (_req, res) => {
    runs += 1;
    const mine = runs;
    await new Promise((r) => setTimeout(r, 150)); // slow, like a payment-gateway call
    if (failNext) {
      failNext = false;
      return res.status(502).json({ success: false, code: 'GATEWAY_DOWN' });
    }
    return res.status(201).json({ success: true, data: { orderId: `order_${mine}` } });
  });
});

afterAll(async () => {
  await disconnect();
});

const post = (key) => request(app).post('/order').set('Idempotency-Key', key);

describe('withIdempotency', () => {
  it('runs the handler once for 5 simultaneous requests with one key', async () => {
    runs = 0;
    const res = await Promise.all([1, 2, 3, 4, 5].map(() => post('same-key')));
    expect(runs).toBe(1);
    expect(res.every((r) => r.status === 201)).toBe(true);
    expect(new Set(res.map((r) => r.body.data.orderId)).size).toBe(1);
    expect(res.filter((r) => r.headers['idempotency-replayed'] === 'true')).toHaveLength(4);
  });

  it('replays the stored response on a later retry', async () => {
    const before = runs;
    const res = await post('same-key');
    expect(runs).toBe(before);
    expect(res.status).toBe(201);
    expect(res.headers['idempotency-replayed']).toBe('true');
  });

  it('different keys each run', async () => {
    const before = runs;
    const [a, b] = await Promise.all([post('key-a'), post('key-b')]);
    expect(runs).toBe(before + 2);
    expect(a.body.data.orderId).not.toBe(b.body.data.orderId);
  });

  it('a failed attempt releases the key so the same key can be retried', async () => {
    failNext = true;
    const first = await post('retry-key');
    expect(first.status).toBe(502);
    const second = await post('retry-key');
    expect(second.status).toBe(201);
    expect(second.headers['idempotency-replayed']).toBeUndefined();
  });

  it('no header → passthrough, every request runs', async () => {
    const before = runs;
    await Promise.all([request(app).post('/order'), request(app).post('/order')]);
    expect(runs).toBe(before + 2);
  });
});
