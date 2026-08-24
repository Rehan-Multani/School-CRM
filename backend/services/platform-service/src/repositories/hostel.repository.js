import { Hostel } from '../models/Hostel.js';
import { HostelRoom } from '../models/HostelRoom.js';
import { HostelBed } from '../models/HostelBed.js';
import { HostelAllocation } from '../models/HostelAllocation.js';
import { HostelAttendance } from '../models/HostelAttendance.js';
import { HostelOuting } from '../models/HostelOuting.js';
import { HostelComplaint } from '../models/HostelComplaint.js';

export const hostelRepository = {
  // --- HOSTELS ---
  async listHostels(schoolId, filter = {}) {
    return Hostel.find({ schoolId, ...filter })
      .populate('wardenId', 'fullName email phone designation role')
      .populate('assistantWardenId', 'fullName email phone designation role')
      .sort({ createdAt: -1 })
      .lean();
  },

  async getHostelById(schoolId, id) {
    return Hostel.findOne({ _id: id, schoolId })
      .populate('wardenId', 'fullName email phone designation role')
      .populate('assistantWardenId', 'fullName email phone designation role')
      .lean();
  },

  async createHostel(data) {
    return Hostel.create(data);
  },

  async updateHostel(schoolId, id, updateData) {
    return Hostel.findOneAndUpdate({ _id: id, schoolId }, updateData, { new: true })
      .populate('wardenId', 'fullName email phone designation role')
      .lean();
  },

  async deleteHostel(schoolId, id) {
    return Hostel.findOneAndDelete({ _id: id, schoolId });
  },

  // --- ROOMS ---
  async listRooms(schoolId, filter = {}) {
    return HostelRoom.find({ schoolId, ...filter })
      .populate('hostelId', 'name type')
      .sort({ blockName: 1, floorNumber: 1, roomNumber: 1 })
      .lean();
  },

  async getRoomById(schoolId, id) {
    return HostelRoom.findOne({ _id: id, schoolId })
      .populate('hostelId', 'name type')
      .lean();
  },

  async createRoom(data) {
    return HostelRoom.create(data);
  },

  async updateRoom(schoolId, id, updateData) {
    return HostelRoom.findOneAndUpdate({ _id: id, schoolId }, updateData, { new: true })
      .populate('hostelId', 'name type')
      .lean();
  },

  async deleteRoom(schoolId, id) {
    return HostelRoom.findOneAndDelete({ _id: id, schoolId });
  },

  // --- BEDS ---
  async listBeds(schoolId, filter = {}) {
    return HostelBed.find({ schoolId, ...filter })
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber blockName floorNumber roomType monthlyRent')
      .populate({
        path: 'currentStudentId',
        select: 'firstName lastName rollNumber admissionNumber className sectionName classId sectionId photoUrl phone email',
      })
      .sort({ bedCode: 1 })
      .lean();
  },

  async getBedById(schoolId, id) {
    return HostelBed.findOne({ _id: id, schoolId })
      .populate('hostelId', 'name type')
      .populate('roomId')
      .populate({
        path: 'currentStudentId',
        select: 'firstName lastName rollNumber admissionNumber className sectionName classId sectionId photoUrl phone email',
      })
      .lean();
  },

  async createBed(data) {
    return HostelBed.create(data);
  },

  async createManyBeds(beds) {
    return HostelBed.insertMany(beds);
  },

  async updateBed(schoolId, id, updateData) {
    return HostelBed.findOneAndUpdate({ _id: id, schoolId }, updateData, { new: true }).lean();
  },

  async deleteBedsByRoom(schoolId, roomId) {
    return HostelBed.deleteMany({ schoolId, roomId });
  },

  // --- ALLOCATIONS ---
  async listAllocations(schoolId, filter = {}) {
    return HostelAllocation.find({ schoolId, ...filter })
      .populate({
        path: 'studentId',
        select: 'firstName lastName rollNumber admissionNumber className sectionName classId sectionId photoUrl phone email guardianName guardianPhone',
      })
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber blockName floorNumber roomType monthlyRent')
      .populate('bedId', 'bedCode status')
      .populate('allocatedBy', 'fullName email')
      .sort({ allocationDate: -1, createdAt: -1 })
      .lean();
  },

  async getAllocationById(schoolId, id) {
    return HostelAllocation.findOne({ _id: id, schoolId })
      .populate({
        path: 'studentId',
        select: 'firstName lastName rollNumber admissionNumber className sectionName classId sectionId photoUrl phone email guardianName guardianPhone',
      })
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber blockName floorNumber roomType monthlyRent')
      .populate('bedId', 'bedCode status')
      .populate('allocatedBy', 'fullName email')
      .lean();
  },

  async getActiveAllocationByStudent(schoolId, studentId) {
    return HostelAllocation.findOne({ schoolId, studentId, status: 'ACTIVE' })
      .populate('hostelId', 'name type')
      .populate('roomId', 'roomNumber blockName floorNumber roomType monthlyRent')
      .populate('bedId', 'bedCode status')
      .lean();
  },

  async createAllocation(data) {
    return HostelAllocation.create(data);
  },

  async updateAllocation(schoolId, id, updateData) {
    return HostelAllocation.findOneAndUpdate({ _id: id, schoolId }, updateData, { new: true }).lean();
  },

  // --- ATTENDANCE ---
  async getAttendanceByDate(schoolId, hostelId, dateStr) {
    return HostelAttendance.findOne({ schoolId, hostelId, date: dateStr })
      .populate({
        path: 'records.studentId',
        select: 'firstName lastName rollNumber admissionNumber className sectionName',
      })
      .populate('records.bedId', 'bedCode')
      .populate('recordedBy', 'fullName email')
      .lean();
  },

  async listAttendanceHistory(schoolId, filter = {}) {
    return HostelAttendance.find({ schoolId, ...filter })
      .populate('hostelId', 'name')
      .populate('recordedBy', 'fullName email')
      .sort({ date: -1 })
      .limit(30)
      .lean();
  },

  async saveAttendance(schoolId, hostelId, dateStr, data) {
    return HostelAttendance.findOneAndUpdate(
      { schoolId, hostelId, date: dateStr },
      { ...data, schoolId, hostelId, date: dateStr },
      { upsert: true, new: true }
    ).lean();
  },

  // --- OUTINGS ---
  async listOutings(schoolId, filter = {}) {
    return HostelOuting.find({ schoolId, ...filter })
      .populate({
        path: 'studentId',
        select: 'firstName lastName rollNumber admissionNumber className sectionName phone guardianPhone',
      })
      .populate('hostelId', 'name type')
      .populate('approvedBy', 'fullName email')
      .sort({ outDateTime: -1, createdAt: -1 })
      .lean();
  },

  async getOutingById(schoolId, id) {
    return HostelOuting.findOne({ _id: id, schoolId })
      .populate({
        path: 'studentId',
        select: 'firstName lastName rollNumber admissionNumber className sectionName phone guardianPhone',
      })
      .populate('hostelId', 'name type')
      .populate('approvedBy', 'fullName email')
      .lean();
  },

  async createOuting(data) {
    return HostelOuting.create(data);
  },

  async updateOuting(schoolId, id, updateData) {
    return HostelOuting.findOneAndUpdate({ _id: id, schoolId }, updateData, { new: true })
      .populate({
        path: 'studentId',
        select: 'firstName lastName rollNumber admissionNumber className sectionName phone guardianPhone',
      })
      .populate('hostelId', 'name type')
      .lean();
  },

  // --- COMPLAINTS ---
  async listComplaints(schoolId, filter = {}) {
    return HostelComplaint.find({ schoolId, ...filter })
      .populate('hostelId', 'name')
      .populate('roomId', 'roomNumber blockName floorNumber')
      .populate({
        path: 'studentId',
        select: 'firstName lastName rollNumber admissionNumber className sectionName',
      })
      .populate('assignedStaffId', 'fullName email designation phone')
      .sort({ createdAt: -1 })
      .lean();
  },

  async getComplaintById(schoolId, id) {
    return HostelComplaint.findOne({ _id: id, schoolId })
      .populate('hostelId', 'name')
      .populate('roomId', 'roomNumber blockName floorNumber')
      .populate({
        path: 'studentId',
        select: 'firstName lastName rollNumber admissionNumber className sectionName',
      })
      .populate('assignedStaffId', 'fullName email designation phone')
      .lean();
  },

  async createComplaint(data) {
    return HostelComplaint.create(data);
  },

  async updateComplaint(schoolId, id, updateData) {
    return HostelComplaint.findOneAndUpdate({ _id: id, schoolId }, updateData, { new: true })
      .populate('hostelId', 'name')
      .populate('roomId', 'roomNumber blockName floorNumber')
      .populate({
        path: 'studentId',
        select: 'firstName lastName rollNumber admissionNumber className sectionName',
      })
      .populate('assignedStaffId', 'fullName email designation phone')
      .lean();
  },

  // --- OVERALL METRICS ---
  async getDashboardMetrics(schoolId) {
    const [
      totalHostels,
      totalRooms,
      totalBeds,
      occupiedBeds,
      maintenanceBeds,
      activeAllocations,
      openComplaints,
      activeOutings,
    ] = await Promise.all([
      Hostel.countDocuments({ schoolId, status: 'ACTIVE' }),
      HostelRoom.countDocuments({ schoolId, status: 'ACTIVE' }),
      HostelBed.countDocuments({ schoolId }),
      HostelBed.countDocuments({ schoolId, status: 'OCCUPIED' }),
      HostelBed.countDocuments({ schoolId, status: 'UNDER_MAINTENANCE' }),
      HostelAllocation.countDocuments({ schoolId, status: 'ACTIVE' }),
      HostelComplaint.countDocuments({ schoolId, status: { $in: ['OPEN', 'IN_PROGRESS'] } }),
      HostelOuting.countDocuments({ schoolId, status: { $in: ['REQUESTED', 'APPROVED', 'OUT'] } }),
    ]);

    const availableBeds = Math.max(0, totalBeds - occupiedBeds - maintenanceBeds);
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    return {
      totalHostels,
      totalRooms,
      totalBeds,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      occupancyRate,
      activeAllocations,
      openComplaints,
      activeOutings,
    };
  },
};
