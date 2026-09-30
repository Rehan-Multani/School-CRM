import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { transportPortalApi } from '../../../../shared/api/client';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

function buildFileUrl(path) {
  if (!path) return '';
  if (/^(https?:|data:|blob:)/.test(path)) return path;
  const _rel = path.startsWith('/') ? path : `/${path}`;
  const _tok = ['school_admin_token', 'principal_token', 'accountant_token', 'hr_token', 'librarian_token', 'transport_token', 'super_admin_token'].reduce((a, k) => a || localStorage.getItem(k), '');
  return `${API_BASE_URL}/platform${_rel}${_tok ? `?t=${encodeURIComponent(_tok)}` : ''}`;
}
import {
  ArrowDown,
  ArrowUp,
  Bus,
  Camera,
  Check,
  Clock,
  Eye,
  FileText,
  IdCard,
  IndianRupee,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Search,
  Trash2,
  Unlink,
  UserPlus,
  Users,
  X,
} from 'lucide-react';

/**
 * Transport – the whole module, in the order it must be set up:
 *
 *   1 Vehicle  →  2 Driver + Vehicle  →  3 Route + Stops (with times)
 *   →  4 Route + Vehicle + Driver  →  5 Student + Route + Stop
 *
 * Step 6 (daily pickup / drop) is the driver's own API and is not managed here.
 * Every action on this page calls the real backend; there is no local fixture.
 */

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';
const labelClass = 'text-[11px] font-bold uppercase tracking-wider text-slate-400';
const cardClass =
  'rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900';
const primaryBtn =
  'inline-flex items-center gap-2 rounded-xl bg-indigo-650 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60';
const ghostBtn =
  'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-indigo-600';
const iconBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-indigo-600';

const VEHICLE_TYPES = [
  { id: 'SCHOOL_BUS', label: 'School Bus' },
  { id: 'MINI_BUS', label: 'Mini Bus' },
  { id: 'VAN', label: 'Van' },
  { id: 'OTHER', label: 'Other' },
];

const FUEL_TYPES = [
  { id: 'DIESEL', label: 'Diesel' },
  { id: 'CNG', label: 'CNG' },
  { id: 'ELECTRIC', label: 'Electric' },
  { id: 'PETROL', label: 'Petrol' },
];

const TABS = [
  { id: 'vehicles', label: 'Vehicles', icon: Bus },
  { id: 'drivers', label: 'Drivers', icon: IdCard },
  { id: 'routes', label: 'Routes & Stops', icon: RouteIcon },
  { id: 'assignments', label: 'Student Assignments', icon: Users },
  { id: 'fees', label: 'Yearly Fee', icon: IndianRupee },
];

/** ₹60,000 – or an em dash when the school has not set an amount yet. */
const money = (amount) =>
  amount === null || amount === undefined ? '–' : `₹${Number(amount).toLocaleString('en-IN')}`;

const emptyVehicle = {
  vehicleNumber: '',
  vehicleType: 'SCHOOL_BUS',
  capacity: 40,
  model: '',
  fuelType: 'DIESEL',
  status: 'ACTIVE',
};
const emptyDriver = {
  name: '',
  mobile: '',
  licenseNumber: '',
  vehicleId: '',
  status: 'ACTIVE',
  photo: '',
  licenseImage: '',
  photoFile: null,
  photoPreview: '',
  licenseFile: null,
  licensePreview: '',
};
const emptyRoute = { routeName: '', status: 'ACTIVE' };
const emptyStop = { stopName: '', pickupTime: '07:30', dropTime: '16:00' };
const emptyAssignment = { studentId: '', routeId: '', stopId: '' };

/** Surface the backend's own message – it already explains exactly what failed. */
const apiError = (error, fallback) =>
  error?.response?.data?.message || error?.message || fallback;

const vehicleTypeLabel = (id) => VEHICLE_TYPES.find((t) => t.id === id)?.label || id;
const fuelTypeLabel = (id) => FUEL_TYPES.find((f) => f.id === id)?.label || id;

/** "07:30 AM" → "07:30" for an <input type="time">; passes 24h through. */
function toTimeInput(display) {
  const match = String(display || '').match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return String(display || '');
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === 'PM') hour += 12;
  return `${String(hour).padStart(2, '0')}:${match[2]}`;
}

