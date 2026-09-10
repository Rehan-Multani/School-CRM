import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { HOSTEL_ERR } from '../constants/hostelErrorCodes.js';
import { hostelRepository } from '../repositories/hostel.repository.js';
import { HOSTEL_TYPES, HOSTEL_CATEGORIES } from '../models/Hostel.js';
import { HostelBed } from '../models/HostelBed.js';
import { HostelRoom } from '../models/HostelRoom.js';
import { HostelAllocation } from '../models/HostelAllocation.js';
import { Student } from '../models/Student.js';
import { StudentEnrollment } from '../models/StudentEnrollment.js';
import { SchoolClass } from '../models/SchoolClass.js';
import { Section } from '../models/Section.js';
import { normalizeMobile as normalizeMobileNumber } from '../utils/mobile.js';

/* The 10-digit rule itself lives in utils/mobile.js — shared with every other
   module — and is re-thrown here with this module's error code. */

/* ============================= small helpers ============================= */

function bad(message, code = HOSTEL_ERR.VALIDATION_ERROR) {
  return new AppError(message, 400, code);
}

function conflict(message, code = HOSTEL_ERR.IN_USE) {
  return new AppError(message, 409, code);
}

function notFound(what) {
  return new AppError(`${what} not found`, 404, HOSTEL_ERR.NOT_FOUND);
}

function requireText(value, label, { max = 120 } = {}) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw bad(`${label} is required`);
  if (text.length > max) throw bad(`${label} must be ${max} characters or fewer`);
  return text;
}

/** An optional free-text field: blank is a legitimate answer, too long is not. */
function optionalText(value, label, { max = 250 } = {}) {
  if (value === null || value === undefined) return '';
  const text = String(value).trim();
  if (text.length > max) throw bad(`${label} must be ${max} characters or fewer`);
  return text;
}

function requireId(value, label) {
  const raw = String(value ?? '').trim();
  if (!raw || !mongoose.isValidObjectId(raw)) throw bad(`${label} is required`);
  return raw;
}

function requireSchool(schoolId) {
  if (!schoolId || !mongoose.isValidObjectId(String(schoolId))) {
    throw new AppError('School context is missing on this session', 401, HOSTEL_ERR.UNAUTHORIZED);
  }
  return String(schoolId);
}

function normalizeMobile(value) {
  try {
    return normalizeMobileNumber(value, 'Mobile number');
  } catch (error) {
    throw bad(error.message);
  }
}

function normalizeStatus(value, label) {
  const raw = String(value ?? 'ACTIVE').trim().toUpperCase();
  if (!['ACTIVE', 'INACTIVE'].includes(raw)) throw bad(`${label} status must be ACTIVE or INACTIVE`);
  return raw;
}

function normalizeHostelType(value) {
  const raw = String(value ?? 'BOYS').trim().toUpperCase();
  if (!HOSTEL_TYPES.includes(raw)) throw bad(`Hostel type must be one of ${HOSTEL_TYPES.join(', ')}`);
  return raw;
}

/** "BH-01" — the admin's own handle for a hostel. Letters, digits, - _ / only. */
function normalizeHostelCode(value) {
  const code = requireText(value, 'Hostel code', { max: 20 }).toUpperCase();
  if (!/^[A-Z0-9][A-Z0-9\-_/]*$/.test(code)) {
    throw bad('Hostel code may use letters, numbers, hyphen, underscore and slash only');
  }
  return code;
}

/** Optional — an empty category means the school does not track one. */
function normalizeHostelCategory(value) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  const raw = String(value).trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (!HOSTEL_CATEGORIES.includes(raw)) {
    throw bad(`Hostel category must be one of ${HOSTEL_CATEGORIES.join(', ')}`);
  }
  return raw;
}

function normalizeCount(value, label, { min = 1, max = 2000 } = {}) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < min || count > max) {
    throw bad(`${label} must be a whole number between ${min} and ${max}`);
  }
  return count;
}

/** Same rules as `normalizeCount`, but blank clears the field. */
function optionalCount(value, label, { min = 1, max = 2000 } = {}) {
  if (value === null || value === undefined || String(value).trim() === '') return null;
  return normalizeCount(value, label, { min, max });
}

/** Blank clears the number; anything else must be a real 10-digit mobile. */
function optionalMobile(value) {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  return normalizeMobile(value);
}

/** A whole-rupee amount — the fee is set by hand and never has paise. */
function normalizeAmount(value, label = 'Yearly fee') {
  const amount = Number(value);
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
    throw bad(`${label} must be a whole number of rupees (0 or more)`);
  }
  if (amount > 10000000) throw bad(`${label} looks too large`);
  return amount;
}

/**
 * Class/section and roll number live on the student's ACTIVE enrollment, not on
 * Student itself — resolve them in one batch so a list stays a fixed number of
 * queries no matter how many students live in the hostel.
 */
async function studentMetaMap(schoolId, studentIds) {
  const meta = new Map();
  const ids = studentIds.filter(Boolean).map(String);
  if (!ids.length) return meta;

  const enrolments = await StudentEnrollment.find({
    schoolId,
    studentId: { $in: ids },
    status: 'ACTIVE',
  })
    .select('studentId classId sectionId rollNumber')
    .lean();
  if (!enrolments.length) return meta;

  const [classes, sections] = await Promise.all([
    SchoolClass.find({ _id: { $in: enrolments.map((e) => e.classId) } }).select('name').lean(),
    Section.find({ _id: { $in: enrolments.map((e) => e.sectionId) } }).select('name').lean(),
  ]);
  const classNames = new Map(classes.map((c) => [String(c._id), c.name]));
  const sectionNames = new Map(sections.map((s) => [String(s._id), s.name]));

  for (const e of enrolments) {
    meta.set(String(e.studentId), {
      rollNumber: e.rollNumber || '',
      className: [classNames.get(String(e.classId)), sectionNames.get(String(e.sectionId))]
        .filter(Boolean)
        .join('-'),
    });
  }
  return meta;
}

