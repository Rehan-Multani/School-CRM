import mongoose from 'mongoose';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';
import { Subject } from '../models/Subject.js';
import { SectionSubject } from '../models/SectionSubject.js';
import { Student } from '../models/Student.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { StudentAttendance } from '../models/StudentAttendance.js';
import { escapeRegex } from '../../../shared/sanitize.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const oids = (arr) => [...arr].map(oid);

class TeacherAcademicsRepository {
  classesByIds(schoolId, classIds) {
    if (!classIds.length) return Promise.resolve([]);
    return SchoolClass.find({ schoolId: oid(schoolId), _id: { $in: oids(classIds) } })
      .select('name code numericOrder')
      .sort({ numericOrder: 1, name: 1 })
      .lean();
  }

  async sectionsByIds(schoolId, sectionIds, classId = null) {
    if (!sectionIds.length) return [];
    const q = { schoolId: oid(schoolId), _id: { $in: oids(sectionIds) } };
    if (classId) q.classId = oid(classId);
    const sections = await Section.find(q).select('name classId roomNumber classTeacherId').sort({ name: 1 }).lean();
    const classes = await SchoolClass.find({
      schoolId: oid(schoolId),
      _id: { $in: [...new Set(sections.map((s) => String(s.classId)))].map(oid) },
    })
      .select('name')
      .lean();
    const classMap = new Map(classes.map((c) => [String(c._id), c.name]));
    return sections.map((s) => ({ ...s, className: classMap.get(String(s.classId)) || '' }));
  }

  sectionById(schoolId, sectionId) {
    return Section.findOne({ schoolId: oid(schoolId), _id: oid(sectionId) })
      .select('name classId roomNumber classTeacherId academicYearId')
      .lean();
  }

  async sectionStudentCounts(schoolId, sectionIds) {
    if (!sectionIds.length) return new Map();
    const rows = await StudentEnrollment.aggregate([
      { $match: { schoolId: oid(schoolId), sectionId: { $in: oids(sectionIds) }, status: 'ACTIVE' } },
      { $group: { _id: '$sectionId', count: { $sum: 1 } } },
    ]);
    return new Map(rows.map((r) => [String(r._id), r.count]));
  }

  /** Lean, projected, paginated section roster. */
  async sectionRoster(schoolId, sectionId, { q = '', page = 1, limit = 20, sort = 'rollNumber' } = {}) {
    const enrollments = await StudentEnrollment.find({
      schoolId: oid(schoolId),
      sectionId: oid(sectionId),
      status: 'ACTIVE',
    })
      .select('studentId rollNumber admissionNumber')
      .lean();

    const enrollMap = new Map(enrollments.map((e) => [String(e.studentId), e]));
    const studentFilter = { schoolId: oid(schoolId), _id: { $in: enrollments.map((e) => e.studentId) }, status: 'ACTIVE' };
    if (q) {
      const rx = new RegExp(escapeRegex(q.trim()), 'i');
      studentFilter.$or = [{ firstName: rx }, { lastName: rx }, { admissionNumber: rx }];
    }

    let students = await Student.find(studentFilter)
      .select('firstName lastName admissionNumber photo status')
      .lean();

    students = students.map((s) => ({ ...s, _enroll: enrollMap.get(String(s._id)) || {} }));
    students.sort((a, b) => {
      if (sort === 'name') {
        return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      }
      // rollNumber — numeric-aware
      const ra = parseInt(a._enroll.rollNumber, 10);
      const rb = parseInt(b._enroll.rollNumber, 10);
      if (Number.isFinite(ra) && Number.isFinite(rb)) return ra - rb;
      return String(a._enroll.rollNumber || '').localeCompare(String(b._enroll.rollNumber || ''));
    });

    const total = students.length;
    const start = (page - 1) * limit;
    return { items: students.slice(start, start + limit), total };
  }

  async studentDetail(schoolId, studentId) {
    const student = await Student.findOne({ schoolId: oid(schoolId), _id: oid(studentId) }).lean();
    if (!student) return null;
    const enrollment = await StudentEnrollment.findOne({
      schoolId: oid(schoolId),
      studentId: oid(studentId),
      status: 'ACTIVE',
    })
      .sort({ enrollmentDate: -1 })
      .lean();
    return { student, enrollment };
  }

  /** Present-rate % for one student across all recorded section-days. */
  async studentAttendancePercent(schoolId, studentId, sectionIds) {
    const rows = await StudentAttendance.find({
      schoolId: oid(schoolId),
      sectionId: { $in: oids(sectionIds) },
      'entries.studentId': oid(studentId),
    })
      .select('entries')
      .lean();
    let present = 0;
    let total = 0;
    for (const row of rows) {
      const e = (row.entries || []).find((x) => String(x.studentId) === String(studentId));
      if (!e) continue;
      total += 1;
      if (['PRESENT', 'LATE', 'HALF_DAY'].includes(e.status)) present += 1;
    }
    return total ? Math.round((present / total) * 100) : null;
  }

  subjectsByIds(schoolId, subjectIds) {
    if (!subjectIds.length) return Promise.resolve([]);
    return Subject.find({ schoolId: oid(schoolId), _id: { $in: oids(subjectIds) } })
      .select('name code subjectType')
      .lean();
  }

  sectionSubjectsForTeacher(schoolId, teacherId) {
    return SectionSubject.find({ schoolId: oid(schoolId), teacherId: oid(teacherId), status: 'ACTIVE' })
      .select('sectionId classId subjectId')
      .lean();
  }
}

export const teacherAcademicsRepository = new TeacherAcademicsRepository();
