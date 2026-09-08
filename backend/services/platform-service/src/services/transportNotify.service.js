import mongoose from 'mongoose';
import { ParentStudent } from '../models/ParentStudent.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { Section } from '../models/Section.js';
import { AcademicYear } from '../models/AcademicYear.js';
import { notificationService } from './notification.service.js';

const oid = (v) => new mongoose.Types.ObjectId(String(v));

/**
 * Fire-and-forget notification fan-out for transport events. Every call is
 * wrapped so a delivery failure never breaks the operational request.
 *
 * `notificationService.send` audiences are DEVICE_ROLES (`parent`, `teacher`,
 * `transport`, `school-admin`) — not transport sub-roles. SOS / critical alerts
 * therefore notify the whole `transport` + `school-admin` audience for the
 * school (documented limitation; sub-role-precise routing needs device-level
 * sub-role storage which the notification layer doesn't have yet).
 */
class TransportNotifyService {
  #safe(promise) {
    Promise.resolve(promise).catch((err) =>
      console.error(`[transport-notify] delivery failed: ${err?.message}`)
    );
  }

  /** Notify only the parent(s) actually linked to this child. */
  notifyParent(schoolId, studentId, { title, body }) {
    this.#safe(
      (async () => {
        const links = await ParentStudent.find({
          schoolId: oid(schoolId),
          studentId: oid(studentId),
          status: 'ACTIVE',
        })
          .select('parentId')
          .lean();
        const recipientRefIds = links.map((l) => String(l.parentId));
        if (!recipientRefIds.length) return;
        await notificationService.send(
          { title, body, audiences: ['parent'], recipientRefIds },
          'Transport',
          { schoolId: String(schoolId) }
        );
      })()
    );
  }

  /** Notify the student's current class teacher (if configured by the caller). */
  notifyClassTeacher(schoolId, studentId, { title, body }) {
    this.#safe(
      (async () => {
        const year = await AcademicYear.findOne({ schoolId: oid(schoolId), isCurrent: true }).select('_id').lean();
        const enr = await StudentEnrollment.findOne({
          schoolId: oid(schoolId),
          studentId: oid(studentId),
          status: 'ACTIVE',
          ...(year ? { academicYearId: year._id } : {}),
        })
          .select('sectionId')
          .lean();
        if (!enr?.sectionId) return;
        const section = await Section.findById(enr.sectionId).select('classTeacherId').lean();
        if (!section?.classTeacherId) return;
        await notificationService.send(
          { title, body, audiences: ['teacher'], recipientRefIds: [String(section.classTeacherId)] },
          'Transport',
          { schoolId: String(schoolId) }
        );
      })()
    );
  }

  /** Broadcast to transport staff + school admins (SOS / critical issue). */
  notifyTransportAndAdmin(schoolId, { title, body }) {
    this.#safe(
      notificationService.send(
        { title, body, audiences: ['transport', 'school-admin'] },
        'Transport',
        { schoolId: String(schoolId) }
      )
    );
  }

  /** Broadcast to transport staff only (operational alerts). */
  notifyTransport(schoolId, { title, body }) {
    this.#safe(
      notificationService.send({ title, body, audiences: ['transport'] }, 'Transport', { schoolId: String(schoolId) })
    );
  }
}

export const transportNotifyService = new TransportNotifyService();
