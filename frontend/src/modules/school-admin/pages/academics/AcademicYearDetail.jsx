import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { academicPortalApi } from '../../../../shared/api/client';
import { AcademicBreadcrumb, CountCards, EmptyState } from './components/AcademicUi';
import { apiMessage, formatDate, YEAR_STATUS_VARIANT, ENTITY_STATUS_VARIANT } from './utils';
import {
  Loader2,
  Plus,
  Trash2,
  Pencil,
  Star,
  Check,
  CheckCircle,
  Archive,
  ArchiveRestore,
  Eye,
  DoorOpen,
  Users,
  BookOpen
} from 'lucide-react';
import { DetailPageSkeleton } from '../../components/ui/SkeletonLoader';

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-xs outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

export const AcademicYearDetail = () => {
  const { yearId } = useParams();
  const navigate = useNavigate();
  const { showToast, ToastComponent } = useToast();
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(null);
  const [yearClasses, setYearClasses] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [sectionModal, setSectionModal] = useState(null);
  const [editSectionModal, setEditSectionModal] = useState(null);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [saving, setSaving] = useState(false);
  const [sectionForm, setSectionForm] = useState({ name: '', capacity: 40, roomNumber: '', classTeacherId: '' });
  const [editSectionForm, setEditSectionForm] = useState({ name: '', capacity: 40, roomNumber: '', classTeacherId: '', status: 'ACTIVE' });
  const [teachers, setTeachers] = useState([]);
  const [removeClassTarget, setRemoveClassTarget] = useState(null);
  const [deleteSectionTarget, setDeleteSectionTarget] = useState(null);
  const [deleteYearTarget, setDeleteYearTarget] = useState(null);

  // Edit Year Modal state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [yearSaving, setYearSaving] = useState(false);
  const [yearForm, setYearForm] = useState({
    name: '',
    code: '',
    startDate: '',
    endDate: '',
    status: 'DRAFT',
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [yearRes, classesRes, allClassesRes, teachersRes] = await Promise.all([
        academicPortalApi.getYear(yearId),
        academicPortalApi.yearClasses(yearId),
        academicPortalApi.classes({ limit: 100 }),
        academicPortalApi.teachers({ status: 'ACTIVE' }),
      ]);
      setYear(yearRes.data);
      setYearClasses(classesRes.data || []);
      setAllClasses(allClassesRes.data || []);
      setTeachers(teachersRes.data || []);
    } catch (error) {
      showToast(apiMessage(error, 'Unable to load academic year'), 'error');
    } finally {
      setLoading(false);
    }
  }, [yearId, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const availableClasses = allClasses.filter(
    (cls) => !yearClasses.some((item) => item.classId === cls.id)
  );

  const openEditModal = () => {
    if (!year) return;
    setYearForm({
      name: year.name || '',
      code: year.code || '',
      startDate: year.startDate?.slice(0, 10) || '',
      endDate: year.endDate?.slice(0, 10) || '',
      status: year.status || 'DRAFT',
    });
    setEditModalOpen(true);
  };

  const handleUpdateYear = async (e) => {
    e.preventDefault();
    setYearSaving(true);
    try {
      await academicPortalApi.updateYear(yearId, yearForm);
      showToast('Academic year updated successfully', 'success');
      setEditModalOpen(false);
      loadData();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to update academic year'), 'error');
    } finally {
      setYearSaving(false);
    }
  };

  const runAction = async (actionFn, message) => {
    try {
      await actionFn(yearId);
      showToast(message, 'success');
      loadData();
    } catch (error) {
      showToast(apiMessage(error, 'Action failed'), 'error');
    }
  };

  const confirmDeleteYear = async () => {
    if (!deleteYearTarget) return;
    try {
      await academicPortalApi.deleteYear(deleteYearTarget.id);
      showToast('Academic year deleted', 'success');
      navigate('/school-admin/academics/years');
    } catch (error) {
      showToast(apiMessage(error, 'Unable to delete academic year'), 'error');
    } finally {
      setDeleteYearTarget(null);
    }
  };

  const handleAddClass = async (e) => {
    e.preventDefault();
    if (!selectedClassId) return;
    setSaving(true);
    try {
      await academicPortalApi.addClassToYear(yearId, selectedClassId);
      showToast('Class added to academic year', 'success');
      setModalOpen(false);
      setSelectedClassId('');
      loadData();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to add class'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveClass = async () => {
    if (!removeClassTarget) return;
    try {
      await academicPortalApi.removeClassFromYear(yearId, removeClassTarget.classId);
      showToast('Class removed from academic year', 'success');
      loadData();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to remove class mapping'), 'error');
    } finally {
      setRemoveClassTarget(null);
    }
  };

  const handleDeleteSection = async () => {
    if (!deleteSectionTarget) return;
    try {
      await academicPortalApi.deleteSection(deleteSectionTarget.id);
      showToast('Section deleted successfully', 'success');
      loadData();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to delete section'), 'error');
    } finally {
      setDeleteSectionTarget(null);
    }
  };

  const handleCreateSection = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await academicPortalApi.createSection({
        academicYearId: yearId,
        classId: sectionModal.classId,
        name: sectionForm.name,
        capacity: Number(sectionForm.capacity),
        roomNumber: sectionForm.roomNumber,
        classTeacherId: sectionForm.classTeacherId || undefined,
      });
      showToast('Section created', 'success');
      setSectionModal(null);
      setSectionForm({ name: '', capacity: 40, roomNumber: '', classTeacherId: '' });
      loadData();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to create section'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenEditSection = (section) => {
    setEditSectionModal(section);
    setEditSectionForm({
      name: section.name || '',
      capacity: section.capacity ?? 40,
      roomNumber: section.roomNumber || '',
      classTeacherId: section.classTeacherId || section.classTeacher?.id || '',
      status: section.status || 'ACTIVE',
    });
  };

  const handleSaveEditSection = async (e) => {
    e.preventDefault();
    if (!editSectionModal) return;
    setSaving(true);
    try {
      await academicPortalApi.updateSection(editSectionModal.id, {
        name: editSectionForm.name,
        capacity: Number(editSectionForm.capacity),
        roomNumber: editSectionForm.roomNumber,
        classTeacherId: editSectionForm.classTeacherId || null,
        status: editSectionForm.status || 'ACTIVE',
      });
      showToast('Section updated successfully', 'success');
      setEditSectionModal(null);
      loadData();
    } catch (error) {
      showToast(apiMessage(error, 'Unable to update section'), 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (!year) {
    return (
      <EmptyState
        title="Academic Year Not Found"
        description="The requested academic session does not exist or has been removed."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <AcademicBreadcrumb items={[{ label: 'Academic Years', to: '/school-admin/academics/years' }, { label: year.name }]} />

      {/* Page Header */}
      <PageHeader
        title={year.name}
        subtitle={`${formatDate(year.startDate)} - ${formatDate(year.endDate)} · Code: ${year.code || '—'}`}
        badge={
          <Badge variant={YEAR_STATUS_VARIANT[year.status] || 'default'}>
            {year.isCurrent ? 'Current Session' : year.status}
          </Badge>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Edit Year Action */}
            <button
              type="button"
              onClick={openEditModal}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 shadow-xs cursor-pointer transition-all"
            >
              <Pencil className="h-3.5 w-3.5 text-primary" /> Edit Year
            </button>

            {/* Status Transition Actions */}
            {year.status === 'DRAFT' && (
              <button
                type="button"
                onClick={() => runAction(academicPortalApi.activateYear, 'Academic year activated')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-900/50 dark:bg-indigo-950/40 dark:text-indigo-300 transition-all cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" /> Activate Year
              </button>
            )}

            {year.status === 'ACTIVE' && !year.isCurrent && (
              <>
                <button
                  type="button"
                  onClick={() => runAction(academicPortalApi.setCurrentYear, 'Set as current year')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300 transition-all cursor-pointer"
                >
                  <Star className="h-3.5 w-3.5" /> Set as Current
                </button>
                <button
                  type="button"
                  onClick={() => runAction(academicPortalApi.completeYear, 'Academic year marked as completed')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 hover:bg-violet-100 dark:border-violet-900/50 dark:bg-violet-950/40 dark:text-violet-300 transition-all cursor-pointer"
                >
                  <CheckCircle className="h-3.5 w-3.5" /> Complete
                </button>
                <button
                  type="button"
                  onClick={() => runAction(academicPortalApi.archiveYear, 'Academic year archived')}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300 transition-all cursor-pointer"
                >
                  <Archive className="h-3.5 w-3.5" /> Archive
                </button>
              </>
            )}

            {year.status === 'COMPLETED' && (
              <button
                type="button"
                onClick={() => runAction(academicPortalApi.archiveYear, 'Academic year archived')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300 transition-all cursor-pointer"
              >
                <Archive className="h-3.5 w-3.5" /> Archive
              </button>
            )}

            {year.status === 'ARCHIVED' && (
              <button
                type="button"
                onClick={() => runAction(academicPortalApi.unarchiveYear, 'Academic year unarchived')}
                className="inline-flex items-center gap-1.5 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-bold text-sky-700 hover:bg-sky-100 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-300 transition-all cursor-pointer"
              >
                <ArchiveRestore className="h-3.5 w-3.5" /> Unarchive
              </button>
            )}

            {/* Primary Add Class Action */}
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-xs shadow-primary/20 hover:bg-primary/90 transition-all cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Add Class
            </button>
          </div>
        }
      />

      {/* Summary Count Cards */}
      <CountCards
        items={[
          { label: 'Classes Mapped', value: yearClasses.length, highlight: true },
          {
            label: 'Total Sections',
            value: yearClasses.reduce((acc, c) => acc + (c.counts?.sections || 0), 0),
          },
          {
            label: 'Enrolled Students',
            value: yearClasses.reduce((acc, c) => acc + (c.counts?.students || 0), 0),
          },
          {
            label: 'Subject Mappings',
            value: yearClasses.reduce((acc, c) => acc + (c.counts?.subjectAssignments || 0), 0),
          },
        ]}
      />

      {/* Year Classes & Sections */}
      {yearClasses.length === 0 ? (
        <EmptyState
          title="No classes mapped to this year"
          description="Add classes from your school master list to start creating sections and mapping curriculum."
          action={
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm"
            >
              Add First Class
            </button>
          }
        />
      ) : (
        <div className="grid gap-4">
          {yearClasses.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">{item.class?.name}</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.counts?.sections ?? 0} sections · {item.counts?.students ?? 0} students ·{' '}
                    {item.counts?.subjectAssignments ?? 0} subject assignments
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSectionModal({ classId: item.classId, className: item.class?.name })
                    }
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-primary hover:text-primary dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 transition-all cursor-pointer"
                  >
                    <Plus className="h-3 w-3" /> Add Section
                  </button>
                  <button
                    type="button"
                    onClick={() => setRemoveClassTarget(item)}
                    className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition cursor-pointer"
                    title="Remove class mapping from this year"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <ClassSections
                yearId={yearId}
                classId={item.classId}
                teachers={teachers}
                onChanged={loadData}
                onEditSection={(sec) => handleOpenEditSection(sec)}
                onDeleteSection={(sec) => setDeleteSectionTarget(sec)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Edit Academic Year Modal */}
      <Modal isOpen={editModalOpen} onClose={() => setEditModalOpen(false)} title="Edit Academic Year">
        <form onSubmit={handleUpdateYear} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Academic Year Name *</label>
            <input
              className={inputClass}
              value={yearForm.name}
              onChange={(e) => setYearForm({ ...yearForm, name: e.target.value })}
              placeholder="e.g. 2026-27"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Code</label>
            <input
              className={inputClass}
              value={yearForm.code}
              onChange={(e) => setYearForm({ ...yearForm, code: e.target.value })}
              placeholder="e.g. AY-2026-27"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Start Date *</label>
              <input
                type="date"
                className={inputClass}
                value={yearForm.startDate}
                onChange={(e) => setYearForm({ ...yearForm, startDate: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">End Date *</label>
              <input
                type="date"
                className={inputClass}
                value={yearForm.endDate}
                onChange={(e) => setYearForm({ ...yearForm, endDate: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Status</label>
            <select
              className={inputClass}
              value={yearForm.status}
              onChange={(e) => setYearForm({ ...yearForm, status: e.target.value })}
            >
              <option value="DRAFT">DRAFT</option>
              <option value="ACTIVE">ACTIVE</option>
              <option value="COMPLETED">COMPLETED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={yearSaving}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {yearSaving ? 'Saving...' : 'Update Academic Year'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Class to Year Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Class to Academic Year">
        <form onSubmit={handleAddClass} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Select Class *</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 outline-none focus:border-primary"
              value={selectedClassId}
              onChange={(e) => setSelectedClassId(e.target.value)}
              required
            >
              <option value="">Choose class</option>
              {availableClasses.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name}
                </option>
              ))}
            </select>
          </div>
          {availableClasses.length === 0 && (
            <p className="text-xs text-slate-500">
              No classes available.{' '}
              <Link to="/school-admin/academics/classes" className="font-bold text-primary hover:underline">
                Create classes first
              </Link>
              .
            </p>
          )}
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !selectedClassId}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-60"
            >
              {saving ? 'Adding...' : 'Add Class'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add Section Modal */}
      <Modal
        isOpen={Boolean(sectionModal)}
        onClose={() => setSectionModal(null)}
        title={`Add Section (${sectionModal?.className || ''})`}
      >
        <form onSubmit={handleCreateSection} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Section Name *</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 outline-none focus:border-primary"
              value={sectionForm.name}
              onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
              required
            >
              <option value="" disabled>Select Section</option>
              {['Section A', 'Section B', 'Section C', 'Section D', 'Section E', 'Section F'].map((sec) => (
                <option key={sec} value={sec}>
                  {sec}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Capacity</label>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={sectionForm.capacity}
                onChange={(e) => setSectionForm({ ...sectionForm, capacity: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Room Number</label>
              <input
                type="text"
                className={inputClass}
                value={sectionForm.roomNumber}
                onChange={(e) => setSectionForm({ ...sectionForm, roomNumber: e.target.value })}
                placeholder="e.g. 204"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Class Teacher (Optional)</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 outline-none focus:border-primary"
              value={sectionForm.classTeacherId}
              onChange={(e) => setSectionForm({ ...sectionForm, classTeacherId: e.target.value })}
            >
              <option value="">Unassigned</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.department || 'Faculty'})
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSectionModal(null)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm disabled:opacity-60"
            >
              {saving ? 'Creating...' : 'Create Section'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Section Modal */}
      <Modal
        isOpen={Boolean(editSectionModal)}
        onClose={() => setEditSectionModal(null)}
        title={`Edit Section (${editSectionModal?.name || ''})`}
      >
        <form onSubmit={handleSaveEditSection} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Section Name *</label>
            <input
              type="text"
              className={inputClass}
              value={editSectionForm.name}
              onChange={(e) => setEditSectionForm({ ...editSectionForm, name: e.target.value })}
              placeholder="e.g. Section A"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Capacity</label>
              <input
                type="number"
                min="1"
                className={inputClass}
                value={editSectionForm.capacity}
                onChange={(e) => setEditSectionForm({ ...editSectionForm, capacity: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Room Number</label>
              <input
                type="text"
                className={inputClass}
                value={editSectionForm.roomNumber}
                onChange={(e) => setEditSectionForm({ ...editSectionForm, roomNumber: e.target.value })}
                placeholder="e.g. 101"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Class Teacher Mentor</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 outline-none focus:border-primary"
              value={editSectionForm.classTeacherId}
              onChange={(e) => setEditSectionForm({ ...editSectionForm, classTeacherId: e.target.value })}
            >
              <option value="">No Class Teacher (Vacant)</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.department || 'Faculty'})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Status</label>
            <select
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-semibold dark:border-slate-800 dark:bg-slate-950 outline-none focus:border-primary"
              value={editSectionForm.status}
              onChange={(e) => setEditSectionForm({ ...editSectionForm, status: e.target.value })}
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setEditSectionModal(null)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Remove Class from Year Dialog */}
      <ConfirmDialog
        isOpen={Boolean(removeClassTarget)}
        onClose={() => setRemoveClassTarget(null)}
        onConfirm={handleRemoveClass}
        title="Remove Class Mapping"
        message={`Remove class "${removeClassTarget?.class?.name}" and its sections from this academic year?`}
        confirmText="Remove Class"
        variant="danger"
      />

      {/* Confirm Delete Section Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteSectionTarget)}
        onClose={() => setDeleteSectionTarget(null)}
        onConfirm={handleDeleteSection}
        title="Delete Section"
        message={`Are you sure you want to delete "${deleteSectionTarget?.name}"?`}
        confirmText="Delete Section"
        variant="danger"
      />

      {/* Confirm Delete Year Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteYearTarget)}
        onClose={() => setDeleteYearTarget(null)}
        onConfirm={confirmDeleteYear}
        title="Delete Academic Year"
        message={`Are you sure you want to permanently delete academic year "${year.name}"?`}
        confirmText="Delete Academic Year"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

function ClassSections({ yearId, classId, teachers, onChanged, onEditSection, onDeleteSection }) {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    academicPortalApi
      .sections({ academicYearId: yearId, classId })
      .then((result) => {
        if (!cancelled) setSections(result.data || []);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [yearId, classId, onChanged]);

  if (loading) return <p className="mt-4 text-xs text-slate-400">Loading sections...</p>;
  if (!sections.length) return <p className="mt-4 text-xs text-slate-400">No sections added yet.</p>;

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-100 dark:border-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
            <tr>
              <th className="px-3.5 py-2.5">Section</th>
              <th className="px-3.5 py-2.5">Class Teacher</th>
              <th className="px-3.5 py-2.5">Room</th>
              <th className="px-3.5 py-2.5">Capacity</th>
              <th className="px-3.5 py-2.5 text-center">Students</th>
              <th className="px-3.5 py-2.5 text-center">Subjects</th>
              <th className="px-3.5 py-2.5">Status</th>
              <th className="px-3.5 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium text-slate-800 dark:text-slate-200">
            {sections.map((section) => (
              <tr key={section.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors">
                <td className="px-3.5 py-2.5 font-bold text-slate-900 dark:text-white">
                  {section.name}
                </td>
                <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-300">
                  {section.classTeacher?.name || <span className="text-slate-400 italic">Unassigned</span>}
                </td>
                <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400">
                  {section.roomNumber || '—'}
                </td>
                <td className="px-3.5 py-2.5 text-slate-600 dark:text-slate-400">
                  {section.capacity || 40}
                </td>
                <td className="px-3.5 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                  {section.counts?.students ?? 0}
                </td>
                <td className="px-3.5 py-2.5 text-center font-bold text-slate-700 dark:text-slate-300">
                  {section.counts?.subjects ?? 0}
                </td>
                <td className="px-3.5 py-2.5">
                  <Badge variant={ENTITY_STATUS_VARIANT[section.status] || 'default'}>
                    {section.status || 'ACTIVE'}
                  </Badge>
                </td>
                <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => onEditSection && onEditSection(section)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition cursor-pointer"
                      title="Edit Section"
                    >
                      <Pencil size={15} />
                    </button>
                    <Link
                      to={`/school-admin/academics/years/${yearId}/sections/${section.id}`}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400 transition"
                      title="Open Section Details"
                    >
                      <Eye size={15} />
                    </Link>
                    <button
                      type="button"
                      onClick={() => onDeleteSection && onDeleteSection(section)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition cursor-pointer"
                      title="Delete Section"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AcademicYearDetail;
