import bcrypt from 'bcryptjs';
import { SchoolUser } from '../models/SchoolUser.js';
import { School } from '../models/School.js';
import { signAccessToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { AppError } from '../../../shared/AppError.js';
import { escapeRegex } from '../../../shared/sanitize.js';
import { schoolThemeSnapshot } from '../services/school.service.js';
import { collectSchoolUserUploadFiles } from '../middleware/uploadSchoolUser.js';
import { deleteUploadedFile } from '../utils/upload.utils.js';

// ----------------------------------------------------
// Shared scope helpers (mirror hr / library controllers)
// ----------------------------------------------------
export function accountantSchoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') {
    return req.user?.sub;
  }
  return req.user?.schoolId || req.user?.sub;
}

export function accountantPerformedBy(req) {
  return req.user?.name || req.user?.email || 'Accountant';
}

// ----------------------------------------------------
// Accountant Auth Login
// ----------------------------------------------------
export async function accountantLogin(req, res, next) {
  try {
    const { username, email, password } = req.body || {};
    const identifier = (username || email || '').trim().toLowerCase();
    const rawPassword = (password || '').trim();

    if (!identifier || !rawPassword) {
      throw new AppError('Username/email and password are required', 400);
    }

    const user = await SchoolUser.findOne({
      role: 'ACCOUNTANT',
      status: 'ACTIVE',
      $or: [
        { email: identifier },
        { employeeId: new RegExp(`^${escapeRegex(identifier)}$`, 'i') },
      ],
    }).select('+passwordHash');

    if (!user || !user.passwordHash) {
      throw new AppError('Invalid username or password', 401);
    }

    let passwordValid = false;
    try {
      passwordValid = await bcrypt.compare(rawPassword, user.passwordHash);
    } catch {
      passwordValid = false;
    }

    if (!passwordValid) {
      throw new AppError('Invalid username or password', 401);
    }

    let school = null;
    if (user.schoolId) {
      school = await School.findById(user.schoolId);
    }

    const schoolIdStr = user.schoolId ? user.schoolId.toString() : school ? school._id.toString() : '';

    const token = signAccessToken(
      {
        sub: user._id.toString(),
        userId: user._id.toString(),
        schoolId: schoolIdStr,
        role: 'Accountant',
        name: user.name,
        email: user.email,
        schoolName: school?.name || '',
      },
      { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn || '7d' }
    );

    await SchoolUser.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }).catch(() => {});

    const publicUser = typeof user.toPublicJSON === 'function' ? user.toPublicJSON() : {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.designation || 'Accountant',
    };

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        ...publicUser,
        schoolName: school?.name || '',
        academicSession: school?.academicSession || '',
        ...schoolThemeSnapshot(school),
      },
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Accountant Profile (personal details)
// ----------------------------------------------------
export async function getAccountantProfile(req, res, next) {
  try {
    const role = req.user?.role?.toUpperCase();
    if (role === 'SCHOOLADMIN') {
      const school = await School.findById(accountantSchoolId(req));
      if (!school) throw new AppError('School not found', 404);
      return res.json({
        user: {
          id: school._id.toString(),
          name: school.admin?.name || 'School Admin',
          email: school.admin?.email || '',
          role: 'Accountant',
          schoolName: school.name || '',
          ...schoolThemeSnapshot(school),
        },
      });
    }

    const user = await SchoolUser.findOne({ _id: req.user?.sub, role: 'ACCOUNTANT' });
    if (!user) throw new AppError('Accountant profile not found', 404);
    const profileSchool = user.schoolId ? await School.findById(user.schoolId) : null;
    res.json({ user: { ...user.toPublicJSON(), ...schoolThemeSnapshot(profileSchool) } });
  } catch (error) {
    next(error);
  }
}

export async function updateAccountantProfile(req, res, next) {
  const uploadFiles = collectSchoolUserUploadFiles(req);
  try {
    const role = req.user?.role?.toUpperCase();
    if (role === 'SCHOOLADMIN') {
      throw new AppError('School Admin account details are managed under School Config, not here', 400);
    }

    const user = await SchoolUser.findOne({ _id: req.user?.sub, role: 'ACCOUNTANT' });
    if (!user) throw new AppError('Accountant profile not found', 404);

    const allowed = ['firstName', 'lastName', 'phone'];
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) {
        user[key] = req.body[key];
      }
    }
    if (req.body?.firstName !== undefined || req.body?.lastName !== undefined) {
      user.name = `${user.firstName} ${user.lastName || ''}`.trim();
    }

    if (uploadFiles.photo) {
      if (user.photo) deleteUploadedFile(user.photo);
      user.photo = uploadFiles.photo;
    } else if (req.body?.removePhoto === true || req.body?.removePhoto === 'true') {
      if (user.photo) deleteUploadedFile(user.photo);
      user.photo = '';
    }

    await user.save();
    res.json({ success: true, user: user.toPublicJSON() });
  } catch (error) {
    if (uploadFiles.photo) deleteUploadedFile(uploadFiles.photo);
    next(error);
  }
}

export async function changeAccountantPassword(req, res, next) {
  try {
    const role = req.user?.role?.toUpperCase();
    if (role === 'SCHOOLADMIN') {
      throw new AppError('School Admin password is managed under Settings in the School Admin portal', 400);
    }

    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }
    if (String(newPassword).length < 8) {
      throw new AppError('New password must be at least 8 characters', 400);
    }

    const user = await SchoolUser.findOne({ _id: req.user?.sub, role: 'ACCOUNTANT' }).select('+passwordHash');
    if (!user) throw new AppError('Accountant profile not found', 404);

    const valid = user.passwordHash ? await bcrypt.compare(currentPassword, user.passwordHash) : false;
    if (!valid) throw new AppError('Current password is incorrect', 401);

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    next(error);
  }
}
