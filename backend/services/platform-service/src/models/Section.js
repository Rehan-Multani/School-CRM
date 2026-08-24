import mongoose from 'mongoose';

const sectionSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', required: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, default: '', trim: true, uppercase: true },
    capacity: { type: Number, required: true, min: 1 },
    roomNumber: { type: String, default: '', trim: true },
    classTeacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', default: null },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

sectionSchema.index({ schoolId: 1, academicYearId: 1, classId: 1, name: 1 }, { unique: true });

sectionSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    academicYearId: this.academicYearId.toString(),
    classId: this.classId.toString(),
    name: this.name,
    code: this.code,
    capacity: this.capacity,
    roomNumber: this.roomNumber,
    classTeacherId: this.classTeacherId ? this.classTeacherId.toString() : null,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Section = mongoose.model('Section', sectionSchema);
