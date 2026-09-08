import mongoose from 'mongoose';
import { transportAccessService } from '../../services/transportAccess.service.js';
import { transportBoardingService } from '../../services/transportBoarding.service.js';
import { StudentTransportAssignment } from '../../models/StudentTransportAssignment.js';
import { Student } from '../../models/Student.js';
import { auditLogService } from '../../services/auditLog.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const ctx = (req) => transportAccessService.loadContext(req);

export async function listTripStudents(req, res, next) {
  try {
    const { data, pagination } = await transportBoardingService.listStudents(await ctx(req), req.params.tripId, req.query);
    res.json({ success: true, data, pagination });
  } catch (e) { next(e); }
}

export async function getTripStudentStatus(req, res, next) {
  try {
    res.json({ success: true, data: await transportBoardingService.studentStatus(await ctx(req), req.params.tripId, req.params.studentId) });
  } catch (e) { next(e); }
}

export async function boardStudent(req, res, next) {
  try {
    const { data, idempotent } = await transportBoardingService.board(await ctx(req), req.params.tripId, req.params.studentId, req.body || {});
    if (!idempotent) {
      auditLogService.record(req, { module: 'TRANSPORT', action: 'BOARD', entityType: 'TripStudent', entityId: data.id, summary: 'Student boarded' });
    }
    res.json({ success: true, data, message: idempotent ? 'Already boarded' : 'Boarded' });
  } catch (e) { next(e); }
}

export async function dropStudent(req, res, next) {
  try {
    const { data, idempotent } = await transportBoardingService.drop(await ctx(req), req.params.tripId, req.params.studentId, req.body || {});
    if (!idempotent) {
      auditLogService.record(req, { module: 'TRANSPORT', action: 'DROP', entityType: 'TripStudent', entityId: data.id, summary: 'Student dropped' });
    }
    res.json({ success: true, data, message: idempotent ? 'Already dropped' : 'Dropped' });
  } catch (e) { next(e); }
}

export async function markStudentAbsent(req, res, next) {
  try {
    const { data, idempotent } = await transportBoardingService.absent(await ctx(req), req.params.tripId, req.params.studentId, req.body || {});
    if (!idempotent) {
      auditLogService.record(req, { module: 'TRANSPORT', action: 'ABSENT', entityType: 'TripStudent', entityId: data.id, summary: 'Student marked absent' });
    }
    res.json({ success: true, data, message: idempotent ? 'Already absent' : 'Marked absent' });
  } catch (e) { next(e); }
}

export async function reportStudentException(req, res, next) {
  try {
    const data = await transportBoardingService.exception(await ctx(req), req.params.tripId, req.params.studentId, req.body || {});
    auditLogService.record(req, { module: 'TRANSPORT', action: 'EXCEPTION', entityType: 'TripStudent', entityId: data.data?.id, summary: 'Transport exception reported' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

export async function listRouteStudents(req, res, next) {
  try {
    const c = await ctx(req);
    transportAccessService.assertRoute(c, req.params.routeId);
    const rows = await StudentTransportAssignment.find({
      schoolId: oid(c.schoolId),
      routeId: oid(req.params.routeId),
      status: 'ACTIVE',
    }).lean();
    const students = rows.length
      ? await Student.find({ _id: { $in: rows.map((r) => r.studentId) } }).select('firstName lastName admissionNumber photo').lean()
      : [];
    const byId = new Map(students.map((s) => [String(s._id), s]));
    res.json({
      success: true,
      data: rows.map((r) => {
        const s = byId.get(String(r.studentId)) || {};
        return {
          studentId: String(r.studentId),
          name: [s.firstName, s.lastName].filter(Boolean).join(' ').trim(),
          admissionNumber: s.admissionNumber || '',
          photo: s.photo || '',
          pickupStopId: String(r.pickupStopId),
          dropStopId: String(r.dropStopId),
          status: r.status,
        };
      }),
    });
  } catch (e) { next(e); }
}
