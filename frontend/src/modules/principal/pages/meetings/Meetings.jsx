import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { useToast } from '../../components/ui/Toast';
import { Video, Calendar, PlusCircle } from 'lucide-react';
import { MOCK_MEETINGS } from '../../utils/constants';

export const Meetings = () => {
  const [activeTab, setActiveTab] = useState('list');
  const { showToast, ToastComponent } = useToast();

  // Schedule form state
  const [title, setTitle] = useState('');
  const [type, setType] = useState('Staff Meeting');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [participants, setParticipants] = useState('All Academic Staff');

  // Local Meetings State
  const [meetings, setMeetings] = useState(MOCK_MEETINGS);

  const handleScheduleMeeting = (e) => {
    e.preventDefault();
    if (!title || !date || !time) return;

    const newMeeting = {
      id: `MTG-00${meetings.length + 1}`,
      title: title,
      type: type,
      date: date,
      time: time,
      participants: participants,
      status: 'Scheduled'
    };

    setMeetings([newMeeting, ...meetings]);
    showToast('Executive meeting scheduled and invitations sent!', 'success');

    // Reset Form
    setTitle('');
    setDate('');
    setTime('');
  };

  const columns = [
    { key: 'title', title: 'Meeting Subject Title', sortable: true },
    { 
      key: 'type', 
      title: 'Meeting Type',
      render: (val) => (
        <Badge variant={val === 'Staff Meeting' ? 'info' : val === 'Parent Meeting' ? 'warning' : 'success'}>
          {val}
        </Badge>
      )
    },
    { key: 'date', title: 'Scheduled Date', sortable: true },
    { key: 'time', title: 'Time Slot' },
    { key: 'participants', title: 'Participants Group' },
    { 
      key: 'status', 
      title: 'Status',
      render: (val) => <Badge variant={val === 'Scheduled' ? 'success' : 'default'}>{val}</Badge>
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Meetings Agenda Calendar" 
        subtitle="Schedule and review staff advisory meetings, Parent Teacher Associations (PTAs), and syllabus reviews." 
      />

      <Tabs 
        tabs={[
          { id: 'list', label: 'Upcoming Scheduled Meetings' },
          { id: 'schedule', label: 'Schedule New Session' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'list' && (
        <DataTable 
          columns={columns} 
          data={meetings} 
          searchPlaceholder="Search meetings..."
          searchKey="title"
        />
      )}

      {activeTab === 'schedule' && (
        <form onSubmit={handleScheduleMeeting} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 text-xs font-semibold">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-450 block">Meeting Category</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650"
              >
                <option value="Staff Meeting">Staff Meeting</option>
                <option value="Parent Meeting">Parent Meeting</option>
                <option value="Department Meeting">Department Meeting</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-455 block">Participant Target Group</label>
              <select
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650"
              >
                <option value="All Academic Staff">All Academic Staff</option>
                <option value="Class 10 & 12 Parents">Class 10 & 12 Parents</option>
                <option value="Science Department Representative">Science Department Representative</option>
                <option value="Mathematics Department Representative">Mathematics Department Representative</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-455 block">Meeting Title Agenda</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Annual Syllabus Coverage Review..."
              required
              className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-455 block">Meeting Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-455 block">Time Slot</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650"
              />
            </div>
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Schedule Session</span>
            </button>
          </div>
        </form>
      )}

      <ToastComponent />
    </div>
  );
};
export default Meetings;
