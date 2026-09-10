/**
 * The Transport module's whole flow, in the order the admin must follow it:
 *
 *   Vehicle → Driver + Vehicle → Route → Stops (+ scheduled times)
 *   → Route + Vehicle + Driver → Student + Route + Stop
 *
 * plus the guards that keep that order true (a route with no bus cannot take
 * riders, a full bus refuses one more, an in-use record cannot be deleted) and
 * tenant isolation between two seeded schools.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';

let app;
let ctx;
const auth = (t) => ({ Authorization: `Bearer ${t}` });
const T = '/school-portal/transport';

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();
}, 60000);
afterAll(disconnect);

describe('Transport · admin flow', () => {
  let token;
  let vehicleId;
  let driverId;
  let routeId;
  let stops = [];
  let assignmentId;

  beforeAll(() => {
    token = ctx.a.adminToken;
  });

  /* ------------------------------ 1 · VEHICLE ----------------------------- */

  it('adds a vehicle and normalizes its number', async () => {
    const res = await request(app)
      .post(`${T}/vehicles`)
      .set(auth(token))
      .send({
        vehicleNumber: 'mp 09 cd 5678',
        vehicleType: 'SCHOOL_BUS',
        capacity: 2,
        model: 'Tata Starbus',
        fuelType: 'CNG',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.vehicleNumber).toBe('MP09CD5678');
    expect(res.body.data.capacity).toBe(2);
    expect(res.body.data.model).toBe('Tata Starbus');
    expect(res.body.data.fuelType).toBe('CNG');
    vehicleId = res.body.data.id;
  });

  it('leaves model blank and fuel on diesel when they are not supplied', async () => {
    const res = await request(app)
      .post(`${T}/vehicles`)
      .set(auth(token))
      .send({ vehicleNumber: 'MP09ZZ0007', vehicleType: 'OTHER', capacity: 12 });
    expect(res.status).toBe(201);
    expect(res.body.data.model).toBe('');
    expect(res.body.data.fuelType).toBe('DIESEL');
    expect(res.body.data.vehicleType).toBe('OTHER');

    const edited = await request(app)
      .patch(`${T}/vehicles/${res.body.data.id}`)
      .set(auth(token))
      .send({ model: 'Force Traveller', fuelType: 'electric' });
    expect(edited.body.data.model).toBe('Force Traveller');
    expect(edited.body.data.fuelType).toBe('ELECTRIC');

    expect((await request(app).delete(`${T}/vehicles/${res.body.data.id}`).set(auth(token))).status).toBe(200);
  });

  it('refuses a duplicate vehicle number, a bad capacity and an unknown fuel type', async () => {
    const dup = await request(app)
      .post(`${T}/vehicles`)
      .set(auth(token))
      .send({ vehicleNumber: 'MP09CD5678', capacity: 40 });
    expect(dup.status).toBe(409);
    expect(dup.body.code).toBe('TRANSPORT_DUPLICATE');

    const bad = await request(app)
      .post(`${T}/vehicles`)
      .set(auth(token))
      .send({ vehicleNumber: 'MP09XX0001', capacity: 0 });
    expect(bad.status).toBe(400);

    const fuel = await request(app)
      .post(`${T}/vehicles`)
      .set(auth(token))
      .send({ vehicleNumber: 'MP09XX0002', capacity: 20, fuelType: 'HYDROGEN' });
    expect(fuel.status).toBe(400);
    expect(fuel.body.message).toMatch(/Fuel type must be one of/);
  });

  /* ------------------------------ 2 · DRIVER ------------------------------ */

  it('adds a driver and assigns the vehicle to them', async () => {
    const created = await request(app)
      .post(`${T}/drivers`)
      .set(auth(token))
      .send({
        name: 'Rahul Sharma',
        mobile: '98765 43222',
        licenseNumber: 'mp123456700',
        password: 'Driver@123',
      });
    expect(created.status).toBe(201);
    expect(created.body.data.mobile).toBe('9876543222');
    expect(created.body.data.licenseNumber).toBe('MP123456700');
    expect(created.body.data.loginEnabled).toBe(true);
    driverId = created.body.data.id;

    const linked = await request(app)
      .post(`${T}/drivers/${driverId}/vehicle`)
      .set(auth(token))
      .send({ vehicleId });
    expect(linked.status).toBe(200);
    expect(linked.body.data.vehicle.vehicleNumber).toBe('MP09CD5678');
  });

  it('refuses a duplicate mobile and a vehicle another driver already holds', async () => {
    const dup = await request(app)
      .post(`${T}/drivers`)
      .set(auth(token))
      .send({ name: 'Someone Else', mobile: '9876543222', licenseNumber: 'MP999999999' });
    expect(dup.status).toBe(409);

    const other = await request(app)
      .post(`${T}/drivers`)
      .set(auth(token))
      .send({ name: 'Second Driver', mobile: '9876543233', licenseNumber: 'MP123456701' });
    expect(other.status).toBe(201);

    const taken = await request(app)
      .post(`${T}/drivers/${other.body.data.id}/vehicle`)
      .set(auth(token))
      .send({ vehicleId });
    expect(taken.status).toBe(409);
    expect(taken.body.code).toBe('TRANSPORT_ALREADY_ASSIGNED');
  });

  /* --------------------------- 3 · ROUTE + STOPS -------------------------- */

  it('creates a route and rejects a duplicate name', async () => {
    const res = await request(app).post(`${T}/routes`).set(auth(token)).send({ routeName: 'Route 07' });
    expect(res.status).toBe(201);
    expect(res.body.data.vehicle).toBeNull();
    routeId = res.body.data.id;

    const dup = await request(app).post(`${T}/routes`).set(auth(token)).send({ routeName: 'Route 07' });
    expect(dup.status).toBe(409);
  });

  it('adds stops in sequence with mandatory pickup and drop times', async () => {
    const wanted = [
      { stopName: 'Teen Imli', pickupTime: '7:30 am', dropTime: '16:00' },
      { stopName: 'Khajrana', pickupTime: '07:45 AM', dropTime: '03:45 PM' },
      { stopName: 'Palasia', pickupTime: '08:00 AM', dropTime: '03:30 PM' },
      { stopName: 'School', pickupTime: '08:20 AM', dropTime: '03:10 PM' },
    ];
    for (const stop of wanted) {
      const res = await request(app).post(`${T}/routes/${routeId}/stops`).set(auth(token)).send(stop);
      expect(res.status).toBe(201);
    }

    const list = await request(app).get(`${T}/routes/${routeId}/stops`).set(auth(token));
    stops = list.body.data;
    expect(stops.map((s) => s.sequenceOrder)).toEqual([1, 2, 3, 4]);
    expect(stops.map((s) => s.stopName)).toEqual(['Teen Imli', 'Khajrana', 'Palasia', 'School']);
    // 12- and 24-hour input both normalize to the stored display form.
    expect(stops[0].pickupTime).toBe('07:30 AM');
    expect(stops[0].dropTime).toBe('04:00 PM');
  });

  it('rejects a stop with no time, a bad time, or a duplicate name', async () => {
    const noTime = await request(app)
      .post(`${T}/routes/${routeId}/stops`)
      .set(auth(token))
      .send({ stopName: 'Bengali Square', dropTime: '03:20 PM' });
    expect(noTime.status).toBe(400);
    expect(noTime.body.message).toMatch(/Pickup time is required/);

    const badTime = await request(app)
      .post(`${T}/routes/${routeId}/stops`)
      .set(auth(token))
      .send({ stopName: 'Bengali Square', pickupTime: '25:99', dropTime: '03:20 PM' });
    expect(badTime.status).toBe(400);

    const dup = await request(app)
      .post(`${T}/routes/${routeId}/stops`)
      .set(auth(token))
      .send({ stopName: 'Palasia', pickupTime: '08:05 AM', dropTime: '03:25 PM' });
    expect(dup.status).toBe(409);
  });

  it('reorders stops, and refuses a partial reorder payload', async () => {
    const partial = await request(app)
      .patch(`${T}/routes/${routeId}/stops/reorder`)
      .set(auth(token))
      .send({ stopIds: [stops[1].id, stops[0].id] });
    expect(partial.status).toBe(400);

    const reversed = [stops[3].id, stops[2].id, stops[1].id, stops[0].id];
    const res = await request(app)
      .patch(`${T}/routes/${routeId}/stops/reorder`)
      .set(auth(token))
      .send({ stopIds: reversed });
    expect(res.status).toBe(200);
    expect(res.body.data.map((s) => s.stopName)).toEqual(['School', 'Palasia', 'Khajrana', 'Teen Imli']);

    // put it back the way the morning run actually goes
    await request(app)
      .patch(`${T}/routes/${routeId}/stops/reorder`)
      .set(auth(token))
      .send({ stopIds: [stops[0].id, stops[1].id, stops[2].id, stops[3].id] });
  });

  /* ------------------- 5 before 4 · the order is enforced ------------------ */

  it('will not seat a student on a route that has no vehicle and driver yet', async () => {
    const res = await request(app)
      .post(`${T}/assignments`)
      .set(auth(token))
      .send({ studentId: ctx.a.studentNoGuardianId, routeId, stopId: stops[0].id });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('TRANSPORT_ROUTE_NOT_READY');
  });

  /* ---------------------- 4 · ROUTE + VEHICLE + DRIVER -------------------- */

  it('assigns the vehicle and driver to the route', async () => {
    const res = await request(app)
      .post(`${T}/routes/${routeId}/assign`)
      .set(auth(token))
      .send({ vehicleId, driverId });
    expect(res.status).toBe(200);
    expect(res.body.data.vehicle.vehicleNumber).toBe('MP09CD5678');
    expect(res.body.data.driver.name).toBe('Rahul Sharma');
    expect(res.body.data.totalStops).toBe(4);
  });

  it('refuses a driver already running another route', async () => {
    const spare = await request(app)
      .post(`${T}/vehicles`)
      .set(auth(token))
      .send({ vehicleNumber: 'MP09EF9999', capacity: 30 });
    const other = await request(app).post(`${T}/routes`).set(auth(token)).send({ routeName: 'Route 08' });

    const res = await request(app)
      .post(`${T}/routes/${other.body.data.id}/assign`)
      .set(auth(token))
      .send({ vehicleId: spare.body.data.id, driverId });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/already driving Route 07/);
  });

  it('refuses a route whose vehicle contradicts the driver’s own vehicle', async () => {
    // A free driver holding one bus, asked to run a route with a different one.
    const held = await request(app)
      .post(`${T}/vehicles`)
      .set(auth(token))
      .send({ vehicleNumber: 'MP09GH1111', capacity: 20 });
    const wanted = await request(app)
      .post(`${T}/vehicles`)
      .set(auth(token))
      .send({ vehicleNumber: 'MP09GH2222', capacity: 20 });
    const free = await request(app)
      .post(`${T}/drivers`)
      .set(auth(token))
      .send({
        name: 'Third Driver',
        mobile: '9876543244',
        licenseNumber: 'MP123456702',
        vehicleId: held.body.data.id,
      });
    expect(free.body.data.vehicle.vehicleNumber).toBe('MP09GH1111');

    const route09 = await request(app).post(`${T}/routes`).set(auth(token)).send({ routeName: 'Route 09' });
    const res = await request(app)
      .post(`${T}/routes/${route09.body.data.id}/assign`)
      .set(auth(token))
      .send({ vehicleId: wanted.body.data.id, driverId: free.body.data.id });
    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/different vehicle/);
  });

  /* ------------------------- 5 · STUDENT ASSIGNMENT ----------------------- */

  it('seats a student and gives them the stop schedule', async () => {
    // the seeded rider already occupies this student, so free them first
    const seeded = await request(app).get(`${T}/assignments`).set(auth(token));
    const mine = seeded.body.data.find((a) => a.student.id === ctx.a.studentId);
    expect(mine).toBeTruthy();
    expect((await request(app).delete(`${T}/assignments/${mine.id}`).set(auth(token))).status).toBe(200);

    const res = await request(app)
      .post(`${T}/assignments`)
      .set(auth(token))
      .send({ studentId: ctx.a.studentId, routeId, stopId: stops[0].id });
    expect(res.status).toBe(201);
    expect(res.body.data.stop.stopName).toBe('Teen Imli');
    expect(res.body.data.pickupTime).toBe('07:30 AM');
    expect(res.body.data.dropTime).toBe('04:00 PM');
    assignmentId = res.body.data.id;
  });

  it('refuses a second active assignment for the same student', async () => {
    const res = await request(app)
      .post(`${T}/assignments`)
      .set(auth(token))
      .send({ studentId: ctx.a.studentId, routeId, stopId: stops[1].id });
    expect(res.status).toBe(409);
    expect(res.body.code).toBe('TRANSPORT_ALREADY_ASSIGNED');
  });

  it('refuses a stop that belongs to another route', async () => {
    const res = await request(app)
      .post(`${T}/assignments`)
      .set(auth(token))
      .send({ studentId: ctx.a.studentNoGuardianId, routeId, stopId: ctx.a.stopId });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not a stop on/);
  });

  it('moving a student to another stop re-reads the timing from that stop', async () => {
    const res = await request(app)
      .patch(`${T}/assignments/${assignmentId}`)
      .set(auth(token))
      .send({ stopId: stops[1].id });
    expect(res.status).toBe(200);
    expect(res.body.data.stop.stopName).toBe('Khajrana');
    expect(res.body.data.pickupTime).toBe('07:45 AM');
    expect(res.body.data.dropTime).toBe('03:45 PM');

    // put them back on Teen Imli for the capacity check below
    await request(app).patch(`${T}/assignments/${assignmentId}`).set(auth(token)).send({ stopId: stops[0].id });
  });

  it('stops seating students once the bus is full', async () => {
    // MP09CD5678 seats 2 and one seat is taken
    const second = await request(app)
      .post(`${T}/assignments`)
      .set(auth(token))
      .send({ studentId: ctx.a.studentNoGuardianId, routeId, stopId: stops[1].id });
    expect(second.status).toBe(201);

    const capacity = await request(app)
      .patch(`${T}/vehicles/${vehicleId}`)
      .set(auth(token))
      .send({ capacity: 1 });
    expect(capacity.status).toBe(409);
    expect(capacity.body.code).toBe('TRANSPORT_CAPACITY_FULL');

    // free a seat, then prove a third rider is refused on a 2-seater
    await request(app).delete(`${T}/assignments/${second.body.data.id}`).set(auth(token));
    await request(app)
      .patch(`${T}/vehicles/${vehicleId}`)
      .set(auth(token))
      .send({ capacity: 1 });

    const overflow = await request(app)
      .post(`${T}/assignments`)
      .set(auth(token))
      .send({ studentId: ctx.a.studentNoGuardianId, routeId, stopId: stops[1].id });
    expect(overflow.status).toBe(409);
    expect(overflow.body.code).toBe('TRANSPORT_CAPACITY_FULL');
  });

  /* ------------------------------- GUARDS -------------------------------- */

  it('will not delete anything still in use', async () => {
    const stop = await request(app).delete(`${T}/stops/${stops[0].id}`).set(auth(token));
    expect(stop.status).toBe(409);
    expect(stop.body.message).toMatch(/picked up there/);

    const route = await request(app).delete(`${T}/routes/${routeId}`).set(auth(token));
    expect(route.status).toBe(409);

    const vehicle = await request(app).delete(`${T}/vehicles/${vehicleId}`).set(auth(token));
    expect(vehicle.status).toBe(409);

    const driver = await request(app).delete(`${T}/drivers/${driverId}`).set(auth(token));
    expect(driver.status).toBe(409);
  });

  it('renumbers the remaining stops after a delete', async () => {
    const spare = await request(app)
      .post(`${T}/routes/${routeId}/stops`)
      .set(auth(token))
      .send({ stopName: 'Bengali Square', pickupTime: '08:10 AM', dropTime: '03:20 PM' });
    expect(spare.body.data.sequenceOrder).toBe(5);

    // delete the 3rd stop; nobody rides from it, so the sequence just closes up
    expect((await request(app).delete(`${T}/stops/${stops[2].id}`).set(auth(token))).status).toBe(200);

    const list = await request(app).get(`${T}/routes/${routeId}/stops`).set(auth(token));
    expect(list.body.data.map((s) => s.sequenceOrder)).toEqual([1, 2, 3, 4]);
    expect(list.body.data.map((s) => s.stopName)).toEqual([
      'Teen Imli',
      'Khajrana',
      'School',
      'Bengali Square',
    ]);
  });

  it('lookups return only real records for the dropdowns', async () => {
    const res = await request(app).get(`${T}/lookups`).set(auth(token));
    expect(res.status).toBe(200);
    expect(res.body.data.routes.find((r) => r.id === routeId).stops.length).toBe(4);
    const rider = res.body.data.students.find((s) => s.id === ctx.a.studentId);
    expect(rider.alreadyAssigned).toBe(true);
    const free = res.body.data.students.find((s) => s.id === ctx.a.studentNoGuardianId);
    expect(free.alreadyAssigned).toBe(false);
  });
});

