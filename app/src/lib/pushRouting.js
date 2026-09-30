import { router } from 'expo-router';

// Where a notification's deep link `{ type, id }` opens, per role. Used by a
// push tap (system tray) and by a tap in the in-app notification list.
const ROUTES = {
  TEACHER: {
    homework: (id) => (id ? `/teacher/homework/${id}` : '/teacher/homework'),
    assignment: (id) => (id ? `/teacher/assignments/${id}` : '/teacher/assignments'),
    leave: () => '/teacher/leaves',
    notice: (id) => (id ? `/teacher/notice/${id}` : '/teacher/inbox'),
    default: () => '/teacher/notifications',
  },
  STUDENT: {
    homework: (id) => (id ? `/student/homework/${id}` : '/student/homework'),
    assignment: (id) => (id ? `/student/classwork/${id}` : '/student/classwork'),
    attendance: () => '/student/attendance',
    leave: () => '/student/leaves',
    result: (id) => (id ? `/student/results/${id}` : '/student/results'),
    notice: (id) => (id ? `/student/notice/${id}` : '/student/notifications'),
    default: () => '/student/notifications',
  },
  PARENT: { default: () => '/parent' },
  DRIVER: { default: () => '/driver' },
};

export function routeForLink(role, link) {
  const table = ROUTES[role];
  if (!table) return null;
  const make = (link?.type && table[link.type]) || table.default;
  return make(link?.id ? encodeURIComponent(String(link.id)) : '');
}

/** Returns true when it navigated. */
export function openNotificationLink(role, link) {
  const path = routeForLink(role, link);
  if (!path) return false;
  router.push(path);
  return true;
}

// Tiny event bus: "a push just arrived" → contexts refresh their bell badge.
const listeners = new Set();
export function onPushReceived(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
export function emitPushReceived(data) {
  listeners.forEach((fn) => {
    try {
      fn(data);
    } catch {
      // a listener must never break the others
    }
  });
}
