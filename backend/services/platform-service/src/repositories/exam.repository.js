import mongoose from 'mongoose';
import { Exam } from '../models/Exam.js';
import { ExamSubject } from '../models/ExamSubject.js';
import { ExamSchedule } from '../models/ExamSchedule.js';
import { ExamMarks } from '../models/ExamMarks.js';
import { ExamResult } from '../models/ExamResult.js';
import { SectionSubject } from '../models/SectionSubject.js';
import { Subject } from '../models/Subject.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { Student } from '../models/Student.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';
import { AcademicYear } from '../models/AcademicYear.js';

function toObjectId(id) {
  if (!id) return null;
  if (id instanceof mongoose.Types.ObjectId) return id;
  try {
    return new mongoose.Types.ObjectId(id);
  } catch {
    return id;
  }
}

class ExamRepository {
  // ===================== EXAMS CRUD =====================
  async listExams(schoolId, query = {}) {
    const filter = { schoolId: toObjectId(schoolId) };

    if (query.academicYearId && query.academicYearId !== 'ALL') {
      filter.academicYearId = toObjectId(query.academicYearId);
    }

    if (query.examType && query.examType !== 'ALL') {
      filter.examType = query.examType.toUpperCase();
    }

    if (query.status && query.status !== 'ALL') {
      filter.status = query.status.toUpperCase();
    }

    if (query.classId && query.classId !== 'ALL') {
      filter.classIds = toObjectId(query.classId);
    }

    if (query.search?.trim()) {
      const regex = new RegExp(query.search.trim(), 'i');
      filter.name = regex;
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(200, Math.max(1, Number(query.limit) || 50));
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Exam.find(filter)
        .populate('academicYearId', 'name code isCurrent')
        .populate('classIds', 'name code')
        .sort({ startDate: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Exam.countDocuments(filter),
    ]);

    return {
      items,
      total,
      page,
      limit,
    };
  }

  async findExamById(schoolId, id) {
    return Exam.findOne({ schoolId: toObjectId(schoolId), _id: toObjectId(id) })
      .populate('academicYearId', 'name code isCurrent startDate endDate')
      .populate('classIds', 'name code numericOrder');
  }

  async createExam(data) {
    const classObjectIds = (data.classIds || []).map(toObjectId);
    return Exam.create({
      ...data,
      schoolId: toObjectId(data.schoolId),
      academicYearId: toObjectId(data.academicYearId),
      classIds: classObjectIds,
    });
  }

  async updateExam(schoolId, id, updates) {
    const cleanUpdates = { ...updates };
    if (cleanUpdates.academicYearId) cleanUpdates.academicYearId = toObjectId(cleanUpdates.academicYearId);
    if (cleanUpdates.classIds) cleanUpdates.classIds = cleanUpdates.classIds.map(toObjectId);

    return Exam.findOneAndUpdate(
      { schoolId: toObjectId(schoolId), _id: toObjectId(id) },
      { $set: cleanUpdates },
      { new: true, runValidators: true }
    )
      .populate('academicYearId', 'name code isCurrent')
      .populate('classIds', 'name code');
  }

  async deleteExam(schoolId, id) {
    const examObjId = toObjectId(id);
    const schoolObjId = toObjectId(schoolId);

    // Cascade delete associated exam records
    await Promise.all([
      ExamSubject.deleteMany({ schoolId: schoolObjId, examId: examObjId }),
      ExamSchedule.deleteMany({ schoolId: schoolObjId, examId: examObjId }),
      ExamMarks.deleteMany({ schoolId: schoolObjId, examId: examObjId }),
      ExamResult.deleteMany({ schoolId: schoolObjId, examId: examObjId }),
    ]);

    return Exam.findOneAndDelete({ schoolId: schoolObjId, _id: examObjId });
  }

  async getStats(schoolId) {
    const schoolObjId = toObjectId(schoolId);
    const [totalExams, scheduled, completed, published] = await Promise.all([
      Exam.countDocuments({ schoolId: schoolObjId }),
      Exam.countDocuments({ schoolId: schoolObjId, status: { $in: ['SCHEDULED', 'IN_PROGRESS'] } }),
      Exam.countDocuments({ schoolId: schoolObjId, status: 'COMPLETED' }),
      Exam.countDocuments({ schoolId: schoolObjId, status: 'PUBLISHED' }),
    ]);

    return {
      totalExams,
      scheduled,
      completed,
      published,
    };
  }

  // ===================== EXAM SUBJECTS =====================
  async listExamSubjects(schoolId, examId, query = {}) {
    const filter = {
      schoolId: toObjectId(schoolId),
      examId: toObjectId(examId),
    };

    if (query.classId && query.classId !== 'ALL') {
      filter.classId = toObjectId(query.classId);
    }

    return ExamSubject.find(filter)
      .populate('classId', 'name code')
      .populate('subjectId', 'name code subjectType')
      .sort({ 'classId.numericOrder': 1, subjectName: 1 });
  }

  async seedExamSubjectsFromAcademic(schoolId, examId) {
    const exam = await this.findExamById(schoolId, examId);
    if (!exam) throw new Error('Exam not found');

    const schoolObjId = toObjectId(schoolId);
    const examObjId = toObjectId(examId);
    const classIds = exam.classIds.map((c) => c._id || c);

    if (!classIds.length) {
      return { seededCount: 0, message: 'No classes attached to this exam' };
    }

    // Fetch distinct SectionSubjects configured for these classes in the exam's academic year
    const sectionSubjects = await SectionSubject.find({
      schoolId: schoolObjId,
      academicYearId: exam.academicYearId._id || exam.academicYearId,
      classId: { $in: classIds },
      status: 'ACTIVE',
    }).populate('subjectId', 'name code maxMarks passingMarks');

    // Also fallback to generic subjects if SectionSubjects not assigned yet
    let seededCount = 0;
    const seenMap = new Set();

    for (const ss of sectionSubjects) {
      if (!ss.subjectId) continue;
      const key = `${ss.classId.toString()}_${ss.subjectId._id.toString()}`;
      if (seenMap.has(key)) continue;
      seenMap.add(key);

      await ExamSubject.findOneAndUpdate(
        {
          schoolId: schoolObjId,
          examId: examObjId,
          classId: ss.classId,
          subjectId: ss.subjectId._id,
        },
        {
          $setOnInsert: {
            subjectName: ss.subjectId.name,
            subjectCode: ss.subjectId.code || '',
            maxMarks: ss.maxMarks || ss.subjectId.maxMarks || 100,
            passingMarks: ss.passingMarks || ss.subjectId.passingMarks || 33,
          },
        },
        { upsert: true, new: true }
      );
      seededCount++;
    }

    // If still 0 and classes exist, fetch all active subjects from Subject master for each class
    if (seededCount === 0) {
      const allSubjects = await Subject.find({ schoolId: schoolObjId, status: 'ACTIVE' });
      for (const clsId of classIds) {
        for (const subj of allSubjects) {
          await ExamSubject.findOneAndUpdate(
            {
              schoolId: schoolObjId,
              examId: examObjId,
              classId: toObjectId(clsId),
              subjectId: subj._id,
            },
            {
              $setOnInsert: {
                subjectName: subj.name,
                subjectCode: subj.code || '',
                maxMarks: subj.maxMarks || 100,
                passingMarks: subj.passingMarks || 33,
              },
            },
            { upsert: true, new: true }
          );
          seededCount++;
        }
      }
    }

    return {
      seededCount,
      message: `Successfully configured ${seededCount} subjects from academic setup!`,
    };
  }

  async addExamSubject(data) {
    return ExamSubject.create({
      ...data,
      schoolId: toObjectId(data.schoolId),
      examId: toObjectId(data.examId),
      classId: toObjectId(data.classId),
      subjectId: toObjectId(data.subjectId),
    });
  }

  async updateExamSubject(schoolId, examId, id, updates) {
    return ExamSubject.findOneAndUpdate(
      {
        schoolId: toObjectId(schoolId),
        examId: toObjectId(examId),
        _id: toObjectId(id),
      },
      { $set: updates },
      { new: true }
    );
  }

  async deleteExamSubject(schoolId, examId, id) {
    return ExamSubject.findOneAndDelete({
      schoolId: toObjectId(schoolId),
      examId: toObjectId(examId),
      _id: toObjectId(id),
    });
  }

  // ===================== EXAM SCHEDULE =====================
  async listSchedule(schoolId, examId, query = {}) {
    const filter = {
      schoolId: toObjectId(schoolId),
      examId: toObjectId(examId),
    };

    if (query.classId && query.classId !== 'ALL') {
      filter.classId = toObjectId(query.classId);
    }
    if (query.sectionId && query.sectionId !== 'ALL') {
      filter.sectionId = toObjectId(query.sectionId);
    }

    return ExamSchedule.find(filter)
      .populate('classId', 'name code')
      .populate('sectionId', 'name code')
      .populate('subjectId', 'name code')
      .sort({ examDate: 1, startTime: 1 });
  }

  async createScheduleEntry(data) {
    return ExamSchedule.create({
      ...data,
      schoolId: toObjectId(data.schoolId),
      examId: toObjectId(data.examId),
      classId: toObjectId(data.classId),
      sectionId: data.sectionId ? toObjectId(data.sectionId) : null,
      subjectId: toObjectId(data.subjectId),
      invigilatorId: data.invigilatorId ? toObjectId(data.invigilatorId) : null,
    });
  }

  async updateScheduleEntry(schoolId, examId, id, updates) {
    const cleanUpdates = { ...updates };
    if (cleanUpdates.classId) cleanUpdates.classId = toObjectId(cleanUpdates.classId);
    if (cleanUpdates.sectionId) cleanUpdates.sectionId = toObjectId(cleanUpdates.sectionId);
    if (cleanUpdates.subjectId) cleanUpdates.subjectId = toObjectId(cleanUpdates.subjectId);
    if (cleanUpdates.invigilatorId) cleanUpdates.invigilatorId = toObjectId(cleanUpdates.invigilatorId);

    return ExamSchedule.findOneAndUpdate(
      {
        schoolId: toObjectId(schoolId),
        examId: toObjectId(examId),
        _id: toObjectId(id),
      },
      { $set: cleanUpdates },
      { new: true }
    );
  }

  async deleteScheduleEntry(schoolId, examId, id) {
    return ExamSchedule.findOneAndDelete({
      schoolId: toObjectId(schoolId),
      examId: toObjectId(examId),
      _id: toObjectId(id),
    });
  }

  // ===================== MARKS ENTRY =====================
  async listMarksSheet(schoolId, examId, { classId, sectionId, subjectId }) {
    const schoolObjId = toObjectId(schoolId);
    const examObjId = toObjectId(examId);
    const classObjId = toObjectId(classId);
    const sectionObjId = toObjectId(sectionId);
    const subjectObjId = toObjectId(subjectId);

    // 1. Get Exam Subject to get maxMarks & passingMarks
    const examSubject = await ExamSubject.findOne({
      schoolId: schoolObjId,
      examId: examObjId,
      classId: classObjId,
      subjectId: subjectObjId,
    });

    const defaultMaxMarks = examSubject?.maxMarks || 100;
    const defaultPassingMarks = examSubject?.passingMarks || 33;

    // 2. Get all enrolled students in this class & section
    const enrollments = await StudentEnrollment.find({
      schoolId: schoolObjId,
      classId: classObjId,
      sectionId: sectionObjId,
      status: 'ACTIVE',
    })
      .populate('studentId', 'firstName lastName admissionNumber rollNumber photo')
      .sort({ rollNumber: 1, 'studentId.firstName': 1 });

    // 3. Get existing entered marks for this exam, section, subject
    const existingMarks = await ExamMarks.find({
      schoolId: schoolObjId,
      examId: examObjId,
      classId: classObjId,
      sectionId: sectionObjId,
      subjectId: subjectObjId,
    });

    const marksMap = new Map();
    existingMarks.forEach((m) => {
      marksMap.set(m.studentId.toString(), m);
    });

    // 4. Combine into single roster
    const studentRows = enrollments.map((enr) => {
      const s = enr.studentId;
      const sId = s?._id?.toString() || enr.studentId?.toString();
      const existing = marksMap.get(sId);

      return {
        studentId: sId,
        studentName: s ? `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Student' : 'Student',
        rollNumber: enr.rollNumber || s?.rollNumber || '—',
        admissionNumber: s?.admissionNumber || enr.admissionNumber || '—',
        marksObtained: existing ? existing.marksObtained : null,
        maxMarks: existing?.maxMarks || defaultMaxMarks,
        passingMarks: existing?.passingMarks || defaultPassingMarks,
        attendanceStatus: existing?.attendanceStatus || 'PRESENT',
        remarks: existing?.remarks || '',
      };
    });

    return {
      examSubject: examSubject
        ? {
            subjectName: examSubject.subjectName,
            subjectCode: examSubject.subjectCode,
            maxMarks: defaultMaxMarks,
            passingMarks: defaultPassingMarks,
          }
        : null,
      students: studentRows,
    };
  }

  async saveMarks(schoolId, examId, { classId, sectionId, subjectId, marksList, gradedBy }) {
    const schoolObjId = toObjectId(schoolId);
    const examObjId = toObjectId(examId);
    const classObjId = toObjectId(classId);
    const sectionObjId = toObjectId(sectionId);
    const subjectObjId = toObjectId(subjectId);

    const operations = marksList.map((item) => {
      const studentObjId = toObjectId(item.studentId);
      const isPresent = item.attendanceStatus === 'PRESENT';
      const marksVal = isPresent && item.marksObtained !== '' && item.marksObtained !== null
        ? Number(item.marksObtained)
        : null;

      return {
        updateOne: {
          filter: {
            schoolId: schoolObjId,
            examId: examObjId,
            studentId: studentObjId,
            subjectId: subjectObjId,
          },
          update: {
            $set: {
              classId: classObjId,
              sectionId: sectionObjId,
              marksObtained: marksVal,
              maxMarks: Number(item.maxMarks) || 100,
              passingMarks: Number(item.passingMarks) || 33,
              attendanceStatus: item.attendanceStatus || 'PRESENT',
              remarks: item.remarks || '',
              gradedBy: gradedBy ? toObjectId(gradedBy) : null,
            },
          },
          upsert: true,
        },
      };
    });

    if (operations.length > 0) {
      await ExamMarks.bulkWrite(operations);
    }

    return {
      success: true,
      savedCount: operations.length,
      message: `Successfully saved marks for ${operations.length} students!`,
    };
  }

  // ===================== RESULTS CALCULATION =====================
  async calculateResults(schoolId, examId, { classId, sectionId }) {
    const schoolObjId = toObjectId(schoolId);
    const examObjId = toObjectId(examId);
    const classObjId = toObjectId(classId);
    const sectionObjId = toObjectId(sectionId);

    const exam = await Exam.findOne({ schoolId: schoolObjId, _id: examObjId });
    if (!exam) throw new Error('Exam not found');

    // 1. Get all subjects configured for this exam and class
    const examSubjects = await ExamSubject.find({
      schoolId: schoolObjId,
      examId: examObjId,
      classId: classObjId,
    }).populate('subjectId', 'name code');

    if (!examSubjects.length) {
      throw new Error('No subjects configured for this class in this exam. Please add subjects first.');
    }

    // 2. Get all enrolled students in this section
    const enrollments = await StudentEnrollment.find({
      schoolId: schoolObjId,
      classId: classObjId,
      sectionId: sectionObjId,
      status: 'ACTIVE',
    }).populate('studentId', 'firstName lastName admissionNumber rollNumber');

    if (!enrollments.length) {
      throw new Error('No active students found in this class section.');
    }

    // 3. Get all marks entered for this exam, class, section
    const allMarks = await ExamMarks.find({
      schoolId: schoolObjId,
      examId: examObjId,
      classId: classObjId,
      sectionId: sectionObjId,
    });

    // Group marks by studentId
    const studentMarksMap = new Map();
    allMarks.forEach((m) => {
      const sId = m.studentId.toString();
      if (!studentMarksMap.has(sId)) {
        studentMarksMap.set(sId, []);
      }
      studentMarksMap.get(sId).push(m);
    });

    // 4. Calculate for each student
    const studentResults = [];

    for (const enr of enrollments) {
      const s = enr.studentId;
      const sId = s._id.toString();
      const enteredMarks = studentMarksMap.get(sId) || [];

      const enteredBySubjId = new Map();
      enteredMarks.forEach((em) => enteredBySubjId.set(em.subjectId.toString(), em));

      let studentTotal = 0;
      let studentMaxTotal = 0;
      let failedSubjectsCount = 0;
      const subjectResultsList = [];

      for (const es of examSubjects) {
        const subIdStr = (es.subjectId._id || es.subjectId).toString();
        const markEntry = enteredBySubjId.get(subIdStr);

        const maxMarks = markEntry?.maxMarks || es.maxMarks || 100;
        const passingMarks = markEntry?.passingMarks || es.passingMarks || 33;
        const status = markEntry?.attendanceStatus || 'PRESENT';
        const marksObt = markEntry?.marksObtained !== undefined && markEntry?.marksObtained !== null
          ? markEntry.marksObtained
          : 0;

        studentMaxTotal += maxMarks;
        if (status === 'PRESENT') {
          studentTotal += marksObt;
        }

        const isPassed = status === 'PRESENT' && marksObt >= passingMarks;
        if (!isPassed && status === 'PRESENT') {
          failedSubjectsCount++;
        }

        // Calculate subject grade
        const subjPct = maxMarks > 0 ? (marksObt / maxMarks) * 100 : 0;
        let subjGrade = 'F';
        if (status === 'PRESENT') {
          if (subjPct >= 90) subjGrade = 'A+';
          else if (subjPct >= 80) subjGrade = 'A';
          else if (subjPct >= 70) subjGrade = 'B+';
          else if (subjPct >= 60) subjGrade = 'B';
          else if (subjPct >= 50) subjGrade = 'C';
          else if (subjPct >= 33) subjGrade = 'D';
          else subjGrade = 'F';
        } else {
          subjGrade = status; // e.g. ABSENT
        }

        subjectResultsList.push({
          subjectId: es.subjectId._id || es.subjectId,
          subjectName: es.subjectName,
          subjectCode: es.subjectCode || '',
          marksObtained: status === 'PRESENT' ? marksObt : null,
          maxMarks,
          passingMarks,
          attendanceStatus: status,
          grade: subjGrade,
          isPassed,
        });
      }

      const overallPercentage = studentMaxTotal > 0
        ? Number(((studentTotal / studentMaxTotal) * 100).toFixed(2))
        : 0;

      // Overall grade
      let overallGrade = 'F';
      if (overallPercentage >= 90) overallGrade = 'A+';
      else if (overallPercentage >= 80) overallGrade = 'A';
      else if (overallPercentage >= 70) overallGrade = 'B+';
      else if (overallPercentage >= 60) overallGrade = 'B';
      else if (overallPercentage >= 50) overallGrade = 'C';
      else if (overallPercentage >= 33) overallGrade = 'D';
      else overallGrade = 'F';

      // Pass / Fail / Compartment rule
      let overallResult = 'PASS';
      if (failedSubjectsCount > 2) {
        overallResult = 'FAIL';
      } else if (failedSubjectsCount > 0) {
        overallResult = 'COMPARTMENT';
      }

      studentResults.push({
        studentId: s._id,
        rollNumber: enr.rollNumber || s.rollNumber || '—',
        totalMarks: studentTotal,
        maxTotalMarks: studentMaxTotal,
        percentage: overallPercentage,
        grade: overallGrade,
        gpa: Number((overallPercentage / 10).toFixed(1)),
        result: overallResult,
        subjectResults: subjectResultsList,
      });
    }

    // 5. Calculate Class Ranks based on percentage
    studentResults.sort((a, b) => b.percentage - a.percentage);
    studentResults.forEach((sr, index) => {
      sr.rank = sr.result === 'FAIL' ? 0 : index + 1;
    });

    // 6. Bulk upsert into ExamResult
    const resultOps = studentResults.map((sr) => ({
      updateOne: {
        filter: {
          schoolId: schoolObjId,
          examId: examObjId,
          studentId: sr.studentId,
        },
        update: {
          $set: {
            academicYearId: exam.academicYearId,
            classId: classObjId,
            sectionId: sectionObjId,
            rollNumber: sr.rollNumber,
            totalMarks: sr.totalMarks,
            maxTotalMarks: sr.maxTotalMarks,
            percentage: sr.percentage,
            grade: sr.grade,
            gpa: sr.gpa,
            result: sr.result,
            rank: sr.rank,
            subjectResults: sr.subjectResults,
          },
        },
        upsert: true,
      },
    }));

    if (resultOps.length > 0) {
      await ExamResult.bulkWrite(resultOps);
    }

    // 7. Update exam status if needed
    if (exam.status === 'SCHEDULED' || exam.status === 'DRAFT') {
      await Exam.updateOne({ _id: examObjId }, { status: 'COMPLETED' });
    }

    return {
      success: true,
      totalStudents: studentResults.length,
      passedCount: studentResults.filter((r) => r.result === 'PASS').length,
      failedCount: studentResults.filter((r) => r.result === 'FAIL').length,
      compartmentCount: studentResults.filter((r) => r.result === 'COMPARTMENT').length,
      message: `Results calculated successfully for ${studentResults.length} students!`,
    };
  }

  async listResults(schoolId, examId, query = {}) {
    const filter = {
      schoolId: toObjectId(schoolId),
      examId: toObjectId(examId),
    };

    if (query.classId && query.classId !== 'ALL') {
      filter.classId = toObjectId(query.classId);
    }
    if (query.sectionId && query.sectionId !== 'ALL') {
      filter.sectionId = toObjectId(query.sectionId);
    }

    return ExamResult.find(filter)
      .populate('studentId', 'firstName lastName admissionNumber phone photo')
      .populate('classId', 'name code')
      .populate('sectionId', 'name code')
      .sort({ rank: 1, percentage: -1 });
  }

  async getStudentReportCard(schoolId, examId, studentId) {
    const schoolObjId = toObjectId(schoolId);
    const examObjId = toObjectId(examId);
    const studentObjId = toObjectId(studentId);

    const [exam, result, student] = await Promise.all([
      Exam.findOne({ schoolId: schoolObjId, _id: examObjId })
        .populate('academicYearId', 'name code')
        .lean(),
      ExamResult.findOne({ schoolId: schoolObjId, examId: examObjId, studentId: studentObjId })
        .populate('classId', 'name')
        .populate('sectionId', 'name')
        .lean(),
      Student.findOne({ schoolId: schoolObjId, _id: studentObjId }).lean(),
    ]);

    if (!result) return null;

    return {
      exam: {
        name: exam?.name || 'Examination',
        session: exam?.academicYearId?.name || '2026-27',
        examType: exam?.examType || 'Term Exam',
        startDate: exam?.startDate,
        endDate: exam?.endDate,
      },
      student: {
        id: student?._id?.toString(),
        name: `${student?.firstName || ''} ${student?.lastName || ''}`.trim(),
        admissionNumber: student?.admissionNumber || '—',
        rollNumber: result.rollNumber || '—',
        className: result.classId?.name || '—',
        sectionName: result.sectionId?.name || '—',
        parentName: student?.parentName || '—',
      },
      result: {
        totalMarks: result.totalMarks,
        maxTotalMarks: result.maxTotalMarks,
        percentage: result.percentage,
        grade: result.grade,
        gpa: result.gpa,
        rank: result.rank,
        outcome: result.result,
        subjectResults: result.subjectResults || [],
      },
    };
  }
}

export const examRepository = new ExamRepository();