export const TransportManagement = () => {
  const [activeTab, setActiveTab] = useState('vehicles');
  const { showToast, ToastComponent } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [fees, setFees] = useState([]); // one row per academic year
  const [feeDrafts, setFeeDrafts] = useState({}); // academicYearId -> amount being typed
  const [lookups, setLookups] = useState({ students: [], vehicles: [], drivers: [], routes: [] });

  const [search, setSearch] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [stops, setStops] = useState([]);
  const [stopsLoading, setStopsLoading] = useState(false);

  const [vehicleModal, setVehicleModal] = useState(null); // null | { editing, form }
  const [driverModal, setDriverModal] = useState(null);
  const [routeModal, setRouteModal] = useState(null);
  const [assignModal, setAssignModal] = useState(null); // route → vehicle + driver
  const [stopModal, setStopModal] = useState(null);
  const [riderModal, setRiderModal] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const photoInputRef = useRef(null);
  const licenseInputRef = useRef(null);

  /* ------------------------------- loading ------------------------------- */

  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const [veh, drv, rts, asg, fee, lk] = await Promise.all([
          transportPortalApi.vehicles(),
          transportPortalApi.drivers(),
          transportPortalApi.routes(),
          transportPortalApi.assignments(),
          transportPortalApi.fees(),
          transportPortalApi.lookups(),
        ]);
        setVehicles(veh.data || []);
        setDrivers(drv.data || []);
        setRoutes(rts.data || []);
        setAssignments(asg.data || []);
        setFees(fee.data || []);
        // The inputs mirror what the server holds; anything half-typed is
        // dropped on a refresh rather than silently kept.
        setFeeDrafts(
          Object.fromEntries(
            (fee.data || []).map((row) => [row.academicYearId, row.yearlyAmount ?? ''])
          )
        );
        setLookups(lk.data || { students: [], vehicles: [], drivers: [], routes: [] });
      } catch (error) {
        showToast(apiError(error, 'Could not load transport data'), 'error');
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Keep the stops panel pointed at a route that still exists.
  useEffect(() => {
    if (!routes.length) {
      setSelectedRouteId('');
      return;
    }
    if (!routes.some((r) => r.id === selectedRouteId)) setSelectedRouteId(routes[0].id);
  }, [routes, selectedRouteId]);

  const loadStops = useCallback(async () => {
    if (!selectedRouteId) {
      setStops([]);
      return;
    }
    setStopsLoading(true);
    try {
      const res = await transportPortalApi.stops(selectedRouteId);
      setStops(res.data || []);
    } catch (error) {
      showToast(apiError(error, 'Could not load stops'), 'error');
      setStops([]);
    } finally {
      setStopsLoading(false);
    }
  }, [selectedRouteId, showToast]);

  useEffect(() => {
    loadStops();
  }, [loadStops]);

  /* ------------------------------- helpers ------------------------------- */

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === selectedRouteId) || null,
    [routes, selectedRouteId]
  );

  const flow = useMemo(
    () => [
      { label: 'Vehicle added', done: vehicles.length > 0 },
      { label: 'Driver has a vehicle', done: drivers.some((d) => d.vehicleId) },
      { label: 'Route created', done: routes.length > 0 },
      { label: 'Stops with times', done: routes.some((r) => r.totalStops > 0) },
      { label: 'Route has bus + driver', done: routes.some((r) => r.vehicle && r.driver) },
      { label: 'Student assigned', done: assignments.length > 0 },
      { label: 'Yearly fee set', done: fees.some((f) => f.academicYear?.isCurrent && f.yearlyAmount !== null) },
    ],
    [vehicles, drivers, routes, assignments, fees]
  );

  const term = search.trim().toLowerCase();
  const filteredVehicles = useMemo(
    () => (term ? vehicles.filter((v) => v.vehicleNumber.toLowerCase().includes(term)) : vehicles),
    [vehicles, term]
  );
  const filteredDrivers = useMemo(
    () =>
      term
        ? drivers.filter(
            (d) =>
              d.name.toLowerCase().includes(term) ||
              d.mobile.includes(term) ||
              d.licenseNumber.toLowerCase().includes(term)
          )
        : drivers,
    [drivers, term]
  );
  const filteredAssignments = useMemo(
    () =>
      term
        ? assignments.filter(
            (a) =>
              (a.student?.name || '').toLowerCase().includes(term) ||
              (a.stop?.stopName || '').toLowerCase().includes(term) ||
              (a.route?.routeName || '').toLowerCase().includes(term)
          )
        : assignments,
    [assignments, term]
  );

  /** Every mutation goes through here: run it, toast, refresh, close the modal. */
  const run = useCallback(
    async (action, { success, onDone, refreshStops = false } = {}) => {
      setSaving(true);
      try {
        const res = await action();
        showToast(success || res?.message || 'Saved', 'success');
        await loadAll({ silent: true });
        if (refreshStops) await loadStops();
        onDone?.();
        return true;
      } catch (error) {
        showToast(apiError(error, 'Something went wrong'), 'error');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [loadAll, loadStops, showToast]
  );

  /* -------------------------------- stops -------------------------------- */

  const moveStop = (index, direction) => {
    const next = [...stops];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setStops(next); // optimistic – the server response replaces it below
    run(() => transportPortalApi.reorderStops(selectedRouteId, next.map((s) => s.id)), {
      success: 'Stop order updated',
      refreshStops: true,
    });
  };

  /* ------------------------------ assignment ----------------------------- */

  const riderRoute = useMemo(
    () => lookups.routes.find((r) => r.id === riderModal?.form.routeId) || null,
    [lookups.routes, riderModal]
  );
  const riderStop = useMemo(
    () => riderRoute?.stops.find((s) => s.id === riderModal?.form.stopId) || null,
    [riderRoute, riderModal]
  );

  /* -------------------------------- render ------------------------------- */

  return (
    <div className="space-y-6">
      <ToastComponent />

      <PageHeader
        title="Transport"
        subtitle="Vehicle → Driver → Route → Stops & times → Student assignment"
        actions={
          <button className={ghostBtn} onClick={() => loadAll()} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {/* SETUP PROGRESS – the flow this module is required to follow, in order */}
      <div className={`${cardClass} p-4`}>
        <div className="flex flex-wrap items-center gap-2">
          {flow.map((step, index) => (
            <React.Fragment key={step.label}>
              <div
                className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px] font-bold ${
                  step.done
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                <span
                  className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black ${
                    step.done ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600 dark:bg-slate-900'
                  }`}
                >
                  {step.done ? <Check className="h-2.5 w-2.5" /> : index + 1}
                </span>
                {step.label}
              </div>
              {index < flow.length - 1 && <span className="text-slate-300 dark:text-slate-700">›</span>}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* TABS + SEARCH */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const count =
              tab.id === 'vehicles'
                ? vehicles.length
                : tab.id === 'drivers'
                  ? drivers.length
                  : tab.id === 'routes'
                    ? routes.length
                    : tab.id === 'fees'
                      ? fees.filter((f) => f.yearlyAmount !== null).length
                      : assignments.length;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearch('');
                }}
                className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-indigo-650 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-black ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab !== 'routes' && activeTab !== 'fees' && (
          <div className="relative shrink-0 lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab}…`}
              className={`${inputClass} pl-9`}
            />
          </div>
        )}
      </div>

      {loading && <SkeletonTable rows={6} columns={5} />}

      {/* ============================ 1 · VEHICLES =========================== */}
      {!loading && activeTab === 'vehicles' && (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fleet</h3>
              <p className="text-[11px] font-semibold text-slate-400">
                Step 1 – register each bus by its number plate
              </p>
            </div>
            <button className={primaryBtn} onClick={() => setVehicleModal({ editing: null, form: emptyVehicle })}>
              <Plus className="h-3.5 w-3.5" /> Add Vehicle
            </button>
          </div>

          {filteredVehicles.length === 0 ? (
            <EmptyState icon={Bus} message="No vehicles yet. Add the school's first bus to begin." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <TableHead columns={['Vehicle Number', 'Type', 'Capacity', 'Driver', 'Status', '']} />
                <tbody>
                  {filteredVehicles.map((vehicle) => {
                    const holder = drivers.find((d) => d.vehicleId === vehicle.id);
                    return (
                      <tr key={vehicle.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                        <td className="px-5 py-3.5">
                          <div className="font-black text-slate-900 dark:text-white">{vehicle.vehicleNumber}</div>
                          {vehicle.model && (
                            <div className="text-[11px] font-semibold text-slate-400">{vehicle.model}</div>
                          )}
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-semibold text-slate-600 dark:text-slate-300">
                            {vehicleTypeLabel(vehicle.vehicleType)}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-400">
                            {fuelTypeLabel(vehicle.fuelType)}
                          </div>
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                          {vehicle.capacity} seats
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                          {holder ? holder.name : <span className="text-slate-400">Unassigned</span>}
                        </td>
                        <td className="px-5 py-3.5">
                          <Badge variant={vehicle.status === 'ACTIVE' ? 'success' : 'secondary'}>
                            {vehicle.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1.5">
                            <button
                              className={iconBtn}
                              title="Edit"
                              onClick={() =>
                                setVehicleModal({
                                  editing: vehicle,
                                  form: {
                                    vehicleNumber: vehicle.vehicleNumber,
                                    vehicleType: vehicle.vehicleType,
                                    capacity: vehicle.capacity,
                                    model: vehicle.model || '',
                                    fuelType: vehicle.fuelType || 'DIESEL',
                                    status: vehicle.status,
                                  },
                                })
                              }
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              className={iconBtn}
                              title="Delete"
                              onClick={() =>
                                setConfirm({
                                  title: 'Delete vehicle',
                                  message: `Delete ${vehicle.vehicleNumber} from the fleet?`,
                                  onConfirm: () =>
                                    run(() => transportPortalApi.deleteVehicle(vehicle.id), {
                                      success: 'Vehicle deleted',
                                    }),
                                })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================ 2 · DRIVERS ============================ */}
      {!loading && activeTab === 'drivers' && (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Drivers</h3>
              <p className="text-[11px] font-semibold text-slate-400">
                Step 2 – add the driver, then hand them a bus
              </p>
            </div>
            <button
              className={primaryBtn}
              onClick={() => setDriverModal({ editing: null, form: emptyDriver })}
              disabled={vehicles.length === 0}
              title={vehicles.length === 0 ? 'Add a vehicle first' : undefined}
            >
              <Plus className="h-3.5 w-3.5" /> Add Driver
            </button>
          </div>

          {filteredDrivers.length === 0 ? (
            <EmptyState
              icon={IdCard}
              message={
                vehicles.length === 0
                  ? 'Add a vehicle first – a driver is given a bus at step 2.'
                  : 'No drivers yet.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <TableHead columns={['Driver', 'Mobile', 'License', 'Vehicle', 'Status', '']} />
                <tbody>
                  {filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {driver.photo ? (
                            <img
                              src={buildFileUrl(driver.photo)}
                              alt={driver.name}
                              className="h-9 w-9 rounded-full object-cover border border-slate-200 shadow-2xs dark:border-slate-700"
                            />
                          ) : (
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-xs text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-400">
                              {(driver.name || 'DR').slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <span className="font-black text-slate-900 dark:text-white">{driver.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-mono font-semibold text-slate-600 dark:text-slate-300">
                        {driver.mobile}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-600 dark:text-slate-300">
                            {driver.licenseNumber}
                          </span>
                          {driver.licenseImage && (
                            <button
                              type="button"
                              onClick={() =>
                                setPreviewImage({
                                  url: buildFileUrl(driver.licenseImage),
                                  title: `${driver.name}'s Driving License`,
                                })
                              }
                              title="View Driving License"
                              className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-400"
                            >
                              <Eye className="h-3 w-3" />
                              <span>View Doc</span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {driver.vehicle ? (
                          <span className="inline-flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                            <Bus className="h-3.5 w-3.5 text-indigo-500" />
                            {driver.vehicle.vehicleNumber}
                          </span>
                        ) : (
                          <span className="text-slate-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={driver.status === 'ACTIVE' ? 'success' : 'secondary'}>
                          {driver.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          {driver.vehicleId && (
                            <button
                              className={iconBtn}
                              title="Remove vehicle"
                              onClick={() =>
                                setConfirm({
                                  title: 'Remove vehicle',
                                  message: `Take ${driver.vehicle?.vehicleNumber} away from ${driver.name}?`,
                                  variant: 'warning',
                                  confirmText: 'Remove',
                                  onConfirm: () =>
                                    run(() => transportPortalApi.unassignVehicleFromDriver(driver.id), {
                                      success: 'Vehicle removed from driver',
                                    }),
                                })
                              }
                            >
                              <Unlink className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button
                            className={iconBtn}
                            title="Edit"
                            onClick={() =>
                              setDriverModal({
                                editing: driver,
                                form: {
                                  name: driver.name || '',
                                  mobile: driver.mobile || '',
                                  licenseNumber: driver.licenseNumber || '',
                                  vehicleId: driver.vehicleId || '',
                                  status: driver.status || 'ACTIVE',
                                  photo: driver.photo || '',
                                  licenseImage: driver.licenseImage || '',
                                  photoFile: null,
                                  photoPreview: driver.photo ? buildFileUrl(driver.photo) : '',
                                  licenseFile: null,
                                  licensePreview: driver.licenseImage ? buildFileUrl(driver.licenseImage) : '',
                                },
                              })
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className={iconBtn}
                            title="Delete"
                            onClick={() =>
                              setConfirm({
                                title: 'Delete driver',
                                message: `Delete ${driver.name}?`,
                                onConfirm: () =>
                                  run(() => transportPortalApi.deleteDriver(driver.id), {
                                    success: 'Driver deleted',
                                  }),
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================= 3 + 4 · ROUTES & STOPS ====================== */}
      {!loading && activeTab === 'routes' && (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-5">
          {/* Routes list */}
          <div className={`${cardClass} overflow-hidden xl:col-span-2`}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Routes</h3>
                <p className="text-[11px] font-semibold text-slate-400">Steps 3 & 4</p>
              </div>
              <button className={primaryBtn} onClick={() => setRouteModal({ editing: null, form: emptyRoute })}>
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </div>

            {routes.length === 0 ? (
              <EmptyState icon={RouteIcon} message="No routes yet." />
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {routes.map((route) => {
                  const isActive = route.id === selectedRouteId;
                  return (
                    <button
                      key={route.id}
                      onClick={() => setSelectedRouteId(route.id)}
                      className={`w-full px-5 py-4 text-left transition-colors ${
                        isActive ? 'bg-indigo-50/70 dark:bg-indigo-950/20' : 'hover:bg-slate-50 dark:hover:bg-indigo-600/50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-slate-900 dark:text-white">{route.routeName}</span>
                        <Badge variant={route.status === 'ACTIVE' ? 'success' : 'secondary'}>{route.status}</Badge>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500">
                        <span className="inline-flex items-center gap-1">
                          <Bus className="h-3 w-3" />
                          {route.vehicle?.vehicleNumber || 'No bus'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <IdCard className="h-3 w-3" />
                          {route.driver?.name || 'No driver'}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {route.totalStops} stops
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {route.assignedStudents}
                          {route.vehicle ? `/${route.vehicle.capacity}` : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Selected route: assignment + stops */}
          <div className="space-y-5 xl:col-span-3">
            {!selectedRoute ? (
              <div className={`${cardClass}`}>
                <EmptyState icon={RouteIcon} message="Create a route to add its stops." />
              </div>
            ) : (
              <>
                <div className={`${cardClass} p-5`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-black text-slate-900 dark:text-white">
                        {selectedRoute.routeName}
                      </h3>
                      <p className="mt-0.5 text-[11px] font-semibold text-slate-400">
                        Step 4 – this route needs a bus and a driver before students can be assigned
                      </p>
                    </div>
                    <div className="flex gap-1.5">
                      <button
                        className={ghostBtn}
                        onClick={() =>
                          setRouteModal({
                            editing: selectedRoute,
                            form: { routeName: selectedRoute.routeName, status: selectedRoute.status },
                          })
                        }
                      >
                        <Pencil className="h-3.5 w-3.5" /> Rename
                      </button>
                      <button
                        className={ghostBtn}
                        onClick={() =>
                          setConfirm({
                            title: 'Delete route',
                            message: `Delete ${selectedRoute.routeName} and all of its stops?`,
                            onConfirm: () =>
                              run(() => transportPortalApi.deleteRoute(selectedRoute.id), {
                                success: 'Route deleted',
                              }),
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ResourceSlot
                      icon={Bus}
                      label="Vehicle"
                      value={selectedRoute.vehicle?.vehicleNumber}
                      hint={selectedRoute.vehicle ? `${selectedRoute.vehicle.capacity} seats` : 'Not assigned'}
                    />
                    <ResourceSlot
                      icon={IdCard}
                      label="Driver"
                      value={selectedRoute.driver?.name}
                      hint={selectedRoute.driver?.mobile || 'Not assigned'}
                    />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <button
                      className={primaryBtn}
                      onClick={() =>
                        setAssignModal({
                          route: selectedRoute,
                          form: {
                            vehicleId: selectedRoute.vehicle?.id || '',
                            driverId: selectedRoute.driver?.id || '',
                          },
                        })
                      }
                      disabled={drivers.length === 0}
                      title={drivers.length === 0 ? 'Add a driver first' : undefined}
                    >
                      <Bus className="h-3.5 w-3.5" />
                      {selectedRoute.vehicle ? 'Change bus & driver' : 'Assign bus & driver'}
                    </button>
                    {selectedRoute.vehicle && (
                      <button
                        className={ghostBtn}
                        onClick={() =>
                          setConfirm({
                            title: 'Remove bus and driver',
                            message: `Clear the vehicle and driver from ${selectedRoute.routeName}?`,
                            variant: 'warning',
                            confirmText: 'Remove',
                            onConfirm: () =>
                              run(() => transportPortalApi.unassignRouteResources(selectedRoute.id), {
                                success: 'Vehicle and driver removed',
                              }),
                          })
                        }
                      >
                        <Unlink className="h-3.5 w-3.5" /> Clear
                      </button>
                    )}
                  </div>
                </div>

                {/* Stops */}
                <div className={`${cardClass} overflow-hidden`}>
                  <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white">Stops</h3>
                      <p className="text-[11px] font-semibold text-slate-400">
                        Step 3 – order matters, and every stop needs both times
                      </p>
                    </div>
                    <button className={primaryBtn} onClick={() => setStopModal({ editing: null, form: emptyStop })}>
                      <Plus className="h-3.5 w-3.5" /> Add Stop
                    </button>
                  </div>

                  {stopsLoading ? (
                    <div className="p-5">
                      <SkeletonTable rows={4} columns={4} />
                    </div>
                  ) : stops.length === 0 ? (
                    <EmptyState icon={MapPin} message="No stops on this route yet." />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <TableHead columns={['#', 'Stop', 'Pickup', 'Drop', '']} />
                        <tbody>
                          {stops.map((stop, index) => (
                            <tr key={stop.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                              <td className="px-5 py-3.5">
                                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-[11px] font-black text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-400">
                                  {stop.sequenceOrder}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 font-black text-slate-900 dark:text-white">
                                {stop.stopName}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                                  <Clock className="h-3 w-3" />
                                  {stop.pickupTime}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <span className="inline-flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
                                  <Clock className="h-3 w-3" />
                                  {stop.dropTime}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="flex justify-end gap-1.5">
                                  <button
                                    className={iconBtn}
                                    title="Move up"
                                    disabled={index === 0 || saving}
                                    onClick={() => moveStop(index, -1)}
                                  >
                                    <ArrowUp className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    className={iconBtn}
                                    title="Move down"
                                    disabled={index === stops.length - 1 || saving}
                                    onClick={() => moveStop(index, 1)}
                                  >
                                    <ArrowDown className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    className={iconBtn}
                                    title="Edit"
                                    onClick={() =>
                                      setStopModal({
                                        editing: stop,
                                        form: {
                                          stopName: stop.stopName,
                                          pickupTime: toTimeInput(stop.pickupTime),
                                          dropTime: toTimeInput(stop.dropTime),
                                        },
                                      })
                                    }
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    className={iconBtn}
                                    title="Delete"
                                    onClick={() =>
                                      setConfirm({
                                        title: 'Delete stop',
                                        message: `Delete "${stop.stopName}" from ${selectedRoute.routeName}?`,
                                        onConfirm: () =>
                                          run(() => transportPortalApi.deleteStop(stop.id), {
                                            success: 'Stop deleted',
                                            refreshStops: true,
                                          }),
                                      })
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ========================= 5 · STUDENT RIDERS ======================== */}
      {!loading && activeTab === 'assignments' && (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Student Assignments</h3>
              <p className="text-[11px] font-semibold text-slate-400">
                Step 5 – the stop decides the student's pickup and drop time
              </p>
            </div>
            <button
              className={primaryBtn}
              onClick={() => setRiderModal({ editing: null, form: emptyAssignment })}
              disabled={!routes.some((r) => r.vehicle && r.driver && r.totalStops > 0)}
              title={
                routes.some((r) => r.vehicle && r.driver && r.totalStops > 0)
                  ? undefined
                  : 'A route needs stops, a bus and a driver first'
              }
            >
              <UserPlus className="h-3.5 w-3.5" /> Assign Student
            </button>
          </div>

          {filteredAssignments.length === 0 ? (
            <EmptyState
              icon={Users}
              message={
                routes.some((r) => r.vehicle && r.driver && r.totalStops > 0)
                  ? 'No students on transport yet.'
                  : 'Finish steps 1–4 first: a route with stops, a bus and a driver.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <TableHead
                  columns={['Student', 'Class', 'Route', 'Stop', 'Pickup', 'Drop', 'Year', 'Yearly fee', '']}
                />
                <tbody>
                  {filteredAssignments.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-5 py-3.5">
                        <div className="font-black text-slate-900 dark:text-white">{row.student?.name}</div>
                        <div className="text-[11px] font-semibold text-slate-400">
                          {row.student?.admissionNumber}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                        {row.student?.className || '–'}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                        {row.route?.routeName}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                          <MapPin className="h-3 w-3 text-indigo-500" />
                          {row.stop?.stopName}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {row.pickupTime}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-amber-600 dark:text-amber-400">{row.dropTime}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                        {row.academicYear?.name || '–'}
                      </td>
                      <td className="px-5 py-3.5 font-black text-slate-900 dark:text-white">
                        {money(row.yearlyFeeAmount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            className={iconBtn}
                            title="Change route or stop"
                            onClick={() =>
                              setRiderModal({
                                editing: row,
                                form: {
                                  studentId: row.student?.id || '',
                                  routeId: row.route?.id || '',
                                  stopId: row.stop?.id || '',
                                },
                              })
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className={iconBtn}
                            title="Remove from transport"
                            onClick={() =>
                              setConfirm({
                                title: 'Remove from transport',
                                message: `Take ${row.student?.name} off ${row.route?.routeName}?`,
                                confirmText: 'Remove',
                                onConfirm: () =>
                                  run(() => transportPortalApi.removeAssignment(row.id), {
                                    success: 'Student removed from transport',
                                  }),
                              })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =========================== 6 · YEARLY FEE ========================== */}
      {!loading && activeTab === 'fees' && (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Yearly Transport Fee</h3>
            <p className="text-[11px] font-semibold text-slate-400">
              Step 6 – one amount per academic year for the whole school. Every rider pays the same,
              whatever their class, route or stop.
            </p>
          </div>

          {fees.length === 0 ? (
            <EmptyState
              icon={IndianRupee}
              message="No academic years yet. Create one under Academic Years, then set its transport fee here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <TableHead columns={['Academic year', 'Yearly fee', 'Students on this year', '']} />
                <tbody>
                  {fees.map((row) => {
                    const draft = feeDrafts[row.academicYearId] ?? '';
                    const unchanged = String(draft) === String(row.yearlyAmount ?? '');
                    return (
                      <tr
                        key={row.academicYearId}
                        className="border-b border-slate-100 last:border-0 dark:border-slate-800"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 dark:text-white">
                              {row.academicYear?.name}
                            </span>
                            {row.academicYear?.isCurrent && <Badge variant="success">Current</Badge>}
                          </div>
                          <div className="text-[11px] font-semibold text-slate-400">{row.academicYear?.code}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-black text-slate-400">₹</span>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              placeholder="Not set"
                              className={`${inputClass} w-40`}
                              value={draft}
                              onChange={(e) =>
                                setFeeDrafts((d) => ({ ...d, [row.academicYearId]: e.target.value }))
                              }
                            />
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="font-bold text-slate-700 dark:text-slate-200">
                            {row.assignedStudents}
                          </span>
                          <div className="text-[11px] font-semibold text-slate-400">
                            keep the amount they were assigned on
                          </div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1.5">
                            <button
                              className={primaryBtn}
                              disabled={saving || unchanged || draft === ''}
                              onClick={() =>
                                run(
                                  () => transportPortalApi.setFee(row.academicYearId, Number(draft)),
                                  { success: `Transport fee saved for ${row.academicYear?.name}` }
                                )
                              }
                            >
                              <Check className="h-3.5 w-3.5" /> Save
                            </button>
                            <button
                              className={iconBtn}
                              title="Clear this year's fee"
                              disabled={row.yearlyAmount === null}
                              onClick={() =>
                                setConfirm({
                                  title: 'Clear transport fee',
                                  message: `Remove the yearly transport fee for ${row.academicYear?.name}? Students already assigned keep the amount they were assigned on.`,
                                  confirmText: 'Clear',
                                  onConfirm: () =>
                                    run(() => transportPortalApi.clearFee(row.academicYearId), {
                                      success: 'Transport fee cleared',
                                    }),
                                })
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============================== MODALS ============================== */}

      {/* Vehicle */}
      <Modal
        isOpen={Boolean(vehicleModal)}
        onClose={() => setVehicleModal(null)}
        title={vehicleModal?.editing ? 'Edit vehicle' : 'Add vehicle'}
        size="md"
        footer={
          <ModalFooter
            saving={saving}
            onCancel={() => setVehicleModal(null)}
            onSave={() => {
              const { editing, form } = vehicleModal;
              const payload = { ...form, capacity: Number(form.capacity) };
              run(
                () =>
                  editing
                    ? transportPortalApi.updateVehicle(editing.id, payload)
                    : transportPortalApi.createVehicle(payload),
                { onDone: () => setVehicleModal(null) }
              );
            }}
          />
        }
      >
        {vehicleModal && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Vehicle number" required className="sm:col-span-2">
              <input
                className={inputClass}
                placeholder="MP09AB1234"
                value={vehicleModal.form.vehicleNumber}
                onChange={(e) => setVehicleModal((m) => ({ ...m, form: { ...m.form, vehicleNumber: e.target.value } }))}
              />
            </Field>
            <Field label="Type" required>
              <select
                className={inputClass}
                value={vehicleModal.form.vehicleType}
                onChange={(e) => setVehicleModal((m) => ({ ...m, form: { ...m.form, vehicleType: e.target.value } }))}
              >
                {VEHICLE_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Capacity" required hint="1–100 seats">
              <input
                placeholder="e.g. 40"
                type="number"
                min={1}
                max={100}
                className={inputClass}
                value={vehicleModal.form.capacity}
                onChange={(e) => setVehicleModal((m) => ({ ...m, form: { ...m.form, capacity: e.target.value } }))}
              />
            </Field>
            <Field label="Model" hint="Optional – the make printed on the bus" className="sm:col-span-2">
              <input
                className={inputClass}
                placeholder="Tata Starbus"
                value={vehicleModal.form.model}
                onChange={(e) => setVehicleModal((m) => ({ ...m, form: { ...m.form, model: e.target.value } }))}
              />
            </Field>
            <Field label="Fuel type" className="sm:col-span-2">
              <select
                className={inputClass}
                value={vehicleModal.form.fuelType}
                onChange={(e) => setVehicleModal((m) => ({ ...m, form: { ...m.form, fuelType: e.target.value } }))}
              >
                {FUEL_TYPES.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Status" className="sm:col-span-2">
              <select
                className={inputClass}
                value={vehicleModal.form.status}
                onChange={(e) => setVehicleModal((m) => ({ ...m, form: { ...m.form, status: e.target.value } }))}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </Field>
          </div>
        )}
      </Modal>

      {/* Driver */}
      <Modal
        isOpen={Boolean(driverModal)}
        onClose={() => setDriverModal(null)}
        title={driverModal?.editing ? 'Edit Driver' : 'Add Driver'}
        size="lg"
        footer={
          <ModalFooter
            saving={saving}
            onCancel={() => setDriverModal(null)}
            onSave={async () => {
              const { editing, form } = driverModal;
              const name = (form.name || '').trim();
              const cleanMobile = (form.mobile || '').replace(/\D/g, '');
              const licenseNumber = (form.licenseNumber || '').trim();

              if (!name) {
                showToast('Driver name is required', 'error');
                return;
              }
              if (cleanMobile.length !== 10) {
                showToast('Mobile number must be exactly 10 digits', 'error');
                return;
              }
              if (!licenseNumber) {
                showToast('License number is required', 'error');
                return;
              }

              let payload;
              if (form.photoFile || form.licenseFile) {
                const fd = new FormData();
                fd.append('name', name);
                fd.append('mobile', cleanMobile);
                fd.append('licenseNumber', licenseNumber);
                fd.append('status', form.status || 'ACTIVE');
                if (form.vehicleId) fd.append('vehicleId', form.vehicleId);
                if (form.photoFile) fd.append('photo', form.photoFile);
                if (form.licenseFile) fd.append('licenseImage', form.licenseFile);
                if (!form.photo && !form.photoFile && editing) fd.append('photo', '');
                if (!form.licenseImage && !form.licenseFile && editing) fd.append('licenseImage', '');
                payload = fd;
              } else {
                payload = {
                  name,
                  mobile: cleanMobile,
                  licenseNumber,
                  status: form.status || 'ACTIVE',
                  vehicleId: form.vehicleId || '',
                };
                if (!form.photo && editing) payload.photo = '';
                if (!form.licenseImage && editing) payload.licenseImage = '';
              }

              if (editing) {
                const ok = await run(() => transportPortalApi.updateDriver(editing.id, payload), {
                  success: 'Driver updated',
                });
                if (!ok) return;
                const current = editing.vehicleId || '';
                if (form.vehicleId !== current) {
                  await run(
                    () =>
                      form.vehicleId
                        ? transportPortalApi.assignVehicleToDriver(editing.id, form.vehicleId)
                        : transportPortalApi.unassignVehicleFromDriver(editing.id),
                    { success: 'Vehicle updated' }
                  );
                }
                setDriverModal(null);
                return;
              }

              // On create the backend links the vehicle in the same call.
              run(() => transportPortalApi.createDriver(payload), {
                success: 'Driver created',
                onDone: () => setDriverModal(null),
              });
            }}
          />
        }
      >
        {driverModal && (
          <div className="space-y-4">
            {/* Top image uploads row */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60">
              {/* Profile Photo */}
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Driver Profile Photo</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-900">
                    {driverModal.form.photoPreview ? (
                      <img
                        src={driverModal.form.photoPreview}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <Camera className="h-7 w-7 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp,.jfif,.bmp,.gif,.tiff,.avif,.heic"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const isImage =
                          file.type?.startsWith('image/') ||
                          /\.(jpg|jpeg|png|webp|gif|bmp|tiff|jfif|avif|heic|heif|svg)$/i.test(file.name || '');
                        if (!isImage) {
                          showToast('Only image files are allowed', 'error');
                          return;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          showToast('Profile photo must be less than 10MB', 'error');
                          return;
                        }
                        setDriverModal((m) => ({
                          ...m,
                          form: {
                            ...m.form,
                            photoFile: file,
                            photoPreview: URL.createObjectURL(file),
                          },
                        }));
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => photoInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-indigo-600"
                    >
                      <Camera className="h-3.5 w-3.5 text-indigo-500" />
                      <span>{driverModal.form.photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                    </button>
                    {driverModal.form.photoPreview && (
                      <button
                        type="button"
                        onClick={() => {
                          if (photoInputRef.current) photoInputRef.current.value = '';
                          setDriverModal((m) => ({
                            ...m,
                            form: {
                              ...m.form,
                              photoFile: null,
                              photoPreview: '',
                              photo: '',
                            },
                          }));
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" />
                        <span>Remove photo</span>
                      </button>
                    )}
                    <span className="text-[10px] font-medium text-slate-400">Any image up to 10MB</span>
                  </div>
                </div>
              </div>

              {/* Driving License */}
              <div className="flex flex-col gap-2">
                <label className={labelClass}>Driving License Document</label>
                <div className="flex items-center gap-3">
                  <div className="relative flex h-20 w-28 shrink-0 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-900">
                    {driverModal.form.licensePreview ? (
                      <img
                        src={driverModal.form.licensePreview}
                        alt="Driving License"
                        className="h-full w-full object-cover cursor-pointer hover:opacity-90"
                        onClick={() =>
                          setPreviewImage({
                            url: driverModal.form.licensePreview,
                            title: `${driverModal.form.name || 'Driver'}'s Driving License`,
                          })
                        }
                        title="Click to view license image"
                      />
                    ) : (
                      <FileText className="h-7 w-7 text-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input
                      ref={licenseInputRef}
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.webp,.jfif,.bmp,.gif,.tiff,.avif,.heic"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const isImage =
                          file.type?.startsWith('image/') ||
                          /\.(jpg|jpeg|png|webp|gif|bmp|tiff|jfif|avif|heic|heif|svg)$/i.test(file.name || '');
                        if (!isImage) {
                          showToast('Only image files are allowed', 'error');
                          return;
                        }
                        if (file.size > 10 * 1024 * 1024) {
                          showToast('License image must be less than 10MB', 'error');
                          return;
                        }
                        setDriverModal((m) => ({
                          ...m,
                          form: {
                            ...m.form,
                            licenseFile: file,
                            licensePreview: URL.createObjectURL(file),
                          },
                        }));
                      }}
                    />
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => licenseInputRef.current?.click()}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-indigo-600"
                      >
                        <FileText className="h-3.5 w-3.5 text-indigo-500" />
                        <span>{driverModal.form.licensePreview ? 'Change Doc' : 'Upload License'}</span>
                      </button>
                      {driverModal.form.licensePreview && (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage({
                              url: driverModal.form.licensePreview,
                              title: `${driverModal.form.name || 'Driver'}'s Driving License`,
                            })
                          }
                          title="View preview"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    {driverModal.form.licensePreview && (
                      <button
                        type="button"
                        onClick={() => {
                          if (licenseInputRef.current) licenseInputRef.current.value = '';
                          setDriverModal((m) => ({
                            ...m,
                            form: {
                              ...m.form,
                              licenseFile: null,
                              licensePreview: '',
                              licenseImage: '',
                            },
                          }));
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-500 hover:text-rose-600"
                      >
                        <X className="h-3 w-3" />
                        <span>Remove license</span>
                      </button>
                    )}
                    <span className="text-[10px] font-medium text-slate-400">Any image up to 10MB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Driver name" required className="sm:col-span-2">
                <input
                  className={inputClass}
                  placeholder="e.g. Rahul Sharma"
                  value={driverModal.form.name}
                  onChange={(e) => setDriverModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))}
                />
              </Field>
              <Field
                label="Mobile number"
                required
                hint={`${(driverModal.form.mobile || '').length}/10 digits (digits only)`}
              >
                <div className="relative">
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    className={inputClass}
                    placeholder="9876543210"
                    value={driverModal.form.mobile}
                    onChange={(e) => {
                      const clean = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setDriverModal((m) => ({ ...m, form: { ...m.form, mobile: clean } }));
                    }}
                  />
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[11px] font-bold text-slate-400 pointer-events-none font-mono">
                    {(driverModal.form.mobile || '').length}/10
                  </div>
                </div>
              </Field>
              <Field label="License number" required>
                <input
                  className={inputClass}
                  placeholder="e.g. MP0920180012345"
                  value={driverModal.form.licenseNumber}
                  onChange={(e) =>
                    setDriverModal((m) => ({ ...m, form: { ...m.form, licenseNumber: e.target.value.toUpperCase() } }))
                  }
                />
              </Field>
              <Field
                label="Vehicle"
                hint="One bus per driver"
              >
                <select
                  className={inputClass}
                  value={driverModal.form.vehicleId}
                  onChange={(e) => setDriverModal((m) => ({ ...m, form: { ...m.form, vehicleId: e.target.value } }))}
                >
                  <option value="">Not assigned</option>
                  {lookups.vehicles
                    .filter((v) => {
                      const holder = drivers.find((d) => d.vehicleId === v.id);
                      return !holder || holder.id === driverModal.editing?.id;
                    })
                    .map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.vehicleNumber} · {v.capacity} seats
                      </option>
                    ))}
                </select>
              </Field>
              <Field label="Status">
                <select
                  className={inputClass}
                  value={driverModal.form.status}
                  onChange={(e) => setDriverModal((m) => ({ ...m, form: { ...m.form, status: e.target.value } }))}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </Field>
            </div>
          </div>
        )}
      </Modal>

      {/* Route */}
      <Modal
        isOpen={Boolean(routeModal)}
        onClose={() => setRouteModal(null)}
        title={routeModal?.editing ? 'Edit route' : 'Create route'}
        size="sm"
        footer={
          <ModalFooter
            saving={saving}
            onCancel={() => setRouteModal(null)}
            onSave={() => {
              const { editing, form } = routeModal;
              run(
                () =>
                  editing
                    ? transportPortalApi.updateRoute(editing.id, form)
                    : transportPortalApi.createRoute(form),
                { onDone: () => setRouteModal(null) }
              );
            }}
          />
        }
      >
        {routeModal && (
          <div className="space-y-4">
            <Field label="Route name" required>
              <input
                className={inputClass}
                placeholder="Route 01"
                value={routeModal.form.routeName}
                onChange={(e) => setRouteModal((m) => ({ ...m, form: { ...m.form, routeName: e.target.value } }))}
              />
            </Field>
            <Field label="Status">
              <select
                className={inputClass}
                value={routeModal.form.status}
                onChange={(e) => setRouteModal((m) => ({ ...m, form: { ...m.form, status: e.target.value } }))}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </Field>
          </div>
        )}
      </Modal>

      {/* Route → vehicle + driver */}
      <Modal
        isOpen={Boolean(assignModal)}
        onClose={() => setAssignModal(null)}
        title={`Bus & driver for ${assignModal?.route.routeName || ''}`}
        size="md"
        footer={
          <ModalFooter
            saving={saving}
            saveLabel="Assign"
            onCancel={() => setAssignModal(null)}
            onSave={() =>
              run(() => transportPortalApi.assignRouteResources(assignModal.route.id, assignModal.form), {
                onDone: () => setAssignModal(null),
              })
            }
          />
        }
      >
        {assignModal && (
          <div className="space-y-4">
            <Field label="Driver" required hint="Only drivers who are not already on a route">
              <select
                className={inputClass}
                value={assignModal.form.driverId}
                onChange={(e) => {
                  const driverId = e.target.value;
                  const picked = drivers.find((d) => d.id === driverId);
                  setAssignModal((m) => ({
                    ...m,
                    // A driver already holding a bus brings it with them.
                    form: { driverId, vehicleId: picked?.vehicleId || m.form.vehicleId },
                  }));
                }}
              >
                <option value="">Select a driver</option>
                {drivers
                  .filter(
                    (d) =>
                      d.status === 'ACTIVE' &&
                      (!routes.some((r) => r.driver?.id === d.id) || d.id === assignModal.route.driver?.id)
                  )
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} · {d.mobile}
                      {d.vehicle ? ` · ${d.vehicle.vehicleNumber}` : ''}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Vehicle" required hint="Must match the driver's own bus, if they have one">
              <select
                className={inputClass}
                value={assignModal.form.vehicleId}
                onChange={(e) => setAssignModal((m) => ({ ...m, form: { ...m.form, vehicleId: e.target.value } }))}
              >
                <option value="">Select a vehicle</option>
                {lookups.vehicles
                  .filter(
                    (v) =>
                      !routes.some((r) => r.vehicle?.id === v.id) || v.id === assignModal.route.vehicle?.id
                  )
                  .map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.vehicleNumber} · {v.capacity} seats
                    </option>
                  ))}
              </select>
            </Field>
          </div>
        )}
      </Modal>

      {/* Stop */}
      <Modal
        isOpen={Boolean(stopModal)}
        onClose={() => setStopModal(null)}
        title={stopModal?.editing ? 'Edit stop' : 'Add stop'}
        size="md"
        footer={
          <ModalFooter
            saving={saving}
            onCancel={() => setStopModal(null)}
            onSave={() => {
              const { editing, form } = stopModal;
              run(
                () =>
                  editing
                    ? transportPortalApi.updateStop(editing.id, form)
                    : transportPortalApi.createStop(selectedRouteId, form),
                { refreshStops: true, onDone: () => setStopModal(null) }
              );
            }}
          />
        }
      >
        {stopModal && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Stop name" required className="sm:col-span-2">
              <input
                className={inputClass}
                placeholder="Teen Imli"
                value={stopModal.form.stopName}
                onChange={(e) => setStopModal((m) => ({ ...m, form: { ...m.form, stopName: e.target.value } }))}
              />
            </Field>
            <Field label="Pickup time" required hint="Morning, towards school">
              <input
                type="time"
                className={inputClass}
                value={stopModal.form.pickupTime}
                onChange={(e) => setStopModal((m) => ({ ...m, form: { ...m.form, pickupTime: e.target.value } }))}
              />
            </Field>
            <Field label="Drop time" required hint="Afternoon, back home">
              <input
                type="time"
                className={inputClass}
                value={stopModal.form.dropTime}
                onChange={(e) => setStopModal((m) => ({ ...m, form: { ...m.form, dropTime: e.target.value } }))}
              />
            </Field>
            {!stopModal.editing && (
              <p className="sm:col-span-2 text-[11px] font-semibold text-slate-400">
                New stops are added at the end of the route. Use the arrows in the list to reorder them.
              </p>
            )}
          </div>
        )}
      </Modal>

      {/* Student assignment */}
      <Modal
        isOpen={Boolean(riderModal)}
        onClose={() => setRiderModal(null)}
        title={riderModal?.editing ? 'Change route or stop' : 'Assign student to transport'}
        size="md"
        footer={
          <ModalFooter
            saving={saving}
            saveLabel={riderModal?.editing ? 'Save' : 'Assign'}
            onCancel={() => setRiderModal(null)}
            onSave={() => {
              const { editing, form } = riderModal;
              run(
                () =>
                  editing
                    ? transportPortalApi.updateAssignment(editing.id, {
                        routeId: form.routeId,
                        stopId: form.stopId,
                      })
                    : transportPortalApi.assignStudent(form),
                { onDone: () => setRiderModal(null) }
              );
            }}
          />
        }
      >
        {riderModal && (
          <div className="space-y-4">
            <Field label="Student" required>
              <select
                className={inputClass}
                disabled={Boolean(riderModal.editing)}
                value={riderModal.form.studentId}
                onChange={(e) => setRiderModal((m) => ({ ...m, form: { ...m.form, studentId: e.target.value } }))}
              >
                <option value="">Select a student</option>
                {lookups.students
                  .filter((s) => !s.alreadyAssigned || s.id === riderModal.form.studentId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.className ? ` · ${s.className}` : ''}
                      {s.admissionNumber ? ` · ${s.admissionNumber}` : ''}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Route" required hint="Only routes that already have stops, a bus and a driver">
              <select
                className={inputClass}
                value={riderModal.form.routeId}
                onChange={(e) =>
                  setRiderModal((m) => ({ ...m, form: { ...m.form, routeId: e.target.value, stopId: '' } }))
                }
              >
                <option value="">Select a route</option>
                {lookups.routes
                  .filter((r) => r.vehicle && r.driver && r.stops.length > 0)
                  .map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.routeName} · {r.vehicle.vehicleNumber}
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Pickup stop" required>
              <select
                className={inputClass}
                disabled={!riderRoute}
                value={riderModal.form.stopId}
                onChange={(e) => setRiderModal((m) => ({ ...m, form: { ...m.form, stopId: e.target.value } }))}
              >
                <option value="">Select a stop</option>
                {(riderRoute?.stops || []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sequenceOrder}. {s.stopName}
                  </option>
                ))}
              </select>
            </Field>

            {/* The whole point of step 5: timing comes from the stop, not typed in */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
              <p className={labelClass}>Scheduled times from this stop</p>
              {riderStop ? (
                <div className="mt-2 flex items-center gap-6">
                  <div>
                    <p className="text-[11px] font-bold text-slate-400">Pickup</p>
                    <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                      {riderStop.pickupTime}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-slate-400">Drop</p>
                    <p className="text-sm font-black text-amber-600 dark:text-amber-400">{riderStop.dropTime}</p>
                  </div>
                </div>
              ) : (
                <p className="mt-1.5 text-xs font-semibold text-slate-400">
                  Pick a stop to see the times the student inherits.
                </p>
              )}
            </div>

            {/* Step 6 – what this student will be charged, before it is stamped
                onto the assignment. Editing it later does not reach back. */}
            {!riderModal.editing && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className={labelClass}>Yearly transport fee</p>
                {lookups.currentAcademicYear ? (
                  <p className="mt-1.5 text-sm font-black text-slate-900 dark:text-white">
                    {money(lookups.currentYearlyFee)}{' '}
                    <span className="text-[11px] font-semibold text-slate-400">
                      for {lookups.currentAcademicYear.name}
                      {lookups.currentYearlyFee === null ? ' – not set yet, set it on the Yearly Fee tab' : ''}
                    </span>
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs font-semibold text-rose-500">
                    No current academic year is set for this school.
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title={confirm?.title}
        message={confirm?.message}
        variant={confirm?.variant || 'danger'}
        confirmText={confirm?.confirmText || 'Delete'}
        onConfirm={() => confirm?.onConfirm?.()}
      />

      {/* Driving License Document Preview Modal */}
      <Modal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        title={previewImage?.title || 'Document Preview'}
        size="lg"
        footer={
          <button className={ghostBtn} onClick={() => setPreviewImage(null)}>
            Close
          </button>
        }
      >
        {previewImage && (
          <div className="flex flex-col items-center justify-center p-2">
            <img
              src={previewImage.url}
              alt={previewImage.title || 'Document Preview'}
              className="max-h-[70vh] w-auto max-w-full rounded-2xl border border-slate-200 object-contain shadow-xs dark:border-slate-800"
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

/* ------------------------------ small pieces ------------------------------ */

const TableHead = ({ columns }) => (
  <thead className="bg-slate-50 dark:bg-slate-950/50">
    <tr>
      {columns.map((column, index) => (
        <th
          key={`${column}-${index}`}
          className={`px-5 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400 ${
            index === columns.length - 1 ? 'text-right' : ''
          }`}
        >
          {column}
        </th>
      ))}
    </tr>
  </thead>
);

const EmptyState = ({ icon: Icon, message }) => (
  <div className="flex flex-col items-center justify-center gap-3 px-5 py-14 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-900">
      <Icon className="h-5 w-5" />
    </div>
    <p className="max-w-xs text-xs font-semibold text-slate-400">{message}</p>
  </div>
);

const Field = ({ label, required, hint, className = '', children }) => (
  <div className={`space-y-1.5 ${className}`}>
    <label className={labelClass}>
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
    {hint && <p className="text-[11px] font-semibold text-slate-400">{hint}</p>}
  </div>
);

const ResourceSlot = ({ icon: Icon, label, value, hint }) => (
  <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950">
    <div
      className={`flex h-9 w-9 items-center justify-center rounded-xl ${
        value ? 'bg-indigo-50 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-slate-200 text-slate-400 dark:bg-slate-900'
      }`}
    >
      <Icon className="h-4 w-4" />
    </div>
    <div className="min-w-0">
      <p className={labelClass}>{label}</p>
      <p className="truncate text-sm font-black text-slate-900 dark:text-white">{value || 'Not assigned'}</p>
      <p className="truncate text-[11px] font-semibold text-slate-400">{hint}</p>
    </div>
  </div>
);

const ModalFooter = ({ saving, onCancel, onSave, saveLabel = 'Save' }) => (
  <>
    <button className={ghostBtn} onClick={onCancel} disabled={saving}>
      Cancel
    </button>
    <button className={primaryBtn} onClick={onSave} disabled={saving}>
      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {saveLabel}
    </button>
  </>
);

export default TransportManagement;

