import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { Modal } from '../../components/ui/Modal';
import { MOCK_VEHICLES, MOCK_DRIVERS } from '../../utils/constants';
import { ShieldAlert, Phone, AlertTriangle, Send, User, Bus } from 'lucide-react';

export const EmergencyManagement = () => {
  const toast = useToast();
  const [reportOpen, setReportOpen] = useState(false);

  const [formData, setFormData] = useState({
    vehicleId: '',
    driverId: '',
    incidentType: 'Engine Breakdown',
    location: '',
    severity: 'Medium',
    description: ''
  });

  const contacts = [
    { role: 'Transport Control Desk', name: 'Manish Dave (Manager)', phone: '+91-9876543210' },
    { role: 'Ambulance & Medical Emergency', name: 'Apollo Emergency Trauma Care', phone: '108 / 102' },
    { role: 'Police Control Room', name: 'Satellite Police Station', phone: '100 / +91-7926300000' },
    { role: 'Fire Emergency Service', name: 'Ahmedabad Fire Brigade', phone: '101' },
    { role: 'School Principal Desk', name: 'Dr. Anjali Sen', phone: '+91-9898012345' },
    { role: 'Crane & Towing Support', name: 'Highway Road Assistance', phone: '+91-9988776655' }
  ];

  const handleReportIncident = (e) => {
    e.preventDefault();
    if (!formData.location.trim() || !formData.description.trim()) {
      toast.error('Location and Incident Description are required.');
      return;
    }

    const veh = MOCK_VEHICLES.find(v => v.id === formData.vehicleId);
    const drv = MOCK_DRIVERS.find(d => d.id === formData.driverId);

    // Simulated action
    toast.success(`Emergency Incident reported successfully! Dispatching rescue support.`);
    toast.info(`Parents on Route assigned to vehicle ${veh?.vehicleNumber || 'GJ-01-AB-1234'} have been alerted.`);
    setReportOpen(false);
  };

  return (
    <div className="space-y-6 text-xs">
      <PageHeader
        title="Emergency Management Desk"
        subtitle="Access immediate contacts, dispatch helpline queries, and report breakdowns/accidents."
        actions={
          <button
            onClick={() => {
              setFormData({
                vehicleId: MOCK_VEHICLES[0]?.id || '',
                driverId: MOCK_DRIVERS[0]?.id || '',
                incidentType: 'Engine Breakdown',
                location: '',
                severity: 'Medium',
                description: ''
              });
              setReportOpen(true);
            }}
            className="h-10 px-4 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all duration-150 shadow-xs"
          >
            <AlertTriangle className="h-4.5 w-4.5" />
            <span>Report Breakdown</span>
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Emergency Contacts list */}
        <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Crisis Contact Directory</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contacts.map((c) => (
              <div key={c.role} className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850 rounded-2xl flex flex-col justify-between hover:border-rose-200 dark:hover:border-rose-900/30 transition-colors">
                <div>
                  <span className="text-4xs font-bold text-slate-450 uppercase block tracking-wider mb-1">{c.role}</span>
                  <span className="font-bold text-slate-800 dark:text-slate-250 block">{c.name}</span>
                </div>
                <a 
                  href={`tel:${c.phone}`}
                  className="mt-3 text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1 hover:underline"
                >
                  <Phone className="h-3.5 w-3.5" />
                  <span>{c.phone}</span>
                </a>
              </div>
            ))}
          </div>
        </div>

        {/* Safety Protocols Guide */}
        <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6 space-y-4">
          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider mb-2">Breakdown & Accident SOP Protocols</h3>
          <div className="space-y-3.5 leading-relaxed text-slate-650 dark:text-slate-350">
            <div className="p-3 bg-cyan-50/20 border border-cyan-100 dark:bg-cyan-955/5 dark:border-cyan-900/20 rounded-xl">
              <p className="font-bold text-cyan-800 dark:text-cyan-300 mb-1">1. Passenger Safety First</p>
              <p className="text-3xs">Instruct drivers to guide all students safely off the vehicle to a sidewalk or barrier, away from oncoming highway traffic.</p>
            </div>
            <div className="p-3 bg-cyan-50/20 border border-cyan-100 dark:bg-cyan-955/5 dark:border-cyan-900/20 rounded-xl">
              <p className="font-bold text-cyan-800 dark:text-cyan-300 mb-1">2. Secure Hazard Spotting</p>
              <p className="text-3xs">Deploy high-visibility double hazard triangles 30 meters behind the vehicle. Switch on vehicle emergency hazard double blinkers.</p>
            </div>
            <div className="p-3 bg-cyan-50/20 border border-cyan-100 dark:bg-cyan-955/5 dark:border-cyan-900/20 rounded-xl">
              <p className="font-bold text-cyan-800 dark:text-cyan-300 mb-1">3. File Dispatch Notification</p>
              <p className="text-3xs">Report the incident immediately using the 'Report Breakdown' trigger above. This triggers parent alert SMS & replacement fleet vehicle routing.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Incident Report Modal */}
      <Modal
        isOpen={reportOpen}
        onClose={() => setReportOpen(false)}
        title="Emergency Incident Dispatch Report"
        size="md"
      >
        <form onSubmit={handleReportIncident} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Select Affected Vehicle</label>
              <select
                value={formData.vehicleId}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleId: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-805 rounded-xl bg-white dark:bg-slate-955"
              >
                {MOCK_VEHICLES.map(v => (
                  <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.make})</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Select Driver In-Charge</label>
              <select
                value={formData.driverId}
                onChange={(e) => setFormData(prev => ({ ...prev, driverId: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-805 rounded-xl bg-white dark:bg-slate-955"
              >
                {MOCK_DRIVERS.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Incident Type</label>
              <select
                value={formData.incidentType}
                onChange={(e) => setFormData(prev => ({ ...prev, incidentType: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-805 rounded-xl bg-white dark:bg-slate-955"
              >
                <option value="Engine Breakdown">Engine Breakdown</option>
                <option value="Minor Collision/Accident">Minor Collision/Accident</option>
                <option value="Flat Tyre / Suspension Issue">Flat Tyre / Suspension Issue</option>
                <option value="Fuel Exhaustion">Fuel Exhaustion</option>
                <option value="Medical Emergency on Board">Medical Emergency on Board</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Incident Severity</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-805 rounded-xl bg-white dark:bg-slate-955"
              >
                <option value="Low">Low (No route disruption)</option>
                <option value="Medium">Medium (Disruption / Delay)</option>
                <option value="High">High (Immediate Towing / Ambulance)</option>
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Live Incident Location <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-805 rounded-xl bg-white dark:bg-slate-950"
              placeholder="e.g. Near SG Highway Underpass"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Description/Specs details <span className="text-rose-500">*</span></label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              className="w-full p-3 border border-slate-200 dark:border-slate-805 rounded-xl bg-white dark:bg-slate-950"
              placeholder="Describe situation, condition of passengers..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-850">
            <button
              type="button"
              onClick={() => setReportOpen(false)}
              className="h-10 px-4 text-xs font-semibold border border-slate-200 dark:border-slate-855 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="h-10 px-4 text-xs font-semibold bg-rose-600 hover:bg-rose-705 text-white rounded-xl shadow-xs"
            >
              Dispatch Crisis Alert
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
