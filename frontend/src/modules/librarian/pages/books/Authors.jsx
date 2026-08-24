import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { UserCheck, RefreshCw, BookOpen } from 'lucide-react';
import { librarianApi } from '../../../../shared/api/client';
import { useToast } from '../../components/ui/Toast';

export const Authors = () => {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchAuthors = async () => {
    setLoading(true);
    try {
      const res = await librarianApi.authors();
      if (res?.success && Array.isArray(res.data)) {
        setAuthors(res.data);
      } else {
        setAuthors([]);
      }
    } catch {
      toast.error('Failed to load author index');
      setAuthors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuthors();
  }, []);

  const columns = [
    {
      title: 'Author Name',
      key: 'name',
      sortable: true,
      render: (val) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
            <UserCheck className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-xs">{val || 'Unknown Author'}</span>
        </div>
      ),
    },
    {
      title: 'Books Catalogued',
      key: 'booksCount',
      sortable: true,
      render: (val) => <Badge variant="neutral">{val} Titles</Badge>,
    },
    {
      title: 'Categories',
      key: 'categories',
      render: (val) => (
        <div className="flex flex-wrap gap-1">
          {(val || []).slice(0, 3).map((c) => (
            <span key={c} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-4xs font-semibold rounded">
              {c}
            </span>
          ))}
          {(val || []).length > 3 && (
            <span className="text-4xs text-slate-400 font-bold">+{val.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      title: 'Total Stock Copies',
      key: 'totalCopies',
      sortable: true,
      render: (val) => <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{val || 0}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Authors Index"
        subtitle="Catalogue of all authors with indexed titles and collection counts."
        actions={
          <button
            onClick={fetchAuthors}
            disabled={loading}
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {loading ? (
        <SkeletonTable rows={8} columns={4} />
      ) : authors.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <UserCheck className="h-8 w-8 mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Authors Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Authors will automatically appear here once books are added to the library catalogue.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={authors}
            searchPlaceholder="Search authors..."
            searchKeys={['name']}
            csvFilename="library_authors_index.csv"
          />
        </div>
      )}
    </div>
  );
};
export default Authors;
