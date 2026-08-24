import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Tabs } from '../../components/ui/Tabs';
import { IssueSlip } from '../../components/ui/IssueSlip';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../utils/formatters';
import { Bookmark, Plus, RefreshCw, CheckCircle2, XCircle, Ban, Hourglass, BookCheck } from 'lucide-react';
import { librarianApi } from '../../../../shared/api/client';

export const BookReservation = () => {
  const toast = useToast();
  const location = useLocation();

  const [reservations, setReservations] = useState([]);
  const [borrowers, setBorrowers] = useState([]);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [form, setForm] = useState({
    bookId: '',
    borrowerRefId: '',
    remarks: '',
  });

  const [createdIssue, setCreatedIssue] = useState(null);
  const [issueSlipOpen, setIssueSlipOpen] = useState(false);

  const [activeTab, setActiveTab] = useState(() => {
    if (location.pathname.includes('/pending')) return 'PENDING';
    return 'ALL';
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resvRes, borrowersRes, booksRes] = await Promise.allSettled([
        librarianApi.reservations({ status: activeTab === 'ALL' ? undefined : activeTab }),
        librarianApi.borrowers(),
        librarianApi.books(),
      ]);

      if (resvRes.status === 'fulfilled' && Array.isArray(resvRes.value?.data)) {
        setReservations(resvRes.value.data);
      } else {
        setReservations([]);
      }

      if (borrowersRes.status === 'fulfilled' && Array.isArray(borrowersRes.value?.data)) {
        setBorrowers(borrowersRes.value.data);
      }

      if (booksRes.status === 'fulfilled' && Array.isArray(booksRes.value?.data)) {
        setBooks(booksRes.value.data);
      }
    } catch {
      toast.error('Failed to load reservations list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  useEffect(() => {
    if (location.pathname.includes('/pending')) setActiveTab('PENDING');
  }, [location.pathname]);

  const handleCreateReservation = async (e) => {
    e.preventDefault();
    const borrower = borrowers.find((b) => b.id === form.borrowerRefId);
    if (!borrower || !form.bookId) {
      toast.error('Please select both a book and a borrower.');
      return;
    }

    setActionLoading(true);
    try {
      await librarianApi.createReservation({
        bookId: form.bookId,
        borrowerRefId: borrower.id,
        borrowerType: borrower.type,
        borrowerName: borrower.name,
        borrowerCode: borrower.code,
        borrowerClass: borrower.class,
        remarks: form.remarks,
      });

      toast.success('Reservation request recorded successfully!');
      setCreateModalOpen(false);
      setForm({ bookId: '', borrowerRefId: '', remarks: '' });
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to place reservation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async (resv) => {
    setActionLoading(true);
    try {
      await librarianApi.approveReservation(resv.id);
      toast.success(`Reservation for "${resv.bookTitle}" approved! Book ready for pickup.`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Cannot approve reservation');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (resv) => {
    const reason = window.prompt('Enter reason for rejection (optional):');
    if (reason === null) return;

    setActionLoading(true);
    try {
      await librarianApi.rejectReservation(resv.id, reason);
      toast.success('Reservation request rejected');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to reject');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFulfill = async (resv) => {
    setActionLoading(true);
    try {
      const res = await librarianApi.fulfillReservation(resv.id);
      toast.success(`"${resv.bookTitle}" issued to ${resv.borrowerName}!`);
      setCreatedIssue(res.data);
      setIssueSlipOpen(true);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to issue reserved book');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async (resv) => {
    if (!window.confirm(`Are you sure you want to cancel reservation for "${resv.borrowerName}"?`)) return;

    setActionLoading(true);
    try {
      await librarianApi.cancelReservation(resv.id);
      toast.success('Reservation cancelled');
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to cancel');
    } finally {
      setActionLoading(false);
    }
  };

  const tabs = [
    { id: 'ALL', label: 'All Reservations', count: reservations.length },
    { id: 'PENDING', label: 'Pending Requests', count: reservations.filter((r) => r.status === 'PENDING').length },
    { id: 'APPROVED', label: 'Approved / Ready', count: reservations.filter((r) => r.status === 'APPROVED').length },
  ];

  const columns = [
    {
      title: 'Book Title',
      key: 'bookTitle',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">{val || '—'}</span>
          <span className="text-3xs text-slate-400">Category: {row.bookCategory || 'General'}</span>
        </div>
      ),
    },
    {
      title: 'Reserving Borrower',
      key: 'borrowerName',
      sortable: true,
      render: (val, row) => (
        <div>
          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs block">{val}</span>
          <span className="text-3xs text-slate-400">{row.borrowerType} • {row.borrowerCode || 'STU'}</span>
        </div>
      ),
    },
    { title: 'Reserved Date', key: 'reservedAt', render: (val) => formatDate(val) },
    { title: 'Expires', key: 'expiresAt', render: (val) => formatDate(val) },
    {
      title: 'Status',
      key: 'status',
      sortable: true,
      render: (val) => (
        <Badge
          variant={
            val === 'APPROVED' || val === 'FULFILLED'
              ? 'success'
              : val === 'PENDING'
              ? 'warning'
              : 'danger'
          }
        >
          {val}
        </Badge>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          {row.status === 'PENDING' && (
            <>
              <button
                onClick={() => handleApprove(row)}
                disabled={actionLoading}
                title="Approve & Ready Copy"
                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:hover:bg-emerald-900/40 text-3xs font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => handleReject(row)}
                disabled={actionLoading}
                title="Reject Request"
                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:hover:bg-rose-900/40 text-3xs font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Reject</span>
              </button>
            </>
          )}
          {row.status === 'APPROVED' && (
            <>
              <button
                onClick={() => handleFulfill(row)}
                disabled={actionLoading}
                title="Issue Book to Reserving Borrower"
                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-3xs font-bold rounded-lg transition-colors flex items-center gap-1"
              >
                <BookCheck className="h-3.5 w-3.5" />
                <span>Issue Now</span>
              </button>
              <button
                onClick={() => handleCancel(row)}
                disabled={actionLoading}
                title="Cancel Reservation"
                className="p-1 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
              >
                <Ban className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Book Reservations"
        subtitle="Manage member reservation queues, approve requests when copies become available, and track expirations."
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={fetchData}
              disabled={loading}
              className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setCreateModalOpen(true)}
              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>New Reservation</span>
            </button>
          </div>
        }
      />

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />

      {loading ? (
        <SkeletonTable rows={8} columns={6} />
      ) : reservations.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Bookmark className="h-8 w-8 mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Reservations</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Members can reserve out-of-stock books, which will appear here for priority fulfillment.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={reservations}
            searchPlaceholder="Search reservations by title or member..."
            searchKeys={['bookTitle', 'borrowerName', 'borrowerCode']}
            csvFilename="library_reservations.csv"
          />
        </div>
      )}

      {/* Create Reservation Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create Book Reservation"
        size="md"
      >
        <form onSubmit={handleCreateReservation} className="space-y-4">
          <div className="space-y-1">
            <label className="text-3xs font-bold text-slate-500 uppercase">Select Book Title *</label>
            <select
              required
              value={form.bookId}
              onChange={(e) => setForm({ ...form, bookId: e.target.value })}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">-- Choose Catalogue Title --</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} ({b.availableCopies} available) — Code: {b.bookCode}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-3xs font-bold text-slate-500 uppercase">Select Borrower *</label>
            <select
              required
              value={form.borrowerRefId}
              onChange={(e) => setForm({ ...form, borrowerRefId: e.target.value })}
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            >
              <option value="">-- Choose Student / Faculty --</option>
              {borrowers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.type}) — {b.code}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-3xs font-bold text-slate-500 uppercase">Remarks (Optional)</label>
            <input
              type="text"
              value={form.remarks}
              onChange={(e) => setForm({ ...form, remarks: e.target.value })}
              placeholder="e.g. Research project reservation"
              className="w-full h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Placing Request...' : 'Place Reservation'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Issue Slip Modal (on fulfilling a reservation) */}
      {createdIssue && (
        <Modal
          isOpen={issueSlipOpen}
          onClose={() => setIssueSlipOpen(false)}
          title="Library Circulation Issue Slip"
          size="md"
        >
          <IssueSlip issue={createdIssue} onClose={() => setIssueSlipOpen(false)} />
        </Modal>
      )}
    </div>
  );
};
export default BookReservation;
