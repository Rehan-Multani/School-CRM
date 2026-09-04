import mongoose from 'mongoose';
import { StudentAttendance } from '../models/StudentAttendance.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { Student } from '../models/Student.js';
import { Section } from '../models/Section.js';
import { SchoolClass } from '../models/SchoolClass.js';

class StudentAttendanceRepository {
  async sectionMeta(schoolId, sectionId) {
    const section = await Section.findOne({ schoolId, _id: sectionId }).lean();
    if (!section) return null;
    const cls = section.classId ? await SchoolClass.findOne({ schoolId, _id: section.classId }).lean() : null;
    return {
      sectionId: section._id,
      sectionName: section.name,
      classId: section.classId || null,
      className: cls?.name || '',
      academicYearId: section.academicYearId || null,
    };
  }

  async roster(schoolId, sectionId) {
    const enrollments = await StudentEnrollment.find({
      schoolId: new mongoose.Types.ObjectId(schoolId),
      sectionId,
      status: 'ACTIVE',
    })
      .select('studentId rollNumber')
      .lean();
    const ids = enrollments.map((e) => e.studentId);
    const rollMap = {};
    enrollments.forEach((e) => {
      rollMap[e.studentId.toString()] = e.rollNumber || '';
    });
    const students = await Student.find({ schoolId, _id: { $in: ids }, status: 'ACTIVE' })
      .select('firstName lastName')
      .sort({ firstName: 1 })
      .lean();
    return students.map((s) => ({
      studentId: s._id.toString(),
      studentName: [s.firstName, s.lastName].filter(Boolean).join(' '),
      rollNumber: rollMap[s._id.toString()] || '',
    }));
  }

  findDay(schoolId, sectionId, date) {
    return StudentAttendance.findOne({ schoolId, sectionId, date });
  }

  upsertDay(schoolId, sectionId, date, data) {
    return StudentAttendance.findOneAndUpdate(
      { schoolId, sectionId, date },
      { $set: { ...data, schoolId, sectionId, date } },
      { new: true, upsert: true }
    );
  }

  async monitor(schoolId, date) {
    const rows = await StudentAttendance.find({ schoolId, date }).lean();
    return rows;
  }

  async rangeReport(schoolId, from, to) {
    const rows = await StudentAttendance.find({
      schoolId,
      date: { $gte: from, $lte: to },
    })
      .sort({ date: 1 })
      .lean();
    return rows;
  }
}

export const studentAttendanceRepository = new StudentAttendanceRepository();
