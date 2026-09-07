import { AppError } from '../../../shared/AppError.js';
import { childCard, childProfile } from '../serializers/parent.serializers.js';
import { PARENT_ERR } from '../constants/parentErrorCodes.js';

/**
 * "My Children" — pure read of the parent context built by parentAccess.
 * No new queries: `ctx.children[]` already carries the linked, school-scoped,
 * enrollment-resolved rows.
 */
class ParentChildrenService {
  list(ctx) {
    return ctx.children.map((c) => childCard(c.student, c.link, c));
  }

  profile(ctx, childId) {
    const row = ctx.children.find((c) => c.studentId === String(childId));
    if (!row) throw new AppError('You are not linked to this child', 403, PARENT_ERR.CHILD_ACCESS_DENIED);
    return childProfile(row.student, row.link, row);
  }
}

export const parentChildrenService = new ParentChildrenService();
