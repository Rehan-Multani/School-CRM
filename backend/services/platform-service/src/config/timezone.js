// "Today" for attendance, the timetable day and dashboards is computed with the
// server's local clock (Date#getHours/getDay, todayStr()). On a UTC host an
// Indian school's 00:00–05:30 would still be "yesterday" — and the app's
// today would be rejected as a future date. Pin the process to the schools'
// timezone. Must be the very first import (ESM evaluates imports in order).
process.env.TZ = process.env.APP_TIMEZONE || process.env.TZ || 'Asia/Kolkata';
