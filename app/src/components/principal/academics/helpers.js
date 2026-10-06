import { confirm, showError, toast } from '../../../lib/notify';
import { principalAcademicsApi as api } from '../../../api/principal/academics';

/** Run a write; toast success / show the error. Resolves true on success. */
export async function act(fn, success) {
  try {
    await fn();
    if (success) toast.success(success);
    return true;
  } catch (err) {
    showError(err);
    return false;
  }
}

/** Ask first, then run the write. */
export async function actConfirmed({ title, message, confirmText, destructive = true }, fn, success) {
  const ok = await confirm(title, message, { confirmText, destructive });
  if (!ok) return false;
  return act(fn, success);
}

/** Year lifecycle actions available for a year, as `[{ key, label, icon, tone, run, confirm? }]`. */
export function yearActions(year) {
  const out = [];
  const id = year.id;
  if (year.status === 'DRAFT') {
    out.push({ key: 'activate', label: 'Activate', icon: 'checkmark', tone: 'primary', run: () => api.activateYear(id), done: 'Academic year activated' });
  }
  if (year.status === 'ACTIVE' && !year.isCurrent) {
    out.push({ key: 'current', label: 'Set current', icon: 'star-outline', tone: 'success', run: () => api.setCurrentYear(id), done: 'Set as current year' });
    out.push({
      key: 'complete',
      label: 'Complete',
      icon: 'checkmark-done-outline',
      tone: 'info',
      run: () => api.completeYear(id),
      done: 'Academic year marked as completed',
      ask: 'Mark this academic year as completed?',
    });
  }
  if ((year.status === 'ACTIVE' && !year.isCurrent) || year.status === 'COMPLETED') {
    out.push({
      key: 'archive',
      label: 'Archive',
      icon: 'archive-outline',
      tone: 'warning',
      run: () => api.archiveYear(id),
      done: 'Academic year archived',
      ask: 'Archive this academic year?',
    });
  }
  if (year.status === 'ARCHIVED') {
    out.push({ key: 'unarchive', label: 'Unarchive', icon: 'arrow-undo-outline', tone: 'info', run: () => api.unarchiveYear(id), done: 'Academic year unarchived' });
  }
  return out;
}

/** Execute one of `yearActions` (with confirmation when it has `ask`). */
export async function runYearAction(year, action) {
  if (action.ask) {
    return actConfirmed({ title: `${action.label} year`, message: `${action.ask}\n\n${year.name}`, confirmText: action.label, destructive: false }, action.run, action.done);
  }
  return act(action.run, action.done);
}

export async function deleteYear(year) {
  return actConfirmed(
    { title: 'Delete academic year', message: `Delete academic year "${year.name}"? This cannot be undone.`, confirmText: 'Delete' },
    () => api.deleteYear(year.id),
    'Academic year deleted',
  );
}

/** Bulk-create helper for CSV imports: returns `{ success, failed }`. */
export async function importEach(rows, fn) {
  let success = 0;
  let failed = 0;
  for (const row of rows) {
    try {
      await fn(row);
      success += 1;
    } catch {
      failed += 1;
    }
  }
  return { success, failed };
}

export function importSummary({ success, failed }, noun = 'imported') {
  const msg = `${success} ${noun}${failed ? `, ${failed} failed` : ''}`;
  if (success > 0) toast.success(msg);
  else toast.error(msg);
}

/** Default description the web gives a class with none. */
export const classDescription = (cls) => (cls.description?.trim() ? cls.description : `Reusable ${cls.name} class for academic year planning and section mapping.`);
