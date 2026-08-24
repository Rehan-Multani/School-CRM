import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { academicPortalApi } from '../../../../shared/api/client';
import { AcademicBreadcrumb, CountCards, EmptyState } from './components/AcademicUi';
import { apiMessage, ENTITY_STATUS_VARIANT } from './utils';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { DetailPageSkeleton } from '../../components/ui/SkeletonLoader';

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950';

export const SectionDetail = () => {
  const { yearId, sectionId } = useParams();
  const { showToast, ToastComponent } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState(null);
  const [sectionSubjects, setSectionSubjects] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState({
    subjectId: '',
    teacherId: '',
    maxMarks: 100,
    passingMarks: 33,
    isOptional: false,
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [sectionRes, subjectsRes, masterSubjectsRes, teachersRes] = await Promise.all([
        academicPortalApi.getSection(sectionId),
        academicPortalApi.sectionSubjects(sectionId),
        academicPortalApi.subjects({ limit: 100, status: 'ACTIVE' }),
        academicPortalApi.teachers({ status: 'ACTIVE' }),
      ]);
      setSection(sectionRes.data);
      setSectionSubjects(subjectsRes.data || []);
      setSubjects(masterSubjectsRes.data || []);
      setTeachers(teachersRes.data || []);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load section'), 'error');
    } finally {
      setLoading(false);
    }
  }, [sectionId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await academicPortalApi.addSectionSubject(sectionId, {
        ...form,
        maxMarks: Number(form.maxMarks),
        passingMarks: Number(form.passingMarks),
      });
      showToast('Subject assigned to section', 'success');
      setModalOpen(false);
      setForm({ subjectId: '', teacherId: '', maxMarks: 100, passingMarks: 33, isOptional: false });
      loadData();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to assign subject'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubject = (item) => {
    setDeleteTarget(item);
  };

  const confirmRemoveSubject = async () => {
    if (!deleteTarget) return;
    try {
      await academicPortalApi.deleteSectionSubject(deleteTarget.id);
      showToast('Subject removed', 'success');
      loadData();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to remove subject'), 'error');
    } finally {
      setDeleteTarget(null);
    }
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (!section) return null;

  const classLabel = section.class?.name || 'Class';
  const yearLabel = section.academicYear?.name || 'Academic Year';
  const sectionLabel = `Section ${section.name}`;

  return (
    <div className="space-y-6">
      <AcademicBreadcrumb
        items={[
          { label: 'Academic Years', to: '/school-admin/academics/years' },
          { label: yearLabel, to: `/school-admin/academics/years/${yearId}` },
          { label: `${classLabel} — ${sectionLabel}` },
        ]}
      />

      <PageHeader
        title={`${classLabel} — ${sectionLabel}`}
        subtitle={`${yearLabel} · Room ${section.roomNumber || '—'} · Capacity ${section.capacity}`}
        action={<Badge variant={ENTITY_STATUS_VARIANT[section.status] || 'default'}>{section.status}</Badge>}
      />

      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'students', label: 'Students' },
          { id: 'subjects', label: 'Subjects' },
          { id: 'teacher', label: 'Class Teacher' },
          { id: 'timetable', label: 'Timetable' },
          { id: 'attendance', label: 'Attendance' },
          { id: 'exams', label: 'Exams' },
        ]}
        activeTab={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <CountCards
            items={[
              { label: 'Capacity', value: section.counts?.capacity ?? section.capacity },
              { label: 'Students', value: section.counts?.students },
              { label: 'Subjects', value: section.counts?.subjects },
              { label: 'Class Teacher', value: section.classTeacher?.name || '—' },
            ]}
          />
        </div>
      )}

      {activeTab === 'students' && (
        <EmptyState
          title="Students module coming soon"
          description="Student enrollments will connect to this section via StudentEnrollment records."
        />
      )}

      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">{sectionLabel} — Subjects</h3>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Add Subject
            </button>
          </div>

          {sectionSubjects.length === 0 ? (
            <EmptyState title="No subjects assigned" description="Assign subjects and teachers for this section." />
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  <tr>
                    {['Subject', 'Teacher', 'Type', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 font-bold text-slate-500 dark:text-slate-400">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sectionSubjects.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 dark:border-slate-850">
                      <td className="px-4 py-3 font-bold">{item.subject?.name}</td>
                      <td className="px-4 py-3">{item.teacher?.name || '—'}</td>
                      <td className="px-4 py-3">{item.subject?.subjectType || 'THEORY'}</td>
                      <td className="px-4 py-3">{item.status}</td>
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveSubject(item)}
                          className="inline-flex items-center gap-1 font-bold text-rose-500 hover:underline"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'teacher' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white">Class Teacher</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {section.classTeacher?.name || 'No class teacher assigned yet.'}
          </p>
        </div>
      )}

      {['timetable', 'attendance', 'exams'].includes(activeTab) && (
        <EmptyState
          title={`${activeTab.charAt(0).toUpperCase()}${activeTab.slice(1)} module coming soon`}
          description="This tab is reserved for the next phase of academic integrations."
        />
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Subject to Section">
        <form onSubmit={handleAddSubject} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Subject *</label>
            <select
              className={inputClass}
              value={form.subjectId}
              onChange={(e) => setForm({ ...form, subjectId: e.target.value })}
              required
            >
              <option value="">Select subject</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Teacher</label>
            <select
              className={inputClass}
              value={form.teacherId}
              onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
            >
              <option value="">Select teacher</option>
              {teachers.map((teacher) => (
                <option key={teacher.id} value={teacher.id}>
                  {teacher.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="rounded-xl px-4 py-2 text-xs font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Subject'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmRemoveSubject}
        title="Remove Subject"
        message={`Remove subject "${deleteTarget?.subject?.name}" from the section?`}
        confirmText="Remove Subject"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default SectionDetail;
