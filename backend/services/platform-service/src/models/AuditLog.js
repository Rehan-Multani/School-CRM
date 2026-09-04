import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    module: { type: String, required: true, trim: true, uppercase: true, index: true },
    action: { type: String, required: true, trim: true },
    entityType: { type: String, default: '', trim: true },
    entityId: { type: String, default: '', trim: true },
    actorId: { type: String, default: '', trim: true },
    actorRole: { type: String, default: '', trim: true },
    actorName: { type: String, default: 'System', trim: true },
    summary: { type: String, default: '', trim: true },
    before: { type: mongoose.Schema.Types.Mixed, default: null },
    after: { type: mongoose.Schema.Types.Mixed, default: null },
    ip: { type: String, default: '', trim: true },
    userAgent: { type: String, default: '', trim: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ schoolId: 1, module: 1, createdAt: -1 });
auditLogSchema.index({ schoolId: 1, createdAt: -1 });

auditLogSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    module: this.module,
    action: this.action,
    entityType: this.entityType || '',
    entityId: this.entityId || '',
    actorId: this.actorId || '',
    actorRole: this.actorRole || '',
    actorName: this.actorName || 'System',
    summary: this.summary || '',
    before: this.before ?? null,
    after: this.after ?? null,
    ip: this.ip || '',
    createdAt: this.createdAt,
  };
};

export const AuditLog = mongoose.model('AuditLog', auditLogSchema);
