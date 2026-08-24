import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { IssueSlip } from '../../components/ui/IssueSlip';
import { SkeletonList } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { Search, User, BookOpen, Calendar, CheckCircle2, ChevronRight, RefreshCw, Copy, ShieldAlert } from 'lucide-react';
import { cn } from '../../utils/cn';
import { librarianApi } from '../../../../shared/api/client';
import { formatDate } from '../../utils/formatters';

export const BookIssue = () => {
  const toast = useToast();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [borrowers, setBorrowers] = useState([]);
  const [books, setBooks] = useState([]);
  const [settings, setSettings] = useState(null);

  const [memberQuery, setMemberQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);

  const [bookQuery, setBookQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState(null);

  const [durationDays, setDurationDays] = useState(14);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });

  const [remarks, setRemarks] = useState('');
  const [issueSlipOpen, setIssueSlipOpen] = useState(false);
  const [createdIssue, setCreatedIssue] = useState(null);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [borrowersRes, booksRes, settingsRes] = await Promise.allSettled([
        librarianApi.borrowers(),
        librarianApi.books({ status: 'AVAILABLE' }),
        librarianApi.settings(),
      ]);

      if (borrowersRes.status === 'fulfilled' && Array.isArray(borrowersRes.value?.data)) {
        setBorrowers(borrowersRes.value.data);
      }

      if (booksRes.status === 'fulfilled' && Array.isArray(booksRes.value?.data)) {
        setBooks(booksRes.value.data);
      }

      if (settingsRes.status === 'fulfilled' && settingsRes.value?.data) {
        setSettings(settingsRes.value.data);
        const days = settingsRes.value.data.defaultIssueDays || 14;
        setDurationDays(days);
        const d = new Date();
        d.setDate(d.getDate() + days);
        setDueDate(d.toISOString().split('T')[0]);
      }
    } catch {
      toast.error('Failed to load circulation records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const filteredMembers = borrowers.filter(
    (m) =>
      m.name.toLowerCase().includes(memberQuery.toLowerCase()) ||
      (m.code && m.code.toLowerCase().includes(memberQuery.toLowerCase())) ||
      (m.type && m.type.toLowerCase().includes(memberQuery.toLowerCase()))
  );

  const filteredBooks = books.filter(
    (b) =>
      b.title.toLowerCase().includes(bookQuery.toLowerCase()) ||
      (b.bookCode && b.bookCode.toLowerCase().includes(bookQuery.toLowerCase())) ||
      (b.author && b.author.toLowerCase().includes(bookQuery.toLowerCase())) ||
      (b.isbn && b.isbn.toLowerCase().includes(bookQuery.toLowerCase()))
  );

  const handleSelectMember = (member) => {
    setSelectedMember(member);
    setStep(2);
  };

  const handleSelectBook = (book) => {
    if (book.availableCopies <= 0) {
      toast.error(`"${book.title}" is out of stock. All copies are currently issued.`);
      return;
    }
    setSelectedBook(book);
    setStep(3);
  };

  const handleDurationChange = (days) => {
    setDurationDays(days);
    const d = new Date();
    d.setDate(d.getDate() + Number(days));
    setDueDate(d.toISOString().split('T')[0]);
  };

  const handleConfirmIssue = async () => {
    if (!selectedMember || !selectedBook) {
      toast.error('Please select both a borrower and a book.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        bookId: selectedBook.id,
        borrowerRefId: selectedMember.id,
        borrowerType: selectedMember.type,
        borrowerName: selectedMember.name,
        borrowerCode: selectedMember.code,
        borrowerClass: selectedMember.class,
        dueDate,
        durationDays,
        remarks,
      };

      const res = await librarianApi.issueBook(payload);
      toast.success(`"${selectedBook.title}" issued successfully to ${selectedMember.name}!`);

      setCreatedIssue({
        ...res.data,
        book: selectedBook,
        member: selectedMember,
      });

      setIssueSlipOpen(true);

      // Reset wizard
      setStep(1);
      setSelectedMember(null);
      setSelectedBook(null);
      setRemarks('');
      loadInitialData();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Issue operation failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Issue Book"
        subtitle="3-step circulation wizard to assign available physical copies to verified school members."
        actions={
          <button
            onClick={loadInitialData}
            disabled={loading}
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {/* Progress Wizard Tracker */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
        <div className="flex justify-between items-center max-w-2xl mx-auto">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center font-black text-xs transition-colors',
                step >= 1 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              )}
            >
              1
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white">Borrower</span>
              <span className="block text-3xs text-slate-400">
                {selectedMember ? selectedMember.name : 'Select Student/Staff'}
              </span>
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-700" />

          <div className="flex items-center gap-3">
            <div
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center font-black text-xs transition-colors',
                step >= 2 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              )}
            >
              2
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white">Book & Copy</span>
              <span className="block text-3xs text-slate-400">
                {selectedBook ? selectedBook.title : 'Select Title'}
              </span>
            </div>
          </div>

          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-700" />

          <div className="flex items-center gap-3">
            <div
              className={cn(
                'h-9 w-9 rounded-full flex items-center justify-center font-black text-xs transition-colors',
                step === 3 ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
              )}
            >
              3
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-900 dark:text-white">Confirm Loan</span>
              <span className="block text-3xs text-slate-400">Due date & Issue</span>
            </div>
          </div>
        </div>
      </div>

      {/* Step 1: Member Selection */}
      {step === 1 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Step 1: Select Eligible Borrower
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose a student, faculty member, or staff with active borrowing privileges.
              </p>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={memberQuery}
                onChange={(e) => setMemberQuery(e.target.value)}
                placeholder="Search borrower by name or code..."
                className="w-full h-10 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          {loading ? (
            <SkeletonList count={6} />
          ) : filteredMembers.length === 0 ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-400">
              No eligible borrowers found matching "{memberQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.slice(0, 12).map((member) => (
                <div
                  key={member.id}
                  onClick={() => handleSelectMember(member)}
                  className="p-4 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/50 rounded-2xl cursor-pointer hover:shadow-xs transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 transition-colors">
                        {member.name}
                      </span>
                      <div className="flex items-center gap-1.5 text-3xs text-slate-400 mt-0.5">
                        <Badge variant="neutral">{member.type}</Badge>
                        <span>•</span>
                        <span>{member.code || 'ID: STU'}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 2: Book & Physical Copy Selection */}
      {step === 2 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-3xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded">
                  Borrower: {selectedMember?.name} ({selectedMember?.type})
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Step 2: Select Book to Issue
              </h3>
              <p className="text-xs text-slate-500">Pick an in-stock title from the catalogue.</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={bookQuery}
                  onChange={(e) => setBookQuery(e.target.value)}
                  placeholder="Search catalogue by title, author, code..."
                  className="w-full h-10 pl-10 pr-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => setStep(1)}
                className="h-10 px-3 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-850"
              >
                Change Borrower
              </button>
            </div>
          </div>

          {filteredBooks.length === 0 ? (
            <div className="py-12 text-center text-xs font-semibold text-slate-400">
              No available books matching "{bookQuery}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBooks.map((b) => (
                <div
                  key={b.id}
                  onClick={() => handleSelectBook(b)}
                  className="p-4 border border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500/50 rounded-2xl cursor-pointer hover:shadow-xs transition-all flex items-start justify-between group"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-12 w-9 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-lg flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-indigo-600 transition-colors">
                        {b.title}
                      </span>
                      <span className="block text-3xs text-slate-400">By {b.author}</span>
                      <div className="flex items-center gap-2 pt-1">
                        <Badge variant={b.availableCopies > 0 ? 'success' : 'danger'}>
                          {b.availableCopies} Copies Available
                        </Badge>
                        <span className="text-3xs text-slate-400 font-mono">{b.bookCode}</span>
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all mt-1" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Step 3: Confirm Issue & Select Physical Copy */}
      {step === 3 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 max-w-3xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Step 3: Finalize Loan Issue
              </h3>
              <p className="text-xs text-slate-500">
                Set the issue duration and confirm the loan.
              </p>
            </div>
            <button
              onClick={() => setStep(2)}
              className="text-xs font-bold text-indigo-600 hover:text-indigo-700"
            >
              Change Book
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Borrower Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <span className="text-3xs font-bold uppercase text-slate-400 tracking-wider block">Borrower Profile</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{selectedMember?.name}</p>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Badge variant="neutral">{selectedMember?.type}</Badge>
                <span>Code: {selectedMember?.code || 'N/A'}</span>
              </div>
            </div>

            {/* Book Card */}
            <div className="p-4 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <span className="text-3xs font-bold uppercase text-slate-400 tracking-wider block">Selected Book</span>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{selectedBook?.title}</p>
              <p className="text-xs text-slate-500">By {selectedBook?.author}</p>
            </div>
          </div>

          {/* Loan Duration & Due Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-3xs font-bold text-slate-500 uppercase">Issue Duration (Days)</label>
              <div className="flex gap-2">
                {[7, 14, 21, 30].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => handleDurationChange(d)}
                    className={cn(
                      'flex-1 h-10 rounded-xl font-bold text-xs transition-colors',
                      durationDays === d
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-300'
                    )}
                  >
                    {d} Days
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-3xs font-bold text-slate-500 uppercase">Calculated Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-3xs font-bold text-slate-500 uppercase">Remarks / Notes (Optional)</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Special exam preparation issue"
              className="w-full h-10 px-3.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setStep(2)}
              className="h-11 px-5 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-850"
            >
              Back
            </button>
            <button
              onClick={handleConfirmIssue}
              disabled={submitting}
              className="h-11 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-indigo-900/10 disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Processing Issue...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm & Issue Book</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Generated Issue Slip Modal */}
      {createdIssue && (
        <Modal
          isOpen={issueSlipOpen}
          onClose={() => setIssueSlipOpen(false)}
          title="Library Circulation Issue Slip"
          size="md"
        >
          <IssueSlip
            issue={createdIssue}
            onClose={() => setIssueSlipOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};
export default BookIssue;
