import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { hostelPortalApi } from '../../../../shared/api/client';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRightLeft,
  Bed,
  Building,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DoorClosed,
  DoorOpen,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  GraduationCap,
  Home,
  Info,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  LogOut,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Utensils,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react';
import { SkeletonStatCard, SkeletonTable } from '../../components/ui/SkeletonLoader';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const ROOM_TYPES = [
  { id: 'SINGLE', label: 'Single Room (1 Bed)', capacity: 1 },
  { id: 'DOUBLE', label: 'Double Sharing (2 Beds)', capacity: 2 },
  { id: 'TRIPLE', label: 'Triple Sharing (3 Beds)', capacity: 3 },
  { id: 'FOUR_BED', label: '4-Bed Dorm (4 Beds)', capacity: 4 },
  { id: 'DORMITORY', label: 'Large Dormitory (6 Beds)', capacity: 6 },
];

const COMPLAINT_CATEGORIES = [
  { id: 'ELECTRICAL', label: 'Electrical (Fan/Light/Socket)', icon: Zap },
  { id: 'PLUMBING', label: 'Plumbing (Tap/Washroom/Water)', icon: Wrench },
  { id: 'CARPENTRY', label: 'Carpentry (Bed/Door/Cupboard)', icon: Building },
  { id: 'CLEANLINESS', label: 'Cleanliness & Housekeeping', icon: Sparkles },
  { id: 'MESS_FOOD', label: 'Mess & Food Quality', icon: Utensils },
  { id: 'INTERNET', label: 'Wi-Fi & Internet', icon: Info },
  { id: 'SECURITY', label: 'Security & Safety', icon: Shield },
  { id: 'OTHER', label: 'Other General Issue', icon: AlertCircle },
];

const OUTING_TYPES = [
  { id: 'DAY_OUTING', label: 'Day Outing (Market/Tuition)' },
  { id: 'NIGHT_STAY', label: 'Night Stay / Weekend Off' },
  { id: 'HOME_VISIT', label: 'Home Visit / Vacation' },
  { id: 'MEDICAL', label: 'Medical / Hospital Visit' },
  { id: 'EMERGENCY', label: 'Emergency Leave' },
];