function studentView(student, meta = {}) {
  if (!student) return null;
  return {
    id: String(student._id),
    name: [student.firstName, student.lastName].filter(Boolean).join(' ').trim(),
    admissionNumber: student.admissionNumber || '',
    rollNumber: meta.rollNumber || '',
    className: meta.className || '',
  };
}

/** Allocation as the admin table renders it. */
function allocationView(allocation, meta = new Map()) {
  const student = allocation.studentId;
  const hostel = allocation.hostelId;
  const room = allocation.roomId;
  const bed = allocation.bedId;
  const year = allocation.academicYearId;
  return {
    id: allocation._id.toString(),
    student: studentView(student, meta.get(String(student?._id || student)) || {}),
    hostel: hostel?._id ? { id: String(hostel._id), name: hostel.name, type: hostel.type } : null,
    room: room?._id
      ? { id: String(room._id), roomNumber: room.roomNumber, floorNumber: room.floorNumber }
      : null,
    bed: bed?._id ? { id: String(bed._id), bedCode: bed.bedCode, bedNumber: bed.bedNumber } : null,
    // The year the resident was admitted for, and what the hostel cost then — a
    // snapshot, not a live lookup, so a later fee revision leaves it untouched.
    academicYear: year?._id ? { id: String(year._id), name: year.name, code: year.code } : null,
    yearlyFeeAmount: allocation.yearlyFeeAmount || 0,
    status: allocation.status,
    createdAt: allocation.createdAt,
  };
}

/** "Bed 1" … "Bed n" for a room of `capacity` beds, starting after `from`. */
function bedRows(schoolId, room, from, to) {
  const rows = [];
  for (let number = from; number <= to; number += 1) {
    rows.push({
      schoolId,
      hostelId: room.hostelId._id || room.hostelId,
      roomId: room._id,
      bedCode: `Bed ${number}`,
      bedNumber: number,
      status: 'AVAILABLE',
    });
  }
  return rows;
}

/** Free the bed a vacating/moving student was in. */
async function releaseBed(schoolId, bedId) {
  if (!bedId) return;
  await HostelBed.updateOne(
    { _id: bedId, schoolId },
    { $set: { status: 'AVAILABLE', currentStudentId: null, currentAllocationId: null } }
  );
}

/* ================================ service ================================ */

