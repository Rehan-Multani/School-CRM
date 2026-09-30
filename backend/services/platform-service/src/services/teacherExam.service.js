import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { Exam } from '../models/Exam.js';
import { ExamSubject } from '../models/ExamSubject.js';
import { ExamSchedule } from '../models/ExamSchedule.js';
import { ExamMarks } from '../models/ExamMarks.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { Section } from '../models/Section.js';
import { examRepository } from '../repositories/exam.repository.js';
import { teacherAcademicsRepository } from '../repositories/teacherAcademics.repository.js';
import { teacherAccessService } from './teacherAccess.service.js';
import { examLite } from '../serializers/teacher.serializers.js';
import { TEACHER_ERR } from '../constants/teacherErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const oids = (arr) => [...arr].map(oid);
const LOCKED_EXAM_STATUS = new Set(['PUBLISHED', 'COMPLETED', 'CANCELLED']);

function assertExamOpen(exam) {
  if (LOCKED_EXAM_STATUS.has(exam.status)) {
    throw new AppError(`This exam is ${exam.status.toLowerCase()} — marks can no longer be changed`, 409, TEACHER_ERR.EXAM_FINALIZED);
  }
}

/**
 * classId/sectionId/subjectId arrive from the client — they must describe ONE
 * real slot: the class is part of this exam and the section belongs to that
 * class (otherwise marks could be filed under the wrong class).
 */
async function assertSlot(ctx, exam, { classId, sectionId, subjectId }) {
  if (!classId || !sectionId || !subjectId) {
    throw new AppError('classId, sectionId and subjectId are required', 400, TEACHER_ERR.VALIDATION_ERROR);
  }
  for (const v of [classId, sectionId, subjectId]) {
    if (!mongoose.isValidObjectId(String(v))) throw new AppError('Invalid id', 400, TEACHER_ERR.VALIDATION_ERROR);
  }
  teacherAccessService.assertClass(ctx, classId);
  teacherAccessService.assertSection(ctx, sectionId);
  teacherAccessService.assertSubjectInSection(ctx, String(sectionId), String(subjectId));
  if (!(exam.classIds || []).some((c) => String(c) === String(classId))) {
    throw new AppError('This class is not part of the exam', 400, TEACHER_ERR.VALIDATION_ERROR);
  }
  const section = await Section.findOne({ schoolId: oid(ctx.schoolId), _id: oid(sectionId) }).select('classId').lean();
  if (!section || String(section.classId) !== String(classId)) {
    throw new AppError('Section does not belong to this class', 400, TEACHER_ERR.VALIDATION_ERROR);
  }
}

class TeacherExamService {
  /** Exams whose classIds intersect the teacher's classes. */
  async list(ctx, query = {}) {
    const classIds = oids(ctx.classIds);
    if (!classIds.length) return { data: [] };
    const filter = { schoolId: oid(ctx.schoolId), classIds: { $in: classIds } };
    if (ctx.currentYearId) filter.academicYearId = oid(ctx.currentYearId);
    if (query.status) filter.status = String(query.status).toUpperCase().slice(0, 20);
    const exams = await Exam.find(filter).sort({ startDate: -1 }).limit(50).lean();
    return { data: exams.map(examLite) };
  }

