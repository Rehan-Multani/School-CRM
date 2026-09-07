import mongoose from 'mongoose';

export const MATERIAL_VISIBILITY = ['SECTION', 'CLASS'];

const studyMaterialSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', default: null },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolClass', default: null },
    className: { type: String, default: '', trim: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', default: null, index: true },
    sectionName: { type: String, default: '', trim: true },
    subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', default: null },
    subjectName: { type: String, default: '', trim: true },
    teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Teacher', required: true, index: true },
    teacherName: { type: String, default: '', trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '', trim: true },
    fileName: { type: String, default: '', trim: true },
    fileType: { type: String, default: '', trim: true },
    fileSize: { type: Number, default: 0, min: 0 },
    url: { type: String, default: '', trim: true },
    visibility: { type: String, enum: MATERIAL_VISIBILITY, default: 'SECTION' },
    status: { type: String, enum: ['ACTIVE', 'ARCHIVED'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

studyMaterialSchema.index({ schoolId: 1, teacherId: 1, createdAt: -1 });
studyMaterialSchema.index({ schoolId: 1, sectionId: 1, subjectId: 1 });

studyMaterialSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    classId: this.classId ? this.classId.toString() : null,
    className: this.className || '',
    sectionId: this.sectionId ? this.sectionId.toString() : null,
    sectionName: this.sectionName || '',
    subjectId: this.subjectId ? this.subjectId.toString() : null,
    subjectName: this.subjectName || '',
    teacherId: this.teacherId ? this.teacherId.toString() : null,
    teacherName: this.teacherName || '',
    title: this.title,
    description: this.description || '',
    fileName: this.fileName || '',
    fileType: this.fileType || '',
    fileSize: this.fileSize || 0,
    url: this.url || '',
    visibility: this.visibility,
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const StudyMaterial = mongoose.model('StudyMaterial', studyMaterialSchema);
