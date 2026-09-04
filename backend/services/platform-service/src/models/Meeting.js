import mongoose from 'mongoose';

export const MEETING_TYPES = ['STAFF', 'PARENT', 'BOARD', 'DEPARTMENT', 'ONE_ON_ONE', 'OTHER'];
export const MEETING_MODES = ['IN_PERSON', 'ONLINE'];
export const MEETING_STATUSES = ['SCHEDULED', 'COMPLETED', 'CANCELLED'];

const meetingSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    agenda: { type: String, default: '', trim: true },
    type: { type: String, enum: MEETING_TYPES, default: 'STAFF' },
    scheduledAt: { type: Date, required: true },
    durationMin: { type: Number, default: 30, min: 1 },
    mode: { type: String, enum: MEETING_MODES, default: 'IN_PERSON' },
    venue: { type: String, default: '', trim: true },
    meetingLink: { type: String, default: '', trim: true },
    organizerId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    organizerName: { type: String, default: '', trim: true },
    participantsLabel: { type: String, default: '', trim: true },
    minutes: { type: String, default: '', trim: true },
    status: { type: String, enum: MEETING_STATUSES, default: 'SCHEDULED', index: true },
  },
  { timestamps: true }
);

meetingSchema.index({ schoolId: 1, scheduledAt: -1 });

meetingSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    title: this.title,
    agenda: this.agenda,
    type: this.type,
    scheduledAt: this.scheduledAt,
    durationMin: this.durationMin,
    mode: this.mode,
    venue: this.venue,
    meetingLink: this.meetingLink,
    organizerId: this.organizerId ? this.organizerId.toString() : null,
    organizerName: this.organizerName || '',
    participantsLabel: this.participantsLabel || '',
    minutes: this.minutes || '',
    status: this.status,
    isPast: new Date(this.scheduledAt).getTime() < Date.now(),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Meeting = mongoose.model('Meeting', meetingSchema);
