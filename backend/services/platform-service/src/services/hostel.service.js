import { AppError } from '../../../shared/AppError.js';
import { hostelRepository } from '../repositories/hostel.repository.js';
import { Student } from '../models/Student.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { HostelBed } from '../models/HostelBed.js';

function requireText(value, label) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text) throw new AppError(`${label} is required`, 400);
  return text;
}

function getBedLetters(capacity) {
  const letters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  return letters.slice(0, capacity);
}

export const hostelService = {
  // --- DASHBOARD & METRICS ---
  async getDashboardStats(schoolId) {
    if (!schoolId) throw new AppError('School ID is required', 400);

    const metrics = await hostelRepository.getDashboardMetrics(schoolId);
    const hostels = await hostelRepository.listHostels(schoolId);

    // Calculate hostel-wise summary
    const hostelBreakdown = await Promise.all(
      hostels.map(async (hostel) => {
        const rooms = await hostelRepository.listRooms(schoolId, { hostelId: hostel._id });
        const beds = await hostelRepository.listBeds(schoolId, { hostelId: hostel._id });
        const occupied = beds.filter((b) => b.status === 'OCCUPIED').length;
        const available = beds.filter((b) => b.status === 'AVAILABLE').length;

        return {
          id: hostel._id.toString(),
          name: hostel.name,
          type: hostel.type,
          warden: hostel.wardenId?.fullName || 'Not Assigned',
          totalRooms: rooms.length,
          totalBeds: beds.length,
          occupiedBeds: occupied,
          availableBeds: available,
          occupancyRate: beds.length > 0 ? Math.round((occupied / beds.length) * 100) : 0,
        };
      })
    );

    const recentAllocations = await hostelRepository.listAllocations(schoolId, {});
    const recentOutings = await hostelRepository.listOutings(schoolId, {});
    const recentComplaints = await hostelRepository.listComplaints(schoolId, {});

    return {
      metrics,
      hostelBreakdown,
      recentAllocations: recentAllocations.slice(0, 5),
      recentOutings: recentOutings.slice(0, 5),
      recentComplaints: recentComplaints.slice(0, 5),
    };
  },

  // --- SEED STARTER DEMO HOSTELS ---
  async seedDemoData(schoolId, user) {
    if (!schoolId) throw new AppError('School ID is required', 400);

    const existing = await hostelRepository.listHostels(schoolId);
    if (existing && existing.length > 0) {
      return { message: 'Hostel data already exists for this school' };
    }

    // Find a staff user if available for warden
    const staff = await SchoolUser.findOne({ schoolId, status: 'ACTIVE' }).lean();
    const wardenId = staff?._id || null;

    // 1. Create Boys Hostel
    const boysHostel = await hostelRepository.createHostel({
      schoolId,
      name: "Rabindranath Tagore Boy's Hostel",
      type: 'BOYS',
      wardenId,
      contactNumber: '+91 9876543210',
      address: {
        addressLine: 'Campus Block B, East Wing',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
      },
      totalBlocks: 2,
      totalFloors: 3,
      capacity: 120,
      description: 'Air-cooled residential block with reading hall, Wi-Fi and indoor sports room.',
      status: 'ACTIVE',
    });

    // 2. Create Girls Hostel
    const girlsHostel = await hostelRepository.createHostel({
      schoolId,
      name: "Sarojini Naidu Girl's Hostel",
      type: 'GIRLS',
      wardenId,
      contactNumber: '+91 9876543211',
      address: {
        addressLine: 'Campus Block D, West Wing',
        city: 'Jaipur',
        state: 'Rajasthan',
        pincode: '302001',
      },
      totalBlocks: 2,
      totalFloors: 3,
      capacity: 120,
      description: 'Secure 24x7 guarded residential block with recreation room and solar water heating.',
      status: 'ACTIVE',
    });

    // 3. Create Sample Rooms with auto-beds for Boys Hostel
    const sampleRoomsBoys = [
      { roomNumber: '101', floorNumber: 'Ground Floor', blockName: 'Block A', roomType: 'DOUBLE', capacity: 2, monthlyRent: 5000, amenities: ['Attached Washroom', 'Study Table', 'Balcony'] },
      { roomNumber: '102', floorNumber: 'Ground Floor', blockName: 'Block A', roomType: 'TRIPLE', capacity: 3, monthlyRent: 4200, amenities: ['Study Table', 'Cupboard'] },
      { roomNumber: '103', floorNumber: 'Ground Floor', blockName: 'Block A', roomType: 'SINGLE', capacity: 1, monthlyRent: 8000, amenities: ['AC', 'Attached Washroom', 'High-Speed Wi-Fi'] },
      { roomNumber: '201', floorNumber: '1st Floor', blockName: 'Block A', roomType: 'DOUBLE', capacity: 2, monthlyRent: 5000, amenities: ['Attached Washroom', 'Balcony'] },
      { roomNumber: '202', floorNumber: '1st Floor', blockName: 'Block A', roomType: 'DOUBLE', capacity: 2, monthlyRent: 5000, amenities: ['Attached Washroom'] },
    ];

    for (const r of sampleRoomsBoys) {
      await this.createRoom(schoolId, { ...r, hostelId: boysHostel._id.toString() });
    }

    // 4. Create Sample Rooms with auto-beds for Girls Hostel
    const sampleRoomsGirls = [
      { roomNumber: 'G-101', floorNumber: 'Ground Floor', blockName: 'Main Block', roomType: 'DOUBLE', capacity: 2, monthlyRent: 5000, amenities: ['Attached Washroom', 'Study Table'] },
      { roomNumber: 'G-102', floorNumber: 'Ground Floor', blockName: 'Main Block', roomType: 'TRIPLE', capacity: 3, monthlyRent: 4200, amenities: ['Study Table', 'Balcony'] },
      { roomNumber: 'G-201', floorNumber: '1st Floor', blockName: 'Main Block', roomType: 'SINGLE', capacity: 1, monthlyRent: 8000, amenities: ['AC', 'Attached Washroom', 'Wi-Fi'] },
    ];

    for (const r of sampleRoomsGirls) {
      await this.createRoom(schoolId, { ...r, hostelId: girlsHostel._id.toString() });
    }

    // 5. Try to allocate 1-2 students if students exist
    const students = await Student.find({ schoolId, status: 'ACTIVE' }).limit(3).lean();
    if (students && students.length > 0) {
      const allBeds = await hostelRepository.listBeds(schoolId, { status: 'AVAILABLE' });
      if (allBeds.length >= students.length) {
        for (let i = 0; i < students.length; i++) {
          const student = students[i];
          const bed = allBeds[i];
          await this.allocateStudent(
            schoolId,
            {
              studentId: student._id.toString(),
              hostelId: bed.hostelId?._id?.toString() || bed.hostelId.toString(),
              roomId: bed.roomId?._id?.toString() || bed.roomId.toString(),
              bedId: bed._id.toString(),
              monthlyFee: bed.roomId?.monthlyRent || 5000,
              securityDeposit: 2000,
              remarks: 'Default admission allocation',
            },
            user
          );
        }
      }
    }

    return { message: 'Demo hostel infrastructure created successfully' };
  },

  // --- HOSTELS CRUD ---
  async listHostels(schoolId, query = {}) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const filter = {};
    if (query.type) filter.type = query.type;
    if (query.status) filter.status = query.status;
    return hostelRepository.listHostels(schoolId, filter);
  },

  async getHostel(schoolId, id) {
    const hostel = await hostelRepository.getHostelById(schoolId, id);
    if (!hostel) throw new AppError('Hostel not found', 404);
    return hostel;
  },

  async createHostel(schoolId, data) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const name = requireText(data.name, 'Hostel Name');
    const type = data.type || 'BOYS';

    const hostel = await hostelRepository.createHostel({
      schoolId,
      name,
      type,
      wardenId: data.wardenId || null,
      assistantWardenId: data.assistantWardenId || null,
      contactNumber: data.contactNumber || '',
      address: data.address || {},
      totalBlocks: Number(data.totalBlocks) || 1,
      totalFloors: Number(data.totalFloors) || 1,
      capacity: Number(data.capacity) || 0,
      description: data.description || '',
      status: data.status || 'ACTIVE',
    });

    return hostelRepository.getHostelById(schoolId, hostel._id);
  },

  async updateHostel(schoolId, id, data) {
    const hostel = await hostelRepository.updateHostel(schoolId, id, data);
    if (!hostel) throw new AppError('Hostel not found', 404);
    return hostel;
  },

  async deleteHostel(schoolId, id) {
    const roomsCount = await HostelRoom.countDocuments({ schoolId, hostelId: id });
    if (roomsCount > 0) {
      throw new AppError(`Cannot delete hostel. It contains ${roomsCount} registered rooms. Please remove or reassign them first.`, 400);
    }
    const result = await hostelRepository.deleteHostel(schoolId, id);
    if (!result) throw new AppError('Hostel not found', 404);
    return { message: 'Hostel deleted successfully' };
  },

  // --- ROOMS & AUTO-BED GENERATION ---
  async listRooms(schoolId, query = {}) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const filter = {};
    if (query.hostelId) filter.hostelId = query.hostelId;
    if (query.floorNumber) filter.floorNumber = query.floorNumber;
    if (query.roomType) filter.roomType = query.roomType;
    if (query.status) filter.status = query.status;
    return hostelRepository.listRooms(schoolId, filter);
  },

  async getRoom(schoolId, id) {
    const room = await hostelRepository.getRoomById(schoolId, id);
    if (!room) throw new AppError('Room not found', 404);
    const beds = await hostelRepository.listBeds(schoolId, { roomId: id });
    return { ...room, beds };
  },

  async createRoom(schoolId, data) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const hostelId = requireText(data.hostelId, 'Hostel ID');
    const roomNumber = requireText(data.roomNumber, 'Room Number');
    const capacity = Math.max(1, Number(data.capacity) || 2);
    const floorNumber = data.floorNumber || 'Ground Floor';
    const blockName = data.blockName || 'Main Block';

    // Verify unique room within this hostel
    const existing = await HostelRoom.findOne({ schoolId, hostelId, roomNumber });
    if (existing) {
      throw new AppError(`Room Number ${roomNumber} already exists in this hostel`, 400);
    }

    const room = await hostelRepository.createRoom({
      schoolId,
      hostelId,
      blockName,
      floorNumber,
      roomNumber,
      roomType: data.roomType || (capacity === 1 ? 'SINGLE' : capacity === 2 ? 'DOUBLE' : capacity === 3 ? 'TRIPLE' : 'DORMITORY'),
      capacity,
      monthlyRent: Number(data.monthlyRent) || 0,
      amenities: Array.isArray(data.amenities) ? data.amenities : [],
      description: data.description || '',
      status: data.status || 'ACTIVE',
    });

    // Auto-generate Beds e.g. "101-A", "101-B", "101-C"
    const letters = getBedLetters(capacity);
    const bedsToCreate = letters.map((letter) => ({
      schoolId,
      hostelId,
      roomId: room._id,
      bedCode: `${roomNumber}-${letter}`,
      status: 'AVAILABLE',
      currentAllocationId: null,
      currentStudentId: null,
    }));

    await hostelRepository.createManyBeds(bedsToCreate);

    // Update hostel total capacity
    const allRooms = await hostelRepository.listRooms(schoolId, { hostelId });
    const totalCapacity = allRooms.reduce((sum, r) => sum + (r.capacity || 0), 0);
    await hostelRepository.updateHostel(schoolId, hostelId, { capacity: totalCapacity });

    return this.getRoom(schoolId, room._id);
  },

  async updateRoom(schoolId, id, data) {
    const existing = await hostelRepository.getRoomById(schoolId, id);
    if (!existing) throw new AppError('Room not found', 404);

    const room = await hostelRepository.updateRoom(schoolId, id, data);
    return this.getRoom(schoolId, room._id);
  },

  async deleteRoom(schoolId, id) {
    const activeAllocations = await HostelAllocation.countDocuments({ schoolId, roomId: id, status: 'ACTIVE' });
    if (activeAllocations > 0) {
      throw new AppError(`Cannot delete room. There are ${activeAllocations} active students currently staying in this room. Please vacate them first.`, 400);
    }

    await hostelRepository.deleteBedsByRoom(schoolId, id);
    const result = await hostelRepository.deleteRoom(schoolId, id);
    if (!result) throw new AppError('Room not found', 404);

    return { message: 'Room and its associated beds deleted successfully' };
  },

  // --- BEDS & VISUALIZER ---
  async listBeds(schoolId, query = {}) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const filter = {};
    if (query.hostelId) filter.hostelId = query.hostelId;
    if (query.roomId) filter.roomId = query.roomId;
    if (query.status) filter.status = query.status;
    return hostelRepository.listBeds(schoolId, filter);
  },

  async getBedVisualizer(schoolId, hostelId) {
    if (!schoolId) throw new AppError('School ID is required', 400);

    const filter = {};
    if (hostelId) filter._id = hostelId;
    const hostels = await hostelRepository.listHostels(schoolId, filter);

    const visualData = await Promise.all(
      hostels.map(async (hostel) => {
        const rooms = await hostelRepository.listRooms(schoolId, { hostelId: hostel._id });
        const beds = await hostelRepository.listBeds(schoolId, { hostelId: hostel._id });

        // Group rooms by floor
        const floorsMap = {};
        rooms.forEach((room) => {
          const floor = room.floorNumber || 'Ground Floor';
          if (!floorsMap[floor]) floorsMap[floor] = [];
          const roomBeds = beds.filter((b) => b.roomId?._id?.toString() === room._id.toString() || b.roomId?.toString() === room._id.toString());
          floorsMap[floor].push({
            ...room,
            beds: roomBeds,
          });
        });

        return {
          hostelId: hostel._id.toString(),
          hostelName: hostel.name,
          hostelType: hostel.type,
          warden: hostel.wardenId?.fullName || 'Not Assigned',
          floors: Object.entries(floorsMap).map(([floorName, floorRooms]) => ({
            floorName,
            rooms: floorRooms,
          })),
        };
      })
    );

    return visualData;
  },

  // --- STUDENT ALLOCATION & TRANSFERS ---
  async listAllocations(schoolId, query = {}) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const filter = {};
    if (query.hostelId) filter.hostelId = query.hostelId;
    if (query.roomId) filter.roomId = query.roomId;
    if (query.status) filter.status = query.status;
    if (query.studentId) filter.studentId = query.studentId;
    return hostelRepository.listAllocations(schoolId, filter);
  },

  async allocateStudent(schoolId, data, user) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const studentId = requireText(data.studentId, 'Student');
    const bedId = requireText(data.bedId, 'Bed');
    const hostelId = requireText(data.hostelId, 'Hostel');
    const roomId = requireText(data.roomId, 'Room');

    // 1. Check if student already has an active allocation
    const existingAlloc = await hostelRepository.getActiveAllocationByStudent(schoolId, studentId);
    if (existingAlloc) {
      throw new AppError(
        `Student is already allocated to ${existingAlloc.hostelId?.name || 'a hostel'} (Room: ${existingAlloc.roomId?.roomNumber}, Bed: ${existingAlloc.bedId?.bedCode}). Please vacate or transfer first.`,
        400
      );
    }

    // 2. Check if bed is available
    const bed = await HostelBed.findOne({ _id: bedId, schoolId });
    if (!bed) throw new AppError('Bed not found', 404);
    if (bed.status !== 'AVAILABLE') {
      throw new AppError(`Selected bed (${bed.bedCode}) is currently ${bed.status}. Please choose an available bed.`, 400);
    }

    // 3. Create Allocation
    const allocation = await hostelRepository.createAllocation({
      schoolId,
      studentId,
      hostelId,
      roomId,
      bedId,
      academicYearId: data.academicYearId || null,
      allocationDate: data.allocationDate ? new Date(data.allocationDate) : new Date(),
      expectedCheckoutDate: data.expectedCheckoutDate ? new Date(data.expectedCheckoutDate) : null,
      monthlyFee: Number(data.monthlyFee) || 0,
      securityDeposit: Number(data.securityDeposit) || 0,
      status: 'ACTIVE',
      remarks: data.remarks || '',
      allocatedBy: user?.userId || null,
    });

    // 4. Mark Bed as OCCUPIED
    await HostelBed.findOneAndUpdate(
      { _id: bedId, schoolId },
      {
        status: 'OCCUPIED',
        currentAllocationId: allocation._id,
        currentStudentId: studentId,
      }
    );

    return hostelRepository.getAllocationById(schoolId, allocation._id);
  },

  async transferStudent(schoolId, allocationId, data, user) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const newBedId = requireText(data.newBedId, 'New Bed');

    const allocation = await hostelRepository.getAllocationById(schoolId, allocationId);
    if (!allocation || allocation.status !== 'ACTIVE') {
      throw new AppError('Active allocation not found', 404);
    }

    const newBed = await HostelBed.findOne({ _id: newBedId, schoolId }).populate('roomId');
    if (!newBed) throw new AppError('New bed not found', 404);
    if (newBed.status !== 'AVAILABLE') {
      throw new AppError(`Target bed (${newBed.bedCode}) is not available`, 400);
    }

    // Release old bed
    await HostelBed.findOneAndUpdate(
      { _id: allocation.bedId?._id || allocation.bedId, schoolId },
      { status: 'AVAILABLE', currentAllocationId: null, currentStudentId: null }
    );

    // Update old allocation as TRANSFERRED
    await hostelRepository.updateAllocation(schoolId, allocationId, {
      status: 'TRANSFERRED',
      actualCheckoutDate: new Date(),
      checkoutRemarks: `Transferred to Bed ${newBed.bedCode}`,
    });

    // Create new allocation
    const newAllocation = await hostelRepository.createAllocation({
      schoolId,
      studentId: allocation.studentId?._id || allocation.studentId,
      hostelId: newBed.hostelId,
      roomId: newBed.roomId?._id || newBed.roomId,
      bedId: newBed._id,
      academicYearId: allocation.academicYearId,
      allocationDate: new Date(),
      monthlyFee: newBed.roomId?.monthlyRent || allocation.monthlyFee,
      securityDeposit: allocation.securityDeposit,
      status: 'ACTIVE',
      remarks: `Transferred from Bed ${allocation.bedId?.bedCode || ''}`,
      allocatedBy: user?.userId || null,
    });

    // Occupy new bed
    await HostelBed.findOneAndUpdate(
      { _id: newBedId, schoolId },
      {
        status: 'OCCUPIED',
        currentAllocationId: newAllocation._id,
        currentStudentId: allocation.studentId?._id || allocation.studentId,
      }
    );

    return hostelRepository.getAllocationById(schoolId, newAllocation._id);
  },

  async checkoutStudent(schoolId, allocationId, data, user) {
    if (!schoolId) throw new AppError('School ID is required', 400);

    const allocation = await hostelRepository.getAllocationById(schoolId, allocationId);
    if (!allocation || allocation.status !== 'ACTIVE') {
      throw new AppError('Active allocation not found', 404);
    }

    const bedId = allocation.bedId?._id || allocation.bedId;

    // 1. Release Bed back to AVAILABLE
    await HostelBed.findOneAndUpdate(
      { _id: bedId, schoolId },
      {
        status: 'AVAILABLE',
        currentAllocationId: null,
        currentStudentId: null,
      }
    );

    // 2. Mark Allocation as VACATED
    const updated = await hostelRepository.updateAllocation(schoolId, allocationId, {
      status: 'VACATED',
      actualCheckoutDate: data.checkoutDate ? new Date(data.checkoutDate) : new Date(),
      checkoutReason: data.checkoutReason || 'Graduation / Left Hostel',
      checkoutRemarks: data.checkoutRemarks || '',
      depositRefunded: Number(data.depositRefunded) || Number(allocation.securityDeposit) || 0,
    });

    return hostelRepository.getAllocationById(schoolId, updated._id);
  },

  // --- ATTENDANCE ROLL CALL ---
  async getDailyAttendance(schoolId, hostelId, dateStr) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const targetDate = dateStr || new Date().toISOString().split('T')[0];

    // Find if already recorded
    let attendance = await hostelRepository.getAttendanceByDate(schoolId, hostelId, targetDate);

    // If not yet recorded, prepare live list of active students in this hostel
    if (!attendance) {
      const activeAllocations = await hostelRepository.listAllocations(schoolId, {
        hostelId,
        status: 'ACTIVE',
      });

      // Also check active outings for today to auto-flag
      const activeOutings = await hostelRepository.listOutings(schoolId, {
        hostelId,
        status: { $in: ['OUT', 'APPROVED'] },
      });
      const outingStudentIds = new Set(activeOutings.map((o) => (o.studentId?._id || o.studentId).toString()));

      const records = activeAllocations.map((alloc) => {
        const sId = (alloc.studentId?._id || alloc.studentId).toString();
        const isOuting = outingStudentIds.has(sId);
        return {
          studentId: alloc.studentId,
          bedId: alloc.bedId,
          roomId: alloc.roomId,
          status: isOuting ? 'OUTING' : 'PRESENT',
          remarks: isOuting ? 'Auto-detected active outing pass' : '',
        };
      });

      return {
        hostelId,
        date: targetDate,
        isRecorded: false,
        totalStudents: records.length,
        presentCount: records.filter((r) => r.status === 'PRESENT').length,
        absentCount: 0,
        outingCount: records.filter((r) => r.status === 'OUTING').length,
        leaveCount: 0,
        medicalCount: 0,
        records,
      };
    }

    return { ...attendance, isRecorded: true };
  },

  async saveDailyAttendance(schoolId, hostelId, data, user) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const dateStr = data.date || new Date().toISOString().split('T')[0];
    const records = Array.isArray(data.records) ? data.records : [];

    const presentCount = records.filter((r) => r.status === 'PRESENT').length;
    const absentCount = records.filter((r) => r.status === 'ABSENT').length;
    const outingCount = records.filter((r) => r.status === 'OUTING').length;
    const leaveCount = records.filter((r) => r.status === 'LEAVE').length;
    const medicalCount = records.filter((r) => r.status === 'MEDICAL').length;

    const saved = await hostelRepository.saveAttendance(schoolId, hostelId, dateStr, {
      totalStudents: records.length,
      presentCount,
      absentCount,
      outingCount,
      leaveCount,
      medicalCount,
      recordedBy: user?.userId || null,
      records,
    });

    return saved;
  },

  // --- OUTINGS & GATE PASSES ---
  async listOutings(schoolId, query = {}) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const filter = {};
    if (query.hostelId) filter.hostelId = query.hostelId;
    if (query.status) filter.status = query.status;
    if (query.studentId) filter.studentId = query.studentId;
    return hostelRepository.listOutings(schoolId, filter);
  },

  async createOuting(schoolId, data, user) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const studentId = requireText(data.studentId, 'Student');
    const hostelId = requireText(data.hostelId, 'Hostel');
    const reason = requireText(data.reason, 'Outing Reason');
    const outDateTime = new Date(data.outDateTime || Date.now());
    const expectedReturnDateTime = new Date(data.expectedReturnDateTime || Date.now() + 4 * 3600 * 1000);

    const gatePassCode = `GP-${Math.floor(1000 + Math.random() * 9000)}`;

    const outing = await hostelRepository.createOuting({
      schoolId,
      hostelId,
      studentId,
      outingType: data.outingType || 'DAY_OUTING',
      outDateTime,
      expectedReturnDateTime,
      reason,
      destination: data.destination || '',
      parentPermissionStatus: data.parentPermissionStatus || 'APPROVED',
      wardenApprovalStatus: data.wardenApprovalStatus || 'APPROVED',
      gatePassCode,
      status: 'APPROVED',
      approvedBy: user?.userId || null,
      remarks: data.remarks || '',
    });

    return hostelRepository.getOutingById(schoolId, outing._id);
  },

  async updateOutingStatus(schoolId, id, data, user) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const { status, actualReturnDateTime, remarks } = data;

    const updateData = {};
    if (status) updateData.status = status;
    if (status === 'RETURNED') {
      updateData.actualReturnDateTime = actualReturnDateTime ? new Date(actualReturnDateTime) : new Date();
    }
    if (remarks) updateData.remarks = remarks;

    const updated = await hostelRepository.updateOuting(schoolId, id, updateData);
    if (!updated) throw new AppError('Outing record not found', 404);
    return updated;
  },

  // --- COMPLAINTS & MAINTENANCE ---
  async listComplaints(schoolId, query = {}) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const filter = {};
    if (query.hostelId) filter.hostelId = query.hostelId;
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.category) filter.category = query.category;
    return hostelRepository.listComplaints(schoolId, filter);
  },

  async createComplaint(schoolId, data) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const hostelId = requireText(data.hostelId, 'Hostel');
    const title = requireText(data.title, 'Issue Title');
    const description = requireText(data.description, 'Description');

    const complaint = await hostelRepository.createComplaint({
      schoolId,
      hostelId,
      roomId: data.roomId || null,
      studentId: data.studentId || null,
      category: data.category || 'OTHER',
      title,
      description,
      priority: data.priority || 'MEDIUM',
      status: 'OPEN',
      assignedStaffId: data.assignedStaffId || null,
    });

    return hostelRepository.getComplaintById(schoolId, complaint._id);
  },

  async updateComplaint(schoolId, id, data) {
    if (!schoolId) throw new AppError('School ID is required', 400);
    const updateData = { ...data };
    if (data.status === 'RESOLVED') {
      updateData.resolvedAt = new Date();
    }

    const updated = await hostelRepository.updateComplaint(schoolId, id, updateData);
    if (!updated) throw new AppError('Complaint record not found', 404);
    return updated;
  },

  // --- ELIGIBLE PICKS (STUDENTS & STAFF) ---
  async getEligibleEntities(schoolId) {
    if (!schoolId) throw new AppError('School ID is required', 400);

    const [students, staff] = await Promise.all([
      Student.find({ schoolId, status: 'ACTIVE' })
        .select('firstName lastName rollNumber admissionNumber className sectionName classId sectionId photoUrl phone email')
        .sort({ firstName: 1 })
        .lean(),
      SchoolUser.find({ schoolId, status: 'ACTIVE' })
        .select('fullName email phone designation role')
        .sort({ fullName: 1 })
        .lean(),
    ]);

    return { students, staff };
  },
};
