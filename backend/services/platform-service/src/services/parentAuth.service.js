import bcrypt from 'bcryptjs';
import { AppError } from '../../../shared/AppError.js';
import { signAccessToken } from '../../../shared/generateToken.js';
import { env } from '../config/env.js';
import { escapeRegex } from '../../../shared/sanitize.js';
import { Parent } from '../models/Parent.js';
import { School } from '../models/School.js';
import { schoolThemeSnapshot } from './school.service.js';
import { parentAccessService } from './parentAccess.service.js';
import { parentSelf, childCard } from '../serializers/parent.serializers.js';
import { PARENT_ERR } from '../constants/parentErrorCodes.js';

const BCRYPT_ROUNDS = 10;
const MIN_PASSWORD_LEN = 8;

/** `tv` = Parent.tokenVersion at signing time — see requireParent (revocation). */
function signParentToken(parent) {
  const id = parent._id.toString();
  return signAccessToken(
    {
      sub: id,
      userId: id,
      parentId: id,
      schoolId: parent.schoolId ? parent.schoolId.toString() : '',
      role: 'PARENT',
      name: [parent.firstName, parent.lastName].filter(Boolean).join(' ').trim(),
      phone: parent.phone || '',
      tv: parent.tokenVersion || 0,
    },
    { secret: env.jwtSecret, expiresIn: env.jwtExpiresIn || '7d' }
  );
}

class ParentAuthService {
  /**
   * identifier = phone | email | account.loginEmail. All failure paths return
   * the SAME generic 401 so an attacker cannot probe which parents exist.
   */
  async login(body = {}) {
    const identifier = String(body.identifier || body.phone || body.email || body.username || '').trim().toLowerCase();
    const password = String(body.password || '').trim();
    if (!identifier || !password) {
      throw new AppError('Login ID and password are required', 400, PARENT_ERR.VALIDATION_ERROR);
    }

    const idRegex = new RegExp(`^${escapeRegex(identifier)}$`, 'i');
    const invalid = new AppError('Invalid login ID or password', 401, PARENT_ERR.INVALID_CREDENTIALS);

    let candidates = await Parent.find({ $or: [{ 'account.loginEmail': identifier }, { email: identifier }] })
      .select('+passwordHash')
      .limit(3);
    if (!candidates.length) {
      candidates = await Parent.find({ $or: [{ phone: idRegex }, { 'account.username': idRegex }] })
        .select('+passwordHash')
        .limit(3);
    }
    if (candidates.length > 1) {
      throw new AppError(
        'This login is registered at more than one school. Please contact your school office.',
        409,
        PARENT_ERR.VALIDATION_ERROR
      );
    }
    const parent = candidates[0];
    if (!parent || !parent.passwordHash) throw invalid;

    let ok = false;
    try {
      ok = await bcrypt.compare(password, parent.passwordHash);
    } catch {
      ok = false;
    }
    if (!ok) throw invalid;

    if (parent.status && parent.status !== 'ACTIVE') {
      throw new AppError('This parent account is not active. Contact your school office.', 403, PARENT_ERR.PARENT_INACTIVE);
    }
    const acctStatus = parent.account?.accountStatus || '';
    if (acctStatus && acctStatus !== 'ACTIVE') {
      throw new AppError('This parent login has been disabled. Contact your school office.', 403, PARENT_ERR.PARENT_INACTIVE);
    }

    const schoolIdStr = parent.schoolId ? parent.schoolId.toString() : '';
    const [school, ctx] = await Promise.all([
      parent.schoolId ? School.findById(parent.schoolId) : null,
      parentAccessService.buildContext(schoolIdStr, parent._id.toString()),
    ]);

    const token = signParentToken(parent);

    Parent.updateOne({ _id: parent._id }, { $set: { lastLoginAt: new Date() } }).catch(() => {});

    const self = parentSelf(parent, ctx.children.length);
    return {
      token,
      parent: self,
      // Common alias so a multi-role app can read `data.user` for every flow.
      user: { ...self, role: 'PARENT' },
      children: ctx.children.map((c) => childCard(c.student, c.link, c)),
      school: {
        id: schoolIdStr,
        name: school?.name || '',
        academicSession: school?.academic?.session || '',
        ...schoolThemeSnapshot(school),
      },
    };
  }

  async me(schoolId, parentId) {
    const parent = await Parent.findOne({ _id: parentId, schoolId });
    if (!parent) throw new AppError('Parent profile not found', 404, PARENT_ERR.PARENT_NOT_FOUND);
    const [school, ctx] = await Promise.all([
      School.findById(schoolId),
      parentAccessService.buildContext(String(schoolId), String(parentId)),
    ]);
    const self = parentSelf(parent, ctx.children.length);
    return {
      parent: self,
      user: { ...self, role: 'PARENT' },
      children: ctx.children.map((c) => childCard(c.student, c.link, c)),
      school: {
        id: String(schoolId),
        name: school?.name || '',
        academicSession: school?.academic?.session || '',
        ...schoolThemeSnapshot(school),
      },
    };
  }

  async changePassword(schoolId, parentId, { currentPassword, newPassword } = {}) {
    if (!currentPassword || !newPassword) {
      throw new AppError('Current and new password are required', 400, PARENT_ERR.VALIDATION_ERROR);
    }
    if (String(newPassword).length < MIN_PASSWORD_LEN) {
      throw new AppError(`New password must be at least ${MIN_PASSWORD_LEN} characters`, 400, PARENT_ERR.PASSWORD_TOO_SHORT);
    }
    const parent = await Parent.findOne({ _id: parentId, schoolId }).select('+passwordHash');
    if (!parent) throw new AppError('Parent profile not found', 404, PARENT_ERR.PARENT_NOT_FOUND);
    const ok = parent.passwordHash ? await bcrypt.compare(currentPassword, parent.passwordHash) : false;
    if (!ok) throw new AppError('Current password is incorrect', 401, PARENT_ERR.CURRENT_PASSWORD_INVALID);
    parent.passwordHash = await bcrypt.hash(String(newPassword), BCRYPT_ROUNDS);
    parent.mustResetPassword = false;
    await parent.save(); // pre-save bumps tokenVersion → other sessions end
    return { message: 'Password updated successfully', token: signParentToken(parent) };
  }

  /** Logout ends every parent session (all devices). */
  async logout(schoolId, parentId) {
    await Parent.updateOne({ _id: parentId, schoolId }, { $inc: { tokenVersion: 1 } });
  }
}

export const parentAuthService = new ParentAuthService();
export { BCRYPT_ROUNDS as PARENT_BCRYPT_ROUNDS, MIN_PASSWORD_LEN };
