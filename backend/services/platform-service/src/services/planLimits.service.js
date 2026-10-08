import mongoose from 'mongoose';
import { AppError } from '../../../shared/AppError.js';
import { School } from '../models/School.js';
import { SubscriptionPlan } from '../models/SubscriptionPlan.js';
import { Student } from '../models/Student.js';
import { Teacher } from '../models/Teacher.js';
import { SchoolUser } from '../models/SchoolUser.js';
import { schoolSubscriptionRepository } from '../repositories/schoolSubscription.repository.js';
import { ACTIVE_LIKE_STATUSES } from '../models/SchoolSubscription.js';

export const PLAN_LIMIT_REACHED = 'PLAN_LIMIT_REACHED';
const KINDS = ['students', 'teachers', 'staff'];

// A missing / null / 0 limit means "unlimited".
function toLimit(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

async function resolveSchool(schoolId) {
  if (!schoolId) return null;
  const query = mongoose.isValidObjectId(schoolId)
    ? School.findById(schoolId)
    : School.findOne({ schoolId: String(schoolId) });
  return query.select('subscriptionPlan stats.maxStudents').lean();
}

/**
 * Effective limits for a school:
 *   1. a live SchoolSubscription (Razorpay) -> its plan.limits
 *   2. else School.subscriptionPlan (name) -> SubscriptionPlan by name
 *   3. else School.stats.maxStudents for students only
 */
export async function resolvePlanLimits(schoolId) {
  const school = await resolveSchool(schoolId);
  const resolvedId = school?._id || schoolId;
  const sub = resolvedId ? await schoolSubscriptionRepository.findForAccess(resolvedId).lean() : null;
  let plan = sub && ACTIVE_LIKE_STATUSES.includes(sub.status) ? sub.planId : null;
  if (!plan && school?.subscriptionPlan) {
    plan = await SubscriptionPlan.findOne({ name: school.subscriptionPlan }).lean();
  }
  if (plan) {
    return {
      students: toLimit(plan.limits?.students),
      teachers: toLimit(plan.limits?.teachers),
      staff: toLimit(plan.limits?.staff),
      planName: plan.name || '',
    };
  }
  return { students: toLimit(school?.stats?.maxStudents), teachers: null, staff: null, planName: '' };
}

function countActive(schoolId, kind) {
  const filter = { schoolId, status: 'ACTIVE' };
  if (kind === 'students') return Student.countDocuments(filter);
  if (kind === 'teachers') return Teacher.countDocuments(filter);
  return SchoolUser.countDocuments(filter);
}

/** { students:{used,limit}, teachers:{used,limit}, staff:{used,limit} } */
export async function getPlanUsage(schoolId) {
  const school = await resolveSchool(schoolId);
  const id = school?._id || schoolId;
  const [limits, ...used] = await Promise.all([resolvePlanLimits(id), ...KINDS.map((k) => countActive(id, k))]);
  const usage = {};
  KINDS.forEach((k, i) => {
    usage[k] = { used: used[i], limit: limits[k] };
  });
  usage.planName = limits.planName;
  return usage;
}

/** Throws 403 PLAN_LIMIT_REACHED when adding `count` more of `kind` would exceed the plan. */
export async function assertCanAdd(schoolId, kind, count = 1) {
  if (!KINDS.includes(kind)) throw new AppError(`Unknown plan limit kind: ${kind}`, 500);
  const limits = await resolvePlanLimits(schoolId);
  const limit = limits[kind];
  if (!limit) return;
  const school = await resolveSchool(schoolId);
  const used = await countActive(school?._id || schoolId, kind);
  if (used + count > limit) {
    throw new AppError(`Your plan allows up to ${limit} ${kind}. Upgrade the plan to add more.`, 403, PLAN_LIMIT_REACHED);
  }
}

export const planLimitsService = { assertCanAdd, getPlanUsage, resolvePlanLimits };
