import { Hostel } from '../models/Hostel.js';
import { HostelRoom } from '../models/HostelRoom.js';
import { HostelBed } from '../models/HostelBed.js';
import { HostelWarden } from '../models/HostelWarden.js';
import { HostelAllocation } from '../models/HostelAllocation.js';
import { HostelFee } from '../models/HostelFee.js';
import { AcademicYear } from '../models/AcademicYear.js';

/**
 * Data access for the Hostel module. Every method takes `schoolId` first and
 * folds it into the filter — a query that cannot name a school cannot leak
 * across tenants.
 */
export const hostelRepository = {
  /* -------------------------------- hostels ------------------------------ */
  listHostels(schoolId, filter = {}) {
    return Hostel.find({ schoolId, ...filter }).sort({ name: 1 });
  },
  getHostel(schoolId, id) {
    return Hostel.findOne({ _id: id, schoolId });
  },
  findHostelByName(schoolId, name) {
    return Hostel.findOne({ schoolId, name });
  },
  findHostelByCode(schoolId, code) {
    return Hostel.findOne({ schoolId, code });
  },
  createHostel(payload) {
    return Hostel.create(payload);
  },
  deleteHostel(schoolId, id) {
    return Hostel.findOneAndDelete({ _id: id, schoolId });
  },

  /* --------------------------------- rooms ------------------------------- */
  listRooms(schoolId, filter = {}) {
    return HostelRoom.find({ schoolId, ...filter })
      .populate('hostelId', 'name type')
      .sort({ floorNumber: 1, roomNumber: 1 });
  },
  getRoom(schoolId, id) {
    return HostelRoom.findOne({ _id: id, schoolId }).populate('hostelId', 'name type');
  },
  findRoomByNumber(schoolId, hostelId, roomNumber) {
    return HostelRoom.findOne({ schoolId, hostelId, roomNumber });
  },
  countRooms(schoolId, hostelId) {
    return HostelRoom.countDocuments({ schoolId, hostelId });
  },
  createRoom(payload) {
    return HostelRoom.create(payload);
  },
  deleteRoom(schoolId, id) {
    return HostelRoom.findOneAndDelete({ _id: id, schoolId });
  },

  /* --------------------------------- beds -------------------------------- */
  listBeds(schoolId, filter = {}) {
    return HostelBed.find({ schoolId, ...filter })
      .populate('currentStudentId', 'firstName lastName admissionNumber')
      .sort({ bedNumber: 1 });
  },
  getBed(schoolId, id) {
    return HostelBed.findOne({ _id: id, schoolId });
  },
  insertBeds(rows) {
    return HostelBed.insertMany(rows);
  },
  countBeds(schoolId, filter = {}) {
    return HostelBed.countDocuments({ schoolId, ...filter });
  },
  deleteBedsAbove(schoolId, roomId, bedNumber) {
    return HostelBed.deleteMany({ schoolId, roomId, bedNumber: { $gt: bedNumber } });
  },
  deleteBedsOfRoom(schoolId, roomId) {
    return HostelBed.deleteMany({ schoolId, roomId });
  },

  /* -------------------------------- wardens ------------------------------ */
  listWardens(schoolId, filter = {}) {
    return HostelWarden.find({ schoolId, ...filter }).populate('hostelId', 'name type').sort({ name: 1 });
  },
  getWarden(schoolId, id) {
    return HostelWarden.findOne({ _id: id, schoolId }).populate('hostelId', 'name type');
  },
  findWardenByMobile(schoolId, mobile) {
    return HostelWarden.findOne({ schoolId, mobile });
  },
  findWardenOfHostel(schoolId, hostelId) {
    return HostelWarden.findOne({ schoolId, hostelId });
  },
  createWarden(payload) {
    return HostelWarden.create(payload);
  },
  deleteWarden(schoolId, id) {
    return HostelWarden.findOneAndDelete({ _id: id, schoolId });
  },

  /* ------------------------------ allocations ---------------------------- */
  listAllocations(schoolId, filter = {}) {
    return HostelAllocation.find({ schoolId, ...filter })
      .populate('studentId', 'firstName lastName admissionNumber')
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber floorNumber capacity')
      .populate('bedId', 'bedCode bedNumber')
      .populate('academicYearId', 'name code isCurrent')
      .sort({ createdAt: -1 });
  },
  getAllocation(schoolId, id) {
    return HostelAllocation.findOne({ _id: id, schoolId })
      .populate('studentId', 'firstName lastName admissionNumber')
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber floorNumber capacity')
      .populate('bedId', 'bedCode bedNumber')
      .populate('academicYearId', 'name code isCurrent');
  },
  findActiveAllocationForStudent(schoolId, studentId) {
    return HostelAllocation.findOne({ schoolId, studentId, status: 'ACTIVE' })
      .populate('hostelId', 'name')
      .populate('roomId', 'roomNumber')
      .populate('bedId', 'bedCode');
  },
  countActiveAllocations(schoolId, filter = {}) {
    return HostelAllocation.countDocuments({ schoolId, status: 'ACTIVE', ...filter });
  },
  createAllocation(payload) {
    return HostelAllocation.create(payload);
  },

  /* ------------------------------ yearly fee ----------------------------- */
  listAcademicYears(schoolId) {
    return AcademicYear.find({ schoolId }).sort({ startDate: -1 });
  },
  getAcademicYear(schoolId, id) {
    return AcademicYear.findOne({ _id: id, schoolId });
  },
  getCurrentAcademicYear(schoolId) {
    return AcademicYear.findOne({ schoolId, isCurrent: true });
  },
  listFees(schoolId) {
    return HostelFee.find({ schoolId });
  },
  findFee(schoolId, academicYearId) {
    return HostelFee.findOne({ schoolId, academicYearId });
  },
  upsertFee(schoolId, academicYearId, yearlyAmount) {
    return HostelFee.findOneAndUpdate(
      { schoolId, academicYearId },
      { $set: { yearlyAmount } },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
  },
  deleteFee(schoolId, academicYearId) {
    return HostelFee.findOneAndDelete({ schoolId, academicYearId });
  },
};