describe('Transport · school isolation', () => {
  it('school B cannot read or touch school A transport records', async () => {
    const token = ctx.b.adminToken;

    expect((await request(app).get(`${T}/vehicles/${ctx.a.vehicleId}`).set(auth(token))).status).toBe(404);
    expect((await request(app).get(`${T}/routes/${ctx.a.routeId}`).set(auth(token))).status).toBe(404);
    expect((await request(app).get(`${T}/routes/${ctx.a.routeId}/stops`).set(auth(token))).status).toBe(404);
    expect(
      (await request(app).patch(`${T}/stops/${ctx.a.stopId}`).set(auth(token)).send({ stopName: 'Hacked' }))
        .status
    ).toBe(404);
    expect((await request(app).delete(`${T}/vehicles/${ctx.a.vehicleId}`).set(auth(token))).status).toBe(404);

    const vehicles = await request(app).get(`${T}/vehicles`).set(auth(token));
    expect(vehicles.body.data.every((v) => v.id !== ctx.a.vehicleId)).toBe(true);
  });

  it('rejects an unauthenticated or non-admin caller', async () => {
    expect((await request(app).get(`${T}/vehicles`)).status).toBe(401);
    expect((await request(app).get(`${T}/vehicles`).set(auth(ctx.a.driverToken))).status).toBe(403);
  });
});