export const hostelService = {
  /* --------------------------- STEP 1 · HOSTELS -------------------------- */

  async listHostels(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const filter = {};
    if (query.status) filter.status = normalizeStatus(query.status, 'Hostel');
    const hostels = await hostelRepository.listHostels(schoolId, filter);

    // Rooms, beds, occupancy and warden are what make the list readable — one
    // aggregate each rather than a query per hostel.
    const hostelIds = hostels.map((h) => h._id);
    const [roomCounts, bedCounts, residentCounts, wardens] = await Promise.all([
      HostelRoom.aggregate([
        { $match: { hostelId: { $in: hostelIds } } },
        { $group: { _id: '$hostelId', rooms: { $sum: 1 }, beds: { $sum: '$capacity' } } },
      ]),
      HostelBed.aggregate([
        { $match: { hostelId: { $in: hostelIds }, status: 'OCCUPIED' } },
        { $group: { _id: '$hostelId', n: { $sum: 1 } } },
      ]),
      HostelAllocation.aggregate([
        { $match: { hostelId: { $in: hostelIds }, status: 'ACTIVE' } },
        { $group: { _id: '$hostelId', n: { $sum: 1 } } },
      ]),
      hostelRepository.listWardens(schoolId, { hostelId: { $in: hostelIds } }),
    ]);

    const roomsBy = new Map(roomCounts.map((r) => [String(r._id), r]));
    const occupiedBy = new Map(bedCounts.map((b) => [String(b._id), b.n]));
    const residentsBy = new Map(residentCounts.map((a) => [String(a._id), a.n]));
    const wardenBy = new Map(wardens.map((w) => [String(w.hostelId?._id || w.hostelId), w]));

    return hostels.map((hostel) => {
      const key = String(hostel._id);
      const warden = wardenBy.get(key);
      return {
        ...hostel.toPublicJSON(),
        // `totalRooms` is what the admin declared on the form; this is how many
        // rooms step 2 has actually produced so far.
        roomsCreated: roomsBy.get(key)?.rooms || 0,
        totalBeds: roomsBy.get(key)?.beds || 0,
        occupiedBeds: occupiedBy.get(key) || 0,
        residents: residentsBy.get(key) || 0,
        warden: warden ? { id: String(warden._id), name: warden.name, mobile: warden.mobile } : null,
      };
    });
  },

  async getHostel(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const hostel = await hostelRepository.getHostel(schoolId, requireId(id, 'Hostel'));
    if (!hostel) throw notFound('Hostel');

    const [rooms, warden, residents] = await Promise.all([
      hostelRepository.listRooms(schoolId, { hostelId: hostel._id }),
      hostelRepository.findWardenOfHostel(schoolId, hostel._id),
      hostelRepository.countActiveAllocations(schoolId, { hostelId: hostel._id }),
    ]);

    return {
      ...hostel.toPublicJSON(),
      rooms: rooms.map((r) => r.toPublicJSON()),
      roomsCreated: rooms.length,
      warden: warden ? warden.toPublicJSON() : null,
      residents,
    };
  },

  async createHostel(schoolIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const name = requireText(data.name, 'Hostel name', { max: 80 });
    const code = normalizeHostelCode(data.code);

    const [byName, byCode] = await Promise.all([
      hostelRepository.findHostelByName(schoolId, name),
      hostelRepository.findHostelByCode(schoolId, code),
    ]);
    if (byName) throw conflict(`A hostel called "${name}" already exists`, HOSTEL_ERR.DUPLICATE);
    if (byCode) throw conflict(`Hostel code ${code} is already used by ${byCode.name}`, HOSTEL_ERR.DUPLICATE);

    const hostel = await hostelRepository.createHostel({
      schoolId,
      name,
      code,
      type: normalizeHostelType(data.type),
      category: normalizeHostelCategory(data.category),
      contactNumber: optionalMobile(data.contactNumber),
      address: optionalText(data.address, 'Address', { max: 250 }),
      totalFloors: optionalCount(data.totalFloors, 'Total floors', { min: 1, max: 50 }),
      totalRooms: optionalCount(data.totalRooms, 'Total rooms', { min: 1, max: 500 }),
      totalCapacity: normalizeCount(data.totalCapacity, 'Total capacity', { min: 1, max: 2000 }),
      description: optionalText(data.description, 'Description', { max: 500 }),
      status: normalizeStatus(data.status, 'Hostel'),
    });

    // Step 4 folded into step 1 — picking the warden on the hostel form is the
    // same link `assignWardenToHostel` makes, so it goes through that path.
    if (data.wardenId) {
      await this.assignWardenToHostel(schoolId, data.wardenId, hostel._id);
    }
    return hostel.toPublicJSON();
  },

  async updateHostel(schoolIdRaw, id, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const hostel = await hostelRepository.getHostel(schoolId, requireId(id, 'Hostel'));
    if (!hostel) throw notFound('Hostel');

    if (data.name !== undefined) {
      const name = requireText(data.name, 'Hostel name', { max: 80 });
      if (name !== hostel.name) {
        const duplicate = await hostelRepository.findHostelByName(schoolId, name);
        if (duplicate) throw conflict(`A hostel called "${name}" already exists`, HOSTEL_ERR.DUPLICATE);
      }
      hostel.name = name;
    }

    if (data.code !== undefined) {
      const code = normalizeHostelCode(data.code);
      if (code !== hostel.code) {
        const duplicate = await hostelRepository.findHostelByCode(schoolId, code);
        if (duplicate) {
          throw conflict(`Hostel code ${code} is already used by ${duplicate.name}`, HOSTEL_ERR.DUPLICATE);
        }
      }
      hostel.code = code;
    }

    if (data.type !== undefined) hostel.type = normalizeHostelType(data.type);
    if (data.category !== undefined) hostel.category = normalizeHostelCategory(data.category);
    if (data.contactNumber !== undefined) hostel.contactNumber = optionalMobile(data.contactNumber);
    if (data.address !== undefined) hostel.address = optionalText(data.address, 'Address', { max: 250 });
    if (data.description !== undefined) {
      hostel.description = optionalText(data.description, 'Description', { max: 500 });
    }
    if (data.totalFloors !== undefined) {
      hostel.totalFloors = optionalCount(data.totalFloors, 'Total floors', { min: 1, max: 50 });
    }
    if (data.totalRooms !== undefined) {
      hostel.totalRooms = optionalCount(data.totalRooms, 'Total rooms', { min: 1, max: 500 });
    }

    if (data.totalCapacity !== undefined) {
      const totalCapacity = normalizeCount(data.totalCapacity, 'Total capacity', { min: 1, max: 2000 });
      // Shrinking below the residents already living here would leave the
      // hostel permanently over capacity with no way back.
      const residents = await hostelRepository.countActiveAllocations(schoolId, { hostelId: hostel._id });
      if (totalCapacity < residents) {
        throw conflict(
          `Capacity cannot drop below ${residents} — that many students already live in ${hostel.name}`,
          HOSTEL_ERR.CAPACITY_FULL
        );
      }
      hostel.totalCapacity = totalCapacity;
    }

    if (data.status !== undefined) {
      const status = normalizeStatus(data.status, 'Hostel');
      if (status === 'INACTIVE') {
        const residents = await hostelRepository.countActiveAllocations(schoolId, { hostelId: hostel._id });
        if (residents) {
          throw conflict(
            `Cannot deactivate ${hostel.name} — ${residents} student(s) still live there. Vacate them first.`
          );
        }
      }
      hostel.status = status;
    }

    await hostel.save();

    // A blank warden on the form means "this hostel has no warden" — the same
    // unassign the wardens tab performs.
    if (data.wardenId !== undefined) {
      const current = await hostelRepository.findWardenOfHostel(schoolId, hostel._id);
      const wanted = data.wardenId ? requireId(data.wardenId, 'Warden') : null;
      if (String(current?._id || '') !== String(wanted || '')) {
        if (current) await this.unassignWardenFromHostel(schoolId, current._id);
        if (wanted) await this.assignWardenToHostel(schoolId, wanted, hostel._id);
      }
    }

    return hostel.toPublicJSON();
  },

  async deleteHostel(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const hostelId = requireId(id, 'Hostel');
    const hostel = await hostelRepository.getHostel(schoolId, hostelId);
    if (!hostel) throw notFound('Hostel');

    const [rooms, residents, warden] = await Promise.all([
      hostelRepository.countRooms(schoolId, hostelId),
      hostelRepository.countActiveAllocations(schoolId, { hostelId }),
      hostelRepository.findWardenOfHostel(schoolId, hostelId),
    ]);
    if (residents) {
      throw conflict(`Cannot delete ${hostel.name} — ${residents} student(s) still live there`);
    }
    if (rooms) {
      throw conflict(`Cannot delete ${hostel.name} — delete its ${rooms} room(s) first`);
    }
    if (warden) {
      throw conflict(`Cannot delete ${hostel.name} — ${warden.name} is its warden. Unassign them first.`);
    }

    await hostelRepository.deleteHostel(schoolId, hostelId);
    return { id: hostelId };
  },

  /* ------------------- STEPS 2 + 3 · ROOMS AND THEIR BEDS ---------------- */

  async listRooms(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const filter = {};
    if (query.hostelId) filter.hostelId = requireId(query.hostelId, 'Hostel');
    const rooms = await hostelRepository.listRooms(schoolId, filter);

    // Beds are the room's whole substance — send them with the room so the
    // admin never needs a second call to see who is where.
    const beds = await hostelRepository.listBeds(schoolId, { roomId: { $in: rooms.map((r) => r._id) } });
    const bedsByRoom = new Map();
    for (const bed of beds) {
      const key = String(bed.roomId);
      if (!bedsByRoom.has(key)) bedsByRoom.set(key, []);
      bedsByRoom.get(key).push({
        ...bed.toPublicJSON(),
        student: bed.currentStudentId
          ? {
              id: String(bed.currentStudentId._id),
              name: [bed.currentStudentId.firstName, bed.currentStudentId.lastName]
                .filter(Boolean)
                .join(' ')
                .trim(),
              admissionNumber: bed.currentStudentId.admissionNumber || '',
            }
          : null,
      });
    }

    return rooms.map((room) => {
      const roomBeds = bedsByRoom.get(String(room._id)) || [];
      return {
        ...room.toPublicJSON(),
        beds: roomBeds,
        occupiedBeds: roomBeds.filter((b) => b.status === 'OCCUPIED').length,
      };
    });
  },

  async getRoom(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const room = await hostelRepository.getRoom(schoolId, requireId(id, 'Room'));
    if (!room) throw notFound('Room');
    const beds = await hostelRepository.listBeds(schoolId, { roomId: room._id });
    return { ...room.toPublicJSON(), beds: beds.map((b) => b.toPublicJSON()) };
  },

  /** Creating a room creates its beds — step 3 is never done by hand. */
  async createRoom(schoolIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const hostelId = requireId(data.hostelId, 'Hostel');
    const hostel = await hostelRepository.getHostel(schoolId, hostelId);
    if (!hostel) throw notFound('Hostel');
    if (hostel.status !== 'ACTIVE') {
      throw conflict(`${hostel.name} is inactive`, HOSTEL_ERR.HOSTEL_INACTIVE);
    }

    const roomNumber = requireText(data.roomNumber, 'Room number', { max: 20 });
    const duplicate = await hostelRepository.findRoomByNumber(schoolId, hostelId, roomNumber);
    if (duplicate) {
      throw conflict(`${hostel.name} already has a room ${roomNumber}`, HOSTEL_ERR.DUPLICATE);
    }

    const capacity = normalizeCount(data.capacity, 'Room capacity', { min: 1, max: 50 });
    const room = await hostelRepository.createRoom({
      schoolId,
      hostelId,
      roomNumber,
      floorNumber: requireText(data.floorNumber, 'Floor', { max: 40 }),
      capacity,
    });
    await hostelRepository.insertBeds(bedRows(schoolId, room, 1, capacity));

    const beds = await hostelRepository.listBeds(schoolId, { roomId: room._id });
    return { ...room.toPublicJSON(), beds: beds.map((b) => b.toPublicJSON()), occupiedBeds: 0 };
  },

  async updateRoom(schoolIdRaw, id, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const room = await hostelRepository.getRoom(schoolId, requireId(id, 'Room'));
    if (!room) throw notFound('Room');

    if (data.roomNumber !== undefined) {
      const roomNumber = requireText(data.roomNumber, 'Room number', { max: 20 });
      if (roomNumber !== room.roomNumber) {
        const duplicate = await hostelRepository.findRoomByNumber(
          schoolId,
          room.hostelId._id || room.hostelId,
          roomNumber
        );
        if (duplicate) throw conflict(`This hostel already has a room ${roomNumber}`, HOSTEL_ERR.DUPLICATE);
      }
      room.roomNumber = roomNumber;
    }

    if (data.floorNumber !== undefined) room.floorNumber = requireText(data.floorNumber, 'Floor', { max: 40 });

    if (data.capacity !== undefined) {
      const capacity = normalizeCount(data.capacity, 'Room capacity', { min: 1, max: 50 });
      if (capacity > room.capacity) {
        // Growing the room adds the missing beds at the end.
        await hostelRepository.insertBeds(bedRows(schoolId, room, room.capacity + 1, capacity));
      } else if (capacity < room.capacity) {
        // Shrinking drops beds from the end — but never one somebody sleeps in.
        const occupied = await hostelRepository.countBeds(schoolId, {
          roomId: room._id,
          bedNumber: { $gt: capacity },
          status: 'OCCUPIED',
        });
        if (occupied) {
          throw conflict(
            `Cannot shrink room ${room.roomNumber} to ${capacity} beds — ${occupied} of the beds being removed are occupied`,
            HOSTEL_ERR.BED_OCCUPIED
          );
        }
        await hostelRepository.deleteBedsAbove(schoolId, room._id, capacity);
      }
      room.capacity = capacity;
    }

    await room.save();
    const beds = await hostelRepository.listBeds(schoolId, { roomId: room._id });
    return {
      ...room.toPublicJSON(),
      beds: beds.map((b) => b.toPublicJSON()),
      occupiedBeds: beds.filter((b) => b.status === 'OCCUPIED').length,
    };
  },

  async deleteRoom(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const roomId = requireId(id, 'Room');
    const room = await hostelRepository.getRoom(schoolId, roomId);
    if (!room) throw notFound('Room');

    const residents = await hostelRepository.countActiveAllocations(schoolId, { roomId });
    if (residents) {
      throw conflict(
        `Cannot delete room ${room.roomNumber} — ${residents} student(s) live there. Vacate them first.`
      );
    }

    await hostelRepository.deleteRoom(schoolId, roomId);
    await hostelRepository.deleteBedsOfRoom(schoolId, roomId);
    return { id: roomId };
  },

  /** Beds are read-only: they exist because the room says so. */
  async listBeds(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const filter = {};
    if (query.hostelId) filter.hostelId = requireId(query.hostelId, 'Hostel');
    if (query.roomId) filter.roomId = requireId(query.roomId, 'Room');
    if (query.status) {
      const status = String(query.status).toUpperCase();
      if (!['AVAILABLE', 'OCCUPIED'].includes(status)) throw bad('status must be AVAILABLE or OCCUPIED');
      filter.status = status;
    }
    const beds = await hostelRepository.listBeds(schoolId, filter);
    return beds.map((bed) => ({
      ...bed.toPublicJSON(),
      student: bed.currentStudentId
        ? {
            id: String(bed.currentStudentId._id),
            name: [bed.currentStudentId.firstName, bed.currentStudentId.lastName]
              .filter(Boolean)
              .join(' ')
              .trim(),
            admissionNumber: bed.currentStudentId.admissionNumber || '',
          }
        : null,
    }));
  },

  /* --------------------------- STEP 4 · WARDENS -------------------------- */

  async listWardens(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const filter = {};
    if (query.status) filter.status = normalizeStatus(query.status, 'Warden');
    const wardens = await hostelRepository.listWardens(schoolId, filter);
    return wardens.map((w) => w.toPublicJSON());
  },

  async getWarden(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const warden = await hostelRepository.getWarden(schoolId, requireId(id, 'Warden'));
    if (!warden) throw notFound('Warden');
    return warden.toPublicJSON();
  },

  async createWarden(schoolIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const name = requireText(data.name, 'Warden name');
    const mobile = normalizeMobile(data.mobile);

    const duplicate = await hostelRepository.findWardenByMobile(schoolId, mobile);
    if (duplicate) throw conflict(`A warden with mobile ${mobile} already exists`, HOSTEL_ERR.DUPLICATE);

    const warden = await hostelRepository.createWarden({
      schoolId,
      name,
      mobile,
      status: normalizeStatus(data.status, 'Warden'),
    });
    // Creating and assigning in one step is the common case — "Rajesh Sharma →
    // Boys Hostel" is a single action for the admin.
    if (data.hostelId) return this.assignWardenToHostel(schoolId, warden._id, data.hostelId);
    return warden.toPublicJSON();
  },

  async updateWarden(schoolIdRaw, id, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const warden = await hostelRepository.getWarden(schoolId, requireId(id, 'Warden'));
    if (!warden) throw notFound('Warden');

    if (data.name !== undefined) warden.name = requireText(data.name, 'Warden name');

    if (data.mobile !== undefined) {
      const mobile = normalizeMobile(data.mobile);
      if (mobile !== warden.mobile) {
        const duplicate = await hostelRepository.findWardenByMobile(schoolId, mobile);
        if (duplicate) throw conflict(`A warden with mobile ${mobile} already exists`, HOSTEL_ERR.DUPLICATE);
      }
      warden.mobile = mobile;
    }

    if (data.status !== undefined) {
      const status = normalizeStatus(data.status, 'Warden');
      if (status === 'INACTIVE' && warden.hostelId) {
        throw conflict(
          `Cannot deactivate ${warden.name} — they are the warden of ${warden.hostelId.name || 'a hostel'}. Unassign them first.`
        );
      }
      warden.status = status;
    }

    await warden.save();
    const fresh = await hostelRepository.getWarden(schoolId, warden._id);
    return fresh.toPublicJSON();
  },

  /** Step 4's actual link: Rajesh Sharma → Boys Hostel. One warden per hostel. */
  async assignWardenToHostel(schoolIdRaw, wardenIdRaw, hostelIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const wardenId = requireId(wardenIdRaw, 'Warden');
    const hostelId = requireId(hostelIdRaw, 'Hostel');

    const [warden, hostel] = await Promise.all([
      hostelRepository.getWarden(schoolId, wardenId),
      hostelRepository.getHostel(schoolId, hostelId),
    ]);
    if (!warden) throw notFound('Warden');
    if (!hostel) throw notFound('Hostel');
    if (warden.status !== 'ACTIVE') {
      throw conflict(`${warden.name} is inactive`, HOSTEL_ERR.WARDEN_INACTIVE);
    }
    if (hostel.status !== 'ACTIVE') {
      throw conflict(`${hostel.name} is inactive`, HOSTEL_ERR.HOSTEL_INACTIVE);
    }

    const holder = await hostelRepository.findWardenOfHostel(schoolId, hostelId);
    if (holder && String(holder._id) !== wardenId) {
      throw conflict(
        `${hostel.name} already has a warden — ${holder.name}`,
        HOSTEL_ERR.ALREADY_ASSIGNED
      );
    }

    warden.hostelId = hostel._id;
    await warden.save();
    const fresh = await hostelRepository.getWarden(schoolId, wardenId);
    return fresh.toPublicJSON();
  },

  async unassignWardenFromHostel(schoolIdRaw, wardenIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const wardenId = requireId(wardenIdRaw, 'Warden');
    const warden = await hostelRepository.getWarden(schoolId, wardenId);
    if (!warden) throw notFound('Warden');

    warden.hostelId = null;
    await warden.save();
    const fresh = await hostelRepository.getWarden(schoolId, wardenId);
    return fresh.toPublicJSON();
  },

  async deleteWarden(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const wardenId = requireId(id, 'Warden');
    const warden = await hostelRepository.getWarden(schoolId, wardenId);
    if (!warden) throw notFound('Warden');
    if (warden.hostelId) {
      throw conflict(
        `Cannot delete ${warden.name} — they are the warden of ${warden.hostelId.name || 'a hostel'}`
      );
    }

    await hostelRepository.deleteWarden(schoolId, wardenId);
    return { id: wardenId };
  },

  /* -------------------- STEP 5 · STUDENT HOSTEL ASSIGNMENT --------------- */

  async listAllocations(schoolIdRaw, query = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const filter = {};
    if (query.hostelId) filter.hostelId = requireId(query.hostelId, 'Hostel');
    if (query.roomId) filter.roomId = requireId(query.roomId, 'Room');
    if (query.academicYearId) filter.academicYearId = requireId(query.academicYearId, 'Academic year');
    filter.status = query.status ? String(query.status).toUpperCase() : 'ACTIVE';
    if (!['ACTIVE', 'VACATED'].includes(filter.status)) throw bad('status must be ACTIVE or VACATED');

    const allocations = await hostelRepository.listAllocations(schoolId, filter);
    const meta = await studentMetaMap(schoolId, allocations.map((a) => a.studentId?._id));
    return allocations.map((a) => allocationView(a, meta));
  },

  /**
   * Ayan Khan → Boys Hostel → Room 101 → Bed 1, for 2026-27 at ₹60,000.
   *
   * Everything the flow promises is checked here: the bed is free, it really is
   * in that room of that hostel, the hostel has room and a warden, and the
   * student is not already living somewhere else.
   */
  async assignStudent(schoolIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const studentId = requireId(data.studentId, 'Student');
    const hostelId = requireId(data.hostelId, 'Hostel');
    const roomId = requireId(data.roomId, 'Room');
    const bedId = requireId(data.bedId, 'Bed');

    const [student, hostel, room, bed] = await Promise.all([
      Student.findOne({ _id: studentId, schoolId }).select('firstName lastName admissionNumber status'),
      hostelRepository.getHostel(schoolId, hostelId),
      hostelRepository.getRoom(schoolId, roomId),
      hostelRepository.getBed(schoolId, bedId),
    ]);
    if (!student) throw notFound('Student');
    if (student.status !== 'ACTIVE') throw conflict('This student is not active');
    if (!hostel) throw notFound('Hostel');
    if (hostel.status !== 'ACTIVE') throw conflict(`${hostel.name} is inactive`, HOSTEL_ERR.HOSTEL_INACTIVE);
    if (!room) throw notFound('Room');
    if (String(room.hostelId._id || room.hostelId) !== hostelId) {
      throw bad(`Room ${room.roomNumber} is not in ${hostel.name}`);
    }
    if (!bed) throw notFound('Bed');
    if (String(bed.roomId) !== roomId) throw bad(`${bed.bedCode} is not in room ${room.roomNumber}`);

    // The flow is ordered for a reason: a hostel with nobody responsible for it
    // is not ready to take residents.
    const warden = await hostelRepository.findWardenOfHostel(schoolId, hostelId);
    if (!warden) {
      throw conflict(
        `${hostel.name} has no warden assigned yet. Complete step 4 first.`,
        HOSTEL_ERR.NOT_READY
      );
    }

    if (bed.status === 'OCCUPIED') {
      throw conflict(
        `${bed.bedCode} in room ${room.roomNumber} is already occupied`,
        HOSTEL_ERR.BED_OCCUPIED
      );
    }

    const existing = await hostelRepository.findActiveAllocationForStudent(schoolId, studentId);
    if (existing) {
      throw conflict(
        `${student.firstName} already lives in ${existing.hostelId?.name || 'a hostel'} (room ${existing.roomId?.roomNumber || '?'}, ${existing.bedId?.bedCode || 'a bed'}). Vacate that first.`,
        HOSTEL_ERR.ALREADY_ASSIGNED
      );
    }

    const residents = await hostelRepository.countActiveAllocations(schoolId, { hostelId });
    if (residents >= hostel.totalCapacity) {
      throw conflict(
        `${hostel.name} is full — it holds ${hostel.totalCapacity} students`,
        HOSTEL_ERR.CAPACITY_FULL
      );
    }

    // Step 6 — the applicable yearly fee rides along with the allocation. The
    // year is the school's current one (or one the admin names explicitly), and
    // the amount is copied, not referenced.
    const academicYear = data.academicYearId
      ? await hostelRepository.getAcademicYear(schoolId, requireId(data.academicYearId, 'Academic year'))
      : await hostelRepository.getCurrentAcademicYear(schoolId);
    if (!academicYear) {
      throw bad('No current academic year is set for this school. Set one before assigning a hostel.');
    }
    const fee = await hostelRepository.findFee(schoolId, academicYear._id);

    let created;
    try {
      created = await hostelRepository.createAllocation({
        schoolId,
        studentId,
        hostelId,
        roomId,
        bedId,
        academicYearId: academicYear._id,
        yearlyFeeAmount: fee?.yearlyAmount || 0,
        status: 'ACTIVE',
      });
    } catch (error) {
      // Lost a race against a concurrent assign for the same student or bed.
      if (error?.code === 11000) {
        throw conflict('That student or bed was just taken by another assignment', HOSTEL_ERR.ALREADY_ASSIGNED);
      }
      throw error;
    }

    await HostelBed.updateOne(
      { _id: bedId, schoolId },
      { $set: { status: 'OCCUPIED', currentStudentId: studentId, currentAllocationId: created._id } }
    );

    const allocation = await hostelRepository.getAllocation(schoolId, created._id);
    const meta = await studentMetaMap(schoolId, [studentId]);
    return allocationView(allocation, meta);
  },

  /** Moving a resident to another room/bed — same validations as assigning. */
  async updateAllocation(schoolIdRaw, id, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const allocation = await hostelRepository.getAllocation(schoolId, requireId(id, 'Allocation'));
    if (!allocation) throw notFound('Hostel allocation');
    if (allocation.status !== 'ACTIVE') throw conflict('This allocation is no longer active');

    const currentHostelId = String(allocation.hostelId?._id || allocation.hostelId);
    const currentBedId = String(allocation.bedId?._id || allocation.bedId);
    const hostelId = data.hostelId ? requireId(data.hostelId, 'Hostel') : currentHostelId;
    const roomId = requireId(data.roomId ?? allocation.roomId?._id ?? allocation.roomId, 'Room');
    const bedId = requireId(data.bedId ?? allocation.bedId?._id ?? allocation.bedId, 'Bed');

    const [hostel, room, bed] = await Promise.all([
      hostelRepository.getHostel(schoolId, hostelId),
      hostelRepository.getRoom(schoolId, roomId),
      hostelRepository.getBed(schoolId, bedId),
    ]);
    if (!hostel) throw notFound('Hostel');
    if (hostel.status !== 'ACTIVE') throw conflict(`${hostel.name} is inactive`, HOSTEL_ERR.HOSTEL_INACTIVE);
    if (!room) throw notFound('Room');
    if (String(room.hostelId._id || room.hostelId) !== hostelId) {
      throw bad(`Room ${room.roomNumber} is not in ${hostel.name}`);
    }
    if (!bed) throw notFound('Bed');
    if (String(bed.roomId) !== roomId) throw bad(`${bed.bedCode} is not in room ${room.roomNumber}`);

    const warden = await hostelRepository.findWardenOfHostel(schoolId, hostelId);
    if (!warden) {
      throw conflict(`${hostel.name} has no warden assigned yet. Complete step 4 first.`, HOSTEL_ERR.NOT_READY);
    }

    if (bedId !== currentBedId && bed.status === 'OCCUPIED') {
      throw conflict(`${bed.bedCode} in room ${room.roomNumber} is already occupied`, HOSTEL_ERR.BED_OCCUPIED);
    }

    // Capacity only matters when the student is actually moving to a new hostel.
    if (hostelId !== currentHostelId) {
      const residents = await hostelRepository.countActiveAllocations(schoolId, { hostelId });
      if (residents >= hostel.totalCapacity) {
        throw conflict(
          `${hostel.name} is full — it holds ${hostel.totalCapacity} students`,
          HOSTEL_ERR.CAPACITY_FULL
        );
      }
    }

    allocation.hostelId = hostel._id;
    allocation.roomId = room._id;
    allocation.bedId = bed._id;
    // The fee snapshot and academic year deliberately stay as they were: moving
    // rooms is not a re-admission and must not re-price the resident.
    await allocation.save();

    if (bedId !== currentBedId) {
      await releaseBed(schoolId, currentBedId);
      await HostelBed.updateOne(
        { _id: bedId, schoolId },
        {
          $set: {
            status: 'OCCUPIED',
            currentStudentId: allocation.studentId?._id || allocation.studentId,
            currentAllocationId: allocation._id,
          },
        }
      );
    }

    const fresh = await hostelRepository.getAllocation(schoolId, allocation._id);
    const meta = await studentMetaMap(schoolId, [fresh.studentId?._id]);
    return allocationView(fresh, meta);
  },

  async vacateAllocation(schoolIdRaw, id) {
    const schoolId = requireSchool(schoolIdRaw);
    const allocation = await hostelRepository.getAllocation(schoolId, requireId(id, 'Allocation'));
    if (!allocation) throw notFound('Hostel allocation');
    if (allocation.status !== 'ACTIVE') throw conflict('This allocation is already vacated');

    // Soft-close rather than delete: the partial-unique indexes free both the
    // student and the bed while the old row stays auditable.
    allocation.status = 'VACATED';
    await allocation.save();
    await releaseBed(schoolId, allocation.bedId?._id || allocation.bedId);

    const fresh = await hostelRepository.getAllocation(schoolId, allocation._id);
    const meta = await studentMetaMap(schoolId, [fresh.studentId?._id]);
    return allocationView(fresh, meta);
  },

  /* ----------------------- STEP 6 · YEARLY HOSTEL FEE -------------------- */

  /**
   * Every academic year the school has, each with the hostel fee set for it (or
   * null where none is set yet). One amount per year, the same for every class
   * and every hostel — that is the whole rule.
   */
  async listFees(schoolIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const [years, fees, residents] = await Promise.all([
      hostelRepository.listAcademicYears(schoolId),
      hostelRepository.listFees(schoolId),
      HostelAllocation.aggregate([
        { $match: { schoolId: new mongoose.Types.ObjectId(schoolId), status: 'ACTIVE' } },
        { $group: { _id: '$academicYearId', n: { $sum: 1 } } },
      ]),
    ]);

    const feeBy = new Map(fees.map((f) => [String(f.academicYearId), f]));
    const residentsBy = new Map(residents.map((r) => [String(r._id), r.n]));

    return years.map((year) => {
      const fee = feeBy.get(String(year._id));
      return {
        academicYearId: String(year._id),
        academicYear: { id: String(year._id), name: year.name, code: year.code, isCurrent: year.isCurrent },
        yearlyAmount: fee ? fee.yearlyAmount : null,
        // Residents already priced off this year — they keep their snapshot even
        // if the amount below is changed.
        assignedStudents: residentsBy.get(String(year._id)) || 0,
        updatedAt: fee?.updatedAt || null,
      };
    });
  },

  async setFee(schoolIdRaw, academicYearIdRaw, data = {}) {
    const schoolId = requireSchool(schoolIdRaw);
    const academicYearId = requireId(academicYearIdRaw, 'Academic year');
    const year = await hostelRepository.getAcademicYear(schoolId, academicYearId);
    if (!year) throw notFound('Academic year');

    const yearlyAmount = normalizeAmount(data.yearlyAmount);
    const fee = await hostelRepository.upsertFee(schoolId, academicYearId, yearlyAmount);
    return {
      academicYearId,
      academicYear: { id: String(year._id), name: year.name, code: year.code, isCurrent: year.isCurrent },
      yearlyAmount: fee.yearlyAmount,
      updatedAt: fee.updatedAt,
    };
  },

  async deleteFee(schoolIdRaw, academicYearIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);
    const academicYearId = requireId(academicYearIdRaw, 'Academic year');
    const removed = await hostelRepository.deleteFee(schoolId, academicYearId);
    if (!removed) throw notFound('Hostel fee for this academic year');
    // Residents assigned under this fee keep their snapshot on purpose.
    return { academicYearId };
  },

  /* ---------------------------- form lookups ----------------------------- */

  /**
   * Everything the admin forms need to populate their dropdowns, in one call —
   * real records only, so the UI never has to invent placeholder data.
   */
  async getLookups(schoolIdRaw) {
    const schoolId = requireSchool(schoolIdRaw);

    const [students, hostels, wardens, activeAllocations, currentYear] = await Promise.all([
      Student.find({ schoolId, status: 'ACTIVE' })
        .select('firstName lastName admissionNumber')
        .sort({ firstName: 1 })
        .lean(),
      hostelRepository.listHostels(schoolId, { status: 'ACTIVE' }),
      hostelRepository.listWardens(schoolId, { status: 'ACTIVE' }),
      HostelAllocation.find({ schoolId, status: 'ACTIVE' }).select('studentId').lean(),
      hostelRepository.getCurrentAcademicYear(schoolId),
    ]);

    const assigned = new Set(activeAllocations.map((a) => String(a.studentId)));
    const meta = await studentMetaMap(schoolId, students.map((s) => s._id));

    const hostelIds = hostels.map((h) => h._id);
    const [rooms, beds, currentFee] = await Promise.all([
      HostelRoom.find({ schoolId, hostelId: { $in: hostelIds } }).sort({ roomNumber: 1 }).lean(),
      HostelBed.find({ schoolId, hostelId: { $in: hostelIds } }).sort({ bedNumber: 1 }).lean(),
      currentYear ? hostelRepository.findFee(schoolId, currentYear._id) : null,
    ]);

    const bedsByRoom = new Map();
    for (const bed of beds) {
      const key = String(bed.roomId);
      if (!bedsByRoom.has(key)) bedsByRoom.set(key, []);
      bedsByRoom.get(key).push({
        id: String(bed._id),
        bedCode: bed.bedCode,
        bedNumber: bed.bedNumber,
        status: bed.status,
      });
    }
    const roomsByHostel = new Map();
    for (const room of rooms) {
      const key = String(room.hostelId);
      if (!roomsByHostel.has(key)) roomsByHostel.set(key, []);
      roomsByHostel.get(key).push({
        id: String(room._id),
        roomNumber: room.roomNumber,
        floorNumber: room.floorNumber,
        capacity: room.capacity,
        beds: bedsByRoom.get(String(room._id)) || [],
      });
    }
    const wardenByHostel = new Map(
      wardens
        .filter((w) => w.hostelId)
        .map((w) => [String(w.hostelId._id || w.hostelId), { id: String(w._id), name: w.name, mobile: w.mobile }])
    );

    return {
      currentAcademicYear: currentYear
        ? { id: String(currentYear._id), name: currentYear.name, code: currentYear.code }
        : null,
      currentYearlyFee: currentFee ? currentFee.yearlyAmount : null,
      students: students.map((s) => ({
        ...studentView(s, meta.get(String(s._id)) || {}),
        alreadyAssigned: assigned.has(String(s._id)),
      })),
      hostels: hostels.map((h) => ({
        ...h.toPublicJSON(),
        warden: wardenByHostel.get(String(h._id)) || null,
        rooms: roomsByHostel.get(String(h._id)) || [],
      })),
      wardens: wardens.map((w) => w.toPublicJSON()),
    };
  },
};
