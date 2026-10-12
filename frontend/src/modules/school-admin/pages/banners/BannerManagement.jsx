import React, { useCallback, useEffect, useRef, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { bannerApi, bannerImageUrl } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { ArrowLeft, ArrowRight, ImagePlus, Link2, Loader2, Pencil, Plus, Trash2, Eye, EyeOff, Smartphone } from 'lucide-react';

const MAX_BANNERS = 10;
const MAX_FILE_BYTES = 6 * 1024 * 1024;

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const AUDIENCES = [
  ['STUDENT', 'Student app'],
  ['PARENT', 'Parent app'],
  ['TEACHER', 'Teacher app'],
  ['PRINCIPAL', 'Principal app'],
  ['TRANSPORT', 'Transport manager app'],
];
const ALL_AUDIENCES = AUDIENCES.map(([key]) => key);

const emptyForm = { title: '', link: '', isActive: true, audience: ALL_AUDIENCES };

const audienceLabel = (audience) => {
  const list = audience?.length ? audience : ALL_AUDIENCES;
  if (list.length === ALL_AUDIENCES.length) return 'All apps';
  return AUDIENCES.filter(([key]) => list.includes(key)).map(([, label]) => label.replace(' app', '')).join(', ');
};

export const BannerManagement = () => {
  const { showToast, ToastComponent } = useToast();
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // { banner? } for add / edit
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState('');
  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await bannerApi.list();
      setBanners(res.data || []);
      setError('');
    } catch (err) {
      setError(apiMessage(err, 'Unable to load banners'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => () => preview && preview.startsWith('blob:') && URL.revokeObjectURL(preview), [preview]);

  const openAdd = () => {
    setForm(emptyForm);
    setFile(null);
    setPreview('');
    setModal({});
  };

  const openEdit = (banner) => {
    setForm({
      title: banner.title,
      link: banner.link,
      isActive: banner.isActive,
      audience: banner.audience?.length ? banner.audience : ALL_AUDIENCES,
    });
    setFile(null);
    setPreview(bannerImageUrl(banner.imageUrl));
    setModal({ banner });
  };

  const pickFile = (picked) => {
    if (!picked) return;
    if (!/^image\/(png|jpe?g|webp)$/i.test(picked.type)) {
      showToast('Please choose a JPG, PNG or WEBP image', 'error');
      return;
    }
    if (picked.size > MAX_FILE_BYTES) {
      showToast('Image must be smaller than 6 MB', 'error');
      return;
    }
    setFile(picked);
    setPreview(URL.createObjectURL(picked));
  };

  const save = async (event) => {
    event.preventDefault();
    const editing = modal?.banner;
    if (!form.audience.length) {
      showToast('Choose at least one app to show the banner in', 'error');
      return;
    }
    if (!editing && !file) {
      showToast('Choose a banner image first', 'error');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await bannerApi.update(editing.id, {
          title: form.title,
          link: form.link,
          isActive: form.isActive,
          audience: form.audience,
        });
        showToast('Banner updated', 'success');
      } else {
        const data = new FormData();
        data.append('image', file);
        data.append('title', form.title);
        data.append('link', form.link);
        data.append('isActive', String(form.isActive));
        data.append('audience', form.audience.join(','));
        await bannerApi.create(data);
        showToast('Banner added', 'success');
      }
      setModal(null);
      await load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to save the banner'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (banner) => {
    setBusyId(banner.id);
    try {
      await bannerApi.update(banner.id, { isActive: !banner.isActive });
      await load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to update the banner'), 'error');
    } finally {
      setBusyId('');
    }
  };

  const move = async (index, delta) => {
    const next = [...banners];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setBanners(next);
    try {
      await bannerApi.reorder(next.map((banner) => banner.id));
    } catch (err) {
      showToast(apiMessage(err, 'Unable to save the order'), 'error');
      load();
    }
  };

  const confirmDelete = async () => {
    const target = deleteTarget;
    setDeleteTarget(null);
    if (!target) return;
    try {
      await bannerApi.remove(target.id);
      showToast('Banner deleted', 'success');
      await load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to delete the banner'), 'error');
    }
  };

  const activeCount = banners.filter((banner) => banner.isActive).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="App Banners"
        subtitle="Banners shown on the home screen of your school's Student, Parent, Teacher, Principal and Transport Manager apps."
        actions={
          <button
            type="button"
            onClick={openAdd}
            disabled={banners.length >= MAX_BANNERS}
            className="flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-white disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> Add banner
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <Smartphone className="h-4 w-4 text-primary" />
        <span>
          {activeCount} active of {banners.length} banner{banners.length === 1 ? '' : 's'} (max {MAX_BANNERS}). Active banners
          slide automatically in the app, in the order shown here.
        </span>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-600">{error}</div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm font-semibold text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading banners...
        </div>
      ) : banners.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-slate-200 py-16 text-center dark:border-slate-800">
          <ImagePlus className="h-10 w-10 text-slate-300" />
          <p className="text-sm font-semibold text-slate-500">No banners yet. Add your first banner for the school apps.</p>
          <p className="max-w-md text-xs text-slate-400">Until you add one, the apps show default welcome banners in your school's color.</p>
          <p className="text-xs text-slate-400">Recommended size: 1200 x 600 px (wide image).</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {banners.map((banner, index) => (
            <div
              key={banner.id}
              className={`overflow-hidden rounded-2xl border bg-white shadow-sm dark:bg-slate-900 ${
                banner.isActive ? 'border-slate-200 dark:border-slate-800' : 'border-dashed border-slate-300 opacity-75 dark:border-slate-700'
              }`}
            >
              <div className="relative aspect-[2/1] bg-slate-100 dark:bg-slate-950">
                <img src={bannerImageUrl(banner.imageUrl)} alt={banner.title || 'Banner'} className="h-full w-full object-cover" />
                <span className="absolute left-2 top-2 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">
                  #{index + 1}
                </span>
                {!banner.isActive && (
                  <span className="absolute right-2 top-2 rounded-md bg-amber-500 px-2 py-0.5 text-[11px] font-bold text-white">
                    Hidden
                  </span>
                )}
              </div>
              <div className="space-y-3 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold text-slate-900 dark:text-white">{banner.title || 'Untitled banner'}</div>
                  {banner.link ? (
                    <div className="flex items-center gap-1 truncate text-xs text-slate-500">
                      <Link2 className="h-3 w-3 shrink-0" /> {banner.link}
                    </div>
                  ) : null}
                  <div className="mt-1 inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    <Smartphone className="h-3 w-3" /> {audienceLabel(banner.audience)}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button type="button" disabled={index === 0} onClick={() => move(index, -1)} title="Move earlier" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={index === banners.length - 1} onClick={() => move(index, 1)} title="Move later" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800">
                    <ArrowRight className="h-4 w-4" />
                  </button>
                  <button type="button" disabled={busyId === banner.id} onClick={() => toggleActive(banner)} title={banner.isActive ? 'Hide from apps' : 'Show in apps'} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                    {banner.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                  <button type="button" onClick={() => openEdit(banner)} title="Edit" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => setDeleteTarget(banner)} title="Delete" className="ml-auto rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={Boolean(modal)} onClose={() => !saving && setModal(null)} title={modal?.banner ? 'Edit banner' : 'Add banner'}>
        <form onSubmit={save} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Banner image {modal?.banner ? '' : '*'}
            </label>
            <button
              type="button"
              disabled={Boolean(modal?.banner)}
              onClick={() => fileRef.current?.click()}
              className="relative flex aspect-[2/1] w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-400 hover:border-primary dark:border-slate-700 dark:bg-slate-950"
            >
              {preview ? (
                <img src={preview} alt="Preview" className="h-full w-full object-cover" />
              ) : (
                <span className="flex flex-col items-center gap-1 text-xs font-semibold">
                  <ImagePlus className="h-7 w-7" /> Click to choose an image (JPG, PNG, WEBP)
                </span>
              )}
            </button>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
            <p className="mt-1 text-[11px] text-slate-400">
              {modal?.banner ? 'To change the image, delete this banner and add a new one.' : 'Wide image, about 1200 x 600 px, up to 6 MB.'}
            </p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Title (optional)</label>
            <input className={inputClass} maxLength={80} value={form.title} placeholder="Annual Day on 15 December" onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Link (optional)</label>
            <input className={inputClass} maxLength={500} value={form.link} placeholder="https://..." onChange={(e) => setForm((f) => ({ ...f, link: e.target.value }))} />
            <p className="mt-1 text-[11px] text-slate-400">Opens when someone taps the banner in the app.</p>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Show in *</label>
            <div className="flex flex-wrap gap-2">
              {AUDIENCES.map(([key, label]) => {
                const on = form.audience.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        audience: on ? f.audience.filter((item) => item !== key) : [...f.audience, key],
                      }))
                    }
                    className={`rounded-xl border px-3 py-2 text-sm font-bold transition ${
                      on
                        ? 'border-primary bg-primary text-white'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, audience: ALL_AUDIENCES }))}
                className="rounded-xl px-2 py-2 text-xs font-bold text-primary"
              >
                Select all
              </button>
            </div>
            <p className="mt-1 text-[11px] text-slate-400">
              Pick the apps that should show this banner: students, parents, teachers, principals, transport managers or all of them.
            </p>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <input type="checkbox" className="h-4 w-4 accent-indigo-600" checked={form.isActive} onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))} />
            Show in the apps
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" disabled={saving} onClick={() => setModal(null)} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-600 dark:border-slate-700 dark:text-slate-200">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex h-10 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-white disabled:opacity-50">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {modal?.banner ? 'Save changes' : 'Add banner'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete banner"
        message={`Delete "${deleteTarget?.title || 'this banner'}"? It will disappear from the apps.`}
        confirmText="Delete"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default BannerManagement;
