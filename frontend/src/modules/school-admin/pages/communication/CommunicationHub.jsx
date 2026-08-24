import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { useToast } from '../../components/ui/Toast';
import { 
  Megaphone, 
  Mail, 
  MessageSquare, 
  Send, 
  Users, 
  Plus, 
  ChevronRight 
} from 'lucide-react';

export const CommunicationHub = () => {
  const [activeTab, setActiveTab] = useState('announcements');
  const { showToast, ToastComponent } = useToast();

  const [announcements, setAnnouncements] = useState([
    { id: '1', title: 'Half Yearly Examination Timetable Out', target: 'All Users', date: '2026-07-16', author: 'Principal' },
    { id: '2', title: 'Independence Day Celebrations Schedule', target: 'Students & Parents', date: '2026-07-14', author: 'Cultural Head' },
    { id: '3', title: 'Important Staff Meeting regarding Syllabus Review', target: 'Teachers', date: '2026-07-10', author: 'Principal' }
  ]);

  const [alerts, setAlerts] = useState([
    { id: '1', type: 'SMS', recipient: 'All Parents', content: 'School holiday declared on 18th July due to weather conditions.', status: 'Sent', date: '2026-07-17 07:30 AM' },
    { id: '2', type: 'Email', recipient: 'Teachers', content: 'Draft syllabus submission form deadlines set.', status: 'Sent', date: '2026-07-15 04:00 PM' },
    { id: '3', type: 'Push', recipient: 'Class 10 Students', content: 'Math home assignment due tomorrow. Upload now.', status: 'Delivered', date: '2026-07-16 06:15 PM' }
  ]);

  const [chats, setChats] = useState([
    { id: '1', sender: 'Dr. Ramesh Kumar', message: 'Hello Admin, I have submitted the Science lab inventory requirements.', date: 'Today, 10:15 AM' },
    { id: '2', sender: 'Mrs. Sunita Rao', message: 'Can you please verify my medical leave request?', date: 'Yesterday, 04:30 PM' },
    { id: '3', sender: 'Mr. David D\'souza', message: 'English curriculum syllabus is uploaded to dashboard.', date: '2 days ago' }
  ]);

  const [selectedChat, setSelectedChat] = useState('1');
  const [replyMessage, setReplyMessage] = useState('');

  // Announcements Modal
  const [annModalOpen, setAnnModalOpen] = useState(false);
  const [newAnn, setNewAnn] = useState({ title: '', target: 'All Users', content: '' });

  // Broadcast Modal
  const [broadcastModalOpen, setBroadcastModalOpen] = useState(false);
  const [newBroadcast, setNewBroadcast] = useState({ type: 'SMS', target: 'All Parents', content: '' });

  const handleCreateAnnouncement = (e) => {
    e.preventDefault();
    setAnnouncements(prev => [{
      id: Date.now().toString(),
      title: newAnn.title,
      target: newAnn.target,
      date: new Date().toISOString().split('T')[0],
      author: 'Principal Office'
    }, ...prev]);
    setAnnModalOpen(false);
    showToast('Broadcast Announcement published!', 'success');
  };

  const handleSendBroadcast = (e) => {
    e.preventDefault();
    setAlerts(prev => [{
      id: Date.now().toString(),
      type: newBroadcast.type,
      recipient: newBroadcast.target,
      content: newBroadcast.content,
      status: 'Sent',
      date: 'Just now'
    }, ...prev]);
    setBroadcastModalOpen(false);
    showToast('Direct alert broadcasts pushed to recipients!', 'success');
  };

  const handleSendChatReply = (e) => {
    e.preventDefault();
    if (!replyMessage.trim()) return;
    showToast('Message sent successfully!', 'success');
    setReplyMessage('');
  };

  // Columns Definitions
  const announcementColumns = [
    { header: 'Announcement Title', key: 'title', render: (val) => <span className="font-bold text-slate-900 dark:text-white">{val}</span> },
    { header: 'Target Audience', key: 'target', render: (val) => <Badge variant="primary">{val}</Badge> },
    { header: 'Publish Date', key: 'date' },
    { header: 'Author', key: 'author' }
  ];

  const alertColumns = [
    { header: 'Alert Channel', key: 'type', render: (val) => <Badge variant={val === 'Email' ? 'info' : val === 'SMS' ? 'warning' : 'success'}>{val}</Badge> },
    { header: 'Target Recipient', key: 'recipient' },
    { header: 'Broadcast Content', key: 'content' },
    { header: 'Status', key: 'status', render: (val) => <Badge variant="success">{val}</Badge> },
    { header: 'Dispatch Time', key: 'date' }
  ];

  const activeChatMessage = chats.find(c => c.id === selectedChat);

  return (
    <div className="space-y-6">
      <PageHeader 
        title="Communication Hub" 
        subtitle="Broadcast school announcements, send targeted SMS/Email alerts, and message staff directly."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => setBroadcastModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-bold rounded-xl"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Broadcast Alert</span>
            </button>
            <button
              onClick={() => setAnnModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Announcement</span>
            </button>
          </div>
        }
      />

      <Tabs 
        tabs={[
          { id: 'announcements', label: 'Broadcasting Announcements', count: announcements.length },
          { id: 'alerts', label: 'Broadcast Log Dispatch', count: alerts.length },
          { id: 'messaging', label: 'Internal Messages Box', count: chats.length }
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'announcements' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <DataTable columns={announcementColumns} data={announcements} searchPlaceholder="Search announcements..." />
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
          <DataTable columns={alertColumns} data={alerts} searchPlaceholder="Search alert history..." />
        </div>
      )}

      {activeTab === 'messaging' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chats Sidebar List */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col divide-y divide-slate-100 dark:divide-slate-850">
            <span className="p-4 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Conversations List</span>
            {chats.map((c) => (
              <div
                key={c.id}
                onClick={() => setSelectedChat(c.id)}
                className={`p-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-950/20 transition-colors flex items-center justify-between text-xs font-semibold ${
                  selectedChat === c.id ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-l-4 border-indigo-650' : 'text-slate-655'
                }`}
              >
                <div className="space-y-1">
                  <span className="font-extrabold text-slate-900 dark:text-white block">{c.sender}</span>
                  <span className="text-slate-400 truncate max-w-[180px] block font-medium">{c.message}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-350" />
              </div>
            ))}
          </div>

          {/* Active Chat Conversation Details */}
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[360px]">
            {activeChatMessage ? (
              <div className="flex-1 flex flex-col justify-between">
                <div className="space-y-4">
                  {/* Sender details */}
                  <div className="pb-4 border-b border-slate-100 flex items-center gap-2 text-xs font-bold text-slate-900">
                    <Megaphone className="w-5 h-5 text-indigo-650" />
                    <span>Sender: {activeChatMessage.sender}</span>
                  </div>

                  {/* Message bubble */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-semibold text-slate-400 block">{activeChatMessage.date}</span>
                    <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl text-xs font-semibold text-slate-700 max-w-lg leading-relaxed">
                      {activeChatMessage.message}
                    </div>
                  </div>
                </div>

                {/* Reply Composer */}
                <form onSubmit={handleSendChatReply} className="mt-6 flex gap-3 pt-4 border-t">
                  <input
                    type="text"
                    placeholder={`Reply to ${activeChatMessage.sender}...`}
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-xs font-semibold rounded-xl border focus:outline-none"
                  />
                  <button type="submit" className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm">
                    <Megaphone className="w-3.5 h-3.5" />
                    <span>Send Message</span>
                  </button>
                </form>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-xs font-semibold text-slate-400">
                Select a message thread from the panel
              </div>
            )}
          </div>
        </div>
      )}

      {/* CREATE ANNOUNCEMENT MODAL */}
      <Modal isOpen={annModalOpen} onClose={() => setAnnModalOpen(false)} title="Create Broadcast Announcement">
        <form onSubmit={handleCreateAnnouncement} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Announcement Title</label>
            <input 
              type="text" 
              required
              placeholder="e.g. Winter Holiday Schedule Notice" 
              value={newAnn.title} 
              onChange={(e) => setNewAnn({...newAnn, title: e.target.value})} 
              className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-semibold rounded-xl border focus:outline-none"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Target Audience</label>
            <select
              value={newAnn.target}
              onChange={(e) => setNewAnn({...newAnn, target: e.target.value})}
              className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-semibold rounded-xl border focus:outline-none"
            >
              <option value="All Users">All Users (Parents, Students, Teachers)</option>
              <option value="Teachers">Teachers & Staff Only</option>
              <option value="Students & Parents">Students & Parents Only</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Message Content</label>
            <textarea 
              rows={4}
              placeholder="Type announcement copy here..." 
              value={newAnn.content} 
              onChange={(e) => setNewAnn({...newAnn, content: e.target.value})} 
              className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-semibold rounded-xl border focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setAnnModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">Publish Announcement</button>
          </div>
        </form>
      </Modal>

      {/* BROADCAST ALERT MODAL */}
      <Modal isOpen={broadcastModalOpen} onClose={() => setBroadcastModalOpen(false)} title="Broadcast SMS / Email Alerts">
        <form onSubmit={handleSendBroadcast} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Dispatch Channel</label>
              <select
                value={newBroadcast.type}
                onChange={(e) => setNewBroadcast({...newBroadcast, type: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-semibold rounded-xl border focus:outline-none"
              >
                <option value="SMS">SMS Message Broadcast</option>
                <option value="Email">Email Letter Broadcast</option>
                <option value="Push">App Push Notification</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400">Target Recipient Group</label>
              <select
                value={newBroadcast.target}
                onChange={(e) => setNewBroadcast({...newBroadcast, target: e.target.value})}
                className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-semibold rounded-xl border focus:outline-none"
              >
                <option value="All Parents">All Parents</option>
                <option value="Teachers">Teachers</option>
                <option value="Class 10 Students">Class 10 Students</option>
              </select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400">Message Content</label>
            <textarea 
              rows={4}
              placeholder="Keep character count below 160 for SMS broadcasts..." 
              value={newBroadcast.content} 
              onChange={(e) => setNewBroadcast({...newBroadcast, content: e.target.value})} 
              className="w-full bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-semibold rounded-xl border focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setBroadcastModalOpen(false)} className="px-4 py-2 text-xs font-semibold rounded-xl hover:bg-slate-100">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-indigo-650 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl">Send Alert</button>
          </div>
        </form>
      </Modal>

      <ToastComponent />
    </div>
  );
};
export default CommunicationHub;
