import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useToast } from '../../components/ui/Toast';
import { inventoryApi } from '../../../../shared/api/client';
import { apiMessage } from '../academics/utils';
import { Package, IndianRupee, PackageCheck, Wrench, Plus, Pencil, Trash2, ArrowLeftRight } from 'lucide-react';

const inputCls =
  'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white';

const CONDITIONS = ['NEW', 'GOOD', 'FAIR', 'POOR', 'DAMAGED'];
const STATUSES = ['IN_STORE', 'ISSUED', 'UNDER_REPAIR', 'WRITTEN_OFF'];
const STATUS_VARIANT = { IN_STORE: 'success', ISSUED: 'info', UNDER_REPAIR: 'warning', WRITTEN_OFF: 'danger' };

function inr(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN')}`;
}
function toDateInput(v) {
  if (!v) return '';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? '' : new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const emptyAsset = {
  name: '',
  assetCode: '',
  categoryId: '',
  quantity: 1,
  unit: 'pcs',
  location: '',
  custodianName: '',
  purchaseDate: '',
  unitCost: 0,
  vendor: '',
  condition: 'GOOD',
  warrantyExpiry: '',
  notes: '',
};

export const InventoryManagement = () => {
  const { showToast, ToastComponent } = useToast();
  const [tab, setTab] = useState('assets');

  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ categoryId: '', status: 'ALL' });

  const [assetModal, setAssetModal] = useState(false);
  const [editingAsset, setEditingAsset] = useState(null);
  const [assetForm, setAssetForm] = useState(emptyAsset);
  const [savingAsset, setSavingAsset] = useState(false);
  const [deleteAssetTarget, setDeleteAssetTarget] = useState(null);

  const [moveModal, setMoveModal] = useState(null); // asset row
  const [moveForm, setMoveForm] = useState({ type: 'ISSUE', qty: 1, toWhom: '', note: '' });
  const [savingMove, setSavingMove] = useState(false);

  const [catModal, setCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', code: '', description: '' });
  const [savingCat, setSavingCat] = useState(false);
  const [deleteCatTarget, setDeleteCatTarget] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: 300 };
      if (filters.categoryId) params.categoryId = filters.categoryId;
      if (filters.status !== 'ALL') params.status = filters.status;
      const [aRes, cRes, mRes, sRes] = await Promise.all([
        inventoryApi.assets(params),
        inventoryApi.categories(),
        inventoryApi.movements({ limit: 200 }).catch(() => ({ data: [] })),
        inventoryApi.stats().catch(() => null),
      ]);
      setAssets(aRes?.data || []);
      setCategories(cRes?.data || []);
      setMovements(mRes?.data || []);
      setStats(sRes?.data || null);
    } catch (err) {
      setError(apiMessage(err, 'Unable to load inventory'));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    load();
  }, [load]);

  // ---- asset handlers ----
  const openAssetCreate = () => {
    setEditingAsset(null);
    setAssetForm(emptyAsset);
    setAssetModal(true);
  };
  const openAssetEdit = (row) => {
    setEditingAsset(row);
    setAssetForm({
      name: row.name || '',
      assetCode: row.assetCode || '',
      categoryId: row.categoryId || '',
      quantity: row.quantity ?? 1,
      unit: row.unit || 'pcs',
      location: row.location || '',
      custodianName: row.custodianName || '',
      purchaseDate: toDateInput(row.purchaseDate),
      unitCost: row.unitCost ?? 0,
      vendor: row.vendor || '',
      condition: row.condition || 'GOOD',
      warrantyExpiry: toDateInput(row.warrantyExpiry),
      notes: row.notes || '',
    });
    setAssetModal(true);
  };
  const submitAsset = async (e) => {
    e.preventDefault();
    if (!assetForm.name.trim()) return showToast('Asset name is required', 'error');
    if (Number(assetForm.quantity) < 0) return showToast('Quantity cannot be negative', 'error');
    setSavingAsset(true);
    try {
      const payload = {
        ...assetForm,
        categoryId: assetForm.categoryId || null,
        quantity: Number(assetForm.quantity) || 0,
        unitCost: Number(assetForm.unitCost) || 0,
        purchaseDate: assetForm.purchaseDate || null,
        warrantyExpiry: assetForm.warrantyExpiry || null,
      };
      if (editingAsset) {
        await inventoryApi.updateAsset(editingAsset.id, payload);
        showToast('Asset updated', 'success');
      } else {
        await inventoryApi.createAsset(payload);
        showToast('Asset added', 'success');
      }
      setAssetModal(false);
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to save asset'), 'error');
    } finally {
      setSavingAsset(false);
    }
  };
  const confirmDeleteAsset = async () => {
    if (!deleteAssetTarget) return;
    try {
      await inventoryApi.deleteAsset(deleteAssetTarget.id);
      showToast('Asset deleted', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to delete asset'), 'error');
    } finally {
      setDeleteAssetTarget(null);
    }
  };

  const openMove = (row) => {
    setMoveModal(row);
    setMoveForm({ type: 'ISSUE', qty: 1, toWhom: '', note: '' });
  };
  const submitMove = async (e) => {
    e.preventDefault();
    if (!moveModal) return;
    setSavingMove(true);
    try {
      await inventoryApi.movement(moveModal.id, {
        type: moveForm.type,
        qty: Number(moveForm.qty),
        toWhom: moveForm.toWhom,
        note: moveForm.note,
      });
      showToast('Stock movement recorded', 'success');
      setMoveModal(null);
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to record movement'), 'error');
    } finally {
      setSavingMove(false);
    }
  };

  // ---- category handlers ----
  const submitCat = async (e) => {
    e.preventDefault();
    if (!catForm.name.trim()) return showToast('Category name is required', 'error');
    setSavingCat(true);
    try {
      if (editingCat) {
        await inventoryApi.updateCategory(editingCat.id, catForm);
        showToast('Category updated', 'success');
      } else {
        await inventoryApi.createCategory(catForm);
        showToast('Category created', 'success');
      }
      setCatModal(false);
      setEditingCat(null);
      setCatForm({ name: '', code: '', description: '' });
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to save category'), 'error');
    } finally {
      setSavingCat(false);
    }
  };
  const confirmDeleteCat = async () => {
    if (!deleteCatTarget) return;
    try {
      await inventoryApi.deleteCategory(deleteCatTarget.id);
      showToast('Category deleted', 'success');
      load();
    } catch (err) {
      showToast(apiMessage(err, 'Unable to delete category'), 'error');
    } finally {
      setDeleteCatTarget(null);
    }
  };

  const assetColumns = useMemo(
    () => [
      { key: 'assetCode', title: 'Code', render: (v) => <span className="font-mono text-[11px] font-bold text-indigo-600">{v}</span> },
      { key: 'name', title: 'Asset', sortable: true, render: (v) => <span className="font-bold">{v}</span> },
      { key: 'categoryName', title: 'Category', render: (v) => v || '—' },
      {
        key: 'availableQuantity',
        title: 'Available / Total',
        align: 'center',
        render: (v, row) => (
          <span>
            <strong>{v}</strong> / {row.quantity} {row.unit}
          </span>
        ),
      },
      { key: 'location', title: 'Location', render: (v) => v || '—' },
      { key: 'totalValue', title: 'Value', render: (v) => inr(v) },
      { key: 'condition', title: 'Condition', render: (v) => <Badge variant={v === 'DAMAGED' || v === 'POOR' ? 'danger' : 'default'}>{v}</Badge> },
      { key: 'status', title: 'Status', render: (v) => <Badge variant={STATUS_VARIANT[v] || 'default'}>{v.replace('_', ' ')}</Badge> },
      {
        key: '_actions',
        title: 'Actions',
        align: 'right',
        render: (_v, row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => openMove(row)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-sky-50 hover:text-sky-600 dark:hover:bg-sky-950/30"
              title="Issue / Return / Adjust"
            >
              <ArrowLeftRight size={15} />
            </button>
            <button
              type="button"
              onClick={() => openAssetEdit(row)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => setDeleteAssetTarget(row)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const catColumns = useMemo(
    () => [
      { key: 'name', title: 'Category', sortable: true, render: (v) => <span className="font-bold">{v}</span> },
      { key: 'code', title: 'Code', render: (v) => v || '—' },
      { key: 'description', title: 'Description', render: (v) => v || '—' },
      { key: 'assetCount', title: 'Assets', align: 'center' },
      {
        key: '_actions',
        title: 'Actions',
        align: 'right',
        render: (_v, row) => (
          <div className="flex items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => {
                setEditingCat(row);
                setCatForm({ name: row.name, code: row.code || '', description: row.description || '' });
                setCatModal(true);
              }}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-800"
              title="Edit"
            >
              <Pencil size={15} />
            </button>
            <button
              type="button"
              onClick={() => setDeleteCatTarget(row)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
              title="Delete"
            >
              <Trash2 size={15} />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  const moveColumns = useMemo(
    () => [
      { key: 'createdAt', title: 'When', render: (v) => new Date(v).toLocaleString('en-IN') },
      { key: 'assetName', title: 'Asset' },
      {
        key: 'type',
        title: 'Type',
        render: (v) => (
          <Badge variant={v === 'ISSUE' ? 'info' : v === 'RETURN' ? 'success' : v === 'WRITE_OFF' ? 'danger' : 'warning'}>
            {v.replace('_', ' ')}
          </Badge>
        ),
      },
      { key: 'qty', title: 'Qty', align: 'center' },
      { key: 'balanceAfter', title: 'Balance', align: 'center' },
      { key: 'toWhom', title: 'To / From', render: (v) => v || '—' },
      { key: 'byName', title: 'By', render: (v) => v || '—' },
      { key: 'note', title: 'Note', render: (v) => v || '—' },
    ],
    []
  );

  const statCards = [
    { label: 'Total Assets', value: stats?.totalAssets ?? 0, icon: Package, tone: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40' },
    { label: 'Total Value', value: inr(stats?.totalValue), icon: IndianRupee, tone: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' },
    { label: 'Units Issued', value: stats?.issued ?? 0, icon: PackageCheck, tone: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40' },
    { label: 'Under Repair', value: stats?.underRepair ?? 0, icon: Wrench, tone: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Inventory & Assets"
        subtitle="Track furniture, equipment and consumables — stock levels, issue/return and asset value."
        actions={
          tab === 'assets' ? (
            <button type="button" onClick={openAssetCreate} className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white">
              <Plus className="h-3.5 w-3.5" /> Add Asset
            </button>
          ) : tab === 'categories' ? (
            <button
              type="button"
              onClick={() => {
                setEditingCat(null);
                setCatForm({ name: '', code: '', description: '' });
                setCatModal(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-white"
            >
              <Plus className="h-3.5 w-3.5" /> Add Category
            </button>
          ) : null
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {statCards.map((c) => (
          <div key={c.label} className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-xl ${c.tone}`}>
              <c.icon className="h-4 w-4" />
            </div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">{c.label}</div>
            <div className="mt-0.5 text-xl font-extrabold text-slate-900 dark:text-white">{c.value}</div>
          </div>
        ))}
      </div>

      <Tabs
        tabs={[
          { id: 'assets', label: 'Assets', count: assets.length },
          { id: 'categories', label: 'Categories', count: categories.length },
          { id: 'movements', label: 'Stock Movements', count: movements.length },
        ]}
        activeTab={tab}
        onChange={setTab}
      />

      {error ? (
        <div className="flex flex-col items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/60 p-10 text-center dark:border-rose-900/40 dark:bg-rose-950/20">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button type="button" onClick={load} className="rounded-xl border border-rose-300 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100">
            Retry
          </button>
        </div>
      ) : tab === 'assets' ? (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <select
              value={filters.categoryId}
              onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              value={filters.status}
              onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50/80 px-3 text-xs font-semibold outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            >
              <option value="ALL">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <DataTable
            columns={assetColumns}
            data={assets}
            loading={loading}
            searchPlaceholder="Search assets by name, code, vendor..."
            searchKeys={['name', 'assetCode', 'vendor', 'custodianName']}
            emptyMessage="No assets recorded yet."
            csvFilename="school_assets.csv"
          />
        </>
      ) : tab === 'categories' ? (
        <DataTable
          columns={catColumns}
          data={categories}
          loading={loading}
          searchPlaceholder="Search categories..."
          searchKeys={['name', 'code']}
          emptyMessage="No categories yet."
          csvFilename="asset_categories.csv"
        />
      ) : (
        <DataTable
          columns={moveColumns}
          data={movements}
          loading={loading}
          searchPlaceholder="Search movements..."
          searchKeys={['assetName', 'toWhom', 'byName']}
          emptyMessage="No stock movements yet."
          csvFilename="stock_movements.csv"
        />
      )}

      {/* ASSET MODAL */}
      <Modal isOpen={assetModal} onClose={() => setAssetModal(false)} title={editingAsset ? 'Edit Asset' : 'Add Asset'} size="lg">
        <form onSubmit={submitAsset} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Asset Name *</label>
              <input className={inputCls} value={assetForm.name} onChange={(e) => setAssetForm({ ...assetForm, name: e.target.value })} required />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Asset Code</label>
              <input className={inputCls} value={assetForm.assetCode} onChange={(e) => setAssetForm({ ...assetForm, assetCode: e.target.value })} placeholder="auto-generated if blank" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Category</label>
              <select className={inputCls} value={assetForm.categoryId} onChange={(e) => setAssetForm({ ...assetForm, categoryId: e.target.value })}>
                <option value="">—</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Location / Room</label>
              <input className={inputCls} value={assetForm.location} onChange={(e) => setAssetForm({ ...assetForm, location: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Quantity</label>
              <input type="number" min="0" className={inputCls} value={assetForm.quantity} onChange={(e) => setAssetForm({ ...assetForm, quantity: e.target.value })} disabled={Boolean(editingAsset)} />
              {editingAsset && <p className="mt-1 text-[10px] text-slate-400">Use the movement action to change quantity</p>}
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Unit</label>
              <input className={inputCls} value={assetForm.unit} onChange={(e) => setAssetForm({ ...assetForm, unit: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Unit Cost (₹)</label>
              <input type="number" min="0" className={inputCls} value={assetForm.unitCost} onChange={(e) => setAssetForm({ ...assetForm, unitCost: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Condition</label>
              <select className={inputCls} value={assetForm.condition} onChange={(e) => setAssetForm({ ...assetForm, condition: e.target.value })}>
                {CONDITIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Purchase Date</label>
              <input type="date" className={inputCls} value={assetForm.purchaseDate} onChange={(e) => setAssetForm({ ...assetForm, purchaseDate: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Warranty Expiry</label>
              <input type="date" className={inputCls} value={assetForm.warrantyExpiry} onChange={(e) => setAssetForm({ ...assetForm, warrantyExpiry: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Vendor</label>
              <input className={inputCls} value={assetForm.vendor} onChange={(e) => setAssetForm({ ...assetForm, vendor: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Custodian</label>
              <input className={inputCls} value={assetForm.custodianName} onChange={(e) => setAssetForm({ ...assetForm, custodianName: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Notes</label>
            <textarea rows={2} className={`${inputCls} h-auto py-2`} value={assetForm.notes} onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => setAssetModal(false)} className="rounded-xl px-4 py-2 text-xs font-semibold">Cancel</button>
            <button type="submit" disabled={savingAsset} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {savingAsset ? 'Saving…' : editingAsset ? 'Update Asset' : 'Add Asset'}
            </button>
          </div>
        </form>
      </Modal>

      {/* MOVEMENT MODAL */}
      <Modal isOpen={Boolean(moveModal)} onClose={() => setMoveModal(null)} title={`Stock Movement — ${moveModal?.name || ''}`}>
        <form onSubmit={submitMove} className="space-y-4">
          <p className="text-xs font-semibold text-slate-500">
            Available: <strong>{moveModal?.availableQuantity}</strong> · Issued: <strong>{moveModal?.issuedQuantity}</strong> · Total:{' '}
            <strong>{moveModal?.quantity}</strong> {moveModal?.unit}
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Type</label>
              <select className={inputCls} value={moveForm.type} onChange={(e) => setMoveForm({ ...moveForm, type: e.target.value })}>
                <option value="ISSUE">Issue</option>
                <option value="RETURN">Return</option>
                <option value="ADJUST">Adjust total (+/-)</option>
                <option value="WRITE_OFF">Write off</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Quantity</label>
              <input
                type="number"
                className={inputCls}
                value={moveForm.qty}
                onChange={(e) => setMoveForm({ ...moveForm, qty: e.target.value })}
                placeholder={moveForm.type === 'ADJUST' ? 'e.g. 5 or -2' : ''}
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">To / From (person or dept)</label>
            <input className={inputCls} value={moveForm.toWhom} onChange={(e) => setMoveForm({ ...moveForm, toWhom: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Note</label>
            <input className={inputCls} value={moveForm.note} onChange={(e) => setMoveForm({ ...moveForm, note: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => setMoveModal(null)} className="rounded-xl px-4 py-2 text-xs font-semibold">Cancel</button>
            <button type="submit" disabled={savingMove} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {savingMove ? 'Saving…' : 'Record Movement'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CATEGORY MODAL */}
      <Modal isOpen={catModal} onClose={() => setCatModal(false)} title={editingCat ? 'Edit Category' : 'Add Category'}>
        <form onSubmit={submitCat} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Name *</label>
            <input className={inputCls} value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} required />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Code</label>
            <input className={inputCls} value={catForm.code} onChange={(e) => setCatForm({ ...catForm, code: e.target.value })} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">Description</label>
            <textarea rows={2} className={`${inputCls} h-auto py-2`} value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button type="button" onClick={() => setCatModal(false)} className="rounded-xl px-4 py-2 text-xs font-semibold">Cancel</button>
            <button type="submit" disabled={savingCat} className="rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white disabled:opacity-60">
              {savingCat ? 'Saving…' : editingCat ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={Boolean(deleteAssetTarget)}
        onClose={() => setDeleteAssetTarget(null)}
        onConfirm={confirmDeleteAsset}
        title="Delete Asset"
        message={`Delete "${deleteAssetTarget?.name}"? This cannot be undone.`}
        confirmText="Delete"
        variant="danger"
      />
      <ConfirmDialog
        isOpen={Boolean(deleteCatTarget)}
        onClose={() => setDeleteCatTarget(null)}
        onConfirm={confirmDeleteCat}
        title="Delete Category"
        message={`Delete category "${deleteCatTarget?.name}"?`}
        confirmText="Delete"
        variant="danger"
      />

      <ToastComponent />
    </div>
  );
};

export default InventoryManagement;