/**
 * Step 6 — the yearly transport fee. One amount per academic year for the whole
 * school, and a rider carries the amount that applied when they were assigned.
 */
describe('Transport · yearly fee', () => {
  let token;

  beforeAll(() => {
    token = ctx.a.adminToken;
  });

  it('lists every academic year, with no fee set to begin with', async () => {
    const res = await request(app).get(`${T}/fees`).set(auth(token));

    expect(res.status).toBe(200);
    const current = res.body.data.find((f) => f.academicYear.isCurrent);
    expect(current).toBeTruthy();
    expect(current.academicYearId).toBe(ctx.a.yearId);
    expect(current.yearlyAmount).toBeNull();
  });

  it('sets one amount for the whole school for that year', async () => {
    const res = await request(app)
      .put(`${T}/fees/${ctx.a.yearId}`)
      .set(auth(token))
      .send({ yearlyAmount: 12000 });

    expect(res.status).toBe(200);
    expect(res.body.data.yearlyAmount).toBe(12000);

    const list = await request(app).get(`${T}/fees`).set(auth(token));
    expect(list.body.data.find((f) => f.academicYearId === ctx.a.yearId).yearlyAmount).toBe(12000);
  });

  it('rejects a fractional or negative amount', async () => {
    for (const yearlyAmount of [999.5, -100]) {
      const res = await request(app).put(`${T}/fees/${ctx.a.yearId}`).set(auth(token)).send({ yearlyAmount });
      expect(res.status).toBe(400);
    }
  });

  it('stamps the fee onto a new rider, and leaves them on it when the fee changes', async () => {
    // The seeded student already rides; assign the second one.
    const route = await request(app).get(`${T}/routes`).set(auth(token));
    const ready = route.body.data.find((r) => r.vehicle && r.driver && r.totalStops > 0);
    const stops = await request(app).get(`${T}/routes/${ready.id}/stops`).set(auth(token));

    const assigned = await request(app)
      .post(`${T}/assignments`)
      .set(auth(token))
      .send({ studentId: ctx.a.studentNoGuardianId, routeId: ready.id, stopId: stops.body.data[0].id });

    expect(assigned.status).toBe(201);
    expect(assigned.body.data.yearlyFeeAmount).toBe(12000);
    expect(assigned.body.data.academicYear.id).toBe(ctx.a.yearId);

    // The school revises the fee afterwards...
    const raise = await request(app)
      .put(`${T}/fees/${ctx.a.yearId}`)
      .set(auth(token))
      .send({ yearlyAmount: 14000 });
    expect(raise.status).toBe(200);

    // ...and the existing rider keeps the amount they were assigned on.
    const list = await request(app).get(`${T}/assignments`).set(auth(token));
    const row = list.body.data.find((a) => a.id === assigned.body.data.id);
    expect(row.yearlyFeeAmount).toBe(12000);
  });

  it('keeps one school out of another school fee table', async () => {
    const res = await request(app).get(`${T}/fees`).set(auth(ctx.b.adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.every((f) => f.academicYearId !== ctx.a.yearId)).toBe(true);

    const write = await request(app)
      .put(`${T}/fees/${ctx.a.yearId}`)
      .set(auth(ctx.b.adminToken))
      .send({ yearlyAmount: 1 });
    expect(write.status).toBe(404);
  });
});
