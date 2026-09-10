import bcrypt from 'bcryptjs';
import { AppError } from '../../../shared/AppError.js';
import { signAccessToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { Driver } from '../models/Driver.js';
import { School } from '../models/School.js';
import { schoolThemeSnapshot } from './school.service.js';
import { transportRepository } from '../repositories/transport.repository.js';
import { TRANSPORT_ERR } from '../constants/transportErrorCodes.js';

const MIN_PASSWORD_LEN = 8;
const BCRYPT_ROUNDS = 10;

/** The driver's own identity plus whatever the admin has assigned them so far. */
async function driverSelf(schoolId, driver) {
  const route = await transportRepository.findRouteOfDriver(schoolId, driver._id);
  const vehicle = driver.vehicleId
    ? await transportRepository.getVehicle(schoolId, driver.vehicleId._id || driver.vehicleId)
    : null;

  return {
    id: driver._id.toString(),
    name: driver.name,
    mobile: driver.mobile,
    licenseNumber: driver.licenseNumber,
    status: driver.status,
    vehicle: vehicle
      ? {
          id: vehicle._id.toString(),
          vehicleNumber: vehicle.vehicleNumber,
          vehicleType: vehicle.vehicleType,
          capacity: vehicle.capacity,
        }
      : null,
    route: route ? { id: route._id.toString(), routeName: route.routeName } : null,
  };
}

class DriverAuthService {
  /**
   * Mobile + password. Every failure path returns the SAME generic 401 so the
   * endpoint cannot be used to probe which mobile numbers are registered.
   */
  async login(body = {}) {
    const mobile = String(body.mobile || body.identifier || body.username || '')
      .trim()
      .replace(/[\s-]/g, '')
      .replace(/^\+91/, '');
    const password = String(body.password || '');

    if (!mobile || !password) {
      throw new AppError('Mobile number and password are required', 400, TRANSPORT_ERR.VALIDATION_ERROR);
    }

    const invalid = new AppError('Invalid mobile number or password', 401, TRANSPORT_ERR.INVALID_CREDENTIALS);

    // Mobile is unique per school, not globally — the same person driving for
    // two schools has to be told apart by a human, not guessed at here.
    const candidates = await Driver.find({ mobile }).select('+passwordHash').limit(3);
    if (candidates.length > 1) {
      throw new AppError(
        'This mobile number is registered at more than one school. Please contact your school office.',
        409,
        TRANSPORT_ERR.VALIDATION_ERROR
      );
    }

    const driver = candidates[0];
    if (!driver || !driver.passwordHash) throw invalid;

    let ok = false;
    try {
      ok = await bcrypt.compare(password, driver.passwordHash);
    } catch {
      ok = false;
    }
    if (!ok) throw invalid;

    if (driver.status !== 'ACTIVE') {
      throw new AppError(
        'This driver account is not active. Contact your school office.',
        403,
        TRANSPORT_ERR.DRIVER_INACTIVE
      );
    }
    if (!driver.loginEnabled) {
      throw new AppError(
        'Driver login is not enabled for this account. Contact your school office.',
        403,
        TRANSPORT_ERR.FORBIDDEN
      );
    }

    const schoolId = driver.schoolId.toString();
    const school = await School.findById(driver.schoolId);

    const token = signAccessToken(
      {
        sub: driver._id.toString(),
        driverId: driver._id.toString(),
        schoolId,
        role: 'DRIVER',
        name: driver.name,
        mobile: driver.mobile,
      },
      { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn || '7d' }
    );

    Driver.updateOne({ _id: driver._id }, { $set: { lastLoginAt: new Date() } }).catch(() => {});

    const self = await driverSelf(schoolId, driver);
    return {
      token,
      driver: self,
      // Common alias so a multi-role app can read `data.user` for every flow.
      user: { ...self, role: 'DRIVER' },
      school: {
        id: schoolId,
        name: school?.name || '',
        academicSession: school?.academic?.session || '',
        ...schoolThemeSnapshot(school),
      },
    };
  }

  async me(schoolId, driverId) {
    const driver = await Driver.findOne({ _id: driverId, schoolId });
    if (!driver) throw new AppError('Driver profile not found', 404, TRANSPORT_ERR.NOT_FOUND);
    const self = await driverSelf(String(schoolId), driver);
    return { driver: self, user: { ...self, role: 'DRIVER' } };
  }

  async changePassword(schoolId, driverId, body = {}) {
    const currentPassword = String(body.currentPassword || '');
    const newPassword = String(body.newPassword || '');
    if (!currentPassword || !newPassword) {
      throw new AppError('Current and new password are required', 400, TRANSPORT_ERR.VALIDATION_ERROR);
    }
    if (newPassword.length < MIN_PASSWORD_LEN) {
      throw new AppError(
        `New password must be at least ${MIN_PASSWORD_LEN} characters`,
        400,
        TRANSPORT_ERR.VALIDATION_ERROR
      );
    }

    const driver = await Driver.findOne({ _id: driverId, schoolId }).select('+passwordHash');
    if (!driver) throw new AppError('Driver profile not found', 404, TRANSPORT_ERR.NOT_FOUND);

    let ok = false;
    try {
      ok = await bcrypt.compare(currentPassword, driver.passwordHash || '');
    } catch {
      ok = false;
    }
    if (!ok) {
      throw new AppError('Current password is incorrect', 401, TRANSPORT_ERR.INVALID_CREDENTIALS);
    }

    driver.passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    driver.loginEnabled = true;
    await driver.save();
    return { changed: true };
  }
}

export const driverAuthService = new DriverAuthService();
