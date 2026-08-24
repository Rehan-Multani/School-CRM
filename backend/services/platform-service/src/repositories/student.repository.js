import mongoose from 'mongoose';
import { Student } from '../models/Student.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { AcademicYear } from '../models/AcademicYear.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';
import { escapeRegex } from '../../../shared/sanitize.js';

function toObjectId(id) {
  return new mongoose.Types.ObjectId(id);
}

export class StudentRepository {
  async listStudents(schoolId, { search, status, academicYearId, classId, sectionId } = {}) {
    const query = { schoolId: toObjectId(schoolId) };
    if (status) query.status = status;
    if (search) {
      const safe = escapeRegex(search);
      query.$or = [
        { admissionNumber: { $regex: safe, $options: 'i' } },
        { firstName: { $regex: safe, $options: 'i' } },
        { lastName: { $regex: safe, $options: 'i' } },
        { email: { $regex: safe, $options: 'i' } },
        { parentName: { $regex: safe, $options: 'i' } },
      ];
    }

    let studentIds = null;
    if (academicYearId || classId || sectionId) {
      const enrollmentQuery = { schoolId: toObjectId(schoolId) };
      if (academicYearId) enrollmentQuery.academicYearId = academicYearId;
      if (classId) enrollmentQuery.classId = classId;
      if (sectionId) enrollmentQuery.sectionId = sectionId;
      const enrollments = await StudentEnrollment.find(enrollmentQuery).select('studentId').lean();
      studentIds = [...new Set(enrollments.map((item) => item.studentId.toString()))];
      if (!studentIds.length) return [];
      query._id = { $in: studentIds };
    }

    return Student.find(query).sort({ firstName: 1, lastName: 1, createdAt: -1 });
  }

  findStudentById(schoolId, id) {
    return Student.findOne({ _id: id, schoolId: toObjectId(schoolId) });
  }

  createStudent(payload) {
    return Student.create(payload);
  }

  updateStudent(schoolId, id, payload) {
    return Student.findOneAndUpdate({ _id: id, schoolId: toObjectId(schoolId) }, payload, {
      new: true,
      runValidators: true,
    });
  }

  deleteStudent(schoolId, id) {
    return Student.findOneAndDelete({ _id: id, schoolId: toObjectId(schoolId) });
  }

  listEnrollmentsForStudents(schoolId, studentIds, filters = {}) {
    if (!studentIds.length) return Promise.resolve([]);
    const query = {
      schoolId: toObjectId(schoolId),
      studentId: { $in: studentIds },
    };
    if (filters.academicYearId) query.academicYearId = filters.academicYearId;
    if (filters.classId) query.classId = filters.classId;
    if (filters.sectionId) query.sectionId = filters.sectionId;
    return StudentEnrollment.find(query).sort({ createdAt: -1 });
  }

  findEnrollmentById(schoolId, id) {
    return StudentEnrollment.findOne({ _id: id, schoolId: toObjectId(schoolId) });
  }

  findCurrentEnrollmentByStudent(schoolId, studentId) {
    return StudentEnrollment.findOne({
      schoolId: toObjectId(schoolId),
      studentId,
    }).sort({ createdAt: -1 });
  }

  createEnrollment(payload) {
    return StudentEnrollment.create(payload);
  }

  updateEnrollment(schoolId, id, payload) {
    return StudentEnrollment.findOneAndUpdate({ _id: id, schoolId: toObjectId(schoolId) }, payload, {
      new: true,
      runValidators: true,
    });
  }

  deleteEnrollmentsByStudent(schoolId, studentId) {
    return StudentEnrollment.deleteMany({
      schoolId: toObjectId(schoolId),
      studentId,
    });
  }

  findYearById(schoolId, id) {
    return AcademicYear.findOne({ _id: id, schoolId: toObjectId(schoolId) });
  }

  findYearsByIds(schoolId, ids = []) {
    if (!ids.length) return Promise.resolve([]);
    return AcademicYear.find({ _id: { $in: ids }, schoolId: toObjectId(schoolId) });
  }

  findClassById(schoolId, id) {
    return SchoolClass.findOne({ _id: id, schoolId: toObjectId(schoolId) });
  }

  findClassesByIds(schoolId, ids = []) {
    if (!ids.length) return Promise.resolve([]);
    return SchoolClass.find({ _id: { $in: ids }, schoolId: toObjectId(schoolId) });
  }

  findSectionById(schoolId, id) {
    return Section.findOne({ _id: id, schoolId: toObjectId(schoolId) });
  }

  findSectionsByIds(schoolId, ids = []) {
    if (!ids.length) return Promise.resolve([]);
    return Section.find({ _id: { $in: ids }, schoolId: toObjectId(schoolId) });
  }
}

export const studentRepository = new StudentRepository();
