import bcrypt from 'bcryptjs';
import { AppError } from '../../../shared/AppError.js';
import { signAccessToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { escapeRegex } from '../../../shared/sanitize.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { School } from '../models/School.js';
import { Vehicle } from '../models/Vehicle.js';
import { TransportRoute } from '../models/TransportRoute.js';
import { RouteStop } from '../models/RouteStop.js';
import { schoolThemeSnapshot } from './school.service.js';
import { staffSelf, vehicleLite, routeLite } from '../serializers/transport.serializers.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LEN = 8;

async function assignedBundle(staff) {
  const [vehicle, route] = await Promise.all([
    staff.assignedVehicleId ? Vehicle.findById(staff.assignedVehicleId).lean() : null,
    staff.assignedRouteId ? TransportRoute.findById(staff.assignedRouteId).lean() : null,
  ]);
  let stops = [];
  if (route) {
    stops = await RouteStop.find({ schoolId: route.schoolId, routeId: route._id }).sort({ sequenceOrder: 1 }).lean();
  }
  return {
    vehicle: vehicle ? vehicleLite(vehicle) : null,
    route: route ? routeLite(route, stops) : null,
  };
}

class TransportAuthService {
  async login(body = {}) {
    const identifier = String(body.identifier || body.username || body.email || body.employeeId || '').trim().toLowerCase();
    const password = String(body.password || '').trim();
    if (!identifier || !password) {
      throw new AppError('Login ID and password are required', 400, TRANSPORT_ERR.VALIDATION_ERROR);
    }
    const invalid = new AppError('Invalid login ID or password', 401, TRANSPORT_ERR.INVALID_CREDENTIALS);
    const idRegex = new RegExp(`^${escapeRegex(identifier)}$`, 'i');

    const candidates = await SchoolUser.find({
      role: 'TRANSPORT',
      $or: [{ email: identifier }, { employeeId: idRegex }],
    })
      .select('+passwordHash')
      .limit(3);
    if (candidates.length > 1) {
      throw new AppError(
        'This login is registered at more than one school. Please contact your school office.',
        409,
        TRANSPORT_ERR.VALIDATION_ERROR
      );
    }
    const staff = candidates[0];
    if (!staff || !staff.passwordHash) throw invalid;

    let ok = false;
    try {
      ok = await bcrypt.compare(password, staff.passwordHash);
    } catch {
      ok = false;
    }
    if (!ok) throw invalid;
    if (staff.status && staff.status !== 'ACTIVE') {
      throw new AppError('This transport account is not active. Contact your school office.', 403, TRANSPORT_ERR.STAFF_INACTIVE);
    }

    const schoolIdStr = staff.schoolId ? staff.schoolId.toString() : '';
    const [school, bundle] = await Promise.all([
      staff.schoolId ? School.findById(staff.schoolId) : null,
      assignedBundle(staff),
    ]);

    const token = signAccessToken(
      {
        sub: staff._id.toString(),
        userId: staff._id.toString(),
        schoolId: schoolIdStr,
        role: 'TRANSPORT',
        transportRole: staff.transportRole || '',
        assignedVehicleId: staff.assignedVehicleId ? staff.assignedVehicleId.toString() : null,
        assignedRouteId: staff.assignedRouteId ? staff.assignedRouteId.toString() : null,
        name: staff.name,
        email: staff.email,
      },
      { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn || '7d' }
    );

    SchoolUser.updateOne({ _id: staff._id }, { $set: { lastLoginAt: new Date() } }).catch(() => {});

    return {
      token,
      staff: staffSelf(staff),
      vehicle: bundle.vehicle,
      route: bundle.route,
      school: {
        id: schoolIdStr,
        name: school?.name || '',
        ...schoolThemeSnapshot(school),
      },
    };
  }

  async me(schoolId, staffId, jwtRole) {
    if (String(jwtRole || '').toUpperCase() === 'SCHOOLADMIN') {
      const school = await School.findById(schoolId);
      return {
        staff: { id: String(schoolId), name: 'School Admin', role: 'SCHOOLADMIN', transportRole: 'TRANSPORT_ADMIN' },
        vehicle: null,
        route: null,
        school: { id: String(schoolId), name: school?.name || '', ...schoolThemeSnapshot(school) },
      };
    }
    const staff = await SchoolUser.findOne({ _id: staffId, schoolId, role: 'TRANSPORT' });
    if (!staff) throw new AppError('Transport staff profile not found', 404, TRANSPORT_ERR.STAFF_NOT_FOUND);
    const [school, bundle] = await Promise.all([School.findById(schoolId), assignedBundle(staff)]);
    return {
      staff: staffSelf(staff),
      vehicle: bundle.vehicle,
      route: bundle.route,
      school: { id: String(schoolId), name: school?.name || '', ...schoolThemeSnapshot(school) },
    };
  }

  async changePassword(schoolId, staffId, { currentPassword, newPassword } = {}) {
    if (!currentPassword || !newPassword) {
      throw new AppError('Current and new password are required', 400, TRANSPORT_ERR.VALIDATION_ERROR);
    }
    if (String(newPassword).length < MIN_PASSWORD_LEN) {
      throw new AppError(`New password must be at least ${MIN_PASSWORD_LEN} characters`, 400, TRANSPORT_ERR.PASSWORD_TOO_SHORT);
    }
    const staff = await SchoolUser.findOne({ _id: staffId, schoolId, role: 'TRANSPORT' }).select('+passwordHash');
    if (!staff) throw new AppError('Transport staff profile not found', 404, TRANSPORT_ERR.STAFF_NOT_FOUND);
    const ok = staff.passwordHash ? await bcrypt.compare(currentPassword, staff.passwordHash) : false;
    if (!ok) throw new AppError('Current password is incorrect', 401, TRANSPORT_ERR.CURRENT_PASSWORD_INVALID);
    staff.passwordHash = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);
    await staff.save();
    return { message: 'Password updated successfully' };
  }
}

export const transportAuthService = new TransportAuthService();
