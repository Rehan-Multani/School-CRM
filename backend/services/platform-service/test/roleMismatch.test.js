import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { connect, disconnect, seed, getApp } from './helpers/setup.js';
import { SchoolUser } from '../src/models/SchoolUser.js';
import { Student } from '../src/models/Student.js';

let app;
let ctx;

const TRANSPORT_EMAIL = 'transport.test@schoola.edu';
const TEACHER_EMAIL = 'teacher@schoola.edu';
const STUDENT_MOBILE = '9811199991';

beforeAll(async () => {
  await connect();
  ctx = await seed();
  app = await getApp();

  // Create transport manager
  await SchoolUser.create({
    schoolId: ctx.a.schoolId,
    employeeId: 'TM-MISMATCH-1',
    firstName: 'Ramesh',
    lastName: 'Kumar',
    name: 'Ramesh Kumar',
    email: TRANSPORT_EMAIL,
    role: 'TRANSPORT',
    phone: '9811199999',
    status: 'ACTIVE',
    passwordHash: await bcrypt.hash('Manager@1', 10),
  });

  // Ensure a student has the mobile number
  await Student.updateOne({ _id: ctx.a.studentId }, { $set: { phone: STUDENT_MOBILE } });
}, 60000);

afterAll(disconnect);

describe('Cross-role login mismatch validation across all 4 roles', () => {
  it('1. Teacher logs into Transport Manager -> clear message: You are not a Transport Manager', async () => {
    const res = await request(app)
      .post('/school-portal/auth/transport-login')
      .send({ identifier: TEACHER_EMAIL, password: 'AnyPassword1!' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ROLE_MISMATCH');
    expect(res.body.suggestedRole).toBe('TEACHER');
    expect(res.body.message).toBe('You are not a Transport Manager. Please sign in as Teacher.');
  });

  it('2. Transport Manager logs into Teacher -> clear message: You are not a Teacher', async () => {
    const res = await request(app)
      .post('/school-portal/auth/teacher-login')
      .send({ identifier: TRANSPORT_EMAIL, password: 'AnyPassword1!' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ROLE_MISMATCH');
    expect(res.body.suggestedRole).toBe('TRANSPORT');
    expect(res.body.message).toBe('You are not a Teacher. Please sign in as Transport Manager.');
  });

  it('3. Teacher logs into Student password portal -> clear message: You are not a Student', async () => {
    const res = await request(app)
      .post('/school-portal/auth/student-login')
      .send({ identifier: TEACHER_EMAIL, password: 'AnyPassword1!' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ROLE_MISMATCH');
    expect(res.body.suggestedRole).toBe('TEACHER');
    expect(res.body.message).toBe('You are not a Student. Please sign in as Teacher.');
  });

  it('4. Teacher logs into Parent password portal -> clear message: You are not a Parent', async () => {
    const res = await request(app)
      .post('/school-portal/auth/parent-login')
      .send({ identifier: TEACHER_EMAIL, password: 'AnyPassword1!' });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ROLE_MISMATCH');
    expect(res.body.suggestedRole).toBe('TEACHER');
    expect(res.body.message).toBe('You are not a Parent. Please sign in as Teacher.');
  });

  it('5. Parent mobile in Student OTP login -> clear message: You are not a Student. Please sign in as Parent.', async () => {
    const res = await request(app)
      .post('/school-portal/auth/otp-login/request')
      .send({ role: 'STUDENT', mobile: ctx.a.parentPhone });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ROLE_MISMATCH');
    expect(res.body.suggestedRole).toBe('PARENT');
    expect(res.body.message).toBe('You are not a Student. Please sign in as Parent.');
  });

  it('6. Student mobile in Parent OTP login -> clear message: You are not a Parent. Please sign in as Student.', async () => {
    const res = await request(app)
      .post('/school-portal/auth/otp-login/request')
      .send({ role: 'PARENT', mobile: STUDENT_MOBILE });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('ROLE_MISMATCH');
    expect(res.body.suggestedRole).toBe('STUDENT');
    expect(res.body.message).toBe('You are not a Parent. Please sign in as Student.');
  });

  it('7. Non-existent user -> normal 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post('/school-portal/auth/transport-login')
      .send({ identifier: 'ghost@nowhere.edu', password: 'AnyPassword1!' });

    expect(res.status).toBe(401);
    expect(res.body.code).toBe('TRANSPORT_INVALID_CREDENTIALS');
  });
});
