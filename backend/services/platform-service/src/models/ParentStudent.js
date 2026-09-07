import mongoose from 'mongoose';

export const PARENT_RELATIONSHIPS = ['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER'];

/**
 * The Parent ↔ Student link. This is the ONLY thing parentAccess.service.js
 * trusts to decide which children a parent may see — a childId from the request
 * is authorized iff an ACTIVE row exists here for (parentId, studentId) in the
 * same school.
 */
const parentStudentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    parentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Parent', required: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    relationship: { type: String, enum: PARENT_RELATIONSHIPS, default: 'GUARDIAN' },
    isPrimary: { type: Boolean, default: false },
    status: { type: String, enum: ['ACTIVE', 'INACTIVE'], default: 'ACTIVE' },
  },
  { timestamps: true }
);

parentStudentSchema.index({ parentId: 1, studentId: 1 }, { unique: true });
parentStudentSchema.index({ schoolId: 1, parentId: 1, status: 1 });
parentStudentSchema.index({ schoolId: 1, studentId: 1 });

parentStudentSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    parentId: this.parentId.toString(),
    studentId: this.studentId.toString(),
    relationship: this.relationship,
    isPrimary: Boolean(this.isPrimary),
    status: this.status,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const ParentStudent = mongoose.model('ParentStudent', parentStudentSchema);
