import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Tabs } from '../../components/ui/Tabs';
import { Badge } from '../../components/ui/Badge';
import { BarcodeDisplay } from '../../components/ui/BarcodeDisplay';
import { DataTable } from '../../components/ui/DataTable';
import { Modal } from '../../components/ui/Modal';
import { DetailPageSkeleton } from '../../components/ui/SkeletonLoader';
import { formatDate, formatCurrency } from '../../utils/formatters';
import { BookOpen, User, ArrowLeft, Tag, MapPin, Layers, Copy, Plus, RefreshCw, Trash2, CheckCircle2, Power, Edit } from 'lucide-react';
import { librarianApi } from '../../../../shared/api/client';
import { useToast } from '../../components/ui/Toast';

export const BookDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();

  const [book, setBook] = useState(null);
  const [copies, setCopies] = useState([]);
  const [issues, setIssues] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const [addCopyOpen, setAddCopyOpen] = useState(false);
  const [copyForm, setCopyForm] = useState({
    accessionNumber: '',
    barcode: '',
    rackNumber: '',
    shelfNumber: '',
    condition: 'GOOD',
    price: 0,
    remarks: '',
  });
  const [copySubmitting, setCopySubmitting] = useState(false);

  const fetchBookData = async () => {
    setLoading(true);
    try {
      const [bookRes, copiesRes, issuesRes, resvRes] = await Promise.allSettled([
        librarianApi.getBook(id),
        librarianApi.copies({ bookId: id }),
        librarianApi.issues({ bookId: id }),
        librarianApi.reservations({ bookId: id }),
      ]);

      if (bookRes.status === 'fulfilled' && bookRes.value?.data) {
        setBook(bookRes.value.data);
      } else {
        setBook(null);
      }

      if (copiesRes.status === 'fulfilled' && Array.isArray(copiesRes.value?.data)) {
        setCopies(copiesRes.value.data);
      }

      if (issuesRes.status === 'fulfilled' && Array.isArray(issuesRes.value?.data)) {
        setIssues(issuesRes.value.data);
      }

      if (resvRes.status === 'fulfilled' && Array.isArray(resvRes.value?.data)) {
        setReservations(resvRes.value.data);
      }
    } catch {
      toast.error('Failed to load book profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookData();
  }, [id]);

  const handleAddCopy = async (e) => {
    e.preventDefault();
    setCopySubmitting(true);
    try {
      await librarianApi.createCopy({
        ...copyForm,
        bookId: id,
      });
      toast.success('Physical copy added successfully!');
      setAddCopyOpen(false);
      setCopyForm({
        accessionNumber: '',
        barcode: '',
        rackNumber: '',
        shelfNumber: '',
        condition: 'GOOD',
        price: 0,
        remarks: '',
      });
      fetchBookData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to add copy');
    } finally {
      setCopySubmitting(false);
    }
  };

  const handleToggleStatus = async () => {
    const nextActive = !(book.isActive !== false);
    try {
      await librarianApi.updateBook(book.id, { isActive: nextActive });
      toast.success(`"${book.title}" marked ${nextActive ? 'active' : 'inactive'}`);
      fetchBookData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update book status');
    }
  };

  const handleDeleteCopy = async (copyId) => {
    if (!window.confirm('Are you sure you want to delete this physical copy?')) return;
    try {
      await librarianApi.deleteCopy(copyId);
      toast.success('Copy deleted successfully');
      fetchBookData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Cannot delete copy');
    }
  };

  if (loading) {
    return <DetailPageSkeleton />;
  }

  if (!book) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
        <p className="text-slate-500 font-bold">Book catalog entry not found in library.</p>
        <button
          onClick={() => navigate('/librarian/books')}
          className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Catalogue</span>
        </button>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'copies', label: 'Physical Copies', count: copies.length },
    { id: 'issues', label: 'Issue History', count: issues.length },
    { id: 'reservations', label: 'Reservations Queue', count: reservations.length },
    { id: 'barcode', label: 'Barcode Label' },
  ];

  const copyColumns = [
    { title: 'Accession #', key: 'accessionNumber', sortable: true },
    { title: 'Barcode', key: 'barcode' },
    {
      title: 'Status',
      key: 'status',
      render: (val) => (
        <Badge variant={val === 'AVAILABLE' ? 'success' : val === 'ISSUED' ? 'warning' : 'danger'}>
          {val}
        </Badge>
      ),
    },
    { title: 'Condition', key: 'condition' },
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
        <button
          onClick={() => handleDeleteCopy(row.id)}
          disabled={row.status === 'ISSUED'}
          title={row.status === 'ISSUED' ? 'Cannot delete actively issued copy' : 'Delete Copy'}
          className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded-lg transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      ),
    },
  ];

  const issueColumns = [
    { title: 'Borrower', key: 'borrowerName' },
    { title: 'Borrower Type', key: 'borrowerType' },
    { title: 'Accession #', key: 'accessionNumber' },
    { title: 'Issue Date', key: 'issueDate', render: (val) => formatDate(val) },
    { title: 'Due Date', key: 'dueDate', render: (val) => formatDate(val) },
    { title: 'Return Date', key: 'returnDate', render: (val) => (val ? formatDate(val) : 'Active') },
    {
      title: 'Status',
      key: 'status',
      render: (val) => (
        <Badge variant={val === 'RETURNED' ? 'success' : val === 'OVERDUE' ? 'danger' : 'warning'}>
          {val}
        </Badge>
      ),
    },
    {
      title: 'Fine',
      key: 'fineAmount',
      render: (val) => (val > 0 ? `₹${val}` : '—'),
    },
  ];

  const reservationColumns = [
    { title: 'Borrower', key: 'borrowerName' },
    { title: 'Type', key: 'borrowerType' },
    { title: 'Reserved Date', key: 'reservedAt', render: (val) => formatDate(val) },
    { title: 'Expires', key: 'expiresAt', render: (val) => formatDate(val) },
    {
      title: 'Status',
      key: 'status',
      render: (val) => (
        <Badge variant={val === 'APPROVED' ? 'success' : val === 'PENDING' ? 'warning' : 'danger'}>
          {val}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/librarian/books')}
            className="p-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Book Profile</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleToggleStatus}
            className="h-9 px-4 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
          >
            <Power className="h-4 w-4" />
            <span>{book.isActive !== false ? 'Deactivate' : 'Activate'}</span>
          </button>
          <button
            onClick={() => setAddCopyOpen(true)}
            className="h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Add Physical Copy</span>
          </button>
        </div>
      </div>

      {/* Book Summary Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start">
        <div className="w-28 h-40 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex flex-col items-center justify-center shrink-0 shadow-md relative overflow-hidden text-center p-2">
          <BookOpen className="h-10 w-10 text-indigo-100 mb-2" />
          <span className="text-3xs text-indigo-200 font-mono tracking-wider font-bold">{book.bookCode}</span>
        </div>

        <div className="flex-1 space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant={book.availableCopies > 0 ? 'success' : 'danger'}>
              {book.availableCopies} / {book.totalCopies} Copies Available
            </Badge>
            <Badge variant="indigo">{book.category}</Badge>
            <Badge variant={book.isActive !== false ? 'default' : 'warning'}>
              {book.isActive !== false ? 'Active' : 'Inactive'}
            </Badge>
            <span className="text-3xs font-bold text-slate-400 font-mono">Code: {book.bookCode}</span>
          </div>

          <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white leading-tight">
            {book.title}
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs pt-2">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <User className="h-4 w-4 text-indigo-500" />
              <span>By {book.author}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Layers className="h-4 w-4 text-indigo-500" />
              <span>Edition: {book.edition || 'Standard'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <Tag className="h-4 w-4 text-indigo-500" />
              <span>ISBN: {book.isbn || '—'}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <MapPin className="h-4 w-4 text-indigo-500" />
              <span>Rack {book.rackNumber || '—'}, Shelf {book.shelfNumber || '—'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {/* Tab Panels */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Classification */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                  Classification & Details
                </h3>
                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  <span className="font-semibold text-slate-400">Category:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{book.category}</span>

                  <span className="font-semibold text-slate-400">Subject:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{book.subject || '—'}</span>

                  <span className="font-semibold text-slate-400">Publisher:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{book.publisher || '—'}</span>

                  <span className="font-semibold text-slate-400">Publication Year:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{book.publicationYear || '—'}</span>

                  <span className="font-semibold text-slate-400">Language:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{book.language || 'English'}</span>

                  <span className="font-semibold text-slate-400">Pages:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{book.pages || '—'}</span>

                  <span className="font-semibold text-slate-400">Added On:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatDate(book.createdAt)}</span>
                </div>
              </div>

              {/* Inventory details */}
              <div className="space-y-4">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-2">
                  Inventory & Stock
                </h3>
                <div className="grid grid-cols-2 gap-y-3 text-xs">
                  <span className="font-semibold text-slate-400">Total Registered Copies:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{book.totalCopies}</span>

                  <span className="font-semibold text-slate-400">Available on Shelf:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{book.availableCopies}</span>

                  <span className="font-semibold text-slate-400">Currently Issued:</span>
                  <span className="font-bold text-indigo-600 dark:text-indigo-400">{book.issuedCopies}</span>

                  <span className="font-semibold text-slate-400">Catalog Price:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(book.price)}</span>
                </div>
              </div>
            </div>

            {book.description && (
              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description / Overview</h4>
                <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{book.description}</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'copies' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">All Physical Copies Registered</h3>
              <button
                onClick={() => setAddCopyOpen(true)}
                className="h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white text-3xs font-bold rounded-lg flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Copy</span>
              </button>
            </div>
            <DataTable
              columns={copyColumns}
              data={copies}
              searchPlaceholder="Search copies by accession or barcode..."
              searchKeys={['accessionNumber', 'barcode', 'status']}
            />
          </div>
        )}

        {activeTab === 'issues' && (
          <DataTable
            columns={issueColumns}
            data={issues}
            searchPlaceholder="Search issue history for this book..."
            searchKeys={['borrowerName', 'accessionNumber', 'status']}
          />
        )}

        {activeTab === 'reservations' && (
          <DataTable
            columns={reservationColumns}
            data={reservations}
            searchPlaceholder="Search reservation list..."
            searchKeys={['borrowerName', 'status']}
          />
        )}

        {activeTab === 'barcode' && (
          <div className="max-w-md mx-auto py-6">
            <BarcodeDisplay value={book.bookCode || book.id} label={book.title} />
          </div>
        )}
      </div>

      {/* Add Physical Copy Modal */}
      <Modal
        isOpen={addCopyOpen}
        onClose={() => setAddCopyOpen(false)}
        title="Add Physical Copy"
        size="md"
      >
        <form onSubmit={handleAddCopy} className="space-y-4">
          <div className="space-y-1">
            <label className="text-3xs font-bold text-slate-500 uppercase">Accession Number (Optional)</label>
            <input
              type="text"
              value={copyForm.accessionNumber}
              onChange={(e) => setCopyForm({ ...copyForm, accessionNumber: e.target.value })}
              placeholder="Leave blank to auto-generate"
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-3xs font-bold text-slate-500 uppercase">Rack Number</label>
              <input
                type="text"
                value={copyForm.rackNumber}
                onChange={(e) => setCopyForm({ ...copyForm, rackNumber: e.target.value })}
                placeholder="e.g. R-04"
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="text-3xs font-bold text-slate-500 uppercase">Shelf Number</label>
              <input
                type="text"
                value={copyForm.shelfNumber}
                onChange={(e) => setCopyForm({ ...copyForm, shelfNumber: e.target.value })}
                placeholder="e.g. S-02"
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-3xs font-bold text-slate-500 uppercase">Initial Condition</label>
              <select
                value={copyForm.condition}
                onChange={(e) => setCopyForm({ ...copyForm, condition: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="NEW">New</option>
                <option value="GOOD">Good</option>
                <option value="FAIR">Fair</option>
                <option value="POOR">Poor</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-3xs font-bold text-slate-500 uppercase">Acquisition Price (₹)</label>
              <input
                type="number"
                min="0"
                value={copyForm.price}
                onChange={(e) => setCopyForm({ ...copyForm, price: e.target.value })}
                className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-3xs font-bold text-slate-500 uppercase">Remarks / Notes</label>
            <textarea
              rows="2"
              value={copyForm.remarks}
              onChange={(e) => setCopyForm({ ...copyForm, remarks: e.target.value })}
              placeholder="e.g. Donated copy, replacement copy"
              className="w-full p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setAddCopyOpen(false)}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={copySubmitting}
              className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              {copySubmitting ? 'Registering...' : 'Register Copy'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
export default BookDetail;
