import React, { useState } from 'react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { useAppStore } from '../../../shared/store/useAppStore';
import {
  BookOpen, Plus, Clock, Users, CheckCircle, Edit3, Trash2,
  Send, ChevronRight, FileText, Eye, Award
} from 'lucide-react';

const statusVariant = { Active: 'success', Pending: 'warning', Submitted: 'info', Closed: 'default' };

export const TeacherHomework = () => {
  const toast = useToast();
  const { store, createHomework, gradeHomework, updateStore } = useAppStore();

  const [tab, setTab] = useState('active');
  const [showCreate, setShowCreate] = useState(false);
  const [selectedHw, setSelectedHw] = useState(null);
  const [evaluating, setEvaluating] = useState(null);

  const [evalMarks, setEvalMarks] = useState('');
  const [evalFeedback, setEvalFeedback] = useState('');

  const homeworkList = store.homework || [];

  const [form, setForm] = useState({
    title: '', class: '10', section: 'A', subject: 'Mathematics',
    description: '', dueDate: '', totalPoints: 20
  });

  const handleCreate = (e) => {
    e.preventDefault();
    createHomework({
      title: form.title,
      class: form.class,
      section: form.section,
      subject: form.subject,
      description: form.description,
      dueDate: form.dueDate || new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      totalPoints: Number(form.totalPoints) || 20
    }, 'Mr. Rajesh Kumar (Teacher)');

    toast.success('Homework task assigned to Class 10-A! Dispatched to Student & Parent feeds.');
    setShowCreate(false);
    setForm({ title: '', class: '10', section: 'A', subject: 'Mathematics', description: '', dueDate: '', totalPoints: 20 });
  };

  const handleEvaluateSubmit = (e) => {
    e.preventDefault();
    if (!evaluating) return;

    gradeHomework(
      evaluating.hwId,
      evaluating.studentId,
      Number(evalMarks),
      evalFeedback || 'Good effort and clear solution steps.',
      'Mr. Rajesh Kumar (Teacher)'
    );

    toast.success(`Submission evaluated! Awarded ${evalMarks} points to ${evaluating.studentName}.`);
    setEvaluating(null);
    setEvalMarks('');
    setEvalFeedback('');
  };

  const handleDeleteHw = (id) => {
    updateStore(prev => ({
      ...prev,
      homework: prev.homework.filter(h => h.id !== id)
    }), 'HOMEWORK_DELETED', { id });
    toast.success('Homework assignment removed.');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-black text-foreground">Homework & Assignments Desk</h2>
          <p className="text-xs text-slate-500 mt-0.5">Publish academic tasks, review student submissions, and grade work</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Assign New Homework</span>
        </button>
      </div>

      <FilterBar
        filters={[
          { value: 'active', label: `Active Assignments (${homeworkList.length})` },
          { value: 'evaluate', label: 'Student Submissions to Grade' }
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'active' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {homeworkList.map(hw => {
            const subCount = Object.keys(hw.submissions || {}).length;
            return (
              <Card key={hw.id} className="p-5 flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 dark:bg-indigo-950 px-2 py-0.5 rounded">
                      {hw.subject} • Class {hw.class}-{hw.section || 'A'}
                    </span>
                    <button
                      onClick={() => handleDeleteHw(hw.id)}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <h3 className="text-sm font-bold text-foreground">{hw.title}</h3>
                  <p className="text-xs text-slate-500 line-clamp-2">{hw.description}</p>
                </div>

                <div className="pt-3 border-t border-border flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5 text-slate-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Due: {hw.dueDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={subCount > 0 ? 'success' : 'default'}>
                      {subCount} Submissions
                    </Badge>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {tab === 'evaluate' && (
        <Card className="p-6 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pending Student Submissions</h3>
          <div className="divide-y divide-border">
            {homeworkList.map(hw => {
              const subs = hw.submissions || {};
              return Object.keys(subs).map(stId => {
                const sub = subs[stId];
                const student = store.students.find(s => s.id === stId) || { name: 'Aarav Sharma', admissionNo: 'ADM-2024-8902' };
                return (
                  <div key={`${hw.id}-${stId}`} className="py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{student.name}</span>
                        <span className="text-[10px] text-slate-400 font-semibold">{student.admissionNo}</span>
                        <Badge variant={sub.marks !== null ? 'success' : 'warning'}>
                          {sub.marks !== null ? `Graded: ${sub.marks}/${hw.totalPoints}` : 'Pending Grade'}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Assignment: <strong>{hw.title}</strong> ({hw.subject})</p>
                      <span className="text-[10px] text-indigo-600 font-semibold">Attached: {sub.fileName || 'Assignment.pdf'} • Submitted: {sub.submittedAt}</span>
                    </div>

                    <button
                      onClick={() => setEvaluating({ hwId: hw.id, studentId: stId, studentName: student.name, totalPoints: hw.totalPoints })}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      {sub.marks !== null ? 'Update Grade' : 'Grade Submission'}
                    </button>
                  </div>
                );
              });
            })}
          </div>
        </Card>
      )}

      {/* CREATE HOMEWORK MODAL */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Assign New Class Homework">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Assignment Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Quadratic Equations Exercise 4.2"
              className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border text-foreground"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Subject</label>
              <select
                value={form.subject}
                onChange={(e) => setForm({ ...form, subject: e.target.value })}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border text-foreground"
              >
                {['Mathematics', 'Science', 'English', 'Social Studies', 'Computer Science'].map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Due Date *</label>
              <input
                type="date"
                required
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border text-foreground"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Instructions & Problems</label>
            <textarea
              rows={3}
              required
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Provide problem numbers and guidelines..."
              className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border text-foreground"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
          >
            Publish Homework to Class Roster
          </button>
        </form>
      </Modal>

      {/* GRADE MODAL */}
      <Modal isOpen={!!evaluating} onClose={() => setEvaluating(null)} title={`Grade Submission: ${evaluating?.studentName}`}>
        {evaluating && (
          <form onSubmit={handleEvaluateSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Marks Awarded (Max: {evaluating.totalPoints}) *</label>
              <input
                type="number"
                min="0"
                max={evaluating.totalPoints}
                required
                value={evalMarks}
                onChange={(e) => setEvalMarks(e.target.value)}
                placeholder="e.g. 19"
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border text-foreground"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Teacher Remarks & Feedback</label>
              <textarea
                rows={3}
                value={evalFeedback}
                onChange={(e) => setEvalFeedback(e.target.value)}
                placeholder="Good method, step-by-step derivation is clear..."
                className="w-full px-3 py-2 text-xs border rounded-xl bg-slate-50 dark:bg-slate-900 border-border text-foreground"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md"
            >
              Save Grade & Deliver Feedback
            </button>
          </form>
        )}
      </Modal>
    </div>
  );
};
export default TeacherHomework;
