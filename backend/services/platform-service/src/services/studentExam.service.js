import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { sanitizePagination } from '../../../shared/sanitize.js';
import { Exam } from '../models/Exam.js';
import { ExamSchedule } from '../models/ExamSchedule.js';
import { ExamResult } from '../models/ExamResult.js';
import { examLite, examScheduleLite, resultLite, resultDetail } from '../serializers/student.serializers.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));
const VISIBLE_EXAM_STATUS = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PUBLISHED'];

function phaseOf(exam, now = Date.now()) {
  const start = exam.startDate ? new Date(exam.startDate).getTime() : null;
  const end = exam.endDate ? new Date(exam.endDate).getTime() : null;
  if (start && now < start) return 'upcoming';
  if (end && now > end) return 'completed';
  return 'ongoing';
}

class StudentExamService {
  #examFilter(ctx) {
    return {
      schoolId: oid(ctx.schoolId),
      classIds: oid(ctx.classId),
      status: { $in: VISIBLE_EXAM_STATUS },
    };
  }

  async listExams(ctx, query = {}) {
    const rows = await Exam.find(this.#examFilter(ctx)).sort({ startDate: -1 }).lean();
    const wanted = String(query.status || 'all').toLowerCase();
    let list = rows.map((e) => ({ e, phase: phaseOf(e) }));
    if (['upcoming', 'ongoing', 'completed'].includes(wanted)) {
      list = list.filter((x) => x.phase === wanted);
    }
    const { page, limit } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const start = (page - 1) * limit;
    return {
      data: list.slice(start, start + limit).map(({ e, phase }) => examLite(e, phase)),
      pagination: { page, limit, total: list.length, totalPages: Math.ceil(list.length / limit) || 1 },
    };
  }

  async upcomingExams(ctx) {
    const rows = await Exam.find({ ...this.#examFilter(ctx), endDate: { $gte: new Date() } })
      .sort({ startDate: 1 })
      .limit(10)
      .lean();
    return rows.map((e) => examLite(e, phaseOf(e)));
  }

  async getExam(ctx, examId) {
    const exam = await Exam.findOne({ ...this.#examFilter(ctx), _id: oid(examId) }).lean();
    if (!exam) throw new AppError('Exam not found', 404, STUDENT_ERR.NOT_FOUND);
    return { ...examLite(exam, phaseOf(exam)), description: exam.description || '' };
  }

  async examSchedule(ctx, examId) {
    const exam = await Exam.findOne({ ...this.#examFilter(ctx), _id: oid(examId) }).select('_id name').lean();
    if (!exam) throw new AppError('Exam not found', 404, STUDENT_ERR.NOT_FOUND);
    const rows = await ExamSchedule.find({
      schoolId: oid(ctx.schoolId),
      examId: exam._id,
      classId: oid(ctx.classId),
      $or: [{ sectionId: null }, { sectionId: oid(ctx.sectionId) }],
    })
      .sort({ examDate: 1, startTime: 1 })
      .lean();
    return { examId: String(exam._id), examName: exam.name, papers: rows.map(examScheduleLite) };
  }

  /* -------------------------------- RESULTS -------------------------------- */
  async #publishedExamMap(ctx, examIds) {
    const exams = await Exam.find({
      schoolId: oid(ctx.schoolId),
      _id: { $in: examIds },
      status: 'PUBLISHED',
    })
      .select('name examType startDate endDate status')
      .lean();
    return new Map(exams.map((e) => [String(e._id), e]));
  }

  async listResults(ctx, query = {}) {
    const all = await ExamResult.find({ schoolId: oid(ctx.schoolId), studentId: oid(ctx.studentId) })
      .sort({ createdAt: -1 })
      .lean();
    const examMap = await this.#publishedExamMap(ctx, all.map((r) => r.examId));
    const visible = all.filter((r) => examMap.has(String(r.examId)));
    const { page, limit } = sanitizePagination({ page: query.page, limit: query.limit, defaultLimit: 20, maxLimit: 50 });
    const start = (page - 1) * limit;
    return {
      data: visible
        .slice(start, start + limit)
        .map((r) => resultLite(r, examMap.get(String(r.examId))?.name)),
      pagination: { page, limit, total: visible.length, totalPages: Math.ceil(visible.length / limit) || 1 },
    };
  }

  async getResult(ctx, examId) {
    const exam = await Exam.findOne({ schoolId: oid(ctx.schoolId), _id: oid(examId) })
      .select('name examType startDate endDate status classIds')
      .lean();
    if (!exam) throw new AppError('Result not found', 404, STUDENT_ERR.NOT_FOUND);
    // The student's OWN result row is the access check — so a published result
    // from an earlier year (different class) listed by /results still opens.
    const result = await ExamResult.findOne({
      schoolId: oid(ctx.schoolId),
      examId: exam._id,
      studentId: oid(ctx.studentId),
    }).lean();
    const inMyClass = (exam.classIds || []).some((c) => String(c) === ctx.classId);
    if (!result && !inMyClass) throw new AppError('Result not found', 404, STUDENT_ERR.NOT_FOUND);
    if (exam.status !== 'PUBLISHED') {
      throw new AppError('This result has not been published yet', 403, STUDENT_ERR.RESULT_NOT_PUBLISHED);
    }
    if (!result) throw new AppError('Result not found', 404, STUDENT_ERR.NOT_FOUND);
    return resultDetail(result, exam);
  }

  async subjectResults(ctx, examId) {
    const detail = await this.getResult(ctx, examId);
    return { examId: detail.examId, examName: detail.examName, subjects: detail.subjects };
  }

  async reportCard(ctx, query = {}) {
    const results = await ExamResult.find({ schoolId: oid(ctx.schoolId), studentId: oid(ctx.studentId) }).lean();
    const examMap = await this.#publishedExamMap(ctx, results.map((r) => r.examId));
    let visible = results.filter((r) => examMap.has(String(r.examId)));
    if (query.yearId && mongoose.isValidObjectId(String(query.yearId))) {
      visible = visible.filter((r) => String(r.academicYearId) === String(query.yearId));
    }
    const exams = visible
      .map((r) => ({ result: r, exam: examMap.get(String(r.examId)) }))
      .sort((a, b) => new Date(a.exam.startDate) - new Date(b.exam.startDate))
      .map(({ result, exam }) => resultDetail(result, exam));

    const totalObtained = exams.reduce((s, e) => s + (e.totalMarks || 0), 0);
    const totalMax = exams.reduce((s, e) => s + (e.maxTotalMarks || 0), 0);
    return {
      academicYearId: query.yearId || ctx.currentYearId,
      examCount: exams.length,
      aggregatePercentage: totalMax ? Math.round((totalObtained / totalMax) * 10000) / 100 : 0,
      exams,
    };
  }
}

export const studentExamService = new StudentExamService();
