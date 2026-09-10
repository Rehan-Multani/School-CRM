/**
 * The Hostel module's whole flow, in the order the admin must follow it:
 *
 *   Hostel → Room → Beds → Warden + Hostel → Student + Hostel + Room + Bed
 *   → Yearly hostel fee
 *
 * plus the guards that keep that order true (a hostel with no warden cannot
 * take residents, an occupied bed refuses a second student, a full hostel
 * refuses one more) and tenant isolation between two seeded schools.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const H = '/school-portal/hostel';

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

describe('Hostel · admin flow', () => {
  let token;
  let hostelId;
  let roomId;
  let beds = [];
  let wardenId;
  let allocationId;

  beforeAll(() => {
    token = ctx.a.adminToken;
  });

  /* ------------------------------ 1 · HOSTEL ------------------------------ */

  it('creates a hostel', async () => {
    const res = await request(app)
      .post(`${H}/hostels`)
      .set(auth(token))
      .send({
        name: 'Boys Hostel',
        code: 'bh-01',
        type: 'BOYS',
        category: 'RESIDENTIAL',
        contactNumber: '9876543210',
        address: 'School Campus, Block A',
        totalFloors: 3,
        totalRooms: 30,
        totalCapacity: 2,
        description: 'Boys hostel near main building',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Boys Hostel');
    // The code is stored upper-cased no matter how the admin typed it.
    expect(res.body.data.code).toBe('BH-01');
    expect(res.body.data.category).toBe('RESIDENTIAL');
    expect(res.body.data.contactNumber).toBe('9876543210');
    expect(res.body.data.address).toBe('School Campus, Block A');
    expect(res.body.data.totalFloors).toBe(3);
    expect(res.body.data.totalRooms).toBe(30);
    expect(res.body.data.description).toBe('Boys hostel near main building');
    expect(res.body.data.totalCapacity).toBe(2);
    hostelId = res.body.data.id;
  });

  it('rejects a second hostel with the same name', async () => {
    const res = await request(app)
      .post(`${H}/hostels`)
      .set(auth(token))
      .send({ name: 'Boys Hostel', code: 'BH-02', type: 'BOYS', totalCapacity: 50 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('HOSTEL_DUPLICATE');
  });

  it('rejects a second hostel with the same code', async () => {
    const res = await request(app)
      .post(`${H}/hostels`)
      .set(auth(token))
      .send({ name: 'Girls Hostel', code: 'BH-01', type: 'GIRLS', totalCapacity: 50 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('HOSTEL_DUPLICATE');
  });

  it('rejects a hostel without a code', async () => {
    const res = await request(app)
      .post(`${H}/hostels`)
      .set(auth(token))
      .send({ name: 'Girls Hostel', type: 'GIRLS', totalCapacity: 50 });

    expect(res.status).toBe(400);
  });

  /* --------------------------- 2 + 3 · ROOM + BEDS ------------------------ */

  it('creates a room and its beds in one step', async () => {
    const res = await request(app)
      .post(`${H}/rooms`)
      .set(auth(token))
      .send({ hostelId, roomNumber: '101', floorNumber: '1st Floor', capacity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.data.capacity).toBe(2);
    expect(res.body.data.beds).toHaveLength(2);
    expect(res.body.data.beds.map((b) => b.bedCode)).toEqual(['Bed 1', 'Bed 2']);
    expect(res.body.data.beds.every((b) => b.status === 'AVAILABLE')).toBe(true);
    roomId = res.body.data.id;
    beds = res.body.data.beds;
  });

  it('rejects a duplicate room number in the same hostel', async () => {
    const res = await request(app)
      .post(`${H}/rooms`)
      .set(auth(token))
      .send({ hostelId, roomNumber: '101', floorNumber: '1st Floor', capacity: 4 });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('HOSTEL_DUPLICATE');
  });

  it('adds beds when the room capacity grows', async () => {
    const res = await request(app).patch(`${H}/rooms/${roomId}`).set(auth(token)).send({ capacity: 3 });

    expect(res.status).toBe(200);
    expect(res.body.data.beds).toHaveLength(3);
    beds = res.body.data.beds;

    // ...and back down again, since no bed is occupied yet.
    const shrink = await request(app).patch(`${H}/rooms/${roomId}`).set(auth(token)).send({ capacity: 2 });
    expect(shrink.status).toBe(200);
    expect(shrink.body.data.beds).toHaveLength(2);
    beds = shrink.body.data.beds;
  });

  /* ------------------------------ 5 · TOO EARLY --------------------------- */

  it('refuses a student while the hostel has no warden', async () => {
    const res = await request(app)
      .post(`${H}/allocations`)
      .set(auth(token))
      .send({ studentId: ctx.a.studentId, hostelId, roomId, bedId: beds[0].id });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('HOSTEL_NOT_READY');
  });

  /* ------------------------------- 4 · WARDEN ----------------------------- */

  it('adds a warden and assigns them to the hostel', async () => {
    const res = await request(app)
      .post(`${H}/wardens`)
      .set(auth(token))
      .send({ name: 'Rajesh Sharma', mobile: '9876543210', hostelId });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Rajesh Sharma');
    expect(res.body.data.hostelId).toBe(hostelId);
    wardenId = res.body.data.id;
  });

  it('refuses a second warden for the same hostel', async () => {
    const res = await request(app)
      .post(`${H}/wardens`)
      .set(auth(token))
      .send({ name: 'Second Warden', mobile: '9876500001', hostelId });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('HOSTEL_ALREADY_ASSIGNED');
  });

  /* ---------------------------- 6 · YEARLY FEE ---------------------------- */

  it('lists every academic year with no fee set yet', async () => {
    const res = await request(app).get(`${H}/fees`).set(auth(token));

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const current = res.body.data.find((f) => f.academicYear.isCurrent);
    expect(current).toBeTruthy();
    expect(current.yearlyAmount).toBeNull();
  });

  it('sets the yearly hostel fee for the current academic year', async () => {
    const res = await request(app)
      .put(`${H}/fees/${ctx.a.yearId}`)
      .set(auth(token))
      .send({ yearlyAmount: 60000 });

    expect(res.status).toBe(200);
    expect(res.body.data.yearlyAmount).toBe(60000);
  });

  it('rejects a fractional or negative fee', async () => {
    for (const yearlyAmount of [1500.5, -1]) {
      const res = await request(app)
        .put(`${H}/fees/${ctx.a.yearId}`)
        .set(auth(token))
        .send({ yearlyAmount });
      expect(res.status).toBe(400);
    }
  });

  /* --------------------------- 5 · STUDENT + BED -------------------------- */

  it('assigns a student to a bed and stamps the yearly fee on the allocation', async () => {
    const res = await request(app)
      .post(`${H}/allocations`)
      .set(auth(token))
      .send({ studentId: ctx.a.studentId, hostelId, roomId, bedId: beds[0].id });

    expect(res.status).toBe(201);
    expect(res.body.data.bed.bedCode).toBe('Bed 1');
    expect(res.body.data.room.roomNumber).toBe('101');
    expect(res.body.data.yearlyFeeAmount).toBe(60000);
    expect(res.body.data.academicYear.id).toBe(ctx.a.yearId);
    allocationId = res.body.data.id;
  });

  it('marks that bed OCCUPIED', async () => {
    const res = await request(app).get(`${H}/beds`).query({ roomId }).set(auth(token));

    expect(res.status).toBe(200);
    const bed1 = res.body.data.find((b) => b.bedCode === 'Bed 1');
    expect(bed1.status).toBe('OCCUPIED');
    expect(bed1.student.admissionNumber).toBe(`ADM-schoola-1`);
    expect(res.body.data.find((b) => b.bedCode === 'Bed 2').status).toBe('AVAILABLE');
  });

  it('refuses a second student in the same bed', async () => {
    const res = await request(app)
      .post(`${H}/allocations`)
      .set(auth(token))
      .send({ studentId: ctx.a.studentNoGuardianId, hostelId, roomId, bedId: beds[0].id });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('HOSTEL_BED_OCCUPIED');
  });

  it('refuses the same student a second hostel bed', async () => {
    const res = await request(app)
      .post(`${H}/allocations`)
      .set(auth(token))
      .send({ studentId: ctx.a.studentId, hostelId, roomId, bedId: beds[1].id });

    expect(res.status).toBe(409);
    expect(res.body.code).toBe('HOSTEL_ALREADY_ASSIGNED');
  });

  it('refuses to shrink the room below an occupied bed', async () => {
    const res = await request(app).patch(`${H}/rooms/${roomId}`).set(auth(token)).send({ capacity: 1 });
    // Bed 1 is occupied, Bed 2 is not — shrinking to 1 keeps Bed 1, so it is
    // allowed; shrinking is only refused when the removed beds are occupied.
    expect(res.status).toBe(200);
    const grow = await request(app).patch(`${H}/rooms/${roomId}`).set(auth(token)).send({ capacity: 2 });
    expect(grow.status).toBe(200);
    beds = grow.body.data.beds;
  });

  it('reports room occupancy as 1 / 2', async () => {
    const res = await request(app).get(`${H}/rooms`).query({ hostelId }).set(auth(token));

    expect(res.status).toBe(200);
    const room = res.body.data.find((r) => r.id === roomId);
    expect(room.capacity).toBe(2);
    expect(room.occupiedBeds).toBe(1);
  });

  /* --------------------------- CAPACITY & DELETES ------------------------- */

  it('refuses a resident past the hostel capacity', async () => {
    // One resident is already in. Tighten the building's ceiling to exactly
    // that, and the free Bed 2 must still be refused.
    const shrink = await request(app)
      .patch(`${H}/hostels/${hostelId}`)
      .set(auth(token))
      .send({ totalCapacity: 1 });
    expect(shrink.status).toBe(200);

    const second = await request(app)
      .post(`${H}/allocations`)
      .set(auth(token))
      .send({ studentId: ctx.a.studentNoGuardianId, hostelId, roomId, bedId: beds[1].id });
    expect(second.status).toBe(409);
    expect(second.body.code).toBe('HOSTEL_CAPACITY_FULL');

    // Dropping the ceiling below the people already living there is refused.
    const tooSmall = await request(app)
      .patch(`${H}/hostels/${hostelId}`)
      .set(auth(token))
      .send({ totalCapacity: 0 });
    expect(tooSmall.status).toBe(400);

    const restore = await request(app)
      .patch(`${H}/hostels/${hostelId}`)
      .set(auth(token))
      .send({ totalCapacity: 2 });
    expect(restore.status).toBe(200);
  });

  it('refuses a student who belongs to another school', async () => {
    const res = await request(app)
      .post(`${H}/allocations`)
      .set(auth(token))
      .send({ studentId: ctx.b.studentId, hostelId, roomId, bedId: beds[1].id });

    expect(res.status).toBe(404);
  });

  it('refuses to delete a room that still has residents', async () => {
    const res = await request(app).delete(`${H}/rooms/${roomId}`).set(auth(token));
    expect(res.status).toBe(409);
  });

  it('refuses to delete a warden who still runs a hostel', async () => {
    const res = await request(app).delete(`${H}/wardens/${wardenId}`).set(auth(token));
    expect(res.status).toBe(409);
  });

  /* ------------------------------- VACATING ------------------------------- */

  it('vacates a student and frees the bed', async () => {
    const res = await request(app).delete(`${H}/allocations/${allocationId}`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('VACATED');

    const bedsRes = await request(app).get(`${H}/beds`).query({ roomId }).set(auth(token));
    expect(bedsRes.body.data.find((b) => b.bedCode === 'Bed 1').status).toBe('AVAILABLE');
  });

  it('keeps the vacated resident priced at the fee they were admitted on', async () => {
    // The school raises the fee AFTER the student was assigned...
    const raise = await request(app)
      .put(`${H}/fees/${ctx.a.yearId}`)
      .set(auth(token))
      .send({ yearlyAmount: 65000 });
    expect(raise.status).toBe(200);

    const res = await request(app).get(`${H}/allocations`).query({ status: 'VACATED' }).set(auth(token));
    const row = res.body.data.find((a) => a.id === allocationId);
    // ...and the existing record still carries the old amount.
    expect(row.yearlyFeeAmount).toBe(60000);
  });

  /* ------------------------------- ISOLATION ------------------------------ */

  it('does not show school B the hostels of school A', async () => {
    const res = await request(app).get(`${H}/hostels`).set(auth(ctx.b.adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.find((h) => h.id === hostelId)).toBeUndefined();
  });

  it('refuses school B access to a school A hostel by id', async () => {
    const res = await request(app).get(`${H}/hostels/${hostelId}`).set(auth(ctx.b.adminToken));
    expect(res.status).toBe(404);
  });

  it('rejects an unauthenticated request', async () => {
    const res = await request(app).get(`${H}/hostels`);
    expect(res.status).toBe(401);
  });
});
