import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { useSchoolAdminAuth } from '../../context/SchoolAdminAuthContext';
import { transportPortalApi } from '../../../../shared/api/client';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Bus,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Fuel,
  Gauge,
  GraduationCap,
  Info,
  Layers,
  LayoutGrid,
  List,
  Loader2,
  LogOut,
  MapPin,
  Navigation,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Route,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Tag,
  Trash2,
  Truck,
  UserCheck,
  UserPlus,
  Users,
  Wrench,
  XCircle,
  Zap,
} from 'lucide-react';
import { SkeletonStatCard, SkeletonTable } from '../../components/ui/SkeletonLoader';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-xs font-semibold outline-none focus:border-indigo-500 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const VEHICLE_TYPES = [
  { id: 'BUS', label: 'School Bus (40-52 Seater)', defaultCapacity: 52 },
  { id: 'MINIBUS', label: 'Mini Bus (24-32 Seater)', defaultCapacity: 32 },
  { id: 'VAN', label: 'Transport Van (8-14 Seater)', defaultCapacity: 14 },
  { id: 'AUTO', label: 'Auto / Feeder (4-6 Seater)', defaultCapacity: 6 },
  { id: 'OTHER', label: 'Other Special Vehicle', defaultCapacity: 20 },
];

const FUEL_TYPES = [
  { id: 'DIESEL', label: 'Diesel' },
  { id: 'CNG', label: 'CNG' },
  { id: 'PETROL', label: 'Petrol' },
  { id: 'ELECTRIC', label: 'Electric (EV)' },
];

const SERVICE_TYPES = [
  { id: 'GENERAL_SERVICE', label: 'General Scheduled Service' },
  { id: 'OIL_CHANGE', label: 'Engine Oil & Filter Change' },
  { id: 'BRAKE_SERVICE', label: 'Brake Pad & Lining Overhaul' },
  { id: 'TYRE_REPLACEMENT', label: 'Tyre Rotation / Replacement' },
  { id: 'BATTERY', label: 'Battery Check / Replacement' },
  { id: 'AC_SERVICE', label: 'Air Conditioning Maintenance' },
  { id: 'ACCIDENT_REPAIR', label: 'Body Work / Accidental Repair' },
  { id: 'OTHER', label: 'Other Mechanical Repair' },
];

const INCIDENT_TYPES = [
  { id: 'BREAKDOWN', label: 'Vehicle Mechanical Breakdown' },
  { id: 'TRAFFIC_DELAY', label: 'Severe Traffic / Route Delay' },
  { id: 'STUDENT_MISBEHAVIOR', label: 'Student Discipline / Misbehavior' },
  { id: 'ACCIDENT_SCRATCH', label: 'Minor Scratch / Accident' },
  { id: 'DRIVER_ISSUE', label: 'Driver / Staff Absence or Issue' },
  { id: 'ROUTE_DEVIATION', label: 'Emergency Route Deviation' },
  { id: 'MEDICAL_EMERGENCY', label: 'Student Medical Emergency on Bus' },
  { id: 'OTHER', label: 'Other Incident' },
];

