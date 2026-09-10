import { hostelService } from '../services/hostel.service.js';
import { schoolId } from '../utils/tenant.js';

/**
 * School-admin Hostel controllers. Every handler resolves the tenant from the
 * verified JWT via `schoolId(req)` — never from the body, query or params.
 */

/* ------------------------------ STEP 1 · HOSTELS ------------------------------ */

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
    res.status(201).json({ success: true, message: 'Hostel added', data });
  } catch (error) {
    next(error);
  }
}

export async function updateHostel(req, res, next) {
  try {
    const data = await hostelService.updateHostel(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Hostel updated', data });
  } catch (error) {
    next(error);
  }
}

export async function deleteHostel(req, res, next) {
  try {
    const data = await hostelService.deleteHostel(schoolId(req), req.params.id);
    res.json({ success: true, message: 'Hostel deleted', data });
  } catch (error) {
    next(error);
  }
}

/* -------------------------- STEPS 2 + 3 · ROOMS & BEDS ------------------------ */

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
    res.status(201).json({ success: true, message: 'Room added with its beds', data });
  } catch (error) {
    next(error);
  }
}

export async function updateRoom(req, res, next) {
  try {
    const data = await hostelService.updateRoom(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Room updated', data });
  } catch (error) {
    next(error);
  }
}

export async function deleteRoom(req, res, next) {
  try {
    const data = await hostelService.deleteRoom(schoolId(req), req.params.id);
    res.json({ success: true, message: 'Room deleted', data });
  } catch (error) {
    next(error);
  }
}

export async function listBeds(req, res, next) {
  try {
    const data = await hostelService.listBeds(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/* ------------------------------ STEP 4 · WARDENS ------------------------------ */

export async function listWardens(req, res, next) {
  try {
    const data = await hostelService.listWardens(schoolId(req), req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function getWarden(req, res, next) {
  try {
    const data = await hostelService.getWarden(schoolId(req), req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function createWarden(req, res, next) {
  try {
    const data = await hostelService.createWarden(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Warden added', data });
  } catch (error) {
    next(error);
  }
}

export async function updateWarden(req, res, next) {
  try {
    const data = await hostelService.updateWarden(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Warden updated', data });
  } catch (error) {
    next(error);
  }
}

export async function assignWardenToHostel(req, res, next) {
  try {
    const data = await hostelService.assignWardenToHostel(schoolId(req), req.params.id, req.body?.hostelId);
    res.json({ success: true, message: 'Warden assigned to hostel', data });
  } catch (error) {
    next(error);
  }
}

export async function unassignWardenFromHostel(req, res, next) {
  try {
    const data = await hostelService.unassignWardenFromHostel(schoolId(req), req.params.id);
    res.json({ success: true, message: 'Warden removed from hostel', data });
  } catch (error) {
    next(error);
  }
}

export async function deleteWarden(req, res, next) {
  try {
    const data = await hostelService.deleteWarden(schoolId(req), req.params.id);
    res.json({ success: true, message: 'Warden deleted', data });
  } catch (error) {
    next(error);
  }
}

/* ------------------------ STEP 5 · STUDENT ASSIGNMENTS ------------------------ */

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
    const data = await hostelService.assignStudent(schoolId(req), req.body);
    res.status(201).json({ success: true, message: 'Student assigned to hostel', data });
  } catch (error) {
    next(error);
  }
}

export async function updateAllocation(req, res, next) {
  try {
    const data = await hostelService.updateAllocation(schoolId(req), req.params.id, req.body);
    res.json({ success: true, message: 'Hostel allocation updated', data });
  } catch (error) {
    next(error);
  }
}

export async function vacateAllocation(req, res, next) {
  try {
    const data = await hostelService.vacateAllocation(schoolId(req), req.params.id);
    res.json({ success: true, message: 'Student vacated from hostel', data });
  } catch (error) {
    next(error);
  }
}

/* ------------------------- STEP 6 · YEARLY HOSTEL FEE ------------------------- */

export async function listHostelFees(req, res, next) {
  try {
    const data = await hostelService.listFees(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function setHostelFee(req, res, next) {
  try {
    const data = await hostelService.setFee(schoolId(req), req.params.academicYearId, req.body);
    res.json({ success: true, message: 'Yearly hostel fee saved', data });
  } catch (error) {
    next(error);
  }
}

export async function deleteHostelFee(req, res, next) {
  try {
    const data = await hostelService.deleteFee(schoolId(req), req.params.academicYearId);
    res.json({ success: true, message: 'Yearly hostel fee cleared', data });
  } catch (error) {
    next(error);
  }
}

/* --------------------------------- LOOKUPS ------------------------------------ */

export async function getHostelLookups(req, res, next) {
  try {
    const data = await hostelService.getLookups(schoolId(req));
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
