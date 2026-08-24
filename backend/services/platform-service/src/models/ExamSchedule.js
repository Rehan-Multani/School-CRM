import mongoose from 'mongoose';

const examScheduleSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    examId: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true, index: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true, index: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
    examDate: { type: Date, required: true },
    startTime: { type: String, required: true, trim: true }, // e.g. '09:00 AM'
    endTime: { type: String, required: true, trim: true },   // e.g. '12:00 PM'
    room: { type: String, default: 'Hall 1', trim: true },
    invigilatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    invigilatorName: { type: String, default: '', trim: true },
    maxMarks: { type: Number, default: 100 },
  },
  { timestamps: true }
);

examScheduleSchema.index({ examId: 1, classId: 1, sectionId: 1, subjectId: 1 });

examScheduleSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    examId: this.examId.toString(),
    classId: this.classId.toString(),
    sectionId: this.sectionId ? this.sectionId.toString() : null,
    subjectId: this.subjectId.toString(),
    examDate: this.examDate,
    startTime: this.startTime,
    endTime: this.endTime,
    room: this.room,
    invigilatorId: this.invigilatorId ? this.invigilatorId.toString() : null,
    invigilatorName: this.invigilatorName,
    maxMarks: this.maxMarks,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const ExamSchedule = mongoose.model('ExamSchedule', examScheduleSchema);
