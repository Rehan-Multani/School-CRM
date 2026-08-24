import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { AddEditBook } from './AddEditBook';
import { librarianApi } from '../../../../shared/api/client';
import { useToast } from '../../components/ui/Toast';
import { ArrowLeft } from 'lucide-react';

export const AddBook = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const handleSave = async (formData) => {
    setLoading(true);
    try {
      await librarianApi.createBook(formData);
      toast.success('Book catalog and physical copies created successfully!');
      navigate('/librarian/books');
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Failed to add book');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <PageHeader
        title="Add New Book"
        subtitle="Register a new title into the library catalogue with barcode and physical copies."
        actions={
          <button
            onClick={() => navigate('/librarian/books')}
            className="h-10 px-4 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-2 transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Books</span>
          </button>
        }
      />

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xs">
        <AddEditBook
          onSuccess={handleSave}
          onCancel={() => navigate('/librarian/books')}
          isLoading={loading}
        />
      </div>
    </div>
  );
};
export default AddBook;
