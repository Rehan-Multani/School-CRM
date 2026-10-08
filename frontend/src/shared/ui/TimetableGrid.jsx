import React, { useMemo } from 'react';

export const TIMETABLE_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
export const DAY_LABELS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };

/**
 * Derive the period rows (number + time range) from a flat list of timetable
 * entries. Times come from the first entry found for each period number.
 */
export function periodsFromEntries(entries = []) {
  const map = new Map();
  for (const e of entries) {
    const n = Number(e.periodNumber);
    if (!map.has(n)) map.set(n, { periodNumber: n, startTime: e.startTime, endTime: e.endTime });
  }
  return [...map.values()].sort((a, b) => a.periodNumber - b.periodNumber);
}

/**
 * Read-only Mon–Sat × periods grid. `entries` is the array returned by
 * GET /school-portal/timetable?sectionId=…
 */
export const TimetableGrid = ({ entries = [], days = TIMETABLE_DAYS, emptyText = 'No timetable set for this section yet.' }) => {
  const periods = useMemo(() => periodsFromEntries(entries), [entries]);
  const byKey = useMemo(() => {
    const m = new Map();
    for (const e of entries) m.set(`${e.dayOfWeek}-${e.periodNumber}`, e);
    return m;
  }, [entries]);

  if (!entries.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-10 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/40">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <table className="w-full min-w-[720px] text-left text-xs">
        <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
          <tr>
            <th className="px-3 py-3 font-bold">Period</th>
            {days.map((d) => (
              <th key={d} className="px-3 py-3 font-bold">
                {DAY_LABELS[d] || d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map((p) => (
            <tr key={p.periodNumber} className="border-b border-slate-50 align-top dark:border-slate-800/60">
              <td className="whitespace-nowrap px-3 py-3">
                <div className="font-bold text-slate-800 dark:text-white">P{p.periodNumber}</div>
                <div className="text-[11px] text-slate-400">
                  {p.startTime} – {p.endTime}
                </div>
              </td>
              {days.map((d) => {
                const e = byKey.get(`${d}-${p.periodNumber}`);
                return (
                  <td key={d} className="px-3 py-3">
                    {e ? (
                      <div>
                        <div className="font-bold text-slate-800 dark:text-white">{e.subjectName || 'Subject'}</div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400">{e.teacherName || 'No teacher'}</div>
                        {e.room ? <div className="text-[11px] text-slate-400">Room {e.room}</div> : null}
                      </div>
                    ) : (
                      <span className="text-slate-300 dark:text-slate-700">–</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TimetableGrid;
