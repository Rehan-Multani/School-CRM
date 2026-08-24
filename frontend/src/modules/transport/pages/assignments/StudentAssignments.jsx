import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { useAppStore } from '../../../../shared/store/useAppStore';
import { formatDate } from '../../utils/formatters';
import { Search, User, CheckCircle2, ChevronRight, Bus, MapPin, Trash2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export const StudentAssignments = () => {
  const toast = useToast();
  const { store, assignStudentTransport, updateStore } = useAppStore();

  const [step, setStep] = useState(1);
  const [studentQuery, setStudentQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [selectedRoute, setSelectedRoute] = useState(null);
  const [selectedPickup, setSelectedPickup] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  const students = store.students || [];
  const routes = store.transport?.routes || [];

  // Build assignments from students with transportRouteId
  const assignments = students.filter(s => s.transportRouteId).map((s, idx) => {
    const route = routes.find(r => r.id === s.transportRouteId) || routes[0];
    return {
      id: `ASN-0${100 + idx}`,
      studentId: s.id,
      studentName: s.name,
      class: s.class,
      section: s.section || 'A',
      admissionNumber: s.admissionNo,
      routeId: s.transportRouteId,
      routeName: route?.routeName || 'Assigned Route',
      vehicleNumber: route?.vehicleNo || 'DL-01-CD-5678',
      pickupPointName: s.pickupPoint || route?.stops?.[0] || 'Bus Stop Gate',
      startDate: '2026-04-01',
      status: 'Active'
    };
  });

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(studentQuery.toLowerCase()) ||
    s.id.toLowerCase().includes(studentQuery.toLowerCase()) ||
    (s.admissionNo && s.admissionNo.toLowerCase().includes(studentQuery.toLowerCase()))
  );

  const handleSelectStudent = (student) => {
    setSelectedStudent(student);
    setStep(2);
  };

  const handleSelectRoute = (route) => {
    setSelectedRoute(route);
    setSelectedPickup(route.stops?.[0] || 'Stop 1');
    setStep(3);
  };

  const handleConfirmAssignment = () => {
    if (!selectedPickup) {
      toast.error('Please choose a Pickup Stop Location.');
      return;
    }

    assignStudentTransport(
      selectedStudent.id,
      selectedRoute.id,
      selectedPickup,
      'Mr. Gurpreet Singh (Transport Manager)'
    );

    toast.success(`Assigned ${selectedStudent.name} to route ${selectedRoute.routeName}! Synced with Student and Parent dashboard.`);
    handleReset();
  };

  const handleRemoveAssignment = (studentId) => {
    assignStudentTransport(studentId, null, null, 'Mr. Gurpreet Singh (Transport Manager)');
    toast.success('Transport route allocation revoked.');
  };

  const handleReset = () => {
    setStep(1);
    setSelectedStudent(null);
    setSelectedRoute(null);
    setSelectedPickup('');
    setStudentQuery('');
  };

  const columns = [
    { title: 'Allocation ID', key: 'id', sortable: true },
    { title: 'Student Name', key: 'studentName', sortable: true },
    { title: 'Admission No', key: 'admissionNumber' },
    { title: 'Class', key: 'class', render: (val, row) => `${val || ''} (${row.section || 'A'})` },
    { title: 'Route Name', key: 'routeName' },
    { title: 'Bus Reg No', key: 'vehicleNumber' },
    { title: 'Pickup Stop', key: 'pickupPointName' },
    { title: 'Status', key: 'status', render: (val) => <Badge variant="success">{val}</Badge> },
    { 
      title: 'Actions', 
      key: 'actions', 
      render: (_, row) => (
        <button
          onClick={() => handleRemoveAssignment(row.studentId)}
          className="p-1 text-slate-400 hover:text-rose-500 rounded"
          title="Revoke Assignment"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Transport Assignments"
        subtitle="3-step allocation: Select Student → Choose Bus Route → Set Pickup Stop & Sync."
      />

      {/* STEP INDICATOR */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { num: 1, title: 'Select Student', desc: selectedStudent ? selectedStudent.name : 'Choose student' },
          { num: 2, title: 'Choose Route', desc: selectedRoute ? selectedRoute.routeName : 'Select fleet route' },
          { num: 3, title: 'Pickup Stop & Confirm', desc: selectedPickup || 'Choose stop' }
        ].map((s) => (
          <div 
            key={s.num}
            className={cn(
              "p-3.5 rounded-2xl border transition-all flex items-center gap-3",
              step === s.num 
                ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20" 
                : step > s.num
                  ? "border-border bg-slate-50 dark:bg-slate-900"
                  : "border-border opacity-60"
            )}
          >
            <div className={cn(
              "w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold shrink-0",
              step === s.num ? "bg-amber-600 text-white" : step > s.num ? "bg-slate-200 text-slate-700 dark:bg-slate-800" : "bg-slate-100 text-slate-400"
            )}>
              {step > s.num ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : s.num}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{s.title}</p>
              <p className="text-[10px] text-slate-400 truncate">{s.desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* STEP 1: SELECT STUDENT */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Step 1: Select Student to Allocate Bus Route</h3>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search student by name, admission no..."
              value={studentQuery}
              onChange={(e) => setStudentQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 pl-9 pr-4 py-2.5 rounded-xl border border-border text-xs focus:outline-none"
            />
          </div>

          <div className="divide-y divide-border border border-border rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
            {filteredStudents.map((st) => (
              <div 
                key={st.id}
                onClick={() => handleSelectStudent(st)}
                className="p-3.5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{st.name}</span>
                    <Badge variant={st.transportRouteId ? 'success' : 'default'}>
                      {st.transportRouteId ? `Route: ${st.transportRouteId}` : 'Unassigned'}
                    </Badge>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    {st.admissionNo} • Class {st.class} • Guardian: {st.parentName}
                  </p>
                </div>
                <button className="text-xs font-bold text-amber-600 flex items-center gap-1 hover:underline">
                  <span>Select</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 2: SELECT ROUTE */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex justify-between items-center pb-2">
            <div className="flex items-center gap-2">
              <Bus className="w-5 h-5 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Step 2: Select Operational Fleet Route</h3>
            </div>
            <button onClick={() => setStep(1)} className="text-xs text-slate-400 hover:text-slate-600">Back</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {routes.map((rt) => (
              <div
                key={rt.id}
                onClick={() => handleSelectRoute(rt)}
                className="p-4 rounded-2xl border border-border hover:border-amber-500 hover:shadow-sm cursor-pointer transition-all space-y-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white">{rt.routeName}</h4>
                    <span className="text-[10px] text-amber-600 font-bold uppercase">{rt.id}</span>
                  </div>
                  <Badge variant="primary">{rt.vehicleNo}</Badge>
                </div>
                <div className="text-[11px] text-slate-400 space-y-1 font-semibold">
                  <div>Driver: {rt.driverName} ({rt.driverPhone})</div>
                  <div>Departure: {rt.morningDeparture} • Drop: {rt.afternoonDrop}</div>
                  <div>Stops: {rt.stops?.join(' → ')}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3: PICKUP & CONFIRM */}
      {step === 3 && (
        <div className="bg-white dark:bg-slate-900 border border-border rounded-3xl p-8 shadow-sm space-y-6 max-w-2xl mx-auto">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">Step 3: Choose Designated Pickup Point</h3>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-border">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Student</span>
              <h4 className="font-bold text-slate-900 dark:text-white mt-1">{selectedStudent.name}</h4>
              <p className="text-slate-400">{selectedStudent.admissionNo} • Class {selectedStudent.class}</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-border">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Selected Route</span>
              <h4 className="font-bold text-slate-900 dark:text-white mt-1">{selectedRoute.routeName}</h4>
              <p className="text-slate-400">{selectedRoute.vehicleNo} • Driver: {selectedRoute.driverName}</p>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Designated Stop Location *</label>
            <select
              value={selectedPickup}
              onChange={(e) => setSelectedPickup(e.target.value)}
              className="w-full px-3 py-2.5 text-xs font-bold rounded-xl border border-border bg-slate-50 dark:bg-slate-900 text-foreground"
            >
              {selectedRoute.stops?.map((st, i) => (
                <option key={i} value={st}>{st}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border">
            <button onClick={() => setStep(2)} className="text-xs font-semibold text-slate-400 hover:text-slate-600">Back</button>
            <button
              onClick={handleConfirmAssignment}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
            >
              Confirm Route Allocation & Sync Portals
            </button>
          </div>
        </div>
      )}

      {/* ALLOCATIONS TABLE */}
      <div className="bg-white dark:bg-slate-900 border border-border rounded-3xl p-6 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Current Fleet Allocations</h3>
        <DataTable columns={columns} data={assignments} searchPlaceholder="Search allocations..." />
      </div>
    </div>
  );
};
export default StudentAssignments;
