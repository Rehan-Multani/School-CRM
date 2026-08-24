import React, { useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { MOCK_ROUTES, MOCK_VEHICLES } from '../../utils/constants';
import { Send, Users, Bus, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export const Communication = () => {
  const toast = useToast();
  const [target, setTarget] = useState('All'); // All, Route, Vehicle
  const [targetId, setTargetId] = useState('');
  const [channel, setChannel] = useState('SMS'); // SMS, Email, Both
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Alert title and message cannot be empty.');
      return;
    }

    // Simulated broadcast
    toast.success(`Successfully broadcasted ${channel} alert notification!`);
    
    setTitle('');
    setMessage('');
    setTargetId('');
  };

  return (
    <div className="space-y-6 text-xs max-w-xl mx-auto animate-fadeIn">
      <PageHeader
        title="Broadcast Alerts Desk"
        subtitle="Dispatch emergency announcements or route delay alerts directly to parents and drivers."
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-202 dark:border-slate-800 rounded-3xl p-6 md:p-8">
        <form onSubmit={handleSend} className="space-y-4">
          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Broadcast Audience Target</label>
            <div className="grid grid-cols-3 gap-2">
              {['All Parents & Drivers', 'Specific Route', 'Specific Vehicle'].map((opt, idx) => {
                const vals = ['All', 'Route', 'Vehicle'];
                const isSel = target === vals[idx];
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setTarget(vals[idx]);
                      setTargetId('');
                    }}
                    className={cn(
                      "h-10 text-3xs font-bold uppercase tracking-wider border rounded-xl transition-all duration-150",
                      isSel 
                        ? "bg-cyan-600 border-cyan-600 text-white shadow-xs" 
                        : "border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                    )}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Conditional targets selection */}
          {target === 'Route' && (
            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Select Target Route</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full h-10 px-3 border border-slate-202 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955"
              >
                <option value="">Select Route...</option>
                {MOCK_ROUTES.map(r => (
                  <option key={r.id} value={r.id}>{r.routeName} ({r.routeCode})</option>
                ))}
              </select>
            </div>
          )}

          {target === 'Vehicle' && (
            <div className="space-y-1.5">
              <label className="font-bold text-slate-550 dark:text-slate-450">Select Target Vehicle Fleet</label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full h-10 px-3 border border-slate-202 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955"
              >
                <option value="">Select Vehicle...</option>
                {MOCK_VEHICLES.map(v => (
                  <option key={v.id} value={v.id}>{v.vehicleNumber} ({v.make})</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Alert Channel</label>
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full h-10 px-3 border border-slate-202 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-955"
            >
              <option value="SMS">SMS Push Notification</option>
              <option value="Email">Email Dispatch</option>
              <option value="Both">Both (SMS + Email Dispatch)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Alert Title / Subject <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950"
              placeholder="e.g. Route NZ-A 20-minute Delay Warning"
            />
          </div>

          <div className="space-y-1.5">
            <label className="font-bold text-slate-550 dark:text-slate-450">Message Body Content <span className="text-rose-500">*</span></label>
            <textarea
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full p-3 border border-slate-202 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950"
              placeholder="Type dispatch messages here..."
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full h-11 bg-cyan-600 hover:bg-cyan-705 text-white font-bold rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all duration-150"
            >
              <Send className="h-4.5 w-4.5" />
              <span>Broadcast Announcement</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
