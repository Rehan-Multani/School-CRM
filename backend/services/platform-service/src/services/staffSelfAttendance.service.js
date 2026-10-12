import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { School } from '../models/School.js';
import { StaffAttendance } from '../models/StaffAttendance.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';
import { distanceMeters, isLat, isLng } from '../utils/geo.js';
import { pushEvents } from './pushEvents.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const TZ = 'Asia/Kolkata';
const MAX_ACCURACY_M = 150; // a worse GPS fix cannot prove the teacher is on campus
const LOCKED = new Set(['LEAVE', 'HOLIDAY']);

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ });
const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true });
const dateOf = (d) => dayFmt.format(d);
const timeOf = (d) => timeFmt.format(d).replace(/\s/g, ' ').toUpperCase();

function personName(t, fallback) {
  return [t.firstName, t.lastName].filter(Boolean).join(' ').trim() || t.name || fallback;
}

/**
 * Whoever is marking themselves present. Teachers and transport managers write
 * the same StaffAttendance row, so HR / admin / reports see them like any staff.
 *   { schoolId, refId, type: 'TEACHER'|'STAFF', employeeId, name, role, department, label }
 */
export function teacherActor(ctx) {
  const t = ctx.teacher;
  return {
    schoolId: ctx.schoolId,
    refId: ctx.teacherId,
    type: 'TEACHER',
    employeeId: t.employeeId || String(t._id),
    name: personName(t, 'Teacher'),
    role: t.designation || 'Teacher',
    department: t.department || '',
    label: 'Teacher',
  };
}

/** Any SchoolUser (transport manager, accountant, HR, librarian ...) marking their own attendance. */
export function staffActor(schoolId, user, { label, role, department = '' }) {
  return {
    schoolId: String(schoolId),
    refId: String(user._id),
    type: 'STAFF',
    employeeId: user.employeeId || String(user._id),
    name: personName(user, label),
    role: user.designation || role || label,
    department: user.department || department,
    label,
  };
}

export const transportManagerActor = (schoolId, user) =>
  staffActor(schoolId, user, { label: 'Transport Manager', department: 'Transport' });

function publicConfig(g = {}) {
  const configured = isLat(g.latitude) && isLng(g.longitude);
  return {
    enabled: Boolean(g.enabled) && configured,
    radiusMeters: g.radiusMeters || 100,
    requireBiometric: g.requireBiometric !== false,
    studentAttendanceInRadius: g.studentAttendanceInRadius !== false,
    label: g.label || '',
  };
}

function recordView(rec) {
  if (!rec) return null;
  return {
    id: String(rec._id),
    date: rec.date,
    status: rec.status,
    clockIn: rec.clockInAt ? rec.clockIn : '',
    clockOut: rec.clockOutAt ? rec.clockOut : '',
    checkedIn: Boolean(rec.clockInAt),
    checkedOut: Boolean(rec.clockOutAt),
    method: rec.method || 'MANUAL',
    distanceMeters: rec.checkInGeo?.distanceMeters ?? null,
  };
}