export const TransportManagement = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { showToast, ToastComponent } = useToast();
  const { currentRole } = useSchoolAdminAuth();

  // Core Data
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [eligibleEntities, setEligibleEntities] = useState({ students: [], staff: [], vehicles: [], routes: [] });

  // Filters
  const [selectedRouteId, setSelectedRouteId] = useState('');
  const [selectedRouteStops, setSelectedRouteStops] = useState([]);
  const [searchStudent, setSearchStudent] = useState('');
  const [vehicleFilterType, setVehicleFilterType] = useState('ALL');
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
  const [attendanceTripType, setAttendanceTripType] = useState('MORNING_PICKUP');
  const [attendanceSheet, setAttendanceSheet] = useState(null);
  const [attendanceLoading, setAttendanceLoading] = useState(false);

  // Modals Control
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    vehicleNumber: '',
    registrationNumber: '',
    vehicleType: 'BUS',
    model: '',
    capacity: 40,
    fuelType: 'DIESEL',
    insuranceExpiry: '',
    fitnessExpiry: '',
    pollutionExpiry: '',
    permitExpiry: '',
    description: '',
  });

  const [routeModalOpen, setRouteModalOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [routeForm, setRouteForm] = useState({
    routeName: '',
    routeCode: '',
    vehicleId: '',
    driverId: '',
    conductorId: '',
    startPoint: '',
    endPoint: 'ABC Public School',
    estimatedDistanceKm: 10,
    estimatedDurationMin: 35,
    description: '',
  });

  const [stopModalOpen, setStopModalOpen] = useState(false);
  const [stopForm, setStopForm] = useState({
    routeId: '',
    stopName: '',
    sequenceOrder: 1,
    pickupTime: '07:20 AM',
    dropTime: '03:45 PM',
    monthlyFee: 1400,
    landmark: '',
  });

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    studentId: '',
    routeId: '',
    pickupStopId: '',
    dropStopId: '',
    monthlyFee: 1400,
    remarks: '',
  });

  const [discontinueModalOpen, setDiscontinueModalOpen] = useState(false);
  const [discontinueTarget, setDiscontinueTarget] = useState(null);
  const [discontinueForm, setDiscontinueForm] = useState({
    endDate: new Date().toISOString().split('T')[0],
    discontinueReason: 'Relocated / Own transport chosen',
  });

  const [maintenanceModalOpen, setMaintenanceModalOpen] = useState(false);
  const [maintenanceForm, setMaintenanceForm] = useState({
    vehicleId: '',
    serviceDate: new Date().toISOString().split('T')[0],
    serviceType: 'GENERAL_SERVICE',
    cost: 4500,
    odometerReadingKm: 32000,
    vendorWorkshop: 'Authorized Tata Service Center',
    description: 'Scheduled fluid change and filter cleaning',
    remarks: '',
  });

  const [incidentModalOpen, setIncidentModalOpen] = useState(false);
  const [incidentForm, setIncidentForm] = useState({
    vehicleId: '',
    routeId: '',
    studentId: '',
    incidentType: 'BREAKDOWN',
    title: '',
    description: '',
    priority: 'MEDIUM',
    actionTaken: '',
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
      const [dashRes, vehRes, routesRes, assignRes, maintRes, incRes, eligRes] = await Promise.all([
        transportPortalApi.dashboard().catch(() => ({ data: null })),
        transportPortalApi.vehicles().catch(() => ({ data: [] })),
        transportPortalApi.routes().catch(() => ({ data: [] })),
        transportPortalApi.assignments().catch(() => ({ data: [] })),
        transportPortalApi.maintenance().catch(() => ({ data: [] })),
        transportPortalApi.incidents().catch(() => ({ data: [] })),
        transportPortalApi.eligibleEntities().catch(() => ({ data: { students: [], staff: [], vehicles: [], routes: [] } })),
      ]);

      if (dashRes?.data) setDashboardData(dashRes.data);
      if (vehRes?.data) setVehicles(vehRes.data);
      if (routesRes?.data) {
        setRoutes(routesRes.data);
        if (!selectedRouteId && routesRes.data.length > 0) {
          setSelectedRouteId(routesRes.data[0]._id);
        }
      }
      if (assignRes?.data) setAssignments(assignRes.data);
      if (maintRes?.data) setMaintenanceLogs(maintRes.data);
      if (incRes?.data) setIncidents(incRes.data);
      if (eligRes?.data) setEligibleEntities(eligRes.data);
    } catch (err) {
      showToast(err.message || 'Failed to load transport records', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedRouteId, showToast]);

  useEffect(() => {
    fetchAllData();
  }, []);

  // Fetch Route Stops when selectedRouteId changes
  const fetchRouteStops = useCallback(async () => {
    if (!selectedRouteId) return;
    try {
      const res = await transportPortalApi.stops(selectedRouteId);
      if (res?.data) {
        setSelectedRouteStops(res.data);
      }
    } catch (err) {
      // Ignored if route has no stops yet
    }
  }, [selectedRouteId]);

  useEffect(() => {
    if (selectedRouteId) {
      fetchRouteStops();
    }
  }, [selectedRouteId, fetchRouteStops]);

  // Fetch Attendance Sheet
  const fetchAttendanceSheet = useCallback(async () => {
    if (!selectedRouteId) return;
    setAttendanceLoading(true);
    try {
      const res = await transportPortalApi.getAttendance(selectedRouteId, {
        date: attendanceDate,
        tripType: attendanceTripType,
      });
      if (res?.data) {
        setAttendanceSheet(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load trip roll call', 'error');
    } finally {
      setAttendanceLoading(false);
    }
  }, [selectedRouteId, attendanceDate, attendanceTripType, showToast]);

  useEffect(() => {
    if (activeTab === 'attendance' && selectedRouteId) {
      fetchAttendanceSheet();
    }
  }, [activeTab, selectedRouteId, attendanceDate, attendanceTripType, fetchAttendanceSheet]);

  // --- SEED DEMO DATA ---
  const handleSeedDemo = async () => {
    try {
      setLoading(true);
      const res = await transportPortalApi.seedDemo();
      showToast(res?.message || 'Transport fleet ready!', 'success');
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Seed demo failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- VEHICLE HANDLERS ---
  const handleOpenVehicleModal = (veh = null) => {
    if (veh) {
      setEditingVehicle(veh);
      setVehicleForm({
        vehicleNumber: veh.vehicleNumber,
        registrationNumber: veh.registrationNumber,
        vehicleType: veh.vehicleType,
        model: veh.model || '',
        capacity: veh.capacity || 40,
        fuelType: veh.fuelType || 'DIESEL',
        insuranceExpiry: veh.insuranceExpiry ? veh.insuranceExpiry.slice(0, 10) : '',
        fitnessExpiry: veh.fitnessExpiry ? veh.fitnessExpiry.slice(0, 10) : '',
        pollutionExpiry: veh.pollutionExpiry ? veh.pollutionExpiry.slice(0, 10) : '',
        permitExpiry: veh.permitExpiry ? veh.permitExpiry.slice(0, 10) : '',
        description: veh.description || '',
      });
    } else {
      setEditingVehicle(null);
      setVehicleForm({
        vehicleNumber: '',
        registrationNumber: '',
        vehicleType: 'BUS',
        model: '',
        capacity: 40,
        fuelType: 'DIESEL',
        insuranceExpiry: '',
        fitnessExpiry: '',
        pollutionExpiry: '',
        permitExpiry: '',
        description: '',
      });
    }
    setVehicleModalOpen(true);
  };

  const handleSaveVehicle = async (e) => {
    e.preventDefault();
    try {
      if (editingVehicle) {
        await transportPortalApi.updateVehicle(editingVehicle._id, vehicleForm);
        showToast('Vehicle updated successfully', 'success');
      } else {
        await transportPortalApi.createVehicle(vehicleForm);
        showToast('Vehicle added to fleet successfully', 'success');
      }
      setVehicleModalOpen(false);
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to save vehicle', 'error');
    }
  };

  const handleDeleteVehicle = (veh) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Vehicle ${veh.vehicleNumber}?`,
      message: 'Are you sure you want to remove this vehicle from the fleet? Make sure it is not assigned to any active route.',
      onConfirm: async () => {
        try {
          await transportPortalApi.deleteVehicle(veh._id);
          showToast('Vehicle removed from fleet', 'success');
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
          await fetchAllData();
        } catch (err) {
          showToast(err.message || 'Failed to delete vehicle', 'error');
        }
      },
    });
  };

  // --- ROUTE & STOP HANDLERS ---
  const handleOpenRouteModal = (rt = null) => {
    if (rt) {
      setEditingRoute(rt);
      setRouteForm({
        routeName: rt.routeName,
        routeCode: rt.routeCode,
        vehicleId: rt.vehicleId?._id || rt.vehicleId || '',
        driverId: rt.driverId?._id || rt.driverId || '',
        conductorId: rt.conductorId?._id || rt.conductorId || '',
        startPoint: rt.startPoint,
        endPoint: rt.endPoint,
        estimatedDistanceKm: rt.estimatedDistanceKm || 10,
        estimatedDurationMin: rt.estimatedDurationMin || 35,
        description: rt.description || '',
      });
    } else {
      setEditingRoute(null);
      setRouteForm({
        routeName: '',
        routeCode: `RT-0${routes.length + 1}`,
        vehicleId: vehicles[0]?._id || '',
        driverId: '',
        conductorId: '',
        startPoint: '',
        endPoint: 'ABC Public School',
        estimatedDistanceKm: 10,
        estimatedDurationMin: 35,
        description: '',
      });
    }
    setRouteModalOpen(true);
  };

  const handleSaveRoute = async (e) => {
    e.preventDefault();
    try {
      if (editingRoute) {
        await transportPortalApi.updateRoute(editingRoute._id, routeForm);
        showToast('Route updated successfully', 'success');
      } else {
        await transportPortalApi.createRoute(routeForm);
        showToast('Transport route created successfully', 'success');
      }
      setRouteModalOpen(false);
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to save route', 'error');
    }
  };

  const handleDeleteRoute = (rt) => {
    setConfirmDialog({
      isOpen: true,
      title: `Delete Route ${rt.routeCode}?`,
      message: 'Are you sure you want to delete this route and its stops? Ensure all students have been reassigned.',
      onConfirm: async () => {
        try {
          await transportPortalApi.deleteRoute(rt._id);
          showToast('Route deleted successfully', 'success');
          setConfirmDialog({ isOpen: false, title: '', message: '', onConfirm: () => {} });
          await fetchAllData();
        } catch (err) {
          showToast(err.message || 'Failed to delete route', 'error');
        }
      },
    });
  };

  const handleOpenStopModal = () => {
    setStopForm({
      routeId: selectedRouteId || (routes[0]?._id || ''),
      stopName: '',
      sequenceOrder: selectedRouteStops.length + 1,
      pickupTime: '07:20 AM',
      dropTime: '03:45 PM',
      monthlyFee: 1400,
      landmark: '',
    });
    setStopModalOpen(true);
  };

  const handleSaveStop = async (e) => {
    e.preventDefault();
    try {
      await transportPortalApi.createStop(stopForm.routeId, stopForm);
      showToast(`Stop added to route successfully!`, 'success');
      setStopModalOpen(false);
      await fetchRouteStops();
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to add stop', 'error');
    }
  };

  const handleDeleteStop = async (stopId) => {
    try {
      await transportPortalApi.deleteStop(stopId);
      showToast('Stop removed from route', 'success');
      await fetchRouteStops();
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to remove stop', 'error');
    }
  };

  // --- ASSIGNMENT HANDLERS ---
  const handleOpenAssignModal = () => {
    const defaultRoute = selectedRouteId || (routes[0]?._id || '');
    setAssignForm({
      studentId: '',
      routeId: defaultRoute,
      pickupStopId: '',
      dropStopId: '',
      monthlyFee: 1400,
      remarks: 'Standard student pickup/drop subscription',
    });
    setAssignModalOpen(true);
  };

  const handleSaveAssignment = async (e) => {
    e.preventDefault();
    try {
      await transportPortalApi.assignStudent(assignForm);
      showToast('Student assigned to transport route successfully!', 'success');
      setAssignModalOpen(false);
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to assign transport', 'error');
    }
  };

  const handleOpenDiscontinueModal = (alloc) => {
    setDiscontinueTarget(alloc);
    setDiscontinueForm({
      endDate: new Date().toISOString().split('T')[0],
      discontinueReason: 'Parent requested transport stoppage',
    });
    setDiscontinueModalOpen(true);
  };

  const handleSaveDiscontinue = async (e) => {
    e.preventDefault();
    try {
      await transportPortalApi.discontinueAssignment(discontinueTarget._id, discontinueForm);
      showToast('Student transport discontinued and fee updated', 'success');
      setDiscontinueModalOpen(false);
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to discontinue transport', 'error');
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
    if (!attendanceSheet || !selectedRouteId) return;
    try {
      await transportPortalApi.saveAttendance(selectedRouteId, {
        date: attendanceDate,
        tripType: attendanceTripType,
        records: attendanceSheet.records,
      });
      showToast('Trip attendance recorded successfully!', 'success');
      await fetchAttendanceSheet();
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to save attendance', 'error');
    }
  };

  // --- MAINTENANCE HANDLERS ---
  const handleOpenMaintenanceModal = () => {
    setMaintenanceForm({
      vehicleId: vehicles[0]?._id || '',
      serviceDate: new Date().toISOString().split('T')[0],
      serviceType: 'GENERAL_SERVICE',
      cost: 4500,
      odometerReadingKm: 32000,
      vendorWorkshop: 'Authorized Service Center',
      description: 'Periodic fluid check & lubrication',
      remarks: '',
    });
    setMaintenanceModalOpen(true);
  };

  const handleSaveMaintenance = async (e) => {
    e.preventDefault();
    try {
      await transportPortalApi.createMaintenance(maintenanceForm);
      showToast('Vehicle service record logged successfully!', 'success');
      setMaintenanceModalOpen(false);
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to log maintenance', 'error');
    }
  };

  // --- INCIDENT HANDLERS ---
  const handleOpenIncidentModal = () => {
    setIncidentForm({
      vehicleId: vehicles[0]?._id || '',
      routeId: selectedRouteId || (routes[0]?._id || ''),
      studentId: '',
      incidentType: 'BREAKDOWN',
      title: '',
      description: '',
      priority: 'MEDIUM',
      actionTaken: '',
    });
    setIncidentModalOpen(true);
  };

  const handleSaveIncident = async (e) => {
    e.preventDefault();
    try {
      await transportPortalApi.createIncident(incidentForm);
      showToast('Transport incident logged and notified to team!', 'success');
      setIncidentModalOpen(false);
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to report incident', 'error');
    }
  };

  const handleUpdateIncidentStatus = async (id, status) => {
    try {
      await transportPortalApi.updateIncident(id, { status });
      showToast(`Incident status updated to ${status}`, 'success');
      await fetchAllData();
    } catch (err) {
      showToast(err.message || 'Failed to update incident', 'error');
    }
  };

  // --- FILTERED COMPUTED DATA ---
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (selectedRouteId && (a.routeId?._id || a.routeId) !== selectedRouteId) return false;
      if (searchStudent) {
        const name = `${a.studentId?.firstName || ''} ${a.studentId?.lastName || ''}`.toLowerCase();
        const roll = (a.studentId?.rollNumber || '').toLowerCase();
        const adm = (a.studentId?.admissionNumber || '').toLowerCase();
        const q = searchStudent.toLowerCase();
        return name.includes(q) || roll.includes(q) || adm.includes(q);
      }
      return true;
    });
  }, [assignments, selectedRouteId, searchStudent]);

  const selectedRouteObj = useMemo(() => {
    return routes.find((r) => r._id === selectedRouteId) || routes[0] || null;
  }, [routes, selectedRouteId]);

  // Stops for modal route
  const stopsForAssignModal = useMemo(() => {
    const r = eligibleEntities.routes.find((rt) => rt._id === assignForm.routeId);
    return r?.stops || [];
  }, [eligibleEntities.routes, assignForm.routeId]);

  return (
    <div className="space-y-6 pb-12">
      {/* PAGE HEADER */}
      <PageHeader
        title="Transport Fleet & Route Logistics"
        subtitle="Manage school bus fleets, driver assignments, route stops, student boarding subscriptions, daily roll calls, and vehicle maintenance."
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleOpenAssignModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <UserPlus className="w-4 h-4" />
              <span>Assign Student</span>
            </button>
            <button
              onClick={() => handleOpenRouteModal()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create Route</span>
            </button>
          </div>
        }
      />

      {/* TABS NAVIGATION */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          {[
            { id: 'dashboard', label: 'Overview & Fleet KPIs', icon: LayoutGrid },
            { id: 'vehicles', label: 'Fleets & Vehicles', icon: Bus, count: vehicles.length },
            { id: 'routes', label: 'Routes & Stops', icon: Navigation, count: routes.length },
            { id: 'assignments', label: 'Student Subscriptions', icon: Users, count: assignments.filter((a) => a.status === 'ACTIVE').length },
            { id: 'attendance', label: 'Trip Roll Call', icon: CheckCircle2 },
            { id: 'maintenance', label: 'Service & Maintenance', icon: Wrench, count: maintenanceLogs.length },
            { id: 'incidents', label: 'Safety & Incidents', icon: ShieldAlert, count: incidents.filter((i) => i.status !== 'RESOLVED').length },
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

        {/* Global Route Picker Filter */}
        {routes.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Route:</span>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800 outline-none dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            >
              {routes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.routeCode} — {r.routeName}
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

      {/* TAB 1: OVERVIEW & FLEET KPIS */}
      {!loading && activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fleet Vehicles</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                  {dashboardData?.metrics?.totalVehicles || 0}
                </h3>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  {dashboardData?.metrics?.activeVehicles || 0} Active • {dashboardData?.metrics?.maintenanceVehicles || 0} In Service
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Bus className="w-6 h-6" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Active Routes</span>
                <h3 className="text-2xl font-black text-indigo-650">
                  {dashboardData?.metrics?.activeRoutes || 0}
                </h3>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  Connecting {routes.reduce((sum, r) => sum + (r.stops?.length || 4), 0)} Pick-up Stops
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Navigation className="w-6 h-6" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Subscribed Students</span>
                <h3 className="text-2xl font-black text-emerald-600">
                  {dashboardData?.metrics?.activeAssignments || 0}
                </h3>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  Daily Morning & Evening Riders
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Compliance & Alerts</span>
                <h3 className="text-2xl font-black text-amber-600">
                  {dashboardData?.metrics?.expiringDocs?.length || 0}
                </h3>
                <span className="text-[11px] text-slate-500 font-semibold block">
                  {dashboardData?.metrics?.openIncidents || 0} Open Safety Incidents
                </span>
              </div>
              <div className="h-12 w-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6" />
              </div>
            </div>
          </div>

          {/* DOCUMENT EXPIRY EARLY WARNING BANNER */}
          {dashboardData?.metrics?.expiringDocs?.length > 0 && (
            <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <h4 className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
                  Compliance Notice: Vehicle Documents Expiring in &lt; 30 Days
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {dashboardData.metrics.expiringDocs.map((doc, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-white dark:bg-slate-900 text-xs font-semibold space-y-1">
                    <span className="font-bold text-slate-900 dark:text-white block">{doc.vehicleNumber}</span>
                    <span className="text-[10px] text-amber-600 font-bold block">
                      Renew Insurance / Fitness / PUC Certificate
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ROUTE SUMMARIES & SEATING CAPACITY PROGRESS */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Bus Routes & Capacity Load</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {dashboardData?.routeSummaries?.map((r) => {
                const loadPercent = r.vehicleCapacity > 0 ? Math.round((r.assignedStudents / r.vehicleCapacity) * 100) : 0;
                return (
                  <div
                    key={r.id}
                    className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="primary">{r.routeCode}</Badge>
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white">{r.routeName}</h4>
                        </div>
                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                          <Bus className="w-3.5 h-3.5 text-indigo-650" />
                          <span>Bus: <strong>{r.vehicle}</strong> ({r.vehicleType})</span>
                        </p>
                      </div>
                      <span className="text-xs font-black text-indigo-650 bg-indigo-50 dark:bg-indigo-950/50 px-3 py-1 rounded-xl">
                        {r.distanceKm} KM • {r.durationMin} Mins
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 text-center">
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Driver</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block truncate">{r.driver}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400 block">Stops</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">{r.totalStops} Pickups</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold uppercase text-emerald-500 block">Riders</span>
                        <span className="text-xs font-bold text-emerald-600 mt-0.5 block">{r.assignedStudents} / {r.vehicleCapacity}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                        <span>Seating Load</span>
                        <span>{loadPercent}% Capacity</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${loadPercent > 90 ? 'bg-rose-500' : 'bg-indigo-650'}`}
                          style={{ width: `${Math.min(loadPercent, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FLEETS & VEHICLES */}
      {!loading && activeTab === 'vehicles' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Fleet & Transport Vehicles</h3>
              <p className="text-xs text-slate-400">Manage school buses, vans, fitness certificates, and insurance documents</p>
            </div>
            <button
              onClick={() => handleOpenVehicleModal()}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Register Vehicle</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {vehicles.map((v) => (
              <div
                key={v._id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">{v.vehicleNumber}</h4>
                      <span className="text-xs text-slate-400 block font-mono mt-0.5">{v.registrationNumber}</span>
                    </div>
                    <Badge variant={v.status === 'ACTIVE' ? 'success' : v.status === 'UNDER_MAINTENANCE' ? 'warning' : 'secondary'}>
                      {v.status}
                    </Badge>
                  </div>

                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">Class / Model:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {v.vehicleType} • {v.model || 'Standard'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">Seating Capacity:</span>
                      <span className="font-bold text-indigo-650">{v.capacity} Seats</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">Fuel Type:</span>
                      <span className="font-bold text-slate-800 dark:text-slate-200">{v.fuelType}</span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      <span className="text-slate-400 font-bold">Insurance Expiry:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {v.insuranceExpiry ? new Date(v.insuranceExpiry).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-bold">Fitness Certificate:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {v.fitnessExpiry ? new Date(v.fitnessExpiry).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => handleOpenVehicleModal(v)}
                    className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-xl"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteVehicle(v)}
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

      {/* TAB 3: ROUTES & STOPS */}
      {!loading && activeTab === 'routes' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2">
                <Badge variant="primary">{selectedRouteObj?.routeCode || 'RT-01'}</Badge>
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  {selectedRouteObj?.routeName || 'Select Route'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                From: <strong>{selectedRouteObj?.startPoint}</strong> → To: <strong>{selectedRouteObj?.endPoint}</strong> • Distance: <strong>{selectedRouteObj?.estimatedDistanceKm} KM</strong> ({selectedRouteObj?.estimatedDurationMin} Mins)
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                onClick={handleOpenStopModal}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Stop</span>
              </button>
              <button
                onClick={() => handleOpenRouteModal(selectedRouteObj)}
                className="p-2 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* VISUAL STOP TIMELINE */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Ordered Route Stops & Boarding Timings ({selectedRouteStops.length} Stops)
            </h4>

            {selectedRouteStops.length === 0 ? (
              <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
                <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No stops mapped on this route</h4>
                <p className="text-xs text-slate-400">Click &quot;Add Stop&quot; to configure pick-up points and monthly fares.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedRouteStops.map((stop) => (
                  <div
                    key={stop._id}
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3 relative hover:border-indigo-300 transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <span className="h-6 w-6 rounded-full bg-indigo-650 text-white font-black text-xs flex items-center justify-center">
                          {stop.sequenceOrder}
                        </span>
                        <h5 className="text-sm font-bold text-slate-900 dark:text-white">{stop.stopName}</h5>
                      </div>
                      <button
                        onClick={() => handleDeleteStop(stop._id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold">Pickup Time:</span>
                        <span className="font-bold text-emerald-600">{stop.pickupTime}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-400 font-bold">Drop Time:</span>
                        <span className="font-bold text-indigo-650">{stop.dropTime}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                        <span className="text-slate-400 font-bold">Monthly Fare:</span>
                        <span className="font-black text-slate-900 dark:text-white">
                          ₹{stop.monthlyFee?.toLocaleString()}/mo
                        </span>
                      </div>
                    </div>

                    {stop.landmark && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="truncate">{stop.landmark}</span>
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 4: STUDENT BUS SUBSCRIPTIONS */}
      {!loading && activeTab === 'assignments' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="relative flex-1 min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search student name, roll number, admission no..."
                value={searchStudent}
                onChange={(e) => setSearchStudent(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 pl-9 pr-3.5 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:text-white"
              />
            </div>
            <button
              onClick={handleOpenAssignModal}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              <span>Assign Transport</span>
            </button>
          </div>

          {/* TABLE */}
          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Assigned Route</th>
                    <th className="px-5 py-4">Pickup Point</th>
                    <th className="px-5 py-4">Drop Point</th>
                    <th className="px-5 py-4">Monthly Fee</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {filteredAssignments.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="px-5 py-12 text-center text-slate-400">
                        No student transport subscriptions found.
                      </td>
                    </tr>
                  ) : (
                    filteredAssignments.map((a) => (
                      <tr key={a._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40">
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-650 flex items-center justify-center font-black">
                              {a.studentId?.firstName?.[0] || 'S'}
                            </div>
                            <div>
                              <h5 className="font-bold text-slate-900 dark:text-white">
                                {a.studentId?.firstName} {a.studentId?.lastName}
                              </h5>
                              <span className="text-[10px] text-slate-400 block">
                                Roll #{a.studentId?.rollNumber || 'N/A'} • Class: {a.studentId?.className || 'N/A'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900 dark:text-white">{a.routeId?.routeCode}</span>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">{a.routeId?.routeName}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-emerald-600 block">{a.pickupStopId?.stopName}</span>
                          <span className="text-[10px] text-slate-400 block">{a.pickupStopId?.pickupTime}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-indigo-650 block">{a.dropStopId?.stopName}</span>
                          <span className="text-[10px] text-slate-400 block">{a.dropStopId?.dropTime}</span>
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-900 dark:text-white">₹{a.monthlyFee?.toLocaleString()}/mo</span>
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant={a.status === 'ACTIVE' ? 'success' : 'secondary'}>{a.status}</Badge>
                        </td>
                        <td className="px-5 py-4 text-right">
                          {a.status === 'ACTIVE' && (
                            <button
                              onClick={() => handleOpenDiscontinueModal(a)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-950/40 text-xs font-bold rounded-xl"
                            >
                              Opt Out / Stop
                            </button>
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

      {/* TAB 5: DAILY TRIP ROLL CALL */}
      {!loading && activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-indigo-650" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">Bus Boarding & Trip Attendance</h4>
                <p className="text-xs text-slate-400">Record daily morning pickup and evening drop attendance</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                <button
                  onClick={() => setAttendanceTripType('MORNING_PICKUP')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    attendanceTripType === 'MORNING_PICKUP' ? 'bg-white dark:bg-slate-900 text-indigo-650 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  ☀️ Morning Pickup
                </button>
                <button
                  onClick={() => setAttendanceTripType('EVENING_DROP')}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    attendanceTripType === 'EVENING_DROP' ? 'bg-white dark:bg-slate-900 text-indigo-650 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  🌙 Evening Drop
                </button>
              </div>

              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-bold outline-none dark:border-slate-800 dark:bg-slate-950"
              />

              <button
                onClick={() => handleMarkAllAttendance('PRESENT')}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 text-xs font-bold rounded-xl"
              >
                Mark All Boarded
              </button>

              <button
                onClick={handleSaveAttendance}
                className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
              >
                Save Attendance
              </button>
            </div>
          </div>

          {attendanceLoading ? (
            <SkeletonTable rows={5} columns={4} />
          ) : !attendanceSheet || attendanceSheet.records?.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 space-y-2">
              <Users className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">No active students on this route</h4>
              <p className="text-xs text-slate-400">Assign students to this route to mark trip attendance.</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <tr>
                      <th className="px-5 py-4">Student Details</th>
                      <th className="px-5 py-4">Assigned Stop</th>
                      <th className="px-5 py-4">Boarding Status</th>
                      <th className="px-5 py-4">Boarding Time / Notes</th>
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
                            <span className="font-bold text-emerald-600 block">{rec.stopId?.stopName || 'Stop'}</span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-1.5">
                              {[
                                { id: 'PRESENT', label: 'Boarded', color: 'bg-emerald-600 text-white' },
                                { id: 'ABSENT', label: 'Absent', color: 'bg-rose-600 text-white' },
                                { id: 'NOT_BOARDED', label: 'Not Boarded', color: 'bg-amber-600 text-white' },
                                { id: 'LEAVE', label: 'On Leave', color: 'bg-purple-600 text-white' },
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
                              placeholder="e.g. Boarded at 07:22 AM..."
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

      {/* TAB 6: SERVICE & MAINTENANCE */}
      {!loading && activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Vehicle Service & Maintenance Records</h3>
              <p className="text-xs text-slate-400">Track periodic oil changes, tyre replacements, and workshop repair costs</p>
            </div>
            <button
              onClick={handleOpenMaintenanceModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Log Service Record</span>
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <tr>
                    <th className="px-5 py-4">Vehicle</th>
                    <th className="px-5 py-4">Service Type</th>
                    <th className="px-5 py-4">Date</th>
                    <th className="px-5 py-4">Odometer</th>
                    <th className="px-5 py-4">Workshop</th>
                    <th className="px-5 py-4 text-right">Cost (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-semibold text-slate-700 dark:text-slate-300">
                  {maintenanceLogs.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-5 py-12 text-center text-slate-400">
                        No maintenance logs recorded yet.
                      </td>
                    </tr>
                  ) : (
                    maintenanceLogs.map((m) => (
                      <tr key={m._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/40">
                        <td className="px-5 py-4 font-bold text-slate-900 dark:text-white">
                          {m.vehicleId?.vehicleNumber}
                        </td>
                        <td className="px-5 py-4">
                          <Badge variant="primary">{m.serviceType}</Badge>
                        </td>
                        <td className="px-5 py-4">{new Date(m.serviceDate).toLocaleDateString()}</td>
                        <td className="px-5 py-4">{m.odometerReadingKm ? `${m.odometerReadingKm.toLocaleString()} KM` : 'N/A'}</td>
                        <td className="px-5 py-4">{m.vendorWorkshop || 'Authorized Center'}</td>
                        <td className="px-5 py-4 text-right font-bold text-slate-900 dark:text-white">
                          ₹{m.cost?.toLocaleString()}
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

      {/* TAB 7: SAFETY & INCIDENTS */}
      {!loading && activeTab === 'incidents' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Safety & Incident Reports</h3>
              <p className="text-xs text-slate-400">Log and resolve bus breakdowns, major delays, and disciplinary issues</p>
            </div>
            <button
              onClick={handleOpenIncidentModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Report Incident</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {incidents.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                <ShieldCheck className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">All transport operations normal</h4>
                <p className="text-xs text-slate-400">No safety incidents or route breakdowns reported.</p>
              </div>
            ) : (
              incidents.map((inc) => (
                <div
                  key={inc._id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <Badge variant={inc.priority === 'CRITICAL' ? 'danger' : inc.priority === 'HIGH' ? 'warning' : 'secondary'}>
                        {inc.priority} PRIORITY
                      </Badge>
                      <Badge variant={inc.status === 'RESOLVED' ? 'success' : 'primary'}>{inc.status}</Badge>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{inc.title}</h4>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        {inc.vehicleId?.vehicleNumber || 'Fleet'} • {inc.incidentType}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-3">{inc.description}</p>
                  </div>

                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">
                      Date: {new Date(inc.incidentDate).toLocaleDateString()}
                    </span>
                    {inc.status !== 'RESOLVED' && (
                      <button
                        onClick={() => handleUpdateIncidentStatus(inc._id, 'RESOLVED')}
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

      {/* --- MODAL 1: ADD/EDIT VEHICLE --- */}
      <Modal isOpen={vehicleModalOpen} onClose={() => setVehicleModalOpen(false)} title={editingVehicle ? 'Edit Vehicle' : 'Register Fleet Vehicle'}>
        <form onSubmit={handleSaveVehicle} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Bus / Vehicle Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. BUS-01"
                value={vehicleForm.vehicleNumber}
                onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleNumber: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Registration Number (RTO) *</label>
              <input
                type="text"
                required
                placeholder="e.g. MP09AB1234"
                value={vehicleForm.registrationNumber}
                onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Vehicle Type *</label>
              <select
                value={vehicleForm.vehicleType}
                onChange={(e) => {
                  const sel = VEHICLE_TYPES.find((vt) => vt.id === e.target.value);
                  setVehicleForm({
                    ...vehicleForm,
                    vehicleType: e.target.value,
                    capacity: sel ? sel.defaultCapacity : 40,
                  });
                }}
                className={inputClass}
              >
                {VEHICLE_TYPES.map((vt) => (
                  <option key={vt.id} value={vt.id}>
                    {vt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Seating Capacity *</label>
              <input
                type="number"
                min="1"
                required
                value={vehicleForm.capacity}
                onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Fuel Type</label>
              <select
                value={vehicleForm.fuelType}
                onChange={(e) => setVehicleForm({ ...vehicleForm, fuelType: e.target.value })}
                className={inputClass}
              >
                {FUEL_TYPES.map((ft) => (
                  <option key={ft.id} value={ft.id}>
                    {ft.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Model Name</label>
              <input
                type="text"
                placeholder="e.g. Tata Starbus 52 Seater"
                value={vehicleForm.model}
                onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Insurance Expiry</label>
              <input
                type="date"
                value={vehicleForm.insuranceExpiry}
                onChange={(e) => setVehicleForm({ ...vehicleForm, insuranceExpiry: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Fitness Expiry</label>
              <input
                type="date"
                value={vehicleForm.fitnessExpiry}
                onChange={(e) => setVehicleForm({ ...vehicleForm, fitnessExpiry: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setVehicleModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
              Save Vehicle
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 2: CREATE/EDIT ROUTE --- */}
      <Modal isOpen={routeModalOpen} onClose={() => setRouteModalOpen(false)} title={editingRoute ? 'Edit Route' : 'Create Transport Route'}>
        <form onSubmit={handleSaveRoute} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Route Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Route 01 - East Zone"
                value={routeForm.routeName}
                onChange={(e) => setRouteForm({ ...routeForm, routeName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Route Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. RT-01"
                value={routeForm.routeCode}
                onChange={(e) => setRouteForm({ ...routeForm, routeCode: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Assigned Bus / Vehicle</label>
              <select
                value={routeForm.vehicleId}
                onChange={(e) => setRouteForm({ ...routeForm, vehicleId: e.target.value })}
                className={inputClass}
              >
                <option value="">Select Fleet Vehicle</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.vehicleNumber} ({v.vehicleType}, {v.capacity} Seats)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Assigned Driver (Staff User)</label>
              <select
                value={routeForm.driverId}
                onChange={(e) => setRouteForm({ ...routeForm, driverId: e.target.value })}
                className={inputClass}
              >
                <option value="">Select Driver</option>
                {eligibleEntities.staff.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.fullName} ({s.designation || s.role})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Start Point *</label>
              <input
                type="text"
                required
                placeholder="e.g. Azad Nagar Square"
                value={routeForm.startPoint}
                onChange={(e) => setRouteForm({ ...routeForm, startPoint: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">End Point *</label>
              <input
                type="text"
                required
                value={routeForm.endPoint}
                onChange={(e) => setRouteForm({ ...routeForm, endPoint: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Distance (KM)</label>
              <input
                type="number"
                value={routeForm.estimatedDistanceKm}
                onChange={(e) => setRouteForm({ ...routeForm, estimatedDistanceKm: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Duration (Minutes)</label>
              <input
                type="number"
                value={routeForm.estimatedDurationMin}
                onChange={(e) => setRouteForm({ ...routeForm, estimatedDurationMin: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setRouteModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
              Save Route
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 3: ADD STOP --- */}
      <Modal isOpen={stopModalOpen} onClose={() => setStopModalOpen(false)} title="Add Pick-up Stop to Route">
        <form onSubmit={handleSaveStop} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Stop Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Teen Imli Square"
                value={stopForm.stopName}
                onChange={(e) => setStopForm({ ...stopForm, stopName: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Sequence Order *</label>
              <input
                type="number"
                min="1"
                required
                value={stopForm.sequenceOrder}
                onChange={(e) => setStopForm({ ...stopForm, sequenceOrder: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Morning Pickup Time *</label>
              <input
                type="text"
                required
                placeholder="07:25 AM"
                value={stopForm.pickupTime}
                onChange={(e) => setStopForm({ ...stopForm, pickupTime: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Evening Drop Time *</label>
              <input
                type="text"
                required
                placeholder="03:50 PM"
                value={stopForm.dropTime}
                onChange={(e) => setStopForm({ ...stopForm, dropTime: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Monthly Transport Fee (₹) *</label>
              <input
                type="number"
                min="0"
                required
                value={stopForm.monthlyFee}
                onChange={(e) => setStopForm({ ...stopForm, monthlyFee: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Landmark</label>
              <input
                type="text"
                placeholder="e.g. Opposite Post Office"
                value={stopForm.landmark}
                onChange={(e) => setStopForm({ ...stopForm, landmark: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setStopModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
              Add Stop
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 4: ASSIGN STUDENT TRANSPORT --- */}
      <Modal isOpen={assignModalOpen} onClose={() => setAssignModalOpen(false)} title="Assign Student to Bus Route">
        <form onSubmit={handleSaveAssignment} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Select Student *</label>
            <select
              required
              value={assignForm.studentId}
              onChange={(e) => setAssignForm({ ...assignForm, studentId: e.target.value })}
              className={inputClass}
            >
              <option value="">Choose Student</option>
              {eligibleEntities.students.map((st) => (
                <option key={st._id} value={st._id}>
                  {st.firstName} {st.lastName} (Roll #{st.rollNumber || 'N/A'}, Class: {st.className || 'N/A'})
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Transport Route *</label>
            <select
              required
              value={assignForm.routeId}
              onChange={(e) => setAssignForm({ ...assignForm, routeId: e.target.value, pickupStopId: '', dropStopId: '' })}
              className={inputClass}
            >
              <option value="">Select Route</option>
              {routes.map((r) => (
                <option key={r._id} value={r._id}>
                  {r.routeCode} — {r.routeName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Pick-up Stop *</label>
              <select
                required
                value={assignForm.pickupStopId}
                onChange={(e) => {
                  const sId = e.target.value;
                  const found = stopsForAssignModal.find((s) => s._id === sId);
                  setAssignForm({
                    ...assignForm,
                    pickupStopId: sId,
                    dropStopId: assignForm.dropStopId || sId,
                    monthlyFee: found?.monthlyFee || assignForm.monthlyFee,
                  });
                }}
                className={inputClass}
              >
                <option value="">Select Stop</option>
                {stopsForAssignModal.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.stopName} ({s.pickupTime}) — ₹{s.monthlyFee}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Drop Stop *</label>
              <select
                required
                value={assignForm.dropStopId}
                onChange={(e) => setAssignForm({ ...assignForm, dropStopId: e.target.value })}
                className={inputClass}
              >
                <option value="">Select Drop Point</option>
                {stopsForAssignModal.map((s) => (
                  <option key={s._id} value={s._id}>
                    {s.stopName} ({s.dropTime})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Monthly Transport Fee (₹)</label>
            <input
              type="number"
              value={assignForm.monthlyFee}
              onChange={(e) => setAssignForm({ ...assignForm, monthlyFee: Number(e.target.value) })}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setAssignModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
              Assign Transport
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 5: DISCONTINUE TRANSPORT --- */}
      <Modal isOpen={discontinueModalOpen} onClose={() => setDiscontinueModalOpen(false)} title="Discontinue Transport Service">
        <form onSubmit={handleSaveDiscontinue} className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 space-y-1 text-xs">
            <span className="text-slate-400 font-bold block">Student:</span>
            <p className="font-bold text-slate-900 dark:text-white">
              {discontinueTarget?.studentId?.firstName} {discontinueTarget?.studentId?.lastName}
            </p>
            <p className="text-slate-500">
              Route: {discontinueTarget?.routeId?.routeCode} • Stop: {discontinueTarget?.pickupStopId?.stopName}
            </p>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Discontinue Effective Date *</label>
            <input
              type="date"
              required
              value={discontinueForm.endDate}
              onChange={(e) => setDiscontinueForm({ ...discontinueForm, endDate: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Reason</label>
            <input
              type="text"
              value={discontinueForm.discontinueReason}
              onChange={(e) => setDiscontinueForm({ ...discontinueForm, discontinueReason: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setDiscontinueModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl">
              Confirm Discontinuation
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 6: LOG MAINTENANCE --- */}
      <Modal isOpen={maintenanceModalOpen} onClose={() => setMaintenanceModalOpen(false)} title="Log Vehicle Maintenance Record">
        <form onSubmit={handleSaveMaintenance} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Vehicle *</label>
              <select
                required
                value={maintenanceForm.vehicleId}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vehicleId: e.target.value })}
                className={inputClass}
              >
                <option value="">Select Vehicle</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.vehicleNumber} ({v.model})
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Service Type *</label>
              <select
                value={maintenanceForm.serviceType}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, serviceType: e.target.value })}
                className={inputClass}
              >
                {SERVICE_TYPES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Service Date *</label>
              <input
                type="date"
                required
                value={maintenanceForm.serviceDate}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, serviceDate: e.target.value })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Total Cost (₹) *</label>
              <input
                type="number"
                min="0"
                required
                value={maintenanceForm.cost}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, cost: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Odometer Reading (KM)</label>
              <input
                type="number"
                value={maintenanceForm.odometerReadingKm}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, odometerReadingKm: Number(e.target.value) })}
                className={inputClass}
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Vendor / Workshop</label>
              <input
                type="text"
                placeholder="e.g. Authorized Service Center"
                value={maintenanceForm.vendorWorkshop}
                onChange={(e) => setMaintenanceForm({ ...maintenanceForm, vendorWorkshop: e.target.value })}
                className={inputClass}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setMaintenanceModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
              Save Service Log
            </button>
          </div>
        </form>
      </Modal>

      {/* --- MODAL 7: REPORT INCIDENT --- */}
      <Modal isOpen={incidentModalOpen} onClose={() => setIncidentModalOpen(false)} title="Report Safety & Transport Incident">
        <form onSubmit={handleSaveIncident} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Vehicle</label>
              <select
                value={incidentForm.vehicleId}
                onChange={(e) => setIncidentForm({ ...incidentForm, vehicleId: e.target.value })}
                className={inputClass}
              >
                <option value="">Select Bus</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.vehicleNumber}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Incident Category *</label>
              <select
                value={incidentForm.incidentType}
                onChange={(e) => setIncidentForm({ ...incidentForm, incidentType: e.target.value })}
                className={inputClass}
              >
                {INCIDENT_TYPES.map((it) => (
                  <option key={it.id} value={it.id}>
                    {it.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Incident Summary / Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. 20 min delay at Bengali Square due to flat tyre"
              value={incidentForm.title}
              onChange={(e) => setIncidentForm({ ...incidentForm, title: e.target.value })}
              className={inputClass}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Detailed Description & Action Taken</label>
            <textarea
              rows="3"
              required
              placeholder="Describe incident and contingency transport arranged..."
              value={incidentForm.description}
              onChange={(e) => setIncidentForm({ ...incidentForm, description: e.target.value })}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs font-semibold outline-none focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setIncidentModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" className="px-5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">
              Submit Incident Report
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

export default TransportManagement;
