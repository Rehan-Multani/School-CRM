import React, { useState, useEffect, useCallback } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { useToast } from '../../components/ui/Toast';
import { hrApi } from '../../../../shared/api/client';
import {
  Megaphone,
  Plus,
  RefreshCw,
  Send,
  AlertCircle,
  Users,
  Sparkles,
  Calendar,
  CheckCircle2,
  BellRing,
  Trash2,
} from 'lucide-react';
import { Badge } from '../../components/ui/Badge';

export const Announcements = () => {
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Form State
  const [title, setTitle] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [body, setBody] = useState('');

  const { showToast, ToastComponent } = useToast();

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await hrApi.announcements();
      if (res?.success) {
        setNotices(res.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  const handlePostNotice = async (e) => {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;

    setSubmitting(true);
    try {
      let audiences = ['staff', 'teacher', 'hr'];
      if (targetAudience === 'teachers') audiences = ['teacher'];
      else if (targetAudience === 'staff') audiences = ['staff'];

      const res = await hrApi.createAnnouncement({
        title: title.trim(),
        body: body.trim(),
        audiences,
      });

      if (res?.success) {
        setNotices((prev) => [res.data, ...prev]);
        showToast(`Announcement "${title}" published successfully!`, 'success');
        setTitle('');
        setBody('');
      }
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to publish announcement', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteNotice = async (id, noticeTitle) => {
    if (!window.confirm(`Are you sure you want to delete announcement "${noticeTitle}"?`)) return;
    try {
      await hrApi.deleteAnnouncement(id);
      setNotices((prev) => prev.filter((n) => n.id !== id));
      showToast('Announcement removed successfully', 'success');
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Failed to delete announcement', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Institutional Announcements & Faculty Circulars"
        subtitle="Broadcast administrative directives, academic holiday memos, and event circulars across staff portals."
        actions={
          <button
            onClick={fetchAnnouncements}
            disabled={loading}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {error && (
        <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-4 rounded-2xl text-rose-700 dark:text-rose-400 text-xs font-semibold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchAnnouncements} className="underline font-bold cursor-pointer">Retry</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Post Form */}
        <form
          onSubmit={handlePostNotice}
          className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs space-y-4 text-left lg:col-span-1"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="text-[11px] font-bold uppercase text-slate-400">Broadcast Composer</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/60 rounded-xl text-indigo-650 dark:text-indigo-400">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notice Subject / Headline <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Teacher's Day Celebration Schedule"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-semibold"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Target Audience Group
            </label>
            <select
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-semibold"
            >
              <option value="all">All Faculty & Staff Members</option>
              <option value="teachers">Teaching Staff Only</option>
              <option value="staff">Non-Teaching Staff Only</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Notice Content & Directives <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              placeholder="Enter the detailed announcement body..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-indigo-500 text-xs font-semibold"
              required
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{submitting ? 'Publishing...' : 'Broadcast Notice'}</span>
          </button>
        </form>

        {/* Notices Feed */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 shadow-xs lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">Active Circulars Feed</h3>
              <p className="text-xs text-slate-400">Latest administrative notices broadcasted to staff</p>
            </div>
            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-650 dark:text-indigo-400 rounded-xl text-xs font-bold">
              {notices.length} Published
            </span>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-28 bg-slate-100 dark:bg-slate-800/60 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : notices.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <BellRing className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-xs">No announcements broadcasted yet.</p>
            </div>
          ) : (
            <div className="space-y-3.5">
              {notices.map((n) => (
                <div
                  key={n.id}
                  className="p-4 bg-slate-50/80 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-850 rounded-2xl space-y-2 hover:border-indigo-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{n.title}</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">
                        {n.createdAt ? new Date(n.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Today'}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteNotice(n.id, n.title)}
                        className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete Announcement"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                    {n.body || n.content}
                  </p>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-200/40 dark:border-slate-800 text-[10px] font-bold text-slate-400">
                    <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      Audience: {Array.isArray(n.audiences) ? n.audiences.join(', ') : 'All Personnel'}
                    </span>
                    <span>•</span>
                    <span>Broadcast by HR Desk</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ToastComponent />
    </div>
  );
};

export default Announcements;
