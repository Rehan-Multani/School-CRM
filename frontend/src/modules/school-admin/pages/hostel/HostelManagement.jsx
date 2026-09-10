import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { hostelPortalApi } from '../../../../shared/api/client';
import { sanitizeMobileInput, isValid10DigitMobile } from '../../../../shared/utils/mobileValidation';
import {
  Bed,
  Building2,
  Check,
  IndianRupee,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Unlink,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';

/**
 * Hostel Ã¢â¬â the whole module, in the order it must be set up:
 *
 *   1 Hostel  Ã¢â â  2 Room  Ã¢â â  3 Beds (from the room's capacity)
 *   Ã¢â â  4 Warden + Hostel  Ã¢â â  5 Student + Hostel + Room + Bed
 *   Ã¢â â  6 Yearly hostel fee (per academic year)
 *
 * Every action on this page calls the real backend; there is no local fixture.
 */

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';
const labelClass = 'text-[11px] font-bold uppercase tracking-wider text-slate-400';
const cardClass =
  'rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-indigo-600';
const primaryBtn =
  'inline-flex items-center gap-2 rounded-xl bg-indigo-650 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60';
const ghostBtn =
  'inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-60 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-indigo-600';
const iconBtn =
  'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-800 disabled:opacity-40 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-indigo-600';

const HOSTEL_TYPES = [
  { id: 'BOYS', label: 'Boys' },
  { id: 'GIRLS', label: 'Girls' },
  { id: 'CO_ED', label: 'Co-ed' },
];

const TABS = [
  { id: 'hostels', label: 'Hostels', icon: Building2 },
  { id: 'rooms', label: 'Rooms & Beds', icon: Bed },
  { id: 'wardens', label: 'Wardens', icon: UserCog },
  { id: 'allocations', label: 'Student Assignments', icon: Users },
  { id: 'fees', label: 'Yearly Fee', icon: IndianRupee },
];

const HOSTEL_CATEGORIES = [
  { id: '', label: 'Not set' },
  { id: 'RESIDENTIAL', label: 'Residential' },
  { id: 'DAY_BOARDING', label: 'Day Boarding' },
];

const emptyHostel = {
  name: '',
  code: '',
  type: 'BOYS',
  category: '',
  wardenId: '',
  contactNumber: '',
  address: '',
  totalFloors: '',
  totalRooms: '',
  totalCapacity: 50,
  description: '',
  status: 'ACTIVE',
};
const emptyRoom = { hostelId: '', roomNumber: '', floorNumber: 'Ground Floor', capacity: 4 };
const emptyWarden = { name: '', mobile: '', hostelId: '', status: 'ACTIVE' };
const emptyAllocation = { studentId: '', hostelId: '', roomId: '', bedId: '' };

/** Surface the backend's own message Ã¢â¬â it already explains exactly what failed. */
const apiError = (error, fallback) => error?.response?.data?.message || error?.message || fallback;

const hostelTypeLabel = (id) => HOSTEL_TYPES.find((t) => t.id === id)?.label || id;
const hostelCategoryLabel = (id) => HOSTEL_CATEGORIES.find((c) => c.id === id)?.label || id;

/** Ã¢âÂ¹60,000 Ã¢â¬â or an em dash when the school has not set an amount yet. */
const money = (amount) =>
  amount === null || amount === undefined ? 'Ã¢â¬â' : `Ã¢âÂ¹${Number(amount).toLocaleString('en-IN')}`;

export const HostelManagement = () => {
  const [activeTab, setActiveTab] = useState('hostels');
  const { showToast, ToastComponent } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [wardens, setWardens] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [fees, setFees] = useState([]); // one row per academic year
  const [feeDrafts, setFeeDrafts] = useState({}); // academicYearId -> amount being typed
  const [lookups, setLookups] = useState({ students: [], hostels: [], wardens: [] });

  const [search, setSearch] = useState('');
  const [selectedHostelId, setSelectedHostelId] = useState(''); // Rooms & Beds panel

  const [hostelModal, setHostelModal] = useState(null); // null | { editing, form }
  const [roomModal, setRoomModal] = useState(null);
  const [wardenModal, setWardenModal] = useState(null);
  const [assignWardenModal, setAssignWardenModal] = useState(null); // warden Ã¢â â hostel
  const [residentModal, setResidentModal] = useState(null);
  const [confirm, setConfirm] = useState(null);

  /* ------------------------------- loading ------------------------------- */

  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const [hos, rms, wrd, alc, fee, lk] = await Promise.all([
          hostelPortalApi.hostels(),
          hostelPortalApi.rooms(),
          hostelPortalApi.wardens(),
          hostelPortalApi.allocations(),
          hostelPortalApi.fees(),
          hostelPortalApi.lookups(),
        ]);
        setHostels(hos.data || []);
        setRooms(rms.data || []);
        setWardens(wrd.data || []);
        setAllocations(alc.data || []);
        setFees(fee.data || []);
        // The fee inputs mirror what the server holds; anything half-typed is
        // dropped on a refresh rather than silently kept.
        setFeeDrafts(
          Object.fromEntries((fee.data || []).map((row) => [row.academicYearId, row.yearlyAmount ?? '']))
        );
        setLookups(lk.data || { students: [], hostels: [], wardens: [] });
      } catch (error) {
        showToast(apiError(error, 'Could not load hostel data'), 'error');
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Keep the rooms panel pointed at a hostel that still exists.
  useEffect(() => {
    if (!hostels.length) {
      setSelectedHostelId('');
      return;
    }
    if (!hostels.some((h) => h.id === selectedHostelId)) setSelectedHostelId(hostels[0].id);
  }, [hostels, selectedHostelId]);

  /* ------------------------------- helpers ------------------------------- */

  const selectedHostel = useMemo(
    () => hostels.find((h) => h.id === selectedHostelId) || null,
    [hostels, selectedHostelId]
  );
  const selectedRooms = useMemo(
    () => rooms.filter((r) => r.hostelId === selectedHostelId),
    [rooms, selectedHostelId]
  );

  const flow = useMemo(
    () => [
      { label: 'Hostel created', done: hostels.length > 0 },
      { label: 'Room created', done: rooms.length > 0 },
      { label: 'Beds defined', done: rooms.some((r) => (r.beds || []).length > 0) },
      { label: 'Warden runs a hostel', done: wardens.some((w) => w.hostelId) },
      { label: 'Student assigned', done: allocations.length > 0 },
      {
        label: 'Yearly fee set',
        done: fees.some((f) => f.academicYear?.isCurrent && f.yearlyAmount !== null),
      },
    ],
    [hostels, rooms, wardens, allocations, fees]
  );

  const term = search.trim().toLowerCase();
  const filteredHostels = useMemo(
    () =>
      term
        ? hostels.filter(
            (h) =>
              h.name.toLowerCase().includes(term) || (h.code || '').toLowerCase().includes(term)
          )
        : hostels,
    [hostels, term]
  );
  /**
   * A hostel holds at most one warden, so the picker offers the ones nobody
   * has claimed Ã¢â¬â plus, when editing, the hostel's own warden.
   */
  const hostelWardenOptions = useMemo(() => {
    const editingId = hostelModal?.editing?.id || '';
    return wardens.filter(
      (w) => w.status === 'ACTIVE' && (!w.hostelId || String(w.hostelId) === String(editingId))
    );
  }, [wardens, hostelModal]);

  const filteredWardens = useMemo(
    () =>
      term
        ? wardens.filter((w) => w.name.toLowerCase().includes(term) || w.mobile.includes(term))
        : wardens,
    [wardens, term]
  );
  const filteredAllocations = useMemo(
    () =>
      term
        ? allocations.filter(
            (a) =>
              (a.student?.name || '').toLowerCase().includes(term) ||
              (a.hostel?.name || '').toLowerCase().includes(term) ||
              (a.room?.roomNumber || '').toLowerCase().includes(term)
          )
        : allocations,
    [allocations, term]
  );

  /** Every mutation goes through here: run it, toast, refresh, close the modal. */
  const run = useCallback(
    async (action, { success, onDone } = {}) => {
      setSaving(true);
      try {
        const res = await action();
        showToast(success || res?.message || 'Saved', 'success');
        await loadAll({ silent: true });
        onDone?.();
        return true;
      } catch (error) {
        showToast(apiError(error, 'Something went wrong'), 'error');
        return false;
      } finally {
        setSaving(false);
      }
    },
    [loadAll, showToast]
  );

  /* ------------------------------ allocation ----------------------------- */

  const residentHostel = useMemo(
    () => lookups.hostels.find((h) => h.id === residentModal?.form.hostelId) || null,
    [lookups.hostels, residentModal]
  );
  const residentRoom = useMemo(
    () => residentHostel?.rooms.find((r) => r.id === residentModal?.form.roomId) || null,
    [residentHostel, residentModal]
  );

  /* -------------------------------- render ------------------------------- */

  return (
    <div className="space-y-6">
      <ToastComponent />

      <PageHeader
        title="Hostel"
        subtitle="Hostel Ã¢â â Room Ã¢â â Beds Ã¢â â Warden Ã¢â â Student assignment Ã¢â â Yearly fee"
        actions={
          <button className={ghostBtn} onClick={() => loadAll()} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        }
      />

      {/* SETUP PROGRESS Ã¢â¬â the flow this module is required to follow, in order */}
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
                    step.done ? 'bg-emerald-600 text-white' : 'bg-slate-300 text-slate-600 dark:bg-indigo-600'
                  }`}
                >
                  {step.done ? <Check className="h-2.5 w-2.5" /> : index + 1}
                </span>
                {step.label}
              </div>
              {index < flow.length - 1 && <span className="text-slate-300 dark:text-slate-700">Ã¢â¬Âº</span>}
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
              tab.id === 'hostels'
                ? hostels.length
                : tab.id === 'rooms'
                  ? rooms.length
                  : tab.id === 'wardens'
                    ? wardens.length
                    : tab.id === 'fees'
                      ? fees.filter((f) => f.yearlyAmount !== null).length
                      : allocations.length;
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
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {activeTab !== 'rooms' && activeTab !== 'fees' && (
          <div className="relative shrink-0 lg:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTab}â¦`}
              className={`${inputClass} pl-9`}
            />
          </div>
        )}
      </div>

      {loading && <SkeletonTable rows={6} columns={5} />}

      {/* ============================= 1 ÃÂ· HOSTELS =========================== */}
      {!loading && activeTab === 'hostels' && (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Hostels</h3>
              <p className="text-[11px] font-semibold text-slate-400">
                Step 1 Ã¢â¬â the building and how many students it holds
              </p>
            </div>
            <button className={primaryBtn} onClick={() => setHostelModal({ editing: null, form: emptyHostel })}>
              <Plus className="h-3.5 w-3.5" /> Add Hostel
            </button>
          </div>

          {filteredHostels.length === 0 ? (
            <EmptyState icon={Building2} message="No hostels yet. Add one to start the flow." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <TableHead
                  columns={['Hostel', 'Type', 'Warden', 'Contact', 'Rooms', 'Beds', 'Residents', 'Status', '']}
                />
                <tbody>
                  {filteredHostels.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-5 py-3.5 font-black text-slate-900 dark:text-white">
                        {row.name}
                        <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                          {row.code}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                        {hostelTypeLabel(row.type)}
                        {row.category ? (
                          <div className="text-[11px] font-semibold text-slate-400">
                            {hostelCategoryLabel(row.category)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                        {row.warden ? (
                          <>
                            {row.warden.name}
                            <div className="text-[11px] font-semibold text-slate-400">{row.warden.mobile}</div>
                          </>
                        ) : (
                          <span className="text-amber-600 dark:text-amber-400">Not assigned</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                        {row.contactNumber || 'Ã¢â¬â'}
                        {row.address ? (
                          <div className="max-w-[180px] truncate text-[11px] font-semibold text-slate-400">
                            {row.address}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200">
                        {row.roomsCreated}
                        {row.totalRooms ? (
                          <span className="font-semibold text-slate-400"> / {row.totalRooms}</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200">
                        {row.occupiedBeds} / {row.totalBeds}
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-700 dark:text-slate-200">
                        {row.residents} / {row.totalCapacity}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'default'}>{row.status}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            className={iconBtn}
                            title="Edit hostel"
                            onClick={() =>
                              setHostelModal({
                                editing: row,
                                form: {
                                  name: row.name,
                                  code: row.code || '',
                                  type: row.type,
                                  category: row.category || '',
                                  wardenId: row.warden?.id || '',
                                  contactNumber: row.contactNumber || '',
                                  address: row.address || '',
                                  totalFloors: row.totalFloors ?? '',
                                  totalRooms: row.totalRooms ?? '',
                                  totalCapacity: row.totalCapacity,
                                  description: row.description || '',
                                  status: row.status,
                                },
                              })
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className={iconBtn}
                            title="Delete hostel"
                            onClick={() =>
                              setConfirm({
                                title: 'Delete hostel',
                                message: `Delete ${row.name}? Its rooms must be deleted and its residents vacated first.`,
                                confirmText: 'Delete',
                                onConfirm: () =>
                                  run(() => hostelPortalApi.deleteHostel(row.id), { success: 'Hostel deleted' }),
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

      {/* ========================= 2 + 3 ÃÂ· ROOMS & BEDS ====================== */}
      {!loading && activeTab === 'rooms' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
          {/* hostel picker */}
          <div className={`${cardClass} h-fit overflow-hidden`}>
            <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Hostels</h3>
            </div>
            {hostels.length === 0 ? (
              <EmptyState icon={Building2} message="Add a hostel first." />
            ) : (
              <div className="p-2">
                {hostels.map((hostel) => (
                  <button
                    key={hostel.id}
                    onClick={() => setSelectedHostelId(hostel.id)}
                    className={`mb-1 w-full rounded-xl px-3 py-2.5 text-left text-xs font-bold transition-colors ${
                      hostel.id === selectedHostelId
                        ? 'bg-indigo-50 text-indigo-650 dark:bg-indigo-950/40 dark:text-indigo-400'
                        : 'text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-indigo-600'
                    }`}
                  >
                    {hostel.name}
                    <div className="text-[11px] font-semibold text-slate-400">
                      {hostel.roomsCreated} room(s) ÃÂ· {hostel.occupiedBeds}/{hostel.totalBeds} beds
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* rooms of the selected hostel */}
          <div className={`${cardClass} overflow-hidden`}>
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  {selectedHostel ? `Rooms in ${selectedHostel.name}` : 'Rooms'}
                </h3>
                <p className="text-[11px] font-semibold text-slate-400">
                  Steps 2 + 3 Ã¢â¬â a room's capacity defines its beds, which are created with it
                </p>
              </div>
              <button
                className={primaryBtn}
                disabled={!selectedHostelId}
                onClick={() =>
                  setRoomModal({ editing: null, form: { ...emptyRoom, hostelId: selectedHostelId } })
                }
              >
                <Plus className="h-3.5 w-3.5" /> Add Room
              </button>
            </div>

            {selectedRooms.length === 0 ? (
              <EmptyState
                icon={Bed}
                message={selectedHostelId ? 'No rooms in this hostel yet.' : 'Pick a hostel first.'}
              />
            ) : (
              <div className="space-y-3 p-4">
                {selectedRooms.map((room) => (
                  <div
                    key={room.id}
                    className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          Room {room.roomNumber}
                        </p>
                        <p className="text-[11px] font-semibold text-slate-400">
                          {room.floorNumber} ÃÂ· occupancy {room.occupiedBeds} / {room.capacity}
                        </p>
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          className={iconBtn}
                          title="Edit room"
                          onClick={() =>
                            setRoomModal({
                              editing: room,
                              form: {
                                hostelId: room.hostelId,
                                roomNumber: room.roomNumber,
                                floorNumber: room.floorNumber,
                                capacity: room.capacity,
                              },
                            })
                          }
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className={iconBtn}
                          title="Delete room"
                          onClick={() =>
                            setConfirm({
                              title: 'Delete room',
                              message: `Delete room ${room.roomNumber} and its ${room.capacity} bed(s)?`,
                              confirmText: 'Delete',
                              onConfirm: () =>
                                run(() => hostelPortalApi.deleteRoom(room.id), { success: 'Room deleted' }),
                            })
                          }
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* the beds themselves Ã¢â¬â step 3, maintained by the server */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(room.beds || []).map((bed) => (
                        <div
                          key={bed.id}
                          className={`rounded-xl px-3 py-2 text-[11px] font-bold ${
                            bed.status === 'OCCUPIED'
                              ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                              : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400'
                          }`}
                        >
                          {bed.bedCode}
                          <div className="text-[10px] font-semibold opacity-80">
                            {bed.status === 'OCCUPIED' ? bed.student?.name || 'Occupied' : 'Available'}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================= 4 ÃÂ· WARDENS =========================== */}
      {!loading && activeTab === 'wardens' && (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Wardens</h3>
              <p className="text-[11px] font-semibold text-slate-400">
                Step 4 Ã¢â¬â who is responsible for a hostel. One warden per hostel.
              </p>
            </div>
            <button className={primaryBtn} onClick={() => setWardenModal({ editing: null, form: emptyWarden })}>
              <Plus className="h-3.5 w-3.5" /> Add Warden
            </button>
          </div>

          {filteredWardens.length === 0 ? (
            <EmptyState icon={UserCog} message="No wardens yet. A hostel needs one before it can take students." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <TableHead columns={['Warden', 'Mobile', 'Hostel', 'Status', '']} />
                <tbody>
                  {filteredWardens.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-5 py-3.5 font-black text-slate-900 dark:text-white">{row.name}</td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                        {row.mobile}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                        {row.hostel?.name || <span className="text-slate-400">Not assigned</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={row.status === 'ACTIVE' ? 'success' : 'default'}>{row.status}</Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            className={iconBtn}
                            title={row.hostelId ? 'Change hostel' : 'Assign to a hostel'}
                            onClick={() => setAssignWardenModal({ warden: row, hostelId: row.hostelId || '' })}
                          >
                            <Building2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className={iconBtn}
                            title="Remove from hostel"
                            disabled={!row.hostelId}
                            onClick={() =>
                              run(() => hostelPortalApi.unassignWardenFromHostel(row.id), {
                                success: 'Warden removed from hostel',
                              })
                            }
                          >
                            <Unlink className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className={iconBtn}
                            title="Edit warden"
                            onClick={() =>
                              setWardenModal({
                                editing: row,
                                form: {
                                  name: row.name,
                                  mobile: row.mobile,
                                  hostelId: row.hostelId || '',
                                  status: row.status,
                                },
                              })
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className={iconBtn}
                            title="Delete warden"
                            onClick={() =>
                              setConfirm({
                                title: 'Delete warden',
                                message: `Delete ${row.name}? A warden who still runs a hostel must be unassigned first.`,
                                confirmText: 'Delete',
                                onConfirm: () =>
                                  run(() => hostelPortalApi.deleteWarden(row.id), { success: 'Warden deleted' }),
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

      {/* ======================= 5 ÃÂ· STUDENT ASSIGNMENTS ===================== */}
      {!loading && activeTab === 'allocations' && (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Student Assignments</h3>
              <p className="text-[11px] font-semibold text-slate-400">
                Step 5 Ã¢â¬â taking a bed marks it occupied; the yearly fee is stamped on at that moment
              </p>
            </div>
            <button
              className={primaryBtn}
              onClick={() => setResidentModal({ editing: null, form: emptyAllocation })}
              disabled={!lookups.hostels.some((h) => h.warden && h.rooms.length > 0)}
              title={
                lookups.hostels.some((h) => h.warden && h.rooms.length > 0)
                  ? undefined
                  : 'A hostel needs rooms and a warden first'
              }
            >
              <UserPlus className="h-3.5 w-3.5" /> Assign Student
            </button>
          </div>

          {filteredAllocations.length === 0 ? (
            <EmptyState
              icon={Users}
              message={
                lookups.hostels.some((h) => h.warden && h.rooms.length > 0)
                  ? 'No students in the hostel yet.'
                  : 'Finish steps 1Ã¢â¬â4 first: a hostel with rooms and a warden.'
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <TableHead
                  columns={['Student', 'Class', 'Hostel', 'Room', 'Bed', 'Year', 'Yearly fee', '']}
                />
                <tbody>
                  {filteredAllocations.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="px-5 py-3.5">
                        <div className="font-black text-slate-900 dark:text-white">{row.student?.name}</div>
                        <div className="text-[11px] font-semibold text-slate-400">
                          {row.student?.admissionNumber}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                        {row.student?.className || 'Ã¢â¬â'}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                        {row.hostel?.name}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {row.room?.roomNumber}
                        </span>
                        <div className="text-[11px] font-semibold text-slate-400">{row.room?.floorNumber}</div>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-indigo-650 dark:text-indigo-400">
                        {row.bed?.bedCode}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-slate-600 dark:text-slate-300">
                        {row.academicYear?.name || 'Ã¢â¬â'}
                      </td>
                      <td className="px-5 py-3.5 font-black text-slate-900 dark:text-white">
                        {money(row.yearlyFeeAmount)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          <button
                            className={iconBtn}
                            title="Move to another room or bed"
                            onClick={() =>
                              setResidentModal({
                                editing: row,
                                form: {
                                  studentId: row.student?.id || '',
                                  hostelId: row.hostel?.id || '',
                                  roomId: row.room?.id || '',
                                  bedId: row.bed?.id || '',
                                },
                              })
                            }
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className={iconBtn}
                            title="Vacate"
                            onClick={() =>
                              setConfirm({
                                title: 'Vacate student',
                                message: `Move ${row.student?.name} out of ${row.hostel?.name} (room ${row.room?.roomNumber}, ${row.bed?.bedCode})? The bed becomes available again.`,
                                confirmText: 'Vacate',
                                onConfirm: () =>
                                  run(() => hostelPortalApi.vacateAllocation(row.id), {
                                    success: 'Student vacated from hostel',
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

      {/* =========================== 6 ÃÂ· YEARLY FEE ========================== */}
      {!loading && activeTab === 'fees' && (
        <div className={`${cardClass} overflow-hidden`}>
          <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Yearly Hostel Fee</h3>
            <p className="text-[11px] font-semibold text-slate-400">
              Step 6 Ã¢â¬â one amount per academic year for the whole school. Every resident pays the same,
              whatever their class or hostel.
            </p>
          </div>

          {fees.length === 0 ? (
            <EmptyState
              icon={IndianRupee}
              message="No academic years yet. Create one under Academic Years, then set its hostel fee here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <TableHead columns={['Academic year', 'Yearly fee', 'Residents on this year', '']} />
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
                            <span className="text-xs font-black text-slate-400">Ã¢âÂ¹</span>
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
                                run(() => hostelPortalApi.setFee(row.academicYearId, Number(draft)), {
                                  success: `Hostel fee saved for ${row.academicYear?.name}`,
                                })
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
                                  title: 'Clear hostel fee',
                                  message: `Remove the yearly hostel fee for ${row.academicYear?.name}? Students already assigned keep the amount they were assigned on.`,
                                  confirmText: 'Clear',
                                  onConfirm: () =>
                                    run(() => hostelPortalApi.clearFee(row.academicYearId), {
                                      success: 'Hostel fee cleared',
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

      {/* Hostel */}
      <Modal
        isOpen={Boolean(hostelModal)}
        onClose={() => setHostelModal(null)}
        title={hostelModal?.editing ? 'Edit hostel' : 'Add hostel'}
        size="lg"
        footer={
          <ModalFooter
            saving={saving}
            onCancel={() => setHostelModal(null)}
            onSave={() => {
              const { editing, form } = hostelModal;
              // Blank optional numbers are sent as '' so the server clears them
              // rather than reading a stray 0.
              const payload = {
                ...form,
                totalCapacity: Number(form.totalCapacity),
                totalFloors: form.totalFloors === '' ? '' : Number(form.totalFloors),
                totalRooms: form.totalRooms === '' ? '' : Number(form.totalRooms),
              };
              run(
                () =>
                  editing
                    ? hostelPortalApi.updateHostel(editing.id, payload)
                    : hostelPortalApi.createHostel(payload),
                { onDone: () => setHostelModal(null) }
              );
            }}
          />
        }
      >
        {hostelModal && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hostel name" required>
              <input
                className={inputClass}
                placeholder="Boys Hostel A"
                value={hostelModal.form.name}
                onChange={(e) => setHostelModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))}
              />
            </Field>
            <Field label="Hostel code" required hint="Short handle, unique in the school">
              <input
                className={inputClass}
                placeholder="BH-01"
                value={hostelModal.form.code}
                onChange={(e) =>
                  setHostelModal((m) => ({ ...m, form: { ...m.form, code: e.target.value.toUpperCase() } }))
                }
              />
            </Field>
            <Field label="Hostel type" required>
              <select
                className={inputClass}
                value={hostelModal.form.type}
                onChange={(e) => setHostelModal((m) => ({ ...m, form: { ...m.form, type: e.target.value } }))}
              >
                {HOSTEL_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hostel category" hint="Optional">
              <select
                className={inputClass}
                value={hostelModal.form.category}
                onChange={(e) =>
                  setHostelModal((m) => ({ ...m, form: { ...m.form, category: e.target.value } }))
                }
              >
                {HOSTEL_CATEGORIES.map((c) => (
                  <option key={c.id || 'none'} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field
              label="Warden"
              hint={
                hostelWardenOptions.length
                  ? 'Only free wardens are listed'
                  : 'Add a warden on the Wardens tab first'
              }
            >
              <select
                className={inputClass}
                value={hostelModal.form.wardenId}
                onChange={(e) =>
                  setHostelModal((m) => ({ ...m, form: { ...m.form, wardenId: e.target.value } }))
                }
              >
                <option value="">No warden yet</option>
                {hostelWardenOptions.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ÃÂ· {w.mobile}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Contact number" hint="Optional ÃÂ· 10 digits">
              <input
                className={inputClass}
                placeholder="9876543210"
                inputMode="numeric"
                value={hostelModal.form.contactNumber}
                onChange={(e) =>
                  setHostelModal((m) => ({
                    ...m,
                    form: { ...m.form, contactNumber: sanitizeMobileInput(e.target.value) },
                  }))
                }
              />
            </Field>
            <Field label="Address" hint="Optional" className="sm:col-span-2">
              <input
                className={inputClass}
                placeholder="School Campus, Block A"
                value={hostelModal.form.address}
                onChange={(e) => setHostelModal((m) => ({ ...m, form: { ...m.form, address: e.target.value } }))}
              />
            </Field>
            <Field label="Total floors" hint="Optional">
              <input
                type="number"
                min={1}
                max={50}
                className={inputClass}
                placeholder="e.g. 3"
                value={hostelModal.form.totalFloors}
                onChange={(e) =>
                  setHostelModal((m) => ({ ...m, form: { ...m.form, totalFloors: e.target.value } }))
                }
              />
            </Field>
            <Field label="Total rooms" hint="Optional ÃÂ· rooms are added in step 2">
              <input
                type="number"
                min={1}
                max={500}
                className={inputClass}
                placeholder="e.g. 30"
                value={hostelModal.form.totalRooms}
                onChange={(e) =>
                  setHostelModal((m) => ({ ...m, form: { ...m.form, totalRooms: e.target.value } }))
                }
              />
            </Field>
            <Field label="Total capacity" required hint="Residents this building can hold">
              <input
                placeholder="e.g. 120"
                type="number"
                min={1}
                max={2000}
                className={inputClass}
                value={hostelModal.form.totalCapacity}
                onChange={(e) =>
                  setHostelModal((m) => ({ ...m, form: { ...m.form, totalCapacity: e.target.value } }))
                }
              />
            </Field>
            <Field label="Status" required>
              <select
                className={inputClass}
                value={hostelModal.form.status}
                onChange={(e) => setHostelModal((m) => ({ ...m, form: { ...m.form, status: e.target.value } }))}
              >
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </Field>
            <Field label="Description" hint="Optional" className="sm:col-span-2">
              <textarea
                rows={2}
                className={inputClass}
                placeholder="Boys hostel near main building"
                value={hostelModal.form.description}
                onChange={(e) =>
                  setHostelModal((m) => ({ ...m, form: { ...m.form, description: e.target.value } }))
                }
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* Room */}
      <Modal
        isOpen={Boolean(roomModal)}
        onClose={() => setRoomModal(null)}
        title={roomModal?.editing ? 'Edit room' : 'Add room'}
        size="md"
        footer={
          <ModalFooter
            saving={saving}
            onCancel={() => setRoomModal(null)}
            onSave={() => {
              const { editing, form } = roomModal;
              const payload = { ...form, capacity: Number(form.capacity) };
              run(
                () =>
                  editing ? hostelPortalApi.updateRoom(editing.id, payload) : hostelPortalApi.createRoom(payload),
                { onDone: () => setRoomModal(null) }
              );
            }}
          />
        }
      >
        {roomModal && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Hostel" required className="sm:col-span-2">
              <select
                className={inputClass}
                disabled={Boolean(roomModal.editing)}
                value={roomModal.form.hostelId}
                onChange={(e) => setRoomModal((m) => ({ ...m, form: { ...m.form, hostelId: e.target.value } }))}
              >
                <option value="">Select a hostelâ¦</option>
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Room number" required>
              <input
                className={inputClass}
                placeholder="101"
                value={roomModal.form.roomNumber}
                onChange={(e) => setRoomModal((m) => ({ ...m, form: { ...m.form, roomNumber: e.target.value } }))}
              />
            </Field>
            <Field label="Floor" required>
              <input
                className={inputClass}
                placeholder="1st Floor"
                value={roomModal.form.floorNumber}
                onChange={(e) =>
                  setRoomModal((m) => ({ ...m, form: { ...m.form, floorNumber: e.target.value } }))
                }
              />
            </Field>
            <Field
              label="Capacity"
              required
              hint="Beds are created from this Ã¢â¬â Bed 1 â¦ Bed n"
              className="sm:col-span-2"
            >
              <input
                placeholder="e.g. 4"
                type="number"
                min={1}
                max={50}
                className={inputClass}
                value={roomModal.form.capacity}
                onChange={(e) => setRoomModal((m) => ({ ...m, form: { ...m.form, capacity: e.target.value } }))}
              />
            </Field>
          </div>
        )}
      </Modal>

      {/* Warden */}
      <Modal
        isOpen={Boolean(wardenModal)}
        onClose={() => setWardenModal(null)}
        title={wardenModal?.editing ? 'Edit warden' : 'Add warden'}
        size="md"
        footer={
          <ModalFooter
            saving={saving}
            onCancel={() => setWardenModal(null)}
            onSave={() => {
              const { editing, form } = wardenModal;
              if (!form.name?.trim()) {
                showToast('Warden name is required', 'error');
                return;
              }
              if (!isValid10DigitMobile(form.mobile, true)) {
                showToast('Mobile number must be exactly 10 digits', 'error');
                return;
              }
              const cleanMobile = sanitizeMobileInput(form.mobile);
              // On edit the hostel link has its own endpoint, so it is not sent here.
              const payload = editing
                ? { name: form.name.trim(), mobile: cleanMobile, status: form.status }
                : { ...form, name: form.name.trim(), mobile: cleanMobile, hostelId: form.hostelId || undefined };
              run(
                () =>
                  editing
                    ? hostelPortalApi.updateWarden(editing.id, payload)
                    : hostelPortalApi.createWarden(payload),
                { onDone: () => setWardenModal(null) }
              );
            }}
          />
        }
      >
        {wardenModal && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Warden name" required>
              <input
                className={inputClass}
                placeholder="Rajesh Sharma"
                value={wardenModal.form.name}
                onChange={(e) => setWardenModal((m) => ({ ...m, form: { ...m.form, name: e.target.value } }))}
              />
            </Field>
            <Field
              label="Mobile"
              required
              hint={wardenModal.form.mobile ? `${wardenModal.form.mobile.length}/10 digits` : '10 digits'}
            >
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                className={inputClass}
                placeholder="9876543210"
                value={wardenModal.form.mobile}
                onChange={(e) =>
                  setWardenModal((m) => ({
                    ...m,
                    form: { ...m.form, mobile: sanitizeMobileInput(e.target.value) },
                  }))
                }
              />
            </Field>
            {!wardenModal.editing && (
              <Field label="Hostel" hint="Optional Ã¢â¬â can be assigned later" className="sm:col-span-2">
                <select
                  className={inputClass}
                  value={wardenModal.form.hostelId}
                  onChange={(e) =>
                    setWardenModal((m) => ({ ...m, form: { ...m.form, hostelId: e.target.value } }))
                  }
                >
                  <option value="">Not assigned yet</option>
                  {hostels
                    .filter((h) => h.status === 'ACTIVE' && !h.warden)
                    .map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                </select>
              </Field>
            )}
            {wardenModal.editing && (
              <Field label="Status" className="sm:col-span-2">
                <select
                  className={inputClass}
                  value={wardenModal.form.status}
                  onChange={(e) =>
                    setWardenModal((m) => ({ ...m, form: { ...m.form, status: e.target.value } }))
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </Field>
            )}
          </div>
        )}
      </Modal>

      {/* Warden Ã¢â â hostel */}
      <Modal
        isOpen={Boolean(assignWardenModal)}
        onClose={() => setAssignWardenModal(null)}
        title="Assign warden to hostel"
        size="sm"
        footer={
          <ModalFooter
            saving={saving}
            saveLabel="Assign"
            onCancel={() => setAssignWardenModal(null)}
            onSave={() =>
              run(
                () =>
                  hostelPortalApi.assignWardenToHostel(
                    assignWardenModal.warden.id,
                    assignWardenModal.hostelId
                  ),
                { success: 'Warden assigned to hostel', onDone: () => setAssignWardenModal(null) }
              )
            }
          />
        }
      >
        {assignWardenModal && (
          <Field label={`Hostel for ${assignWardenModal.warden.name}`} required>
            <select
              className={inputClass}
              value={assignWardenModal.hostelId}
              onChange={(e) => setAssignWardenModal((m) => ({ ...m, hostelId: e.target.value }))}
            >
              <option value="">Select a hostelâ¦</option>
              {hostels
                .filter(
                  (h) =>
                    h.status === 'ACTIVE' && (!h.warden || h.warden.id === assignWardenModal.warden.id)
                )
                .map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
            </select>
          </Field>
        )}
      </Modal>

      {/* Student Ã¢â â hostel + room + bed */}
      <Modal
        isOpen={Boolean(residentModal)}
        onClose={() => setResidentModal(null)}
        title={residentModal?.editing ? 'Move to another room or bed' : 'Assign student to hostel'}
        size="md"
        footer={
          <ModalFooter
            saving={saving}
            saveLabel={residentModal?.editing ? 'Save' : 'Assign'}
            onCancel={() => setResidentModal(null)}
            onSave={() => {
              const { editing, form } = residentModal;
              run(
                () =>
                  editing
                    ? hostelPortalApi.updateAllocation(editing.id, {
                        hostelId: form.hostelId,
                        roomId: form.roomId,
                        bedId: form.bedId,
                      })
                    : hostelPortalApi.allocateStudent(form),
                { onDone: () => setResidentModal(null) }
              );
            }}
          />
        }
      >
        {residentModal && (
          <div className="space-y-4">
            <Field label="Student" required>
              <select
                className={inputClass}
                disabled={Boolean(residentModal.editing)}
                value={residentModal.form.studentId}
                onChange={(e) =>
                  setResidentModal((m) => ({ ...m, form: { ...m.form, studentId: e.target.value } }))
                }
              >
                <option value="">Select a studentâ¦</option>
                {lookups.students
                  .filter((s) => !s.alreadyAssigned || s.id === residentModal.form.studentId)
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} {s.className ? `ÃÂ· ${s.className}` : ''} ({s.admissionNumber})
                    </option>
                  ))}
              </select>
            </Field>

            <Field label="Hostel" required>
              <select
                className={inputClass}
                value={residentModal.form.hostelId}
                onChange={(e) =>
                  setResidentModal((m) => ({
                    ...m,
                    form: { ...m.form, hostelId: e.target.value, roomId: '', bedId: '' },
                  }))
                }
              >
                <option value="">Select a hostelâ¦</option>
                {lookups.hostels.map((h) => (
                  <option key={h.id} value={h.id} disabled={!h.warden}>
                    {h.name} {h.warden ? `ÃÂ· warden ${h.warden.name}` : 'ÃÂ· no warden yet'}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Room" required>
              <select
                className={inputClass}
                disabled={!residentHostel}
                value={residentModal.form.roomId}
                onChange={(e) =>
                  setResidentModal((m) => ({ ...m, form: { ...m.form, roomId: e.target.value, bedId: '' } }))
                }
              >
                <option value="">Select a roomâ¦</option>
                {(residentHostel?.rooms || []).map((r) => (
                  <option key={r.id} value={r.id}>
                    Room {r.roomNumber} ÃÂ· {r.floorNumber} ({r.beds.filter((b) => b.status === 'AVAILABLE').length}{' '}
                    free of {r.capacity})
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Bed" required hint="Occupied beds cannot be picked">
              <select
                className={inputClass}
                disabled={!residentRoom}
                value={residentModal.form.bedId}
                onChange={(e) => setResidentModal((m) => ({ ...m, form: { ...m.form, bedId: e.target.value } }))}
              >
                <option value="">Select a bedâ¦</option>
                {(residentRoom?.beds || []).map((b) => (
                  <option
                    key={b.id}
                    value={b.id}
                    disabled={b.status === 'OCCUPIED' && b.id !== residentModal.form.bedId}
                  >
                    {b.bedCode} {b.status === 'OCCUPIED' ? 'ÃÂ· occupied' : 'ÃÂ· available'}
                  </option>
                ))}
              </select>
            </Field>

            {/* Step 6 Ã¢â¬â what this student will be charged, before it is stamped
                onto the allocation. Editing it later does not reach back. */}
            {!residentModal.editing && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950">
                <p className={labelClass}>Yearly hostel fee</p>
                {lookups.currentAcademicYear ? (
                  <p className="mt-1.5 text-sm font-black text-slate-900 dark:text-white">
                    {money(lookups.currentYearlyFee)}{' '}
                    <span className="text-[11px] font-semibold text-slate-400">
                      for {lookups.currentAcademicYear.name}
                      {lookups.currentYearlyFee === null ? ' Ã¢â¬â not set yet, set it on the Yearly Fee tab' : ''}
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
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-indigo-600">
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

export default HostelManagement;

