import React, { useState, useEffect } from 'react';
import { PageHeader } from '../../components/ui/PageHeader';
import { DataTable } from '../../components/ui/DataTable';
import { Badge } from '../../components/ui/Badge';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { Building, RefreshCw } from 'lucide-react';
import { librarianApi } from '../../../../shared/api/client';
import { useToast } from '../../components/ui/Toast';

export const Publishers = () => {
  const [publishers, setPublishers] = useState([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const fetchPublishers = async () => {
    setLoading(true);
    try {
      const res = await librarianApi.publishers();
      if (res?.success && Array.isArray(res.data)) {
        setPublishers(res.data);
      } else {
        setPublishers([]);
      }
    } catch {
      toast.error('Failed to load publishers index');
      setPublishers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublishers();
  }, []);

  const columns = [
    {
      title: 'Publisher Name',
      key: 'name',
      sortable: true,
      render: (val) => (
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400">
            <Building className="h-4 w-4" />
          </div>
          <span className="font-bold text-slate-900 dark:text-white text-xs">{val || 'Unknown Publisher'}</span>
        </div>
      ),
    },
    {
      title: 'Publications Catalogued',
      key: 'booksCount',
      sortable: true,
      render: (val) => <Badge variant="neutral">{val} Titles</Badge>,
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
        title="Publishers Index"
        subtitle="Catalogue of all publishers and publishing houses in the school library."
        actions={
          <button
            onClick={fetchPublishers}
            disabled={loading}
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        }
      />

      {loading ? (
        <SkeletonTable rows={8} columns={3} />
      ) : publishers.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 text-center space-y-3">
          <Building className="h-8 w-8 mx-auto text-slate-400" />
          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200">No Publishers Found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Publishers will automatically appear here as books with publisher details are catalogued.
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6">
          <DataTable
            columns={columns}
            data={publishers}
            searchPlaceholder="Search publishers..."
            searchKeys={['name']}
            csvFilename="library_publishers_index.csv"
          />
        </div>
      )}
    </div>
  );
};
export default Publishers;