class StaffSelfAttendanceService {
  async #geofence(schoolId) {
    const school = await School.findById(oid(schoolId)).select('settings.attendanceGeofence').lean();
    if (!school) throw new AppError('School not found', 404, TEACHER_ERR.NOT_FOUND);
    return school.settings?.attendanceGeofence || {};
  }

  async today(actor) {
    const date = dateOf(new Date());
    const [g, rec] = await Promise.all([
      this.#geofence(actor.schoolId),
      StaffAttendance.findOne({ schoolId: oid(actor.schoolId), date, employeeRefId: oid(actor.refId) }).lean(),
    ]);
    return { date, config: publicConfig(g), record: recordView(rec) };
  }

  /** Validates the device fix + fingerprint claim and returns the proof to store. */
  async #verify(actor, payload, opts = {}) {
    const g = await this.#geofence(actor.schoolId);
    const cfg = publicConfig(g);
    if (!cfg.enabled) {
      throw new AppError(
        'Self attendance is not enabled for this school yet. Ask your school admin.',
        409,
        TEACHER_ERR.GEOFENCE_NOT_CONFIGURED,
      );
    }
    // Web panels have no fingerprint reader: they pass { skipBiometric: true } from the ROUTE, never from the body.
    if (cfg.requireBiometric && !opts.skipBiometric && payload.biometricVerified !== true) {
      throw new AppError('Fingerprint verification is required.', 400, TEACHER_ERR.BIOMETRIC_REQUIRED);
    }
    return this.#checkFix(g, cfg, payload, 'Attendance');
  }

  /** Device fix must be real, accurate and inside the circle. Returns the proof to store. */
  #checkFix(g, cfg, payload, subject) {
    const latitude = Number(payload.latitude);
    const longitude = Number(payload.longitude);
    if (!isLat(latitude) || !isLng(longitude)) {
      throw new AppError('A valid device location is required.', 400, TEACHER_ERR.VALIDATION_ERROR);
    }
    if (payload.mocked === true) {
      throw new AppError('Mock / fake location detected. Turn it off and try again.', 403, TEACHER_ERR.LOCATION_UNRELIABLE);
    }
    const accuracy = payload.accuracy === undefined || payload.accuracy === null ? null : Number(payload.accuracy);
    if (accuracy !== null && (!Number.isFinite(accuracy) || accuracy < 0)) {
      throw new AppError('Invalid location accuracy.', 400, TEACHER_ERR.VALIDATION_ERROR);
    }
    if (accuracy !== null && accuracy > MAX_ACCURACY_M) {
      throw new AppError(
        `GPS signal is weak (±${Math.round(accuracy)} m). Move to an open area and try again.`,
        409,
        TEACHER_ERR.LOCATION_UNRELIABLE,
      );
    }
    const distance = Math.round(distanceMeters(latitude, longitude, g.latitude, g.longitude));
    if (distance > cfg.radiusMeters) {
      throw new AppError(
        `You are ${distance} m from school. ${subject} can be marked only within ${cfg.radiusMeters} m.`,
        403,
        TEACHER_ERR.OUTSIDE_GEOFENCE,
      );
    }
    return {
      latitude,
      longitude,
      accuracy: accuracy === null ? null : Math.round(accuracy),
      distanceMeters: distance,
      biometricVerified: payload.biometricVerified === true,
    };
  }

  /**
   * Student attendance by a teacher: when the school turned the radius on, the
   * teacher must be inside it. Returns null when there is no restriction.
   */
  async assertStudentAttendanceLocation(schoolId, location) {
    const g = await this.#geofence(schoolId);
    const cfg = publicConfig(g);
    if (!cfg.enabled || !cfg.studentAttendanceInRadius) return null;
    const hasFix = location && typeof location === 'object' && location.latitude !== undefined && location.longitude !== undefined;
    if (!hasFix) {
      throw new AppError(
        'Your location is needed to mark student attendance. Turn on location and try again (update the app if this keeps coming).',
        400,
        TEACHER_ERR.LOCATION_REQUIRED,
      );
    }
    return this.#checkFix(g, cfg, location, 'Student attendance');
  }

  async checkIn(actor, payload = {}, opts = {}) {
    const geo = await this.#verify(actor, payload, opts);
    const now = new Date();
    const date = dateOf(now);
    const key = { schoolId: oid(actor.schoolId), date, employeeRefId: oid(actor.refId) };

    const existing = await StaffAttendance.findOne(key);
    if (existing && LOCKED.has(existing.status)) {
      throw new AppError(
        `Today is marked as ${existing.status.toLowerCase()}. Contact your school admin.`,
        409,
        TEACHER_ERR.ATTENDANCE_LOCKED,
      );
    }
    if (existing?.clockInAt) return { alreadyDone: true, ...this.#shape(existing) };

    const set = {
      employeeType: actor.type,
      employeeId: actor.employeeId,
      employeeName: actor.name,
      employeeRole: actor.role,
      department: actor.department,
      status: existing?.status === 'HALF_DAY' ? 'HALF_DAY' : 'PRESENT',
      clockIn: timeOf(now),
      clockOut: '',
      clockInAt: now,
      clockOutAt: null,
      method: 'APP_GEOFENCE',
      recordedBy: actor.name,
      checkInGeo: geo,
    };
    try {
      const doc = await StaffAttendance.findOneAndUpdate(
        key,
        { $set: set },
        { new: true, upsert: true, setDefaultsOnInsert: true },
      );
      // Fire-and-forget: a push failure must never fail the attendance mark.
      pushEvents
        .staffPresent(actor.schoolId, { name: actor.name, roleLabel: actor.label, time: doc.clockIn, recordId: String(doc._id) })
        .catch(() => {});
      return { alreadyDone: false, ...this.#shape(doc) };
    } catch (err) {
      if (err?.code === 11000) {
        const doc = await StaffAttendance.findOne(key);
        return { alreadyDone: true, ...this.#shape(doc) };
      }
      throw err;
    }
  }

  async checkOut(actor, payload = {}, opts = {}) {
    const geo = await this.#verify(actor, payload, opts);
    const now = new Date();
    const key = { schoolId: oid(actor.schoolId), date: dateOf(now), employeeRefId: oid(actor.refId) };
    const existing = await StaffAttendance.findOne(key);
    if (!existing?.clockInAt) {
      throw new AppError('Check in first, then check out.', 409, TEACHER_ERR.NOT_CHECKED_IN);
    }
    if (existing.clockOutAt) return { alreadyDone: true, ...this.#shape(existing) };
    existing.clockOut = timeOf(now);
    existing.clockOutAt = now;
    existing.checkOutGeo = geo;
    await existing.save();
    return { alreadyDone: false, ...this.#shape(existing) };
  }

  #shape(doc) {
    return { date: doc.date, record: recordView(doc) };
  }
}

export const staffSelfAttendanceService = new StaffSelfAttendanceService();
