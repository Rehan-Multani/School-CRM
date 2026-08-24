import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { useToast } from '../../components/ui/Toast';
import { Badge } from '../../components/ui/Badge';
import { Megaphone, MessageSquare, Send, Mail } from 'lucide-react';
import { MOCK_COMMUNICATIONS } from '../../utils/constants';

export const Communication = () => {
  const [activeTab, setActiveTab] = useState('circulars');
  const { showToast, ToastComponent } = useToast();

  // Announcement Form State
  const [announcementType, setAnnouncementType] = useState('Academic Circular');
  const [audience, setAudience] = useState('All Parents & Teachers');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  // Messaging Form State
  const [messageTarget, setMessageTarget] = useState('Teachers');
  const [directMessage, setDirectMessage] = useState('');

  // Local Communications Feed State
  const [communications, setCommunications] = useState(MOCK_COMMUNICATIONS);

  const handlePostAnnouncement = (e) => {
    e.preventDefault();
    if (!title || !message) return;

    const newComm = {
      id: `COM-00${communications.length + 1}`,
      date: new Date().toISOString().split('T')[0],
      type: announcementType,
      title: title,
      audience: audience,
      sentBy: 'Principal'
    };

    setCommunications([newComm, ...communications]);
    showToast('Circular announcement posted and broadcasted successfully!', 'success');
    setTitle('');
    setMessage('');
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!directMessage) return;

    showToast(`Direct message dispatched to group: ${messageTarget}!`, 'success');
    setDirectMessage('');
  };

  const columns = [
    { key: 'date', title: 'Post Date', sortable: true },
    { 
      key: 'type', 
      title: 'Notice Category',
      render: (val) => (
        <Badge variant={val === 'Emergency Notice' ? 'danger' : val === 'Holiday Notice' ? 'warning' : 'info'}>
          {val}
        </Badge>
      )
    },
    { key: 'title', title: 'Circular Headline', sortable: true },
    { key: 'audience', title: 'Audience Group' },
    { key: 'sentBy', title: 'Authorized Sender' }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Announcements & Communication" 
        subtitle="Broadcast school-wide circulars, emergency announcements, holiday schedules, and message staff." 
      />

      <Tabs 
        tabs={[
          { id: 'circulars', label: 'Broadcast History' },
          { id: 'post', label: 'Create New Circular Announcement' },
          { id: 'direct', label: 'Direct Messaging Panel' }
        ]} 
        activeTab={activeTab} 
        onChange={setActiveTab} 
      />

      {activeTab === 'circulars' && (
        <DataTable 
          columns={columns} 
          data={communications} 
          searchPlaceholder="Search announcement circulars..."
          searchKey="title"
        />
      )}

      {activeTab === 'post' && (
        <form onSubmit={handlePostAnnouncement} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 text-xs font-semibold">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Notice Category</label>
              <select
                value={announcementType}
                onChange={(e) => setAnnouncementType(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650"
              >
                <option value="Academic Circular">Academic Circular</option>
                <option value="Emergency Notice">Emergency Notice</option>
                <option value="Holiday Notice">Holiday Notice</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Target Audience Group</label>
              <select
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650"
              >
                <option value="All Parents & Teachers">All Parents & Teachers</option>
                <option value="All Students & Staff">All Students & Staff</option>
                <option value="Only Teachers">Only Teachers</option>
                <option value="Only Students">Only Students</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Circular Headline Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Midterm Examination Syllabus Allocation 2026..."
              required
              className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Notice Body Content</label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Compose announcement details here..."
              required
              className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650"
            />
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm"
            >
              <Megaphone className="w-4 h-4" />
              <span>Broadcast Notice Circular</span>
            </button>
          </div>
        </form>
      )}

      {activeTab === 'direct' && (
        <form onSubmit={handleSendMessage} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5 text-xs font-semibold">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Select Direct Recipient Group</label>
            <select
              value={messageTarget}
              onChange={(e) => setMessageTarget(e.target.value)}
              className="w-full max-w-md bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650"
            >
              <option value="Teachers">All Teachers Faculty</option>
              <option value="School Admin">School Admin Staff</option>
              <option value="Science Department">Science Department Head</option>
              <option value="Mathematics Department">Mathematics Department Head</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Direct Message Body</label>
            <textarea
              rows={4}
              value={directMessage}
              onChange={(e) => setDirectMessage(e.target.value)}
              placeholder="Type your message text here..."
              required
              className="w-full bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-650"
            />
          </div>

          <div className="flex justify-end pt-3">
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send Message</span>
            </button>
          </div>
        </form>
      )}

      <ToastComponent />
    </div>
  );
};
export default Communication;
