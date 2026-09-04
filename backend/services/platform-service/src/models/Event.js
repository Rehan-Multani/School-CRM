import mongoose from 'mongoose';

export const EVENT_CATEGORIES = [
  'ACADEMIC',
  'SPORTS',
  'CULTURAL',
  'MEETING',
  'HOLIDAY',
  'EXAM',
  'OTHER',
];

export const EVENT_AUDIENCES = ['ALL', 'TEACHERS', 'STUDENTS', 'PARENTS', 'STAFF'];

export const EVENT_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED'];

const eventSchema = new mongoose.Schema(
  {
    schoolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'School',
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    category: {
      type: String,
      enum: EVENT_CATEGORIES,
      default: 'OTHER',
      index: true,
    },
    startAt: {
      type: Date,
      required: true,
    },
    endAt: {
      type: Date,
      required: true,
    },
    allDay: {
      type: Boolean,
      default: false,
    },
    venue: {
      type: String,
      default: '',
      trim: true,
    },
    audiences: {
      type: [String],
      enum: EVENT_AUDIENCES,
      default: ['ALL'],
    },
    leadStaffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SchoolUser',
      default: null,
    },
    leadName: {
      type: String,
      default: '',
      trim: true,
    },
    // 'CANCELLED' is a sticky manual state; every other value is derived from dates.
    manualStatus: {
      type: String,
      enum: ['', 'CANCELLED'],
      default: '',
    },
    attachments: {
      type: [
        {
          name: String,
          url: String,
        },
      ],
      default: [],
    },
    createdByName: {
      type: String,
      default: '',
      trim: true,
    },
  },
  { timestamps: true }
);

eventSchema.index({ schoolId: 1, startAt: -1 });

export function deriveEventStatus(doc, now = new Date()) {
  if (doc.manualStatus === 'CANCELLED') return 'CANCELLED';
  const start = new Date(doc.startAt).getTime();
  const end = new Date(doc.endAt).getTime();
  const ts = now.getTime();
  if (ts < start) return 'UPCOMING';
  if (ts > end) return 'COMPLETED';
  return 'ONGOING';
}

eventSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    schoolId: this.schoolId.toString(),
    title: this.title,
    description: this.description,
    category: this.category,
    startAt: this.startAt,
    endAt: this.endAt,
    allDay: this.allDay,
    venue: this.venue,
    audiences: this.audiences || [],
    leadStaffId: this.leadStaffId ? this.leadStaffId.toString() : null,
    leadName: this.leadName || '',
    status: deriveEventStatus(this),
    cancelled: this.manualStatus === 'CANCELLED',
    attachments: this.attachments || [],
    createdByName: this.createdByName || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

export const Event = mongoose.model('Event', eventSchema);