export const HostelManagement = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { showToast, ToastComponent } = useToast();
  const { currentRole } = useSchoolAdminAuth();

  // Core State
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [hostels, setHostels] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [beds, setBeds] = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [outings, setOutings] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [visualizerData, setVisualizerData] = useState([]);
  const [eligibleEntities, setEligibleEntities] = useState({ students: [], staff: [] });

  // Filters
  const [selectedHostelId, setSelectedHostelId] = useState('');
  const [roomFilterFloor, setRoomFilterFloor] = useState('ALL');
  const [searchStudent, setSearchStudent] = useState('');
  const [complaintFilterStatus, setComplaintFilterStatus] = useState('ALL');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceSheet, setAttendanceSheet] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Modals Control
  const [hostelModalOpen, setHostelModalOpen] = useState(false);
  const [editingHostel, setEditingHostel] = useState(null);
  const [hostelForm, setHostelForm] = useState({
    name: '',
    type: 'BOYS',
    wardenId: '',
    contactNumber: '',
    address: { addressLine: '', city: '', state: '', pincode: '' },
    totalBlocks: 1,
    totalFloors: 3,
    description: '',
  });

  const [roomModalOpen, setRoomModalOpen] = useState(false);
  const [roomForm, setRoomForm] = useState({
    hostelId: '',
    blockName: 'Block A',
    floorNumber: 'Ground Floor',
    roomNumber: '',
    roomType: 'DOUBLE',
    capacity: 2,
    monthlyRent: 5000,
    amenitiesText: 'Attached Washroom, Study Table, Cupboard',
    description: '',
  });

  const [allocateModalOpen, setAllocateModalOpen] = useState(false);
  const [allocateForm, setAllocateForm] = useState({
    studentId: '',
    hostelId: '',
    roomId: '',
    bedId: '',
    monthlyFee: 5000,
    securityDeposit: 2000,
    remarks: '',
  });

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferTargetAlloc, setTransferTargetAlloc] = useState(null);
  const [transferBedId, setTransferBedId] = useState('');

  const [checkoutModalOpen, setCheckoutModalOpen] = useState(false);
  const [checkoutTargetAlloc, setCheckoutTargetAlloc] = useState(null);
  const [checkoutForm, setCheckoutForm] = useState({
    checkoutDate: new Date().toISOString().split('T')[0],
    checkoutReason: 'Session End / Normal Vacation',
    checkoutRemarks: '',
    depositRefunded: 0,
  });

  const [outingModalOpen, setOutingModalOpen] = useState(false);
  const [outingForm, setOutingForm] = useState({
    studentId: '',
    hostelId: '',
    outingType: 'DAY_OUTING',
    outDateTime: new Date().toISOString().slice(0, 16),
    expectedReturnDateTime: new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 16),
    reason: '',
    destination: '',
    parentPermissionStatus: 'APPROVED',
    remarks: '',
  });

  const [complaintModalOpen, setComplaintModalOpen] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    hostelId: '',
    roomId: '',
    studentId: '',
    category: 'ELECTRICAL',
    title: '',
    description: '',
    priority: 'MEDIUM',
    assignedStaffId: '',
  });

  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // --- DATA FETCHING ---
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, hostelsRes, roomsRes, allocRes, outingsRes, complaintsRes, eligRes, visRes] = await Promise.all([
        hostelPortalApi.dashboard().catch(() => ({ data: null })),
        hostelPortalApi.hostels().catch(() => ({ data: [] })),
        hostelPortalApi.rooms().catch(() => ({ data: [] })),
        hostelPortalApi.allocations().catch(() => ({ data: [] })),
        hostelPortalApi.outings().catch(() => ({ data: [] })),
        hostelPortalApi.complaints().catch(() => ({ data: [] })),
        hostelPortalApi.eligibleEntities().catch(() => ({ data: { students: [], staff: [] } })),
        hostelPortalApi.bedVisualizer().catch(() => ({ data: [] })),
      ]);

      if (dashRes?.data) setDashboardData(dashRes.data);
      if (hostelsRes?.data) {
        setHostels(hostelsRes.data);
        if (!selectedHostelId && hostelsRes.data.length > 0) {
          setSelectedHostelId(hostelsRes.data[0]._id);
        }
      }
      if (roomsRes?.data) setRooms(roomsRes.data);
      if (allocRes?.data) setAllocations(allocRes.data);
      if (outingsRes?.data) setOutings(outingsRes.data);
      if (complaintsRes?.data) setComplaints(complaintsRes.data);
      if (eligRes?.data) setEligibleEntities(eligRes.data);
      if (visRes?.data) setVisualizerData(visRes.data);
    } catch (err) {
      showToast(err.message || 'Failed to load hostel records', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedHostelId, showToast]);

  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch Attendance when tab or hostel or date changes
  const fetchAttendanceSheet = useCallback(async () => {
    if (!selectedHostelId) return;
    setAttendanceLoading(true);
    try {
      const res = await hostelPortalApi.getAttendance(selectedHostelId, { date: attendanceDate });
      if (res?.data) {
        setAttendanceSheet(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load attendance roll call', 'error');
    } finally {
      setAttendanceLoading(false);
    }
  }, [selectedHostelId, attendanceDate, showToast]);

  useEffect(() => {
    if (activeTab === 'attendance' && selectedHostelId) {
      fetchAttendanceSheet();
    }
  }, [activeTab, selectedHostelId, attendanceDate, fetchAttendanceSheet]);

  // --- SEED DEMO DATA ---
  const handleSeedDemo = async () => {
    try {
      setLoading(true);
      const res = await hostelPortalApi.seedDemo();
      showToast(res?.message || 'Hostel infrastructure ready!', 'success');
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Seed demo failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- HOSTEL CRUD HANDLERS ---
  const handleOpenHostelModal = (hostel = null) => {
    if (hostel) {
      setEditingHostel(hostel);
      setHostelForm({
        name: hostel.name,
        type: hostel.type,
        wardenId: hostel.wardenId?._id || hostel.wardenId || '',
        contactNumber: hostel.contactNumber || '',
        address: hostel.address || { addressLine: '', city: '', state: '', pincode: '' },
        totalBlocks: hostel.totalBlocks || 1,
        totalFloors: hostel.totalFloors || 3,
        description: hostel.description || '',
      });
    } else {
      setEditingHostel(null);
      setHostelForm({
        name: '',
        type: 'BOYS',
        wardenId: '',
        contactNumber: '',
        address: { addressLine: '', city: '', state: '', pincode: '' },
        totalBlocks: 1,
        totalFloors: 3,
        description: '',
      });
    }
    setHostelModalOpen(true);
  };

  const handleSaveHostel = async (e) => {
    e.preventDefault();
    try {
      if (editingHostel) {
        await hostelPortalApi.updateHostel(editingHostel._id, hostelForm);
        showToast('Hostel updated successfully', 'success');
      } else {
        await hostelPortalApi.createHostel(hostelForm);
        showToast('Hostel building created successfully', 'success');
      }
      setHostelModalOpen(false);
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to save hostel', 'error');
    }
  };

  const handleDeleteHostel = (hostel) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Hostel: ${hostel.name}?`,
      message: 'Are you sure you want to delete this hostel building? This can only be done if all rooms and beds have been vacated.',
      onConfirm: async () => {
        try {
          await hostelPortalApi.deleteHostel(hostel._id);
          showToast('Hostel deleted successfully', 'success');
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
          await fetchAllData();
        } catch (err) {
          showToast(err.message || 'Failed to delete hostel', 'error');
        }
      },
    });
  };

  // --- ROOM CRUD HANDLERS ---
  const handleOpenRoomModal = () => {
    setRoomForm({
      hostelId: selectedHostelId || (hostels[0]?._id || ''),
      blockName: 'Block A',
      floorNumber: 'Ground Floor',
      roomNumber: '',
      roomType: 'DOUBLE',
      capacity: 2,
      monthlyRent: 5000,
      amenitiesText: 'Attached Washroom, Study Table, Cupboard',
      description: '',
    });
    setRoomModalOpen(true);
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    try {
      const amenities = roomForm.amenitiesText
        ? roomForm.amenitiesText.split(',').map((s) => s.trim()).filter(Boolean)
        : [];
      const payload = {
        ...roomForm,
        amenities,
      };
      await hostelPortalApi.createRoom(payload);
      showToast(`Room ${roomForm.roomNumber} & its beds generated automatically!`, 'success');
      setRoomModalOpen(false);
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to create room', 'error');
    }
  };

  const handleDeleteRoom = (room) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Room ${room.roomNumber}?`,
      message: `Are you sure you want to delete Room ${room.roomNumber}? This will remove the room and all its associated beds.`,
      onConfirm: async () => {
        try {
          await hostelPortalApi.deleteRoom(room._id);
          showToast('Room and beds removed', 'success');
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
          await fetchAllData();
        } catch (err) {
          showToast(err.message || 'Failed to delete room', 'error');
        }
      },
    });
  };

  // --- ALLOCATION HANDLERS ---
  const handleOpenAllocateModal = (prefillHostelId = '', prefillRoomId = '', prefillBedId = '') => {
    const defaultHostel = prefillHostelId || selectedHostelId || (hostels[0]?._id || '');
    setAllocateForm({
      studentId: '',
      hostelId: defaultHostel,
      roomId: prefillRoomId || '',
      bedId: prefillBedId || '',
      monthlyFee: 5000,
      securityDeposit: 2000,
      remarks: 'Admitted into campus residence',
    });
    setAllocateModalOpen(true);
  };

  const handleSaveAllocation = async (e) => {
    e.preventDefault();
    try {
      await hostelPortalApi.allocateStudent(allocateForm);
      showToast('Student successfully allocated to bed!', 'success');
      setAllocateModalOpen(false);
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to allocate bed', 'error');
    }
  };

  const handleOpenTransferModal = (alloc) => {
    setTransferTargetAlloc(alloc);
    setTransferBedId('');
    setTransferModalOpen(true);
  };

  const handleSaveTransfer = async (e) => {
    e.preventDefault();
    try {
      await hostelPortalApi.transferStudent(transferTargetAlloc._id, { newBedId: transferBedId });
      showToast('Student transferred to new bed successfully!', 'success');
      setTransferModalOpen(false);
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to transfer bed', 'error');
    }
  };

  const handleOpenCheckoutModal = (alloc) => {
    setCheckoutTargetAlloc(alloc);
    setCheckoutForm({
      checkoutDate: new Date().toISOString().split('T')[0],
      checkoutReason: 'Vacating hostel / Session completion',
      checkoutRemarks: 'Cleared all room inventory and keys handed over.',
      depositRefunded: alloc.securityDeposit || 0,
    });
    setCheckoutModalOpen(true);
  };

  const handleSaveCheckout = async (e) => {
    e.preventDefault();
    try {
      await hostelPortalApi.checkoutStudent(checkoutTargetAlloc._id, checkoutForm);
      showToast('Student checkout processed & bed released to Available!', 'success');
      setCheckoutModalOpen(false);
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to process checkout', 'error');
    }
  };

  // --- ATTENDANCE HANDLERS ---
  const handleMarkAllAttendance = (status) => {
    if (!attendanceSheet || !attendanceSheet.records) return;
    setAttendanceSheet((prev) => ({
      ...prev,
      records: prev.records.map((r) => ({ ...r, status })),
    }));
  };

  const handleToggleStudentAttendance = (studentId, status) => {
    if (!attendanceSheet) return;
    setAttendanceSheet((prev) => ({
      ...prev,
      records: prev.records.map((r) => {
        const sId = r.studentId?._id || r.studentId;
        if (sId === studentId) {
          return { ...r, status };
        }
        return r;
      }),
    }));
  };

  const handleSaveAttendance = async () => {
    if (!attendanceSheet || !selectedHostelId) return;
    try {
      await hostelPortalApi.saveAttendance(selectedHostelId, {
        date: attendanceDate,
        records: attendanceSheet.records,
      });
      showToast('Night roll call attendance recorded successfully!', 'success');
      await fetchAttendanceSheet();
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to save attendance', 'error');
    }
  };

  // --- OUTING HANDLERS ---
  const handleOpenOutingModal = () => {
    setOutingForm({
      studentId: '',
      hostelId: selectedHostelId || (hostels[0]?._id || ''),
      outingType: 'DAY_OUTING',
      outDateTime: new Date().toISOString().slice(0, 16),
      expectedReturnDateTime: new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 16),
      reason: '',
      destination: 'City Market',
      parentPermissionStatus: 'APPROVED',
      remarks: '',
    });
    setOutingModalOpen(true);
  };

  const handleSaveOuting = async (e) => {
    e.preventDefault();
    try {
      await hostelPortalApi.createOuting(outingForm);
      showToast('Gate pass generated successfully!', 'success');
      setOutingModalOpen(false);
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to create outing pass', 'error');
    }
  };

  const handleUpdateOutingStatus = async (outingId, status) => {
    try {
      await hostelPortalApi.updateOutingStatus(outingId, { status });
      showToast(`Outing status updated to ${status}`, 'success');
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to update outing status', 'error');
    }
  };

  // --- COMPLAINTS HANDLERS ---
  const handleOpenComplaintModal = () => {
    setComplaintForm({
      hostelId: selectedHostelId || (hostels[0]?._id || ''),
      roomId: '',
      studentId: '',
      category: 'ELECTRICAL',
      title: '',
      description: '',
      priority: 'MEDIUM',
      assignedStaffId: '',
    });
    setComplaintModalOpen(true);
  };

  const handleSaveComplaint = async (e) => {
    e.preventDefault();
    try {
      await hostelPortalApi.createComplaint(complaintForm);
      showToast('Hostel maintenance ticket logged!', 'success');
      setComplaintModalOpen(false);
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to register complaint', 'error');
    }
  };

  const handleUpdateComplaintStatus = async (complaintId, status) => {
    try {
      await hostelPortalApi.updateComplaint(complaintId, { status });
      showToast(`Complaint status updated to ${status}`, 'success');
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to update complaint status', 'error');
    }
  };

  // --- COMPUTED / FILTERED DATA ---
  const filteredAllocations = useMemo(() => {
    return allocations.filter((a) => {
      if (selectedHostelId && (a.hostelId?._id || a.hostelId) !== selectedHostelId) return false;
      if (searchStudent) {
        const name = `${a.studentId?.firstName || ''} ${a.studentId?.lastName || ''}`.toLowerCase();
        const roll = (a.studentId?.rollNumber || '').toLowerCase();
        const adm = (a.studentId?.admissionNumber || '').toLowerCase();
        const room = (a.roomId?.roomNumber || '').toLowerCase();
        const q = searchStudent.toLowerCase();
        return name.includes(q) || roll.includes(q) || adm.includes(q) || room.includes(q);
      }
      return true;
    });
  }, [allocations, selectedHostelId, searchStudent]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (selectedHostelId && (c.hostelId?._id || c.hostelId) !== selectedHostelId) return false;
      if (complaintFilterStatus !== 'ALL' && c.status !== complaintFilterStatus) return false;
      return true;
    });
  }, [complaints, selectedHostelId, complaintFilterStatus]);

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      if (selectedHostelId && (r.hostelId?._id || r.hostelId) !== selectedHostelId) return false;
      if (roomFilterFloor !== 'ALL' && r.floorNumber !== roomFilterFloor) return false;
      return true;
    });
  }, [rooms, selectedHostelId, roomFilterFloor]);

  const activeVisualizer = useMemo(() => {
    if (!selectedHostelId) return visualizerData[0] || null;
    return visualizerData.find((v) => v.hostelId === selectedHostelId) || visualizerData[0] || null;
  }, [visualizerData, selectedHostelId]);

  // Available beds for allocate dropdown
  const availableBedsForModal = useMemo(() => {
    if (!allocateForm.hostelId) return [];
    return rooms
      .filter((r) => (r.hostelId?._id || r.hostelId) === allocateForm.hostelId)
      .map((room) => {
        const roomBeds = room.beds || [];
        return {
          room,
          beds: roomBeds.filter((b) => b.status === 'AVAILABLE'),
        };
      });
  }, [rooms, allocateForm.hostelId]);

  // Available beds for transfer dropdown
  const availableBedsForTransfer = useMemo(() => {
    return rooms.flatMap((r) => (r.beds || []).filter((b) => b.status === 'AVAILABLE'));
  }, [rooms]);

  return (
    <div className="space-y-6 pb-12">
      {/* PAGE HEADER */}
      <PageHeader
        title="Hostel & Residential Life Management"
        subtitle="Manage student hostel infrastructure, room inventories, bed matrices, night roll calls, gate passes, and maintenance tickets."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => handleOpenAllocateModal()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Allocate Bed</span>
            </button>
            <button
              onClick={handleOpenRoomModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add Room</span>
            </button>
          </div>
        }
      />

      {/* TABS NAVIGATION */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          {[
            { id: 'dashboard', label: 'Overview & Analytics', icon: LayoutGrid },
            { id: 'hostels', label: 'Hostels & Buildings', icon: Building2, count: hostels.length },
            { id: 'rooms', label: 'Rooms & Bed Visualizer', icon: Bed, count: rooms.length },
            { id: 'allocations', label: 'Student Allocations', icon: Users, count: allocations.filter((a) => a.status === 'ACTIVE').length },
            { id: 'attendance', label: 'Night Roll Call', icon: CheckCircle2 },
            { id: 'outings', label: 'Outings & Gate Passes', icon: DoorOpen, count: outings.filter((o) => o.status === 'OUT' || o.status === 'REQUESTED').length },
            { id: 'complaints', label: 'Maintenance Desk', icon: Wrench, count: complaints.filter((c) => c.status === 'OPEN' || c.status === 'IN_PROGRESS').length },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-indigo-650 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Global Hostel Picker Filter */}
        {hostels.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Hostel:</span>
            <select
              value={selectedHostelId}
              onChange={(e) => setSelectedHostelId(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            >
              {hostels.map((h) => (
                <option key={h._id} value={h._id}>
                  {h.name} ({h.type})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </div>
          <SkeletonTable rows={6} columns={5} />
        </div>
      )}

      {/* TAB 1: DASHBOARD & OVERVIEW */}
      {!loading && activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Bed Capacity</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {dashboardData?.metrics?.totalBeds || 0}
                </h3>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  Across {dashboardData?.metrics?.totalHostels || 0} Hostels & {dashboardData?.metrics?.totalRooms || 0} Rooms
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Bed className="w-6 h-6" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Occupancy Rate</span>
                <div className="flex items-baseline gap-2">
                  <h3 className="text-2xl font-black text-indigo-650">
                    {dashboardData?.metrics?.occupancyRate || 0}%
                  </h3>
                  <span className="text-xs font-bold text-slate-400">
                    ({dashboardData?.metrics?.occupiedBeds || 0} / {dashboardData?.metrics?.totalBeds || 0})
                  </span>
                </div>
                <div className="w-32 bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden mt-1">
                  <div
                    className="bg-indigo-650 h-full rounded-full transition-all"
                    style={{ width: `${dashboardData?.metrics?.occupancyRate || 0}%` }}
                  />
                </div>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Available Beds</span>
                <h3 className="text-2xl font-black text-emerald-600">
                  {dashboardData?.metrics?.availableBeds || 0}
                </h3>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  {dashboardData?.metrics?.maintenanceBeds || 0} under maintenance
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <DoorOpen className="w-6 h-6" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Gate Passes</span>
                <h3 className="text-2xl font-black text-amber-600">
                  {dashboardData?.metrics?.activeOutings || 0}
                </h3>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  {dashboardData?.metrics?.openComplaints || 0} Open maintenance issues
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* HOSTEL BUILDINGS BREAKDOWN */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hostel Infrastructure Summary</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardData?.hostelBreakdown?.map((h) => (
                <div
                  key={h.id}
                  className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-bold text-slate-900 dark:text-white">{h.name}</h4>
                        <Badge variant={h.type === 'BOYS' ? 'primary' : h.type === 'GIRLS' ? 'pink' : 'secondary'}>
                          {h.type} HOSTEL
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-650" />
                        <span>Warden: <strong>{h.warden}</strong></span>
                      </p>
                    </div>
                    <span className="text-xs font-black text-indigo-650 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-xl">
                      {h.occupancyRate}% Occupied
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 text-center">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Rooms</span>
                      <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 block">{h.totalRooms}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Total Beds</span>
                      <span className="text-base font-black text-slate-900 dark:text-white mt-0.5 block">{h.totalBeds}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-emerald-500 block">Available</span>
                      <span className="text-base font-black text-emerald-600 mt-0.5 block">{h.availableBeds}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-1">
                    <span>Occupancy Progress</span>
                    <span>{h.occupiedBeds} / {h.totalBeds} Beds Taken</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${h.occupancyRate > 90 ? 'bg-rose-500' : 'bg-indigo-650'}`}
                      style={{ width: `${h.occupancyRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RECENT ACTIVITIES (ALLOCTIONS, OUTINGS, COMPLAINTS) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Allocations */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-650" />
                <span>Recent Bed Allocations</span>
              </h4>
              <div className="space-y-3">
                {dashboardData?.recentAllocations?.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No recent allocations</p>
                ) : (
                  dashboardData?.recentAllocations?.map((a) => (
                    <div key={a._id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          {a.studentId?.firstName} {a.studentId?.lastName}
                        </h5>
                        <span className="text-[10px] text-slate-400 block">
                          Room {a.roomId?.roomNumber} • Bed {a.bedId?.bedCode}
                        </span>
                      </div>
                      <Badge variant="success">Active</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Recent Outing Passes */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <DoorOpen className="w-4 h-4 text-amber-500" />
                <span>Active Gate Passes</span>
              </h4>
              <div className="space-y-3">
                {dashboardData?.recentOutings?.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No recent outing requests</p>
                ) : (
                  dashboardData?.recentOutings?.map((o) => (
                    <div key={o._id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white">
                          {o.studentId?.firstName} {o.studentId?.lastName}
                        </h5>
                        <span className="text-[10px] text-slate-400 block">
                          {o.gatePassCode} • {o.reason}
                        </span>
                      </div>
                      <Badge variant={o.status === 'OUT' ? 'warning' : 'primary'}>{o.status}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Open Maintenance Complaints */}
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench className="w-4 h-4 text-rose-500" />
                <span>Open Maintenance Issues</span>
              </h4>
              <div className="space-y-3">
                {dashboardData?.recentComplaints?.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6">No pending maintenance complaints</p>
                ) : (
                  dashboardData?.recentComplaints?.map((c) => (
                    <div key={c._id} className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <h5 className="text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px]">
                          {c.title}
                        </h5>
                        <span className="text-[10px] text-slate-400 block">
                          Room {c.roomId?.roomNumber || 'Common'} • {c.category}
                        </span>
                      </div>
                      <Badge variant={c.priority === 'URGENT' ? 'danger' : 'warning'}>{c.priority}</Badge>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HOSTELS & BUILDINGS */}
      {!loading && activeTab === 'hostels' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Hostel Buildings & Blocks</h3>
              <p className="text-xs text-slate-400">Configure residential hostel blocks and assigned warden staff</p>
            </div>
            <button
              onClick={() => handleOpenHostelModal()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Hostel</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {hostels.map((h) => (
              <div
                key={h._id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{h.name}</h4>
                      <span className="text-xs text-slate-400 block mt-0.5">{h.address?.addressLine || 'Campus Wing'}</span>
                    </div>
                    <Badge variant={h.type === 'BOYS' ? 'primary' : h.type === 'GIRLS' ? 'pink' : 'secondary'}>
                      {h.type}
                    </Badge>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold">Warden:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {h.wardenId?.fullName || 'Not Assigned'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold">Contact:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{h.contactNumber || 'N/A'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold">Floors & Blocks:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {h.totalFloors} Floors, {h.totalBlocks} Block(s)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-bold">Rated Bed Capacity:</span>
                      <span className="font-bold text-indigo-650">{h.capacity || 0} Beds</span>
                    </div>
                  </div>

                  {h.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{h.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleOpenHostelModal(h)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteHostel(h)}
                    className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-xl"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: ROOMS & BED VISUALIZER */}
      {!loading && activeTab === 'rooms' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-400">Filter Floor:</span>
              <select
                value={roomFilterFloor}
                onChange={(e) => setRoomFilterFloor(e.target.value)}
                className="h-9 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold outline-none dark:border-slate-800 dark:bg-slate-950"
              >
                <option value="ALL">All Floors</option>
                <option value="Ground Floor">Ground Floor</option>
                <option value="1st Floor">1st Floor</option>
                <option value="2nd Floor">2nd Floor</option>
                <option value="3rd Floor">3rd Floor</option>
              </select>
            </div>

            {/* Bed Legend */}
            <div className="flex items-center gap-4 text-xs font-bold">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-400">Available Bed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-indigo-600" />
                <span className="text-slate-600 dark:text-slate-400">Occupied Bed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-full bg-amber-500" />
                <span className="text-slate-600 dark:text-slate-400">Maintenance</span>
              </div>
            </div>
          </div>

          {/* VISUALIZER BED MATRIX */}
          {activeVisualizer?.floors?.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-3">
              <Bed className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No rooms registered yet</h4>
              <p className="text-xs text-slate-400">Click &quot;Add Room&quot; to create rooms and auto-generate beds.</p>
              <button
                onClick={handleOpenRoomModal}
                className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl"
              >
                Add First Room
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {activeVisualizer?.floors
                ?.filter((f) => roomFilterFloor === 'ALL' || f.floorName === roomFilterFloor)
                .map((floor) => (
                  <div key={floor.floorName} className="space-y-4">
                    <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                      <Layers className="w-4 h-4 text-indigo-650" />
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                        {floor.floorName}
                      </h4>
                      <span className="text-xs font-bold text-slate-400">({floor.rooms.length} Rooms)</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {floor.rooms.map((room) => {
                        const occupiedBedsCount = (room.beds || []).filter((b) => b.status === 'OCCUPIED').length;
                        return (
                          <div
                            key={room._id}
                            className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4 hover:border-indigo-200 dark:hover:border-indigo-900 transition-all"
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="flex items-center gap-2">
                                  <h5 className="text-base font-black text-slate-900 dark:text-white">
                                    Room {room.roomNumber}
                                  </h5>
                                  <Badge variant="primary">{room.roomType}</Badge>
                                </div>
                                <span className="text-[11px] text-slate-400 block mt-0.5">
                                  {room.blockName} • ₹{room.monthlyRent?.toLocaleString()}/mo
                                </span>
                              </div>
                              <button
                                onClick={() => handleDeleteRoom(room)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                                title="Delete Room"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* BEDS VISUAL GRID IN ROOM */}
                            <div className="space-y-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                                Beds Matrix ({occupiedBedsCount}/{room.capacity} Filled)
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                {(room.beds || []).map((bed) => {
                                  const isAvailable = bed.status === 'AVAILABLE';
                                  const isOccupied = bed.status === 'OCCUPIED';
                                  return (
                                    <div
                                      key={bed._id}
                                      onClick={() => {
                                        if (isAvailable) {
                                          handleOpenAllocateModal(room.hostelId?._id || room.hostelId, room._id, bed._id);
                                        }
                                      }}
                                      className={`p-2.5 rounded-2xl border text-center transition-all cursor-pointer ${
                                        isAvailable
                                          ? 'border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 dark:border-emerald-950 dark:bg-emerald-950/30'
                                          : isOccupied
                                          ? 'border-indigo-200 bg-indigo-50/70 dark:border-indigo-950 dark:bg-indigo-950/30'
                                          : 'border-amber-200 bg-amber-50/70 dark:border-amber-950 dark:bg-amber-950/30'
                                      }`}
                                    >
                                      <div className="flex items-center justify-center gap-1">
                                        <Bed
                                          className={`w-3.5 h-3.5 ${
                                            isAvailable
                                              ? 'text-emerald-600'
                                              : isOccupied
                                              ? 'text-indigo-600'
                                              : 'text-amber-600'
                                          }`}
                                        />
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-100">
                                          {bed.bedCode}
                                        </span>
                                      </div>
                                      {isOccupied && bed.currentStudentId ? (
                                        <span className="text-[10px] font-bold text-indigo-650 block truncate mt-1">
                                          {bed.currentStudentId?.firstName}
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold text-emerald-600 block mt-1">
                                          + Free
                                        </span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {room.amenities?.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-2 border-t border-slate-100 dark:border-slate-800">
                                {room.amenities.map((a, i) => (
                                  <span
                                    key={i}
                                    className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300"
                                  >
                                    {a}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STUDENT ALLOCATIONS & CHECKOUT */}
      {!loading && activeTab === 'allocations' && (
        <div className="space-y-6">
          {/* Search & Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student name, roll number, admission no, or room..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <button
              onClick={() => handleOpenAllocateModal()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>New Allocation</span>
            </button>
          </div>

          {/* ALLOCATIONS TABLE */}
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Hostel & Block</th>
                    <th className="px-5 py-4">Room & Bed</th>
                    <th className="px-5 py-4">Stay Duration</th>
                    <th className="px-5 py-4">Fee / Deposit</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {filteredAllocations.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                        No student residential allocations match the filter.
                      </td>
                    </tr>
                  ) : (
                    filteredAllocations.map((alloc) => (
                      <tr key={alloc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-650 flex items-center justify-center font-black">
                              {alloc.studentId?.firstName?.[0] || 'S'}
                            </div>
                            <div>
                              <h5 className="font-bold text-slate-900 dark:text-white">
                                {alloc.studentId?.firstName} {alloc.studentId?.lastName}
                              </h5>
                              <span className="text-[10px] text-slate-400 block">
                                Roll #{alloc.studentId?.rollNumber || 'N/A'} • Adm: {alloc.studentId?.admissionNumber || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900 dark:text-white">{alloc.hostelId?.name}</span>
                          <span className="text-[10px] text-slate-400 block">{alloc.roomId?.blockName}</span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <Badge variant="primary">Room {alloc.roomId?.roomNumber}</Badge>
                            <Badge variant="secondary">Bed {alloc.bedId?.bedCode}</Badge>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-slate-800 dark:text-slate-200">
                            From: {new Date(alloc.allocationDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900 dark:text-white">₹{alloc.monthlyFee?.toLocaleString()}/mo</span>
                          <span className="text-[10px] text-slate-400 block">Dep: ₹{alloc.securityDeposit?.toLocaleString()}</span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={alloc.status === 'ACTIVE' ? 'success' : alloc.status === 'TRANSFERRED' ? 'info' : 'secondary'}>
                            {alloc.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {alloc.status === 'ACTIVE' && (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenTransferModal(alloc)}
                                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center gap-1"
                              >
                                <ArrowRightLeft className="w-3.5 h-3.5" />
                                <span>Transfer</span>
                              </button>
                              <button
                                onClick={() => handleOpenCheckoutModal(alloc)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 dark:hover:bg-rose-950 text-xs font-bold rounded-xl flex items-center gap-1"
                              >
                                <LogOut className="w-3.5 h-3.5" />
                                <span>Vacate</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: NIGHT ATTENDANCE ROLL CALL */}
      {!loading && activeTab === 'attendance' && (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-indigo-650" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Daily Night Roll Call</h4>
                <p className="text-xs text-slate-400">Record residency night check attendance per student bed</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold outline-none dark:border-slate-800 dark:bg-slate-950"
              />
              <button
                onClick={() => handleMarkAllAttendance('PRESENT')}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:hover:bg-emerald-950 text-xs font-bold rounded-xl"
              >
                Mark All Present
              </button>
              <button
                onClick={handleSaveAttendance}
                className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Save Attendance
              </button>
            </div>
          </div>

          {/* Roll Call Attendance Table */}
          {attendanceLoading ? (
            <SkeletonTable rows={5} columns={4} />
          ) : !attendanceSheet || attendanceSheet.records?.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No active students allocated</h4>
              <p className="text-xs text-slate-400">Allocate students to beds in this hostel to take attendance.</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-4">Student Details</th>
                      <th className="px-5 py-4">Room & Bed</th>
                      <th className="px-5 py-4">Attendance Status</th>
                      <th className="px-5 py-4">Notes / Remarks</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                    {attendanceSheet.records.map((rec) => {
                      const s = rec.studentId;
                      const sId = s?._id || s;
                      return (
                        <tr key={sId} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40">
                          <td className="px-5 py-4">
                            <span className="font-bold text-slate-900 dark:text-white block">
                              {s?.firstName} {s?.lastName}
                            </span>
                            <span className="text-[10px] text-slate-400 block">Roll #{s?.rollNumber || 'N/A'}</span>
                          </td>
                          <td className="px-5 py-4">
                            <span className="font-bold text-indigo-650">
                              Bed {rec.bedId?.bedCode || 'Allocated'}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              {[
                                { id: 'PRESENT', label: 'Present', color: 'bg-emerald-600 text-white' },
                                { id: 'ABSENT', label: 'Absent', color: 'bg-rose-600 text-white' },
                                { id: 'OUTING', label: 'Outing', color: 'bg-amber-600 text-white' },
                                { id: 'LEAVE', label: 'Leave', color: 'bg-purple-600 text-white' },
                                { id: 'MEDICAL', label: 'Medical', color: 'bg-blue-600 text-white' },
                              ].map((btn) => {
                                const isSelected = rec.status === btn.id;
                                return (
                                  <button
                                    key={btn.id}
                                    type="button"
                                    onClick={() => handleToggleStudentAttendance(sId, btn.id)}
                                    className={`px-3 py-1 rounded-xl text-[11px] font-black transition-all ${
                                      isSelected
                                        ? btn.color
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                    }`}
                                  >
                                    {btn.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-5 py-4">
                            <input
                              type="text"
                              placeholder="Add roll-call remark..."
                              value={rec.remarks || ''}
                              onChange={(e) => {
                                const text = e.target.value;
                                setAttendanceSheet((prev) => ({
                                  ...prev,
                                  records: prev.records.map((r) =>
                                    (r.studentId?._id || r.studentId) === sId ? { ...r, remarks: text } : r
                                  ),
                                }));
                              }}
                              className="h-8 w-full max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs outline-none dark:border-slate-800 dark:bg-slate-950"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: OUTINGS & GATE PASSES */}
      {!loading && activeTab === 'outings' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Gate Passes & Student Outings</h3>
              <p className="text-xs text-slate-400">Track student campus exit permits, expected returns, and parent permissions</p>
            </div>
            <button
              onClick={handleOpenOutingModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Gate Pass</span>
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Gate Pass #</th>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Outing Type & Reason</th>
                    <th className="px-5 py-4">Schedule</th>
                    <th className="px-5 py-4">Approvals</th>
                    <th className="px-5 py-4">Gate Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {outings.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                        No outing records logged yet.
                      </td>
                    </tr>
                  ) : (
                    outings.map((o) => (
                      <tr key={o._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40">
                        <td className="px-5 py-4">
                          <span className="font-mono font-black text-indigo-650 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-1 rounded-lg">
                            {o.gatePassCode}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900 dark:text-white block">
                            {o.studentId?.firstName} {o.studentId?.lastName}
                          </span>
                          <span className="text-[10px] text-slate-400 block">{o.hostelId?.name}</span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="secondary">{o.outingType}</Badge>
                          <span className="text-[11px] text-slate-600 dark:text-slate-300 block mt-1">{o.reason}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="block text-slate-800 dark:text-slate-200">
                            Out: {new Date(o.outDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            Exp: {new Date(o.expectedReturnDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-emerald-600 block">Parent: {o.parentPermissionStatus}</span>
                            <span className="text-[10px] font-bold text-indigo-650 block">Warden: {o.wardenApprovalStatus}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge
                            variant={
                              o.status === 'OUT'
                                ? 'warning'
                                : o.status === 'RETURNED'
                                ? 'success'
                                : o.status === 'OVERDUE'
                                ? 'danger'
                                : 'primary'
                            }
                          >
                            {o.status}
                          </Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {o.status === 'APPROVED' && (
                              <button
                                onClick={() => handleUpdateOutingStatus(o._id, 'OUT')}
                                className="px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl"
                              >
                                Mark Out
                              </button>
                            )}
                            {o.status === 'OUT' && (
                              <button
                                onClick={() => handleUpdateOutingStatus(o._id, 'RETURNED')}
                                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl"
                              >
                                Mark Returned
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 7: MAINTENANCE & COMPLAINTS */}
      {!loading && activeTab === 'complaints' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Hostel Maintenance & Complaints Desk</h3>
              <p className="text-xs text-slate-400">Log electrical, plumbing, carpentry, and cleanliness maintenance tickets</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={complaintFilterStatus}
                onChange={(e) => setComplaintFilterStatus(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-bold outline-none dark:border-slate-800 dark:bg-slate-900"
              >
                <option value="ALL">All Statuses</option>
                <option value="OPEN">Open</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="RESOLVED">Resolved</option>
              </select>
              <button
                onClick={handleOpenComplaintModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Log Complaint</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredComplaints.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <Wrench className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No complaints registered</h4>
                <p className="text-xs text-slate-400">All hostel rooms and facilities are in good condition.</p>
              </div>
            ) : (
              filteredComplaints.map((c) => (
                <div
                  key={c._id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Badge variant={c.priority === 'URGENT' ? 'danger' : c.priority === 'HIGH' ? 'warning' : 'secondary'}>
                        {c.priority} PRIORITY
                      </Badge>
                      <Badge variant={c.status === 'RESOLVED' ? 'success' : c.status === 'IN_PROGRESS' ? 'info' : 'primary'}>
                        {c.status}
                      </Badge>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{c.title}</h4>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {c.hostelId?.name} • Room {c.roomId?.roomNumber || 'Common Area'}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">{c.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">
                      Category: <strong>{c.category}</strong>
                    </span>
                    {c.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleUpdateComplaintStatus(c._id, 'RESOLVED')}
                        className="px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 text-xs font-bold rounded-xl"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 1: ADD/EDIT HOSTEL --- */}
      <Modal isOpen={hostelModalOpen} onClose={() => setHostelModalOpen(false)} title={editingHostel ? 'Edit Hostel Building' : 'Add Hostel Building'}>
        <form onSubmit={handleSaveHostel} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Hostel Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. Rabindranath Tagore Boys Hostel"
              value={hostelForm.name}
              onChange={(e) => setHostelForm({ ...hostelForm, name: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Hostel Type *</label>
              <select
                value={hostelForm.type}
                onChange={(e) => setHostelForm({ ...hostelForm, type: e.target.value })}
                className={inputClass}
              >
                <option value="BOYS">Boys Hostel</option>
                <option value="GIRLS">Girls Hostel</option>
                <option value="CO_ED">Co-Ed Hostel</option>
                <option value="STAFF">Staff Quarters</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Warden (Staff User)</label>
              <select
                value={hostelForm.wardenId}
                onChange={(e) => setHostelForm({ ...hostelForm, wardenId: e.target.value })}
                className={inputClass}
              >
                <option value="">Select Staff Warden</option>
                {eligibleEntities.staff.map((st) => (
                  <option key={st._id} value={st._id}>
                    {st.fullName} ({st.designation || st.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Contact Number</label>
              <input
                type="text"
                placeholder="e.g. +91 9876543210"
                value={hostelForm.contactNumber}
                onChange={(e) => setHostelForm({ ...hostelForm, contactNumber: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Total Floors</label>
              <input
                type="number"
                min="1"
                value={hostelForm.totalFloors}
                onChange={(e) => setHostelForm({ ...hostelForm, totalFloors: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Hostel Description / Facilities</label>
            <textarea
              rows="2"
              placeholder="e.g. Air cooled block, 24x7 water supply, reading room..."
              value={hostelForm.description}
              onChange={(e) => setHostelForm({ ...hostelForm, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setHostelModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
              Save Hostel
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 2: ADD ROOM & AUTO-BEDS --- */}
      <Modal isOpen={roomModalOpen} onClose={() => setRoomModalOpen(false)} title="Add Hostel Room (Auto-Generates Beds)">
        <form onSubmit={handleSaveRoom} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Hostel *</label>
              <select
                required
                value={roomForm.hostelId}
                onChange={(e) => setRoomForm({ ...roomForm, hostelId: e.target.value })}
                className={inputClass}
              >
                <option value="">Select Hostel</option>
                {hostels.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Room Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. 101, 102"
                value={roomForm.roomNumber}
                onChange={(e) => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Floor *</label>
              <select
                value={roomForm.floorNumber}
                onChange={(e) => setRoomForm({ ...roomForm, floorNumber: e.target.value })}
                className={inputClass}
              >
                <option value="Ground Floor">Ground Floor</option>
                <option value="1st Floor">1st Floor</option>
                <option value="2nd Floor">2nd Floor</option>
                <option value="3rd Floor">3rd Floor</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Block Name</label>
              <input
                type="text"
                placeholder="e.g. Block A"
                value={roomForm.blockName}
                onChange={(e) => setRoomForm({ ...roomForm, blockName: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Sharing Layout & Beds *</label>
              <select
                value={roomForm.roomType}
                onChange={(e) => {
                  const sel = ROOM_TYPES.find((rt) => rt.id === e.target.value);
                  setRoomForm({
                    ...roomForm,
                    roomType: e.target.value,
                    capacity: sel ? sel.capacity : 2,
                  });
                }}
                className={inputClass}
              >
                {ROOM_TYPES.map((rt) => (
                  <option key={rt.id} value={rt.id}>
                    {rt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Monthly Rent (₹)</label>
              <input
                type="number"
                min="0"
                value={roomForm.monthlyRent}
                onChange={(e) => setRoomForm({ ...roomForm, monthlyRent: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
            <span className="text-[11px] font-bold text-indigo-650 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                System will auto-create <strong>{roomForm.capacity} Beds</strong> ({roomForm.roomNumber || 'Room'}-A,{' '}
                {roomForm.roomNumber || 'Room'}-B...) with status <strong>AVAILABLE</strong>.
              </span>
            </span>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Amenities (comma-separated)</label>
            <input
              type="text"
              placeholder="e.g. Attached Washroom, Study Table, Cupboard, Balcony"
              value={roomForm.amenitiesText}
              onChange={(e) => setRoomForm({ ...roomForm, amenitiesText: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setRoomModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
              Create Room & Beds
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 3: ALLOCATE STUDENT TO BED --- */}
      <Modal isOpen={allocateModalOpen} onClose={() => setAllocateModalOpen(false)} title="Allocate Student to Bed">
        <form onSubmit={handleSaveAllocation} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Select Student *</label>
            <select
              required
              value={allocateForm.studentId}
              onChange={(e) => setAllocateForm({ ...allocateForm, studentId: e.target.value })}
              className={inputClass}
            >
              <option value="">Choose Enrolled Student</option>
              {eligibleEntities.students.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.firstName} {st.lastName} (Roll #{st.rollNumber || 'N/A'}, Class: {st.className || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Hostel *</label>
              <select
                required
                value={allocateForm.hostelId}
                onChange={(e) => setAllocateForm({ ...allocateForm, hostelId: e.target.value, roomId: '', bedId: '' })}
                className={inputClass}
              >
                <option value="">Select Hostel</option>
                {hostels.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name} ({h.type})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Available Bed *</label>
              <select
                required
                value={allocateForm.bedId}
                onChange={(e) => {
                  const bId = e.target.value;
                  // Find room for this bed
                  for (const g of availableBedsForModal) {
                    const found = g.beds.find((b) => b._id === bId);
                    if (found) {
                      setAllocateForm({
                        ...allocateForm,
                        bedId: bId,
                        roomId: g.room._id,
                        monthlyFee: g.room.monthlyRent || 5000,
                      });
                      break;
                    }
                  }
                }}
                className={inputClass}
              >
                <option value="">Select Free Bed</option>
                {availableBedsForModal.flatMap((g) =>
                  g.beds.map((b) => (
                    <option key={b._id} value={b._id}>
                      Room {g.room.roomNumber} → Bed {b.bedCode}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Monthly Hostel Fee (₹)</label>
              <input
                type="number"
                value={allocateForm.monthlyFee}
                onChange={(e) => setAllocateForm({ ...allocateForm, monthlyFee: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Caution / Security Deposit (₹)</label>
              <input
                type="number"
                value={allocateForm.securityDeposit}
                onChange={(e) => setAllocateForm({ ...allocateForm, securityDeposit: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Remarks / Special Medical Requirements</label>
            <input
              type="text"
              placeholder="e.g. Ground floor preferred due to medical condition"
              value={allocateForm.remarks}
              onChange={(e) => setAllocateForm({ ...allocateForm, remarks: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setAllocateModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
              Confirm Allocation
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 4: TRANSFER BED --- */}
      <Modal isOpen={transferModalOpen} onClose={() => setTransferModalOpen(false)} title="Transfer Student to Another Bed">
        <form onSubmit={handleSaveTransfer} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 space-y-1 text-xs">
            <span className="text-slate-400 font-bold block">Current Residency:</span>
            <p className="font-bold text-slate-900 dark:text-white">
              {transferTargetAlloc?.studentId?.firstName} {transferTargetAlloc?.studentId?.lastName}
            </p>
            <p className="text-slate-500">
              {transferTargetAlloc?.hostelId?.name} • Room {transferTargetAlloc?.roomId?.roomNumber} (Bed {transferTargetAlloc?.bedId?.bedCode})
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Target Available Bed *</label>
            <select
              required
              value={transferBedId}
              onChange={(e) => setTransferBedId(e.target.value)}
              className={inputClass}
            >
              <option value="">Select Destination Bed</option>
              {availableBedsForTransfer.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.hostelId?.name} → Bed {b.bedCode}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setTransferModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
              Process Transfer
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 5: VACATE / CHECKOUT CLEARANCE --- */}
      <Modal isOpen={checkoutModalOpen} onClose={() => setCheckoutModalOpen(false)} title="Hostel Checkout & Clearance Clearance">
        <form onSubmit={handleSaveCheckout} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 space-y-1 text-xs">
            <span className="text-slate-400 font-bold block">Student to Vacate:</span>
            <p className="font-bold text-slate-900 dark:text-white">
              {checkoutTargetAlloc?.studentId?.firstName} {checkoutTargetAlloc?.studentId?.lastName}
            </p>
            <p className="text-slate-500">
              Bed: {checkoutTargetAlloc?.bedId?.bedCode} • Room {checkoutTargetAlloc?.roomId?.roomNumber}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Vacating Date *</label>
              <input
                type="date"
                required
                value={checkoutForm.checkoutDate}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, checkoutDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Caution Deposit Refund (₹)</label>
              <input
                type="number"
                value={checkoutForm.depositRefunded}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, depositRefunded: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Reason for Vacating</label>
            <input
              type="text"
              value={checkoutForm.checkoutReason}
              onChange={(e) => setCheckoutForm({ ...checkoutForm, checkoutReason: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="p-3 rounded-2xl bg-rose-50/70 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900/50">
            <span className="text-[11px] font-bold text-rose-600 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5" />
              <span>
                Bed {checkoutTargetAlloc?.bedId?.bedCode} will automatically reset to <strong>AVAILABLE</strong> for new allocations.
              </span>
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setCheckoutModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl">
              Complete Checkout
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 6: ISSUE GATE PASS --- */}
      <Modal isOpen={outingModalOpen} onClose={() => setOutingModalOpen(false)} title="Issue Student Outing Gate Pass">
        <form onSubmit={handleSaveOuting} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Resident Student *</label>
            <select
              required
              value={outingForm.studentId}
              onChange={(e) => {
                const sId = e.target.value;
                const alloc = allocations.find((a) => (a.studentId?._id || a.studentId) === sId);
                setOutingForm({
                  ...outingForm,
                  studentId: sId,
                  hostelId: alloc?.hostelId?._id || alloc?.hostelId || outingForm.hostelId,
                });
              }}
              className={inputClass}
            >
              <option value="">Select Active Resident</option>
              {allocations
                .filter((a) => a.status === 'ACTIVE')
                .map((a) => (
                  <option key={a._id} value={a.studentId?._id || a.studentId}>
                    {a.studentId?.firstName} {a.studentId?.lastName} (Room {a.roomId?.roomNumber})
                  </option>
                ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Outing Type</label>
              <select
                value={outingForm.outingType}
                onChange={(e) => setOutingForm({ ...outingForm, outingType: e.target.value })}
                className={inputClass}
              >
                {OUTING_TYPES.map((ot) => (
                  <option key={ot.id} value={ot.id}>
                    {ot.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Destination</label>
              <input
                type="text"
                placeholder="e.g. City Market / Home"
                value={outingForm.destination}
                onChange={(e) => setOutingForm({ ...outingForm, destination: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Out Date & Time *</label>
              <input
                type="datetime-local"
                required
                value={outingForm.outDateTime}
                onChange={(e) => setOutingForm({ ...outingForm, outDateTime: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Expected Return *</label>
              <input
                type="datetime-local"
                required
                value={outingForm.expectedReturnDateTime}
                onChange={(e) => setOutingForm({ ...outingForm, expectedReturnDateTime: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Reason for Outing *</label>
            <input
              type="text"
              required
              placeholder="e.g. Buying academic books / Weekend family visit"
              value={outingForm.reason}
              onChange={(e) => setOutingForm({ ...outingForm, reason: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setOutingModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
              Generate Gate Pass
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 7: LOG COMPLAINT --- */}
      <Modal isOpen={complaintModalOpen} onClose={() => setComplaintModalOpen(false)} title="Register Maintenance Ticket">
        <form onSubmit={handleSaveComplaint} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Hostel *</label>
              <select
                required
                value={complaintForm.hostelId}
                onChange={(e) => setComplaintForm({ ...complaintForm, hostelId: e.target.value })}
                className={inputClass}
              >
                <option value="">Select Hostel</option>
                {hostels.map((h) => (
                  <option key={h._id} value={h._id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Issue Category *</label>
              <select
                value={complaintForm.category}
                onChange={(e) => setComplaintForm({ ...complaintForm, category: e.target.value })}
                className={inputClass}
              >
                {COMPLAINT_CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Room Number</label>
              <select
                value={complaintForm.roomId}
                onChange={(e) => setComplaintForm({ ...complaintForm, roomId: e.target.value })}
                className={inputClass}
              >
                <option value="">Common Facility / Corridors</option>
                {rooms
                  .filter((r) => !complaintForm.hostelId || (r.hostelId?._id || r.hostelId) === complaintForm.hostelId)
                  .map((r) => (
                    <option key={r._id} value={r._id}>
                      Room {r.roomNumber} ({r.floorNumber})
                    </option>
                  ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Priority *</label>
              <select
                value={complaintForm.priority}
                onChange={(e) => setComplaintForm({ ...complaintForm, priority: e.target.value })}
                className={inputClass}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent (Water/Electric breakdown)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Issue Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Ceiling fan regulator not functioning"
              value={complaintForm.title}
              onChange={(e) => setComplaintForm({ ...complaintForm, title: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Detailed Description *</label>
            <textarea
              rows="3"
              required
              placeholder="Describe the issue and specific location within room..."
              value={complaintForm.description}
              onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setComplaintModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
              Submit Ticket
            </button>
          </div>
        </form>
      </Modal>

      {/* CONFIRM DIALOG */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onClose={() => setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} })}
      />

      <ToastComponent />
    </div>
  );
};

export default HostelManagement;