  async #loadExam(ctx, examId) {
    const exam = await Exam.findOne({ schoolId: oid(ctx.schoolId), _id: oid(examId) }).lean();
    if (!exam) throw new AppError('Exam not found', 404, TEACHER_ERR.NOT_FOUND);
    const overlaps = (exam.classIds || []).some((c) => ctx.classIds.has(String(c)));
    if (!overlaps) throw new AppError('You are not involved in this exam', 403, TEACHER_ERR.CLASS_ACCESS_DENIED);
    return exam;
  }

  async get(ctx, examId) {
    const exam = await this.#loadExam(ctx, examId);
    return new Exam(exam).toPublicJSON();
  }

  async schedule(ctx, examId) {
    await this.#loadExam(ctx, examId);
    const rows = await ExamSchedule.find({ schoolId: oid(ctx.schoolId), examId: oid(examId) }).lean();
    const mine = rows.filter(
      (r) =>
        String(r.invigilatorId || '') === String(ctx.teacherId) ||
        (r.classId && r.subjectId && ctx.classSubjectPairs.has(`${r.classId}:${r.subjectId}`))
    );
    return mine.map((r) => new ExamSchedule(r).toPublicJSON());
  }

  async subjects(ctx, examId) {
    await this.#loadExam(ctx, examId);
    const rows = await ExamSubject.find({ schoolId: oid(ctx.schoolId), examId: oid(examId) }).lean();
    const mine = rows.filter((r) => r.classId && r.subjectId && ctx.classSubjectPairs.has(`${r.classId}:${r.subjectId}`));
    // For each subject, the sections of that class where THIS teacher teaches
    // it — exactly the (section, subject) pairs saveMarks will accept.
    const sections = await teacherAcademicsRepository.sectionsByIds(ctx.schoolId, [...ctx.sectionIds]);
    return mine.map((r) => ({
      ...new ExamSubject(r).toPublicJSON(),
      className: sections.find((s) => String(s.classId) === String(r.classId))?.className || '',
      sections: sections
        .filter(
          (s) =>
            String(s.classId) === String(r.classId) && ctx.sectionSubjectPairs.has(`${s._id}:${r.subjectId}`)
        )
        .map((s) => ({ id: String(s._id), name: s.name || '' })),
    }));
  }

  async marksSheet(ctx, examId, query = {}) {
    const exam = await this.#loadExam(ctx, examId);
    const { classId, sectionId, subjectId } = query;
    await assertSlot(ctx, exam, { classId, sectionId, subjectId });
    const sheet = await examRepository.listMarksSheet(ctx.schoolId, examId, { classId, sectionId, subjectId });
    return { ...sheet, examStatus: exam.status, locked: LOCKED_EXAM_STATUS.has(exam.status) };
  }

  async saveMarks(ctx, examId, payload = {}) {
    const exam = await this.#loadExam(ctx, examId);
    assertExamOpen(exam);

    const { classId, sectionId, subjectId } = payload;
    await assertSlot(ctx, exam, { classId, sectionId, subjectId });

    const marksList = Array.isArray(payload.marksList) ? payload.marksList : [];
    if (!marksList.length) throw new AppError('marksList[] is required', 400, TEACHER_ERR.VALIDATION_ERROR);

    const examSubject = await ExamSubject.findOne({
      schoolId: oid(ctx.schoolId),
      examId: oid(examId),
      classId: oid(classId),
      subjectId: oid(subjectId),
    }).lean();
    const maxMarks = examSubject?.maxMarks || 100;
    const passingMarks = examSubject?.passingMarks ?? 33;

    // roster membership
    const roster = await StudentEnrollment.find({
      schoolId: oid(ctx.schoolId),
      sectionId: oid(sectionId),
      status: 'ACTIVE',
    })
      .select('studentId')
      .lean();
    const rosterSet = new Set(roster.map((r) => String(r.studentId)));

    const seen = new Set();
    const ops = [];
    for (const item of marksList) {
      const sid = String(item?.studentId || '');
      if (!sid || !mongoose.isValidObjectId(sid)) {
        throw new AppError('Every mark needs a valid studentId', 400, TEACHER_ERR.VALIDATION_ERROR);
      }
      if (seen.has(sid)) throw new AppError(`Duplicate studentId: ${sid}`, 400, TEACHER_ERR.VALIDATION_ERROR);
      seen.add(sid);
      if (!rosterSet.has(sid)) {
        throw new AppError('One or more students are not in this section', 403, TEACHER_ERR.STUDENT_ACCESS_DENIED);
      }
      const attendanceStatus = ['PRESENT', 'ABSENT', 'MEDICAL', 'EXEMPTED'].includes(String(item.attendanceStatus).toUpperCase())
        ? String(item.attendanceStatus).toUpperCase()
        : 'PRESENT';
      let marksVal = null;
      if (attendanceStatus === 'PRESENT') {
        if (item.marksObtained === '' || item.marksObtained === null || item.marksObtained === undefined) {
          marksVal = null;
        } else {
          marksVal = Number(item.marksObtained);
          if (!Number.isFinite(marksVal) || marksVal < 0 || marksVal > maxMarks) {
            throw new AppError(`marksObtained for ${sid} must be between 0 and ${maxMarks}`, 400, TEACHER_ERR.INVALID_MARKS);
          }
        }
      }
      ops.push({
        updateOne: {
          filter: { schoolId: oid(ctx.schoolId), examId: oid(examId), studentId: oid(sid), subjectId: oid(subjectId) },
          update: {
            $set: {
              classId: oid(classId),
              sectionId: oid(sectionId),
              marksObtained: marksVal,
              maxMarks,
              passingMarks,
              attendanceStatus,
              remarks: String(item.remarks || '').slice(0, 500),
              gradedBy: oid(ctx.teacherId),
            },
          },
          upsert: true,
        },
      });
    }

    // All-or-nothing where the deployment supports transactions; fall back to a
    // plain ordered bulkWrite on a standalone mongod.
    const session = await mongoose.startSession();
    try {
      let result;
      await session.withTransaction(async () => {
        result = await ExamMarks.bulkWrite(ops, { session, ordered: true });
      });
      await session.endSession();
      return { saved: ops.length, upserted: result?.upsertedCount ?? 0, modified: result?.modifiedCount ?? 0 };
    } catch (err) {
      await session.endSession();
      if (err instanceof AppError) throw err;
      if (/Transaction numbers|replica set|not supported/i.test(err.message || '')) {
        await ExamMarks.bulkWrite(ops, { ordered: true });
        return { saved: ops.length, transactional: false };
      }
      throw err;
    }
  }

  async patchMark(ctx, examId, markId, payload = {}) {
    const exam = await this.#loadExam(ctx, examId);
    assertExamOpen(exam);
    const mark = await ExamMarks.findOne({ schoolId: oid(ctx.schoolId), _id: oid(markId), examId: oid(examId) });
    if (!mark) throw new AppError('Mark not found', 404, TEACHER_ERR.NOT_FOUND);
    teacherAccessService.assertSection(ctx, mark.sectionId);
    teacherAccessService.assertSubjectInSection(ctx, mark.sectionId, mark.subjectId);

    if (payload.attendanceStatus !== undefined) {
      const a = String(payload.attendanceStatus).toUpperCase();
      if (!['PRESENT', 'ABSENT', 'MEDICAL', 'EXEMPTED'].includes(a)) {
        throw new AppError('Invalid attendanceStatus', 400, TEACHER_ERR.VALIDATION_ERROR);
      }
      mark.attendanceStatus = a;
      if (a !== 'PRESENT') mark.marksObtained = null;
    }
    if (payload.marksObtained !== undefined && mark.attendanceStatus === 'PRESENT') {
      const v = payload.marksObtained === '' || payload.marksObtained === null ? null : Number(payload.marksObtained);
      if (v !== null && (!Number.isFinite(v) || v < 0 || v > mark.maxMarks)) {
        throw new AppError(`marksObtained must be between 0 and ${mark.maxMarks}`, 400, TEACHER_ERR.INVALID_MARKS);
      }
      mark.marksObtained = v;
    }
    if (payload.remarks !== undefined) mark.remarks = String(payload.remarks).slice(0, 500);
    mark.gradedBy = oid(ctx.teacherId);
    await mark.save();
    return mark.toPublicJSON();
  }
}

export const teacherExamService = new TeacherExamService();
