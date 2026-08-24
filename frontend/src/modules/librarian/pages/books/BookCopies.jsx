import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { Copy, Plus, RefreshCw, Trash2, Edit, CheckCircle, AlertTriangle } from 'lucide-react';
import { librarianApi } from '../../../../shared/api/client';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatCurrency } from '../../utils/formatters';

export const BookCopies = () => {
  const [copies, setCopies] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingCopy, setEditingCopy] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    bookId: '',
    accessionNumber: '',
    barcode: '',
    rackNumber: '',
    shelfNumber: '',
    condition: 'GOOD',
    price: 0,
    remarks: '',
  });

  const toast = useToast();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [copiesRes, booksRes] = await Promise.allSettled([
        librarianApi.copies({ status: filterStatus === 'ALL' ? undefined : filterStatus }),
        librarianApi.books(),
      ]);

      if (copiesRes.status === 'fulfilled' && Array.isArray(copiesRes.value?.data)) {
        setCopies(copiesRes.value.data);
      } else {
        setCopies([]);
      }

      if (booksRes.status === 'fulfilled' && Array.isArray(booksRes.value?.data)) {
        setBooks(booksRes.value.data);
      }
    } catch {
      toast.error('Failed to load physical copies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterStatus]);

  const handleSaveCopy = async (e) => {
    e.preventDefault();
    if (!formData.bookId && !editingCopy) {
      toast.error('Please select the parent book catalogue entry.');
      return;
    }
    setSubmitting(true);
    try {
      if (editingCopy) {
        await librarianApi.updateCopy(editingCopy.id, formData);
        toast.success('Physical copy updated successfully!');
      } else {
        await librarianApi.createCopy(formData);
        toast.success('Physical copy registered successfully!');
      }
      setAddModalOpen(false);
      setEditingCopy(null);
      setFormData({
        bookId: '',
        accessionNumber: '',
        barcode: '',
        rackNumber: '',
        shelfNumber: '',
        condition: 'GOOD',
        price: 0,
        remarks: '',
      });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (copy) => {
    setEditingCopy(copy);
    setFormData({
      bookId: copy.bookId,
      accessionNumber: copy.accessionNumber,
      barcode: copy.barcode || '',
      rackNumber: copy.rackNumber || '',
      shelfNumber: copy.shelfNumber || '',
      condition: copy.condition || 'GOOD',
      price: copy.price || 0,
      remarks: copy.remarks || '',
    });
    setAddModalOpen(true);
  };

  const handleDelete = async (copy) => {
    if (copy.status === 'ISSUED') {
      toast.error('Cannot delete an actively issued copy. Return the copy first.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete physical copy "${copy.accessionNumber}"?`)) return;

    try {
      await librarianApi.deleteCopy(copy.id);
      toast.success('Physical copy deleted successfully');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete copy');
    }
  };

  const columns = [
    {
      title: 'Accession #',
      key: 'accessionNumber',
      sortable: true,
      render: (val) => (
        <span className="font-bold font-mono text-xs text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
          {val}
        </span>
      ),
    },
    {
      title: 'Book Title',
      key: 'bookTitle',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">{val || '—'}</span>
          <span className="text-3xs text-slate-400">Author: {row.bookAuthor || '—'}</span>
        </div>
      ),
    },
    { title: 'Barcode', key: 'barcode', render: (val) => <span className="font-mono text-3xs text-slate-500">{val || '—'}</span> },
    {
      title: 'Status',
      key: 'status',
      sortable: true,
      render: (val) => (
        <Badge variant={val === 'AVAILABLE' ? 'success' : val === 'ISSUED' ? 'warning' : 'danger'}>
          {val}
        </Badge>
      ),
    },
    {
      title: 'Condition',
      key: 'condition',
      render: (val) => (
        <span className={`text-3xs font-bold px-2 py-0.5 rounded ${
          val === 'NEW' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30' :
          val === 'GOOD' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/30' :
          val === 'FAIR' ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/30' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/30'
        }`}>
          {val}
        </span>
      ),
    },
    {
      title: 'Location',
      key: 'rackNumber',
      render: (val, row) => (val ? `Rack ${val}, Shelf ${row.shelfNumber || '1'}` : '—'),
    },
    {
      title: 'Acquired Date',
      key: 'acquiredAt',
      render: (val) => formatDate(val),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleEdit(row)}
            title="Edit Copy"
            className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/20"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDelete(row)}
            disabled={row.status === 'ISSUED'}
            title={row.status === 'ISSUED' ? 'Cannot delete issued copy' : 'Delete Copy'}
            className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/20"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Physical Book Copies"
        subtitle="Track individual copies, accession numbers, barcodes, conditions, and shelf locations."
        actions={
          <div className="flex items-center gap-2.5">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="h-10 px-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ISSUED">Issued</option>
              <option value="LOST">Lost</option>
              <option value="DAMAGED">Damaged</option>
              <option value="MAINTENANCE">Maintenance</option>
            </select>

            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => {
                setEditingCopy(null);
                setFormData({
                  bookId: books[0]?.id || '',
                  accessionNumber: '',
                  barcode: '',
                  rackNumber: '',
                  shelfNumber: '',
                  condition: 'GOOD',
                  price: 0,
                  remarks: '',
                });
                setAddModalOpen(true);
              }}
              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add Physical Copy</span>
            </button>
          </div>
        }
      />

      {loading ? (
        <SkeletonTable rows={8} columns={7} />
      ) : copies.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Copy className="h-8 w-8 mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Physical Copies Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {filterStatus === 'ALL'
              ? 'Register books or add copies to populate your physical accession inventory.'
              : `No copies found matching filter status "${filterStatus}".`}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={copies}
            searchPlaceholder="Search by accession #, barcode, or title..."
            searchKeys={['accessionNumber', 'barcode', 'bookTitle', 'bookAuthor']}
            csvFilename="library_book_copies.csv"
          />
        </div>
      )}

      {/* Add / Edit Copy Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => {
          setAddModalOpen(false);
          setEditingCopy(null);
        }}
        title={editingCopy ? 'Edit Physical Copy' : 'Register New Physical Copy'}
        size="md"
      >
        <form onSubmit={handleSaveCopy} className="space-y-4">
          {!editingCopy && (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-550 dark:text-slate-400">Select Book Title *</label>
              <select
                required
                value={formData.bookId}
                onChange={(e) => setFormData({ ...formData, bookId: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all duration-150"
              >
                <option value="">-- Choose Catalogue Title --</option>
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} (by {b.author}) — Code: {b.bookCode}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-550 dark:text-slate-400">Accession Number</label>
              <input
                type="text"
                value={formData.accessionNumber}
                onChange={(e) => setFormData({ ...formData, accessionNumber: e.target.value })}
                placeholder="Leave blank to auto-generate"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all duration-150"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-550 dark:text-slate-400">Barcode Value</label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                placeholder="Barcode scanner ID"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all duration-150"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-550 dark:text-slate-400">Rack Location</label>
              <input
                type="text"
                value={formData.rackNumber}
                onChange={(e) => setFormData({ ...formData, rackNumber: e.target.value })}
                placeholder="e.g. R-03"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all duration-150"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-550 dark:text-slate-400">Shelf Location</label>
              <input
                type="text"
                value={formData.shelfNumber}
                onChange={(e) => setFormData({ ...formData, shelfNumber: e.target.value })}
                placeholder="e.g. S-01"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all duration-150"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-550 dark:text-slate-400">Physical Condition</label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all duration-150"
              >
                <option value="NEW">New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-550 dark:text-slate-400">Acquisition Price (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all duration-150"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-550 dark:text-slate-400">Remarks</label>
            <textarea
              rows="2"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Condition notes or donation details"
              className="w-full px-3.5 py-2.5 border border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950 rounded-xl text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 dark:text-white transition-all duration-150"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAddModalOpen(false);
                setEditingCopy(null);
              }}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition-all duration-150 shadow-xs disabled:opacity-60"
            >
              {submitting ? 'Saving...' : editingCopy ? 'Update Copy' : 'Register Copy'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default BookCopies;
