import mongoose from 'mongoose';

export const TRIP_STUDENT_STATUSES = ['NOT_BOARDED', 'BOARDED', 'DROPPED', 'ABSENT', 'CANCELLED'];

const gps = () => ({
  lat: { type: Number, default: null },
  lng: { type: Number, default: null },
});

const tripStudentSchema = new mongoose.Schema(
  {
    schoolId: { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true, index: true },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'Trip', required: true, index: true },
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    studentName: { type: String, default: '', trim: true },
    rollNumber: { type: String, default: '', trim: true },
    routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'TransportRoute', required: true },
    pickupStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'RouteStop', default: null },
    dropStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'RouteStop', default: null },
    status: { type: String, enum: TRIP_STUDENT_STATUSES, default: 'NOT_BOARDED' },
    boardedAt: { type: Date, default: null },
    droppedAt: { type: Date, default: null },
    absentAt: { type: Date, default: null },
    boardStopId: { type: mongoose.Schema.Types.ObjectId, ref: 'RouteStop', default: null },
    dropStopId2: { type: mongoose.Schema.Types.ObjectId, ref: 'RouteStop', default: null },
    boardGps: gps(),
    dropGps: gps(),
    operatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'SchoolUser', default: null },
    absentReason: { type: String, default: '', trim: true },
    notes: { type: String, default: '', trim: true },
  },
  { timestamps: true }
);

// Idempotency anchor: at most one row per (trip, student).
tripStudentSchema.index({ tripId: 1, studentId: 1 }, { unique: true });
tripStudentSchema.index({ schoolId: 1, tripId: 1, status: 1 });
tripStudentSchema.index({ schoolId: 1, studentId: 1, createdAt: -1 });

tripStudentSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    tripId: this.tripId.toString(),
    studentId: this.studentId.toString(),
    studentName: this.studentName || '',
    rollNumber: this.rollNumber || '',
    pickupStopId: this.pickupStopId ? this.pickupStopId.toString() : null,
    dropStopId: this.dropStopId ? this.dropStopId.toString() : null,
    status: this.status,
    boardedAt: this.boardedAt,
    droppedAt: this.droppedAt,
    absentAt: this.absentAt,
    absentReason: this.absentReason || '',
    updatedAt: this.updatedAt,
  };
};

export const TripStudent = mongoose.model('TripStudent', tripStudentSchema);
