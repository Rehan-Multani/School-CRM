import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { BookCard } from '../../components/ui/BookCard';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { AddEditBook } from './AddEditBook';
import { SkeletonCard, SkeletonTable } from '../../components/ui/SkeletonLoader';
import { Plus, LayoutGrid, List, Trash2, Eye, Edit, RefreshCw, Power } from 'lucide-react';
import { cn } from '../../utils/cn';
import { librarianApi } from '../../../../shared/api/client';
import { useToast } from '../../components/ui/Toast';

export const BookList = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [bookToDelete, setBookToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBooks = async () => {
    setLoading(true);
    try {
      const res = await librarianApi.books();
      if (res?.success && Array.isArray(res.data)) {
        setBooks(res.data);
      } else {
        setBooks([]);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to fetch book catalog');
      setBooks([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleAddSuccess = async (bookData) => {
    setActionLoading(true);
    try {
      if (editingBook) {
        await librarianApi.updateBook(editingBook.id, bookData);
        toast.success('Book catalog updated successfully!');
      } else {
        await librarianApi.createBook(bookData);
        toast.success('New book and physical copies created successfully!');
      }
      setWizardOpen(false);
      setEditingBook(null);
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditClick = (book) => {
    setEditingBook(book);
    setWizardOpen(true);
  };

  const handleToggleStatus = async (book) => {
    const nextActive = !(book.isActive !== false);
    try {
      await librarianApi.updateBook(book.id, { isActive: nextActive });
      toast.success(`"${book.title}" marked ${nextActive ? 'active' : 'inactive'}`);
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to update book status');
    }
  };

  const confirmDelete = async () => {
    if (!bookToDelete) return;
    setActionLoading(true);
    try {
      await librarianApi.deleteBook(bookToDelete.id);
      toast.success('Book and copies deleted successfully!');
      setDeleteModalOpen(false);
      setBookToDelete(null);
      fetchBooks();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to delete book');
    } finally {
      setActionLoading(false);
    }
  };

  const columns = [
    { title: 'Book Code', key: 'bookCode', sortable: true },
    {
      title: 'Title',
      key: 'title',
      sortable: true,
      render: (val, row) => (
        <div
          onClick={() => navigate(`/librarian/books/${row.id}`)}
          className="cursor-pointer group"
        >
          <span className="font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 block">
            {val}
          </span>
          <span className="text-3xs text-slate-400">{row.isbn ? `ISBN: ${row.isbn}` : ''}</span>
        </div>
      ),
    },
    { title: 'Author', key: 'author', sortable: true },
    {
      title: 'Category',
      key: 'category',
      sortable: true,
      render: (val) => <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-3xs rounded-md">{val}</span>,
    },
    {
      title: 'Available Copies',
      key: 'availableCopies',
      sortable: true,
      render: (val, row) => (
        <Badge variant={val > 0 ? 'success' : 'danger'}>
          {val} / {row.totalCopies} Available
        </Badge>
      ),
    },
    {
      title: 'Status',
      key: 'isActive',
      sortable: true,
      render: (val, row) => (
        <button onClick={() => handleToggleStatus(row)} title={val !== false ? 'Click to deactivate' : 'Click to activate'}>
          <Badge variant={val !== false ? 'default' : 'warning'} className="cursor-pointer">
            {val !== false ? 'Active' : 'Inactive'}
          </Badge>
        </button>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, row) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/librarian/books/${row.id}`)}
            title="View Details"
            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleEditClick(row)}
            title="Edit Book"
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/20 rounded-lg transition-colors"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleToggleStatus(row)}
            title={row.isActive !== false ? 'Deactivate Book' : 'Activate Book'}
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20 rounded-lg transition-colors"
          >
            <Power className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setBookToDelete(row);
              setDeleteModalOpen(true);
            }}
            title="Delete Book"
            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition-colors"
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
        title="Book Catalogue"
        subtitle="Manage master book titles, classification codes, shelf coordinates, and copy distributions."
        actions={
          <div className="flex items-center gap-2.5">
            {/* Refresh */}
            <button
              onClick={fetchBooks}
              disabled={loading}
              className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            {/* Grid / List switcher */}
            <div className="flex items-center p-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  viewMode === 'grid'
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                    : 'text-slate-400'
                )}
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={cn(
                  'p-1.5 rounded-lg transition-colors',
                  viewMode === 'list'
                    ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                    : 'text-slate-400'
                )}
              >
                <List className="h-4 w-4" />
              </button>
            </div>

            <button
              onClick={() => {
                setEditingBook(null);
                setWizardOpen(true);
              }}
              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all duration-150 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Add Book</span>
            </button>
          </div>
        }
      />

      {loading ? (
        viewMode === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, idx) => (
              <SkeletonCard key={idx} />
            ))}
          </div>
        ) : (
          <SkeletonTable rows={8} columns={6} />
        )
      ) : books.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="inline-flex p-4 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 rounded-2xl">
            <Plus className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">No Books in Library</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Start by registering your first book catalog item along with physical accession numbers.
            </p>
          </div>
          <button
            onClick={() => {
              setEditingBook(null);
              setWizardOpen(true);
            }}
            className="h-10 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl inline-flex items-center gap-2 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Register First Book</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {books.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              onView={(b) => navigate(`/librarian/books/${b.id}`)}
              onEdit={handleEditClick}
              onToggleStatus={handleToggleStatus}
              onDelete={(b) => {
                setBookToDelete(b);
                setDeleteModalOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={books}
            searchPlaceholder="Search by title, author, isbn, or code..."
            searchKeys={['title', 'author', 'bookCode', 'isbn', 'category']}
            csvFilename="library_books_catalogue.csv"
          />
        </div>
      )}

      {/* Multistep Add/Edit Book Wizard Modal */}
      <Modal
        isOpen={wizardOpen}
        onClose={() => {
          setWizardOpen(false);
          setEditingBook(null);
        }}
        title={editingBook ? 'Edit Book Details' : 'Register New Book Catalog'}
        size="lg"
      >
        <AddEditBook
          book={editingBook}
          onSuccess={handleAddSuccess}
          onCancel={() => {
            setWizardOpen(false);
            setEditingBook(null);
          }}
          isLoading={actionLoading}
        />
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setBookToDelete(null);
        }}
        title="Confirm Book Deletion"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            Are you sure you want to delete <strong className="text-slate-900 dark:text-white">"{bookToDelete?.title}"</strong>?
            This will permanently remove this catalog entry and all its physical copies from the library.
          </p>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/30 rounded-xl text-3xs text-indigo-700 dark:text-indigo-400">
            Note: Books with active borrower loans or pending reservations cannot be deleted.
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={() => {
                setDeleteModalOpen(false);
                setBookToDelete(null);
              }}
              className="px-4 py-2 text-xs font-semibold border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-850"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
export default BookList;
