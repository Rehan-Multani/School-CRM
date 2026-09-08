/**
 * Compact DTOs for the Transport APK. Mobile-first: only what a screen renders,
 * stable names, ISO dates. Never returns a Mongoose doc.
 */

const idStr = (v) => (v === null || v === undefined ? null : String(v._id || v));

export function staffSelf(user = {}, extra = {}) {
  const u = typeof user.toPublicJSON === 'function' ? user.toPublicJSON() : user;
  return {
    id: String(u.id || u._id),
    name: u.name,
    firstName: u.firstName || '',
    lastName: u.lastName || '',
    employeeId: u.employeeId || '',
    email: u.email || '',
    phone: u.phone || '',
    photo: u.photo || '',
    role: 'TRANSPORT',
    transportRole: u.transportRole || '',
    assignedVehicleId: u.assignedVehicleId || null,
    assignedRouteId: u.assignedRouteId || null,
    emergencyContact: u.emergencyContact || { name: '', phone: '', relationship: '' },
    status: u.status,
    ...extra,
  };
}

export function vehicleLite(v = {}) {
  const x = typeof v.toObject === 'function' ? v.toObject() : v;
  return {
    id: idStr(x.id || x._id),
    vehicleNumber: x.vehicleNumber || '',
    registrationNumber: x.registrationNumber || '',
    vehicleType: x.vehicleType || '',
    model: x.model || '',
    capacity: x.capacity ?? 0,
    fuelType: x.fuelType || '',
    gpsDeviceImei: x.gpsDeviceImei || '',
    status: x.status || '',
  };
}

export function routeLite(r = {}, stops = []) {
  const x = typeof r.toObject === 'function' ? r.toObject() : r;
  return {
    id: idStr(x.id || x._id),
    routeName: x.routeName || '',
    routeCode: x.routeCode || '',
    startPoint: x.startPoint || '',
    endPoint: x.endPoint || '',
    estimatedDistanceKm: x.estimatedDistanceKm ?? 0,
    estimatedDurationMin: x.estimatedDurationMin ?? 0,
    status: x.status || '',
    stops: (stops || []).map(stopLite),
  };
}

export function stopLite(s = {}) {
  const x = typeof s.toObject === 'function' ? s.toObject() : s;
  return {
    id: idStr(x.id || x._id),
    stopName: x.stopName || '',
    sequenceOrder: x.sequenceOrder,
    pickupTime: x.pickupTime || '',
    dropTime: x.dropTime || '',
    landmark: x.landmark || '',
    lat: x.latitude ?? null,
    lng: x.longitude ?? null,
  };
}

export function tripLite(t = {}) {
  const x = typeof t.toPublicJSON === 'function' ? t.toPublicJSON() : t;
  return {
    id: String(x.id || x._id),
    routeId: idStr(x.routeId),
    vehicleId: idStr(x.vehicleId),
    tripType: x.tripType,
    date: x.date,
    status: x.status,
    scheduledStart: x.scheduledStart || null,
    actualStart: x.actualStart || null,
    actualEnd: x.actualEnd || null,
    inspectionPassed: Boolean(x.inspectionPassed),
    counts: x.counts || { studentsExpected: 0, boarded: 0, dropped: 0, absent: 0 },
    currentStopId: idStr(x.currentStopId),
    lastLocationAt: x.lastLocation?.at || null,
  };
}

export function tripStudentLite(ts = {}) {
  const x = typeof ts.toPublicJSON === 'function' ? ts.toPublicJSON() : ts;
  return {
    id: String(x.id || x._id),
    studentId: idStr(x.studentId),
    studentName: x.studentName || '',
    rollNumber: x.rollNumber || '',
    pickupStopId: idStr(x.pickupStopId),
    dropStopId: idStr(x.dropStopId),
    status: x.status,
    boardedAt: x.boardedAt || null,
    droppedAt: x.droppedAt || null,
    absentAt: x.absentAt || null,
    absentReason: x.absentReason || '',
  };
}

export function alertLite(a = {}, isRead = false) {
  const x = typeof a.toPublicJSON === 'function' ? a.toPublicJSON() : a;
  return {
    id: String(x.id || x._id),
    type: x.type,
    severity: x.severity,
    title: x.title,
    body: x.body || '',
    tripId: idStr(x.tripId),
    vehicleId: idStr(x.vehicleId),
    routeId: idStr(x.routeId),
    studentId: idStr(x.studentId),
    status: x.status,
    isRead: Boolean(isRead),
    createdAt: x.createdAt,
  };
}

export function sosLite(s = {}) {
  const x = typeof s.toPublicJSON === 'function' ? s.toPublicJSON() : s;
  return {
    id: String(x.id || x._id),
    tripId: idStr(x.tripId),
    vehicleId: idStr(x.vehicleId),
    status: x.status,
    description: x.description || '',
    location: x.location || null,
    raisedAt: x.raisedAt,
    acknowledgedAt: x.acknowledgedAt || null,
    resolvedAt: x.resolvedAt || null,
  };
}

export function inspectionLite(i = {}) {
  const x = typeof i.toPublicJSON === 'function' ? i.toPublicJSON() : i;
  return {
    id: String(x.id || x._id),
    tripId: idStr(x.tripId),
    inspectedAt: x.inspectedAt,
    overallResult: x.overallResult,
    criticalFailed: Boolean(x.criticalFailed),
    overridden: Boolean(x.overridden),
    items: x.items || [],
  };
}

export function pingLite(p = {}, staleSeconds = null) {
  const x = typeof p.toPublicJSON === 'function' ? p.toPublicJSON() : p;
  return { ...x, staleSeconds };
}
