import { createContext, useContext } from 'react';
import { studentApi } from '../api/student';

// Whose data a shared screen shows, and through which endpoints.
//
// The academics / attendance / fee screens under app/student/ are also the
// Parent app's screens (doc 03 §9: same response shapes, only the URL prefix
// differs). They never import an API module or hard-code a route — they read:
//   api       same method names as `studentApi`; for a parent it is bound to
//             the selected child (`/parent/children/{childId}/...`)
//   base      route prefix for pushes: '/student' or '/parent'
//   readOnly  a parent can look but not submit (homework, leave)
//   scopeKey  changes when the subject changes (child switch) — put it in
//             useAsync / PagedList deps so the screen reloads
//   canPay    fees: show "Pay Now" (Parent app only — the only one that takes money)
//   role      'STUDENT' | 'PARENT' — picks the deep-link table for notifications
//   inboxTab  which segment the inbox screen opens on
//   setUnread / refreshUnread   keep the role's bell badge in sync
const noop = () => {};
export const STUDENT_SCOPE = {
  api: studentApi,
  base: '/student',
  readOnly: false,
  scopeKey: 'self',
  canPay: false,
  role: 'STUDENT',
  inboxTab: 'notifications',
  setUnread: noop,
  refreshUnread: noop,
};
const DEFAULT = STUDENT_SCOPE;

const PortalScopeContext = createContext(DEFAULT);

export const PortalScopeProvider = PortalScopeContext.Provider;

export function usePortal() {
  return useContext(PortalScopeContext);
}
