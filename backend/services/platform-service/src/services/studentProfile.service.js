import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { Student } from '../models/Student.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { toStudentPhotoPublicPath, deleteUploadedFile } from '../utils/upload.utils.js';
import { studentSelf, guardianInfo } from '../serializers/student.serializers.js';
import { STUDENT_ERR } from '../constants/studentErrorCodes.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

// The only fields a student may self-edit — protected academic fields
// (name, admissionNumber, class, DOB, gender…) are read-only from the APK.
const EDITABLE = ['phone', 'address'];

class StudentProfileService {
  async getProfile(ctx) {
    const student = await Student.findOne({ _id: oid(ctx.studentId), schoolId: oid(ctx.schoolId) });
    if (!student) throw new AppError('Student profile not found', 404, STUDENT_ERR.STUDENT_NOT_FOUND);
    return studentSelf(student, ctx);
  }

  async updateProfile(ctx, body = {}, files = {}) {
    const student = await Student.findOne({ _id: oid(ctx.studentId), schoolId: oid(ctx.schoolId) });
    if (!student) throw new AppError('Student profile not found', 404, STUDENT_ERR.STUDENT_NOT_FOUND);

    for (const key of EDITABLE) {
      if (body[key] !== undefined) student[key] = String(body[key]).trim().slice(0, 500);
    }
    if (files.photo) {
      const next = toStudentPhotoPublicPath(files.photo.filename);
      const prev = student.photo;
      student.photo = next;
      if (prev && prev !== next) deleteUploadedFile(prev);
    }
    await student.save();
    return studentSelf(student, ctx);
  }

  async academicInfo(ctx) {
    const enrollment = ctx.enrollmentId
      ? await StudentEnrollment.findById(oid(ctx.enrollmentId)).lean()
      : null;
    return {
      admissionNumber: ctx.admissionNumber,
      rollNumber: ctx.rollNumber,
      classId: ctx.classId,
      className: ctx.className,
      sectionId: ctx.sectionId,
      sectionName: ctx.sectionName,
      academicYearId: ctx.currentYearId,
      academicYear: ctx.academicYearName,
      enrollmentStatus: enrollment?.status || (ctx.hasEnrollment ? 'ACTIVE' : 'NONE'),
      enrollmentDate: enrollment?.enrollmentDate || null,
    };
  }

  async guardians(ctx) {
    const student = await Student.findOne({ _id: oid(ctx.studentId), schoolId: oid(ctx.schoolId) })
      .select('parentName parentPhone')
      .lean();
    if (!student) throw new AppError('Student profile not found', 404, STUDENT_ERR.STUDENT_NOT_FOUND);
    return guardianInfo(student);
  }
}

export const studentProfileService = new StudentProfileService();
