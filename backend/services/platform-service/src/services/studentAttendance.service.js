import { AppError } from '../../../shared/AppError.js';
import { studentAttendanceRepository } from '../repositories/studentAttendance.repository.js';
import { STUDENT_ATTENDANCE_STATUSES } from '../models/StudentAttendance.js';

function todayStr() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function validDate(date) {
  const s = (date || '').trim() || todayStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new AppError('Date must be YYYY-MM-DD', 400);
  if (s > todayStr()) throw new AppError('Cannot mark attendance for a future date', 400);
  return s;
}
function pickStatus(v, fallback = 'PRESENT') {
  const up = String(v || '').toUpperCase();
  return STUDENT_ATTENDANCE_STATUSES.includes(up) ? up : fallback;
}

class StudentAttendanceService {
  // GET roster + existing marks for a section+date
  async getDay(schoolId, sectionId, date) {
    if (!sectionId) throw new AppError('sectionId is required', 400);
    const meta = await studentAttendanceRepository.sectionMeta(schoolId, sectionId);
    if (!meta) throw new AppError('Section not found', 404);
    const day = validDate(date);
    const [roster, existing] = await Promise.all([
      studentAttendanceRepository.roster(schoolId, sectionId),
      studentAttendanceRepository.findDay(schoolId, sectionId, day),
    ]);
    if (!roster.length) {
      return {
        section: meta,
        date: day,
        marked: Boolean(existing),
        markedByName: existing?.markedByName || '',
        entries: [],
        message: 'No active students enrolled in this section yet.',
      };
    }
    const marks = {};
    (existing?.entries || []).forEach((e) => {
      marks[e.studentId.toString()] = { status: e.status, note: e.note || '' };
    });
    return {
      section: meta,
      date: day,
      marked: Boolean(existing),
      markedByName: existing?.markedByName || '',
      entries: roster.map((r) => ({
        ...r,
        status: marks[r.studentId]?.status || 'PRESENT',
        note: marks[r.studentId]?.note || '',
        previouslyMarked: Boolean(marks[r.studentId]),
      })),
    };
  }

  // POST upsert whole day
  async saveDay(schoolId, payload = {}, actorName = '') {
    const sectionId = payload.sectionId;
    if (!sectionId) throw new AppError('sectionId is required', 400);
    const meta = await studentAttendanceRepository.sectionMeta(schoolId, sectionId);
    if (!meta) throw new AppError('Section not found', 404);
    const day = validDate(payload.date);
    const roster = await studentAttendanceRepository.roster(schoolId, sectionId);
    if (!roster.length) throw new AppError('This section has no active students to mark', 400);

    const rosterById = {};
    roster.forEach((r) => (rosterById[r.studentId] = r));
    const incoming = Array.isArray(payload.entries) ? payload.entries : [];
    const incomingById = {};
    incoming.forEach((e) => {
      if (e && e.studentId) incomingById[String(e.studentId)] = e;
    });

    const entries = roster.map((r) => {
      const src = incomingById[r.studentId] || {};
      return {
        studentId: r.studentId,
        studentName: r.studentName,
        rollNumber: r.rollNumber,
        status: pickStatus(src.status, 'PRESENT'),
        note: (src.note || '').trim(),
      };
    });

    const doc = await studentAttendanceRepository.upsertDay(schoolId, sectionId, day, {
      academicYearId: meta.academicYearId,
      classId: meta.classId,
      className: meta.className,
      sectionName: meta.sectionName,
      entries,
      markedByName: actorName,
    });
    return doc.toPublicJSON();
  }

  async markSingle(schoolId, sectionId, studentId, payload = {}, actorName = '') {
    const meta = await studentAttendanceRepository.sectionMeta(schoolId, sectionId);
    if (!meta) throw new AppError('Section not found', 404);
    const day = validDate(payload.date);
    let doc = await studentAttendanceRepository.findDay(schoolId, sectionId, day);
    if (!doc) {
      // materialise from roster first
      await this.saveDay(schoolId, { sectionId, date: day, entries: [] }, actorName);
      doc = await studentAttendanceRepository.findDay(schoolId, sectionId, day);
    }
    const entry = doc.entries.find((e) => e.studentId.toString() === String(studentId));
    if (!entry) throw new AppError('Student not in this section roster', 404);
    entry.status = pickStatus(payload.status, entry.status);
    if (payload.note !== undefined) entry.note = (payload.note || '').trim();
    doc.markedByName = actorName || doc.markedByName;
    await doc.save();
    return doc.toPublicJSON();
  }

  async markAll(schoolId, payload = {}, actorName = '') {
    const status = pickStatus(payload.status, 'PRESENT');
    const roster = await studentAttendanceRepository.roster(schoolId, payload.sectionId);
    return this.saveDay(
      schoolId,
      {
        sectionId: payload.sectionId,
        date: payload.date,
        entries: roster.map((r) => ({ studentId: r.studentId, status })),
      },
      actorName
    );
  }

  // Principal monitoring — today's roll-call by section
  async monitor(schoolId, date) {
    const day = validDate(date);
    const rows = await studentAttendanceRepository.monitor(schoolId, day);
    if (!rows.length) {
      return { date: day, marked: false, sections: [], totals: null };
    }
    const sections = rows.map((r) => {
      const s = { PRESENT: 0, ABSENT: 0, LATE: 0, HALF_DAY: 0, LEAVE: 0 };
      (r.entries || []).forEach((e) => {
        s[e.status] = (s[e.status] || 0) + 1;
      });
      const total = (r.entries || []).length;
      const present = s.PRESENT + s.LATE + s.HALF_DAY;
      return {
        sectionId: r.sectionId.toString(),
        label: `${r.className || ''} ${r.sectionName || ''}`.trim() || 'Section',
        total,
        present,
        absent: s.ABSENT + s.LEAVE,
        presentRate: total ? Math.round((present / total) * 100) : 0,
        breakdown: s,
      };
    });
    const totalStudents = sections.reduce((a, s) => a + s.total, 0);
    const totalPresent = sections.reduce((a, s) => a + s.present, 0);
    return {
      date: day,
      marked: true,
      sections,
      totals: {
        totalStudents,
        present: totalPresent,
        absent: totalStudents - totalPresent,
        presentRate: totalStudents ? Math.round((totalPresent / totalStudents) * 100) : 0,
      },
    };
  }

  async report(schoolId, from, to) {
    const f = validDate(from);
    const t = validDate(to);
    const rows = await studentAttendanceRepository.rangeReport(schoolId, f, t);
    const byDate = {};
    rows.forEach((r) => {
      const s = byDate[r.date] || { present: 0, total: 0 };
      (r.entries || []).forEach((e) => {
        s.total += 1;
        if (e.status === 'PRESENT' || e.status === 'LATE' || e.status === 'HALF_DAY') s.present += 1;
      });
      byDate[r.date] = s;
    });
    const trend = Object.entries(byDate)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([d, s]) => ({ date: d, attendance: s.total ? Math.round((s.present / s.total) * 100) : 0 }));
    return { from: f, to: t, trend };
  }
}

export const studentAttendanceService = new StudentAttendanceService();
