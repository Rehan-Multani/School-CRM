import React, { useCallback, useEffect, useState } from 'react';
import { Bus, CalendarDays, ChevronDown, ChevronRight, Loader2, RefreshCw } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { transportPortalApi } from '../../../../shared/api/client';

/**
 * Transport → Daily Status. Read-only: pickup and drop are recorded by the
 * Transport Manager in the mobile app; this tab shows the school the same day,
 * route by route, and each rider when a route is opened.
 */

const cardClass =
  'rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
const inputClass =
  'h-11 rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';
const ghostBtn =
  'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-indigo-600';
const th = 'px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-400';

const apiError = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

/** Local calendar date as YYYY-MM-DD (toISOString would be UTC). */
function today() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const timeOf = (value) =>
  value ? new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';

function Progress({ done, total, tone }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="font-bold text-slate-700 dark:text-slate-200">
        {done}/{total}
      </span>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className={`${cardClass} px-5 py-4`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-black text-slate-900 dark:text-white">{value}</div>
    </div>
  );
}

export function TransportDailyStatus({ showToast }) {
  const [date, setDate] = useState(today);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [openRouteId, setOpenRouteId] = useState('');
  const [run, setRun] = useState(null); // the open route's riders
  const [runLoading, setRunLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await transportPortalApi.daily(date);
      setOverview(res.data);
    } catch (error) {
      showToast(apiError(error, 'Could not load the daily status'), 'error');
    } finally {
      setLoading(false);
    }
  }, [date, showToast]);

  useEffect(() => {
    load();
  }, [load]);

  const loadRun = useCallback(async () => {
    if (!openRouteId) {
      setRun(null);
      return;
    }
    setRunLoading(true);
    try {
      const res = await transportPortalApi.dailyRoute(openRouteId, date);
      setRun(res.data);
    } catch (error) {
      showToast(apiError(error, 'Could not load the route'), 'error');
      setRun(null);
    } finally {
      setRunLoading(false);
    }
  }, [openRouteId, date, showToast]);

  useEffect(() => {
    loadRun();
  }, [loadRun]);

  const totals = overview?.totals;
  const routes = overview?.routes || [];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Stat label="Students on transport" value={totals?.students ?? '–'} />
        <Stat label="Picked up" value={totals ? `${totals.pickedUp} / ${totals.students}` : '–'} />
        <Stat label="Dropped" value={totals ? `${totals.dropped} / ${totals.students}` : '–'} />
      </div>

      <div className={`${cardClass} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Daily Pickup & Drop</h3>
            <p className="text-[11px] font-semibold text-slate-400">
              Recorded by the Transport Manager in the mobile app. Open a route to see each student.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-slate-400" />
            <input
              type="date"
              className={inputClass}
              value={date}
              max={today()}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
            <button
              className={ghostBtn}
              disabled={loading}
              onClick={() => {
                load();
                loadRun();
              }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {loading && !overview ? (
          <div className="flex items-center justify-center gap-2 px-5 py-12 text-xs font-semibold text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : routes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Bus className="h-8 w-8 text-slate-300" />
            <p className="text-xs font-semibold text-slate-400">No routes yet. Create one under Routes & Stops.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800">
                  <th className={th}>Route</th>
                  <th className={th}>Vehicle</th>
                  <th className={th}>Driver</th>
                  <th className={th}>Picked up</th>
                  <th className={th}>Dropped</th>
                </tr>
              </thead>
              <tbody>
                {routes.map((route) => {
                  const open = route.id === openRouteId;
                  return (
                    <React.Fragment key={route.id}>
                      <tr
                        className="cursor-pointer border-b border-slate-100 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/50"
                        onClick={() => setOpenRouteId(open ? '' : route.id)}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            {open ? (
                              <ChevronDown className="h-4 w-4 text-slate-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-slate-400" />
                            )}
                            <span className="font-black text-slate-900 dark:text-white">{route.routeName}</span>
                            {!route.ready && <Badge variant="warning">Not ready</Badge>}
                          </div>
                          <div className="pl-6 text-[11px] font-semibold text-slate-400">
                            {route.totalStops} stops · {route.totalStudents} students
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200">
                          {route.vehicle?.vehicleNumber || '–'}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-slate-700 dark:text-slate-200">{route.driver?.name || '–'}</div>
                          <div className="text-[11px] font-semibold text-slate-400">{route.driver?.mobile}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <Progress done={route.pickedUpCount} total={route.totalStudents} tone="bg-emerald-500" />
                        </td>
                        <td className="px-5 py-3.5">
                          <Progress done={route.droppedCount} total={route.totalStudents} tone="bg-amber-500" />
                        </td>
                      </tr>

                      {open && (
                        <tr className="border-b border-slate-100 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-950/40">
                          <td colSpan={5} className="px-5 py-4">
                            {runLoading || !run ? (
                              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                                <Loader2 className="h-4 w-4 animate-spin" /> Loading students…
                              </div>
                            ) : run.students.length === 0 ? (
                              <p className="text-xs font-semibold text-slate-400">No students are assigned to this route.</p>
                            ) : (
                              <table className="w-full text-left text-xs">
                                <thead>
                                  <tr>
                                    <th className={th}>Student</th>
                                    <th className={th}>Class</th>
                                    <th className={th}>Stop</th>
                                    <th className={th}>Pickup</th>
                                    <th className={th}>Drop</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {run.students.map((s) => (
                                    <tr key={s.studentId} className="border-t border-slate-200/70 dark:border-slate-800">
                                      <td className="px-5 py-2.5">
                                        <div className="font-bold text-slate-900 dark:text-white">{s.name}</div>
                                        <div className="text-[11px] font-semibold text-slate-400">{s.admissionNumber}</div>
                                      </td>
                                      <td className="px-5 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                                        {s.className || '–'}
                                      </td>
                                      <td className="px-5 py-2.5 font-semibold text-slate-600 dark:text-slate-300">
                                        {s.stop?.stopName || '–'}
                                      </td>
                                      <td className="px-5 py-2.5">
                                        {s.pickupStatus === 'PICKED_UP' ? (
                                          <Badge variant="success">Picked up {timeOf(s.pickedUpAt)}</Badge>
                                        ) : (
                                          <span className="font-semibold text-slate-400">Pending · {s.pickupTime}</span>
                                        )}
                                      </td>
                                      <td className="px-5 py-2.5">
                                        {s.dropStatus === 'DROPPED' ? (
                                          <Badge variant="success">Dropped {timeOf(s.droppedAt)}</Badge>
                                        ) : (
                                          <span className="font-semibold text-slate-400">Pending · {s.dropTime}</span>
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
