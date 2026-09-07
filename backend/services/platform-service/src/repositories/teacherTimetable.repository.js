import mongoose from 'mongoose';
import { TimetableEntry, TIMETABLE_DAYS } from '../models/TimetableEntry.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

class TeacherTimetableRepository {
  weekForTeacher(schoolId, teacherId) {
    return TimetableEntry.find({
      schoolId: oid(schoolId),
      teacherId: oid(teacherId),
      status: 'ACTIVE',
    })
      .sort({ dayOfWeek: 1, periodNumber: 1 })
      .lean();
  }

  dayForTeacher(schoolId, teacherId, day) {
    return TimetableEntry.find({
      schoolId: oid(schoolId),
      teacherId: oid(teacherId),
      dayOfWeek: day,
      status: 'ACTIVE',
    })
      .sort({ periodNumber: 1 })
      .lean();
  }

  entryById(schoolId, id) {
    return TimetableEntry.findOne({ schoolId: oid(schoolId), _id: oid(id) });
  }

  countTeacherClassesForDay(schoolId, teacherId, day) {
    return TimetableEntry.countDocuments({
      schoolId: oid(schoolId),
      teacherId: oid(teacherId),
      dayOfWeek: day,
      status: 'ACTIVE',
    });
  }
}

export const teacherTimetableRepository = new TeacherTimetableRepository();
export { TIMETABLE_DAYS };
