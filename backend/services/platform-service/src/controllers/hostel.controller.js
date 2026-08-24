import { hostelService } from '../services/hostel.service.js';

function schoolId(req) {
  return req.user?.sub || req.schoolAdmin?.schoolId || req.user?.schoolId;
}

function userContext(req) {
  return {
    userId: req.user?.sub || req.schoolAdmin?.schoolAdminId || req.user?.id,
    role: req.user?.role || req.schoolAdmin?.role,
    name: req.user?.name || req.schoolAdmin?.name,
  };
}

// --- DASHBOARD & DEMO SEED ---
export async function getHostelDashboard(req, res, next) {
  try {
    const data = await hostelService.getDashboardStats(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function seedDemoHostelData(req, res, next) {
  try {
    const result = await hostelService.seedDemoData(schoolId(req), userContext(req));
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}

export async function getEligibleHostelEntities(req, res, next) {
  try {
    const data = await hostelService.getEligibleEntities(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// --- HOSTELS CRUD ---
export async function listHostels(req, res, next) {
  try {
    const data = await hostelService.listHostels(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getHostel(req, res, next) {
  try {
    const data = await hostelService.getHostel(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createHostel(req, res, next) {
  try {
    const data = await hostelService.createHostel(schoolId(req), req.body);
    res.status(201).json({
      success: true,
      message: 'Hostel building added successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateHostel(req, res, next) {
  try {
    const data = await hostelService.updateHostel(schoolId(req), req.params.id, req.body);
    res.json({
      success: true,
      message: 'Hostel updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteHostel(req, res, next) {
  try {
    const result = await hostelService.deleteHostel(schoolId(req), req.params.id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}

// --- ROOMS & AUTO-BEDS ---
export async function listRooms(req, res, next) {
  try {
    const data = await hostelService.listRooms(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getRoom(req, res, next) {
  try {
    const data = await hostelService.getRoom(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createRoom(req, res, next) {
  try {
    const data = await hostelService.createRoom(schoolId(req), req.body);
    res.status(201).json({
      success: true,
      message: 'Room and beds created successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateRoom(req, res, next) {
  try {
    const data = await hostelService.updateRoom(schoolId(req), req.params.id, req.body);
    res.json({
      success: true,
      message: 'Room updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteRoom(req, res, next) {
  try {
    const result = await hostelService.deleteRoom(schoolId(req), req.params.id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    next(error);
  }
}

// --- BEDS & VISUALIZER ---
export async function listBeds(req, res, next) {
  try {
    const data = await hostelService.listBeds(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getBedVisualizer(req, res, next) {
  try {
    const data = await hostelService.getBedVisualizer(schoolId(req), req.query.hostelId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// --- ALLOCATIONS & CHECKOUT ---
export async function listAllocations(req, res, next) {
  try {
    const data = await hostelService.listAllocations(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function allocateStudent(req, res, next) {
  try {
    const data = await hostelService.allocateStudent(schoolId(req), req.body, userContext(req));
    res.status(201).json({
      success: true,
      message: 'Student allocated to bed successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function transferStudent(req, res, next) {
  try {
    const data = await hostelService.transferStudent(schoolId(req), req.params.id, req.body, userContext(req));
    res.json({
      success: true,
      message: 'Student bed transferred successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function checkoutStudent(req, res, next) {
  try {
    const data = await hostelService.checkoutStudent(schoolId(req), req.params.id, req.body, userContext(req));
    res.json({
      success: true,
      message: 'Student checkout processed and bed released',
      data,
    });
  } catch (error) {
    next(error);
  }
}

// --- ATTENDANCE ROLL CALL ---
export async function getHostelAttendance(req, res, next) {
  try {
    const data = await hostelService.getDailyAttendance(schoolId(req), req.params.hostelId, req.query.date);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function saveHostelAttendance(req, res, next) {
  try {
    const data = await hostelService.saveDailyAttendance(schoolId(req), req.params.hostelId, req.body, userContext(req));
    res.json({
      success: true,
      message: 'Night attendance recorded successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

// --- OUTINGS & GATE PASSES ---
export async function listOutings(req, res, next) {
  try {
    const data = await hostelService.listOutings(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createOuting(req, res, next) {
  try {
    const data = await hostelService.createOuting(schoolId(req), req.body, userContext(req));
    res.status(201).json({
      success: true,
      message: 'Outing gate pass generated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateOutingStatus(req, res, next) {
  try {
    const data = await hostelService.updateOutingStatus(schoolId(req), req.params.id, req.body, userContext(req));
    res.json({
      success: true,
      message: 'Outing status updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

// --- COMPLAINTS & MAINTENANCE ---
export async function listComplaints(req, res, next) {
  try {
    const data = await hostelService.listComplaints(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createComplaint(req, res, next) {
  try {
    const data = await hostelService.createComplaint(schoolId(req), req.body);
    res.status(201).json({
      success: true,
      message: 'Hostel complaint registered successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateComplaint(req, res, next) {
  try {
    const data = await hostelService.updateComplaint(schoolId(req), req.params.id, req.body, userContext(req));
    res.json({
      success: true,
      message: 'Hostel complaint updated successfully',
      data,
    });
  } catch (error) {
    next(error);
  }
}
