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
  // The Mongo filter for a students list, or null when the class/section/year
  // filter matches nobody. Each word of the search must match one of the fields,
  // so a full name ("Aarav Mehta") finds the student.
  async buildStudentQuery(schoolId, { search, status, academicYearId, classId, sectionId } = {}) {
    const query = { schoolId: toObjectId(schoolId) };
    if (status) query.status = status;
    const words = String(search || '').trim().split(/\s+/).filter(Boolean).slice(0, 5);
    if (words.length) {
      query.$and = words.map((word) => {
        const safe = escapeRegex(word);
        return {
          $or: [
            { admissionNumber: { $regex: safe, $options: 'i' } },
            { firstName: { $regex: safe, $options: 'i' } },
            { lastName: { $regex: safe, $options: 'i' } },
            { email: { $regex: safe, $options: 'i' } },
            { parentName: { $regex: safe, $options: 'i' } },
          ],
        };
      });
    }

    if (academicYearId || classId || sectionId) {
      const enrollmentQuery = { schoolId: toObjectId(schoolId) };
      if (academicYearId) enrollmentQuery.academicYearId = academicYearId;
      if (classId) enrollmentQuery.classId = classId;
      if (sectionId) enrollmentQuery.sectionId = sectionId;
      const studentIds = await StudentEnrollment.distinct('studentId', enrollmentQuery);
      if (!studentIds.length) return null;
      query._id = { $in: studentIds };
    }
    return query;
  }

  // `paging` ({ skip, limit }) is optional: without it the whole list is returned.
  async listStudents(schoolId, filters = {}, paging = null) {
    const query = await this.buildStudentQuery(schoolId, filters);
    if (!query) return [];
    const cursor = Student.find(query).sort({ firstName: 1, lastName: 1, createdAt: -1 });
    return paging ? cursor.skip(paging.skip).limit(paging.limit) : cursor;
  }

  async countStudents(schoolId, filters = {}) {
    const query = await this.buildStudentQuery(schoolId, filters);
    return query ? Student.countDocuments(query) : 0;
  }

  // Students (within the same filters) whose most recent enrollment is WITHDRAWN.
  async countWithdrawnStudents(schoolId, filters = {}) {
    const query = await this.buildStudentQuery(schoolId, filters);
    if (!query) return 0;
    const enrollmentMatch = { schoolId: toObjectId(schoolId) };
    if (filters.academicYearId) enrollmentMatch.academicYearId = toObjectId(filters.academicYearId);
    if (filters.classId) enrollmentMatch.classId = toObjectId(filters.classId);
    if (filters.sectionId) enrollmentMatch.sectionId = toObjectId(filters.sectionId);
    const withdrawn = await StudentEnrollment.aggregate([
      { $match: enrollmentMatch },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$studentId', status: { $first: '$status' } } },
      { $match: { status: 'WITHDRAWN' } },
    ]);
    if (!withdrawn.length) return 0;
    return Student.countDocuments({ $and: [query, { _id: { $in: withdrawn.map((row) => row._id) } }] });
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
