import mongoose from 'mongoose';

const studentEnrollmentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    rollNumber: { type: String, default: '', trim: true },
    admissionNumber: { type: String, default: '', trim: true },
    status: { type: String, enum: ['ACTIVE', 'PROMOTED', 'TRANSFERRED', 'WITHDRAWN'], default: 'ACTIVE' },
    enrollmentDate: { type: Date, default: Date.now },
    leavingDate: { type: Date, default: null },
  },
  { timestamps: true }
);

studentEnrollmentSchema.index({ schoolId: 1, studentId: 1, academicYearId: 1 }, { unique: true });
studentEnrollmentSchema.index({ schoolId: 1, academicYearId: 1, sectionId: 1 });

studentEnrollmentSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    studentId: this.studentId.toString(),
    academicYearId: this.academicYearId.toString(),
    classId: this.classId.toString(),
    sectionId: this.sectionId.toString(),
    rollNumber: this.rollNumber,
    admissionNumber: this.admissionNumber,
    status: this.status,
    enrollmentDate: this.enrollmentDate,
    leavingDate: this.leavingDate,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const StudentEnrollment = mongoose.model('StudentEnrollment', studentEnrollmentSchema);
