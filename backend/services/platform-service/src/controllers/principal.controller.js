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
import { subscriptionAccessService } from '../services/subscriptionAccess.service.js';
import { deleteAppAccount } from '../services/appAccount.service.js';
import { checkRoleMismatch } from '../services/roleMismatch.service.js';
import { DeviceToken } from '../models/DeviceToken.js';
import { clearStaffAccountCache } from '../middleware/staffAccount.js';

// The mobile app reads the school's name + theme from a `school` block (same shape as
// the other app roles); the web panel ignores it.
function schoolBlock(school, schoolId) {
  return {
    id: String(schoolId || ''),
    name: school?.name || '',
    academicSession: school?.academic?.session || school?.academicSession || '',
    ...schoolThemeSnapshot(school),
  };
}

// `tv` = SchoolUser.tokenVersion at signing time; staffAccount.js refuses a token whose
// `tv` is older (password change, force logout, account delete).
function signPrincipalToken(user, school, schoolIdStr) {
  return signAccessToken(
    {
      sub: user._id.toString(),
      userId: user._id.toString(),
      schoolId: schoolIdStr,
      role: 'Principal',
      name: user.name,
      email: user.email,
      schoolName: school?.name || '',
      tv: user.tokenVersion || 0,
    },
    { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn || '7d' }
  );
}

// ----------------------------------------------------
// Principal Auth Login
// ----------------------------------------------------
export async function principalLogin(req, res, next) {
  try {
    const { identifier: loginId, username, email, password } = req.body || {};
    // String() first: a JSON body can send an object/array here, and calling
    // .trim() on one throws a TypeError that surfaces as a 500 instead of a
    // clean 400 (and would be an operator-injection vector without coercion).
    const identifier = String(loginId || username || email || '').trim().toLowerCase();
    const rawPassword = String(password || '').trim();

    if (!identifier || !rawPassword) {
      throw new AppError('Username/email and password are required', 400);
    }

    const user = await SchoolUser.findOne({
      role: 'PRINCIPAL',
      status: 'ACTIVE',
      $or: [
        { email: identifier },
        { employeeId: new RegExp(`^${escapeRegex(identifier)}$`, 'i') },
      ],
    }).select('+passwordHash');

    if (!user || !user.passwordHash) {
      // The mobile app has one login screen per role: tell a teacher who picked
      // the Principal tab where to go instead of a bare "invalid".
      await checkRoleMismatch('PRINCIPAL', identifier);
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

    // No plan at the school = nobody but its School Admin signs in.
    await subscriptionAccessService.assertSchoolCanSignIn(schoolIdStr);

    const token = signPrincipalToken(user, school, schoolIdStr);

    await SchoolUser.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } }).catch(() => {});

    const publicUser = typeof user.toPublicJSON === 'function' ? user.toPublicJSON() : {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.designation || 'Principal',
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
      school: schoolBlock(school, schoolIdStr),
    });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Principal Profile (personal details)
// ----------------------------------------------------
function principalSchoolId(req) {
  const role = req.user?.role?.toUpperCase();
  if (role === 'SCHOOLADMIN') {
    return req.user?.sub;
  }
  return req.user?.schoolId || req.user?.sub;
}

export async function getPrincipalProfile(req, res, next) {
  try {
    const role = req.user?.role?.toUpperCase();
    if (role === 'SCHOOLADMIN') {
      const school = await School.findById(principalSchoolId(req));
      if (!school) throw new AppError('School not found', 404);
      return res.json({
        user: {
          id: school._id.toString(),
          name: school.admin?.name || 'School Admin',
          email: school.admin?.email || '',
          role: 'Principal',
          schoolName: school.name || '',
          ...schoolThemeSnapshot(school),
        },
      });
    }

    const user = await SchoolUser.findOne({ _id: req.user?.sub, role: 'PRINCIPAL' });
    if (!user) throw new AppError('Principal profile not found', 404);
    const profileSchool = user.schoolId ? await School.findById(user.schoolId) : null;
    res.json({
      user: { ...user.toPublicJSON(), ...schoolThemeSnapshot(profileSchool) },
      school: schoolBlock(profileSchool, user.schoolId),
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePrincipalProfile(req, res, next) {
  const uploadFiles = collectSchoolUserUploadFiles(req);
  try {
    const role = req.user?.role?.toUpperCase();
    if (role === 'SCHOOLADMIN') {
      throw new AppError('School Admin account details are managed under School Config, not here', 400);
    }

    const user = await SchoolUser.findOne({ _id: req.user?.sub, role: 'PRINCIPAL' });
    if (!user) throw new AppError('Principal profile not found', 404);

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

export async function changePrincipalPassword(req, res, next) {
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

    const user = await SchoolUser.findOne({ _id: req.user?.sub, role: 'PRINCIPAL' }).select('+passwordHash');
    if (!user) throw new AppError('Principal profile not found', 404);

    const valid = user.passwordHash ? await bcrypt.compare(currentPassword, user.passwordHash) : false;
    if (!valid) throw new AppError('Current password is incorrect', 401);

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    clearStaffAccountCache(user._id); // the cached tokenVersion is stale now
    // save() bumped tokenVersion, which ends every other session; this one gets a fresh token.
    const school = user.schoolId ? await School.findById(user.schoolId) : null;
    const token = signPrincipalToken(user, school, String(user.schoolId || ''));
    res.json({ success: true, message: 'Password updated successfully', token });
  } catch (error) {
    next(error);
  }
}

// ----------------------------------------------------
// Mobile app session: logout + delete account
// ----------------------------------------------------
function requireStaffPrincipal(req) {
  if (req.user?.role?.toUpperCase() === 'SCHOOLADMIN') {
    throw new AppError('The School Admin signs in on the web portal', 400);
  }
  return String(req.user?.userId || req.user?.sub || '');
}

/** Stops this phone's pushes. Other sessions (the web panel) stay signed in. */
export async function principalLogout(req, res, next) {
  try {
    const userId = requireStaffPrincipal(req);
    await DeviceToken.deleteMany({ role: 'principal', userId });
    res.json({ success: true, message: 'Logged out' });
  } catch (error) {
    next(error);
  }
}

export async function principalDeleteAccount(req, res, next) {
  try {
    const userId = requireStaffPrincipal(req);
    const data = await deleteAppAccount('PRINCIPAL', req.user.schoolId, userId, req.body || {});
    res.json({ success: true, message: data.message });
  } catch (error) {
    next(error);
  }
}
