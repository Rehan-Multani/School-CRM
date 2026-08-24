import React, { useState, useMemo } from 'react';
import {
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  MoreVertical,
  Pencil,
  Check,
} from 'lucide-react';
import { exportToCSV } from '../lib/exportHelpers';
import { cn } from '../lib/cn';

export const DataTable = ({
  columns = [],
  data = [],
  initialData,
  searchPlaceholder = 'Search records...',
  searchKey,
  searchKeys,
  filterOptions = [],
  inlineFilters = [],
  bulkActions,
  actions,
  onRowClick,
  loading,
  isLoading,
  emptyMessage = 'No matching records found.',
  enableExport = true,
  enableSelection = false,
  enableIndex = true,
  csvFilename,
  exportFilename,
  onView,
  onEdit,
  onMore,
}) => {
  const rows = data ?? initialData ?? [];
  const busy = loading ?? isLoading ?? false;
  const exportName = csvFilename || exportFilename || `export_${Date.now()}.csv`;
  const getKey = (col) => col.key ?? col.id;
  const getTitle = (col) => col.title ?? col.header ?? '';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilters, setSelectedFilters] = useState({});
  const [sortConfig, setSortConfig] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [visibleColumns, setVisibleColumns] = useState(() => new Set(columns.map(getKey)));
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [showColumnToggle, setShowColumnToggle] = useState(false);

  const effectiveSearchKeys = searchKeys?.length ? searchKeys : searchKey ? [searchKey] : null;

  const derivedFilterOptions = filterOptions.length
    ? filterOptions
    : columns
        .filter((c) => c.filterable)
        .map((c) => {
          const values = rows
            .map((item) => item[getKey(c)])
            .filter((v) => v !== null && v !== undefined && v !== '');
          return {
            key: getKey(c),
            label: getTitle(c),
            options: [...new Set(values)].map((v) => ({ label: String(v), value: String(v) })),
          };
        });

  const allFilters = inlineFilters.length ? inlineFilters : derivedFilterOptions;

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (key, value) => {
    setSelectedFilters((prev) => {
      const next = { ...prev };
      if (!value || value === 'ALL') delete next[key];
      else next[key] = value;
      return next;
    });
    setCurrentPage(1);
  };

  const handleSort = (col) => {
    if (!col.sortable) return;
    const key = getKey(col);
    let direction = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleSelectAll = (e, currentRows) => {
    if (e.target.checked) {
      setSelectedIds(new Set(currentRows.map((r, idx) => r.id ?? `row-${idx}`)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleColumn = (key) => {
    setVisibleColumns((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const processedData = useMemo(() => {
    let result = [...rows];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter((item) => {
        if (effectiveSearchKeys) {
          return effectiveSearchKeys.some((key) => {
            const val = item[key];
            return val !== null && val !== undefined && String(val).toLowerCase().includes(term);
          });
        }
        return Object.values(item).some((val) => {
          if (val === null || val === undefined) return false;
          if (typeof val === 'object') {
            return Object.values(val).some(
              (sub) => sub !== null && sub !== undefined && String(sub).toLowerCase().includes(term)
            );
          }
          return String(val).toLowerCase().includes(term);
        });
      });
    }

    Object.entries(selectedFilters).forEach(([key, val]) => {
      result = result.filter((item) => {
        const itemVal = item[key];
        if (itemVal === null || itemVal === undefined) return false;
        return String(itemVal).toLowerCase() === String(val).toLowerCase();
      });
    });

    if (sortConfig) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'ascending' ? valA - valB : valB - valA;
        }
        valA = valA ? String(valA).toLowerCase() : '';
        valB = valB ? String(valB).toLowerCase() : '';
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [rows, searchTerm, effectiveSearchKeys, selectedFilters, sortConfig]);

  const totalRecords = processedData.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedData.slice(start, start + pageSize);
  }, [processedData, currentPage, pageSize]);

  const activeColumns = columns.filter((c) => visibleColumns.has(getKey(c)));
  const hasBulkArray = Array.isArray(bulkActions) && bulkActions.length > 0;
  const hasBulkFn = typeof bulkActions === 'function';
  const showBulkCheckboxes = Boolean(enableSelection);

  const clearSelection = () => setSelectedIds(new Set());

  // Generate clean page number list with ellipsis (e.g. 1, 2, 3, '...', 13)
  const paginationRange = useMemo(() => {
    const delta = 1;
    const range = [];
    const rangeWithDots = [];
    let l;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (l) {
        if (i - l === 2) {
          rangeWithDots.push(l + 1);
        } else if (i - l !== 1) {
          rangeWithDots.push('...');
        }
      }
      rangeWithDots.push(i);
      l = i;
    }

    return rangeWithDots;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-4">
      {/* Top Filter & Controls Card */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Search Box */}
          <div className="relative min-w-[280px] flex-1">
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchTerm}
              onChange={handleSearchChange}
              className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-3.5 pr-10 text-xs font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-white"
            />
            <Search className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>

          {/* Inline Filter Selects */}
          <div className="flex flex-wrap items-center gap-2.5">
            {allFilters.slice(0, 4).map((filter) => (
              <div key={filter.key} className="flex flex-col">
                <select
                  value={selectedFilters[filter.key] || 'ALL'}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="h-10 rounded-xl border border-slate-200 bg-slate-50/70 px-3 text-xs font-semibold text-slate-700 outline-none transition focus:border-indigo-600 focus:bg-white dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 cursor-pointer"
                >
                  <option value="ALL">All {filter.label}</option>
                  {filter.options.map((opt) => (
                    <option key={opt.value ?? opt} value={opt.value ?? opt}>
                      {opt.label ?? opt}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            {allFilters.length > 4 && (
              <button
                type="button"
                onClick={() => setShowFilterDrawer(!showFilterDrawer)}
                className={cn(
                  'inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-xs font-bold transition cursor-pointer',
                  showFilterDrawer
                    ? 'border-indigo-600/30 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300'
                )}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Filters</span>
              </button>
            )}

            {/* Column Toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowColumnToggle(!showColumnToggle)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 cursor-pointer"
                title="Toggle visible columns"
              >
                <Eye className="h-3.5 w-3.5" />
                <span>Columns</span>
              </button>
              {showColumnToggle && (
                <div className="absolute right-0 z-30 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-800 dark:bg-slate-900">
                  <span className="mb-2 block border-b border-slate-100 pb-1 text-[10px] font-black uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    Visible Columns
                  </span>
                  <div className="max-h-48 space-y-1.5 overflow-y-auto">
                    {columns.map((c) => (
                      <label
                        key={getKey(c)}
                        className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={visibleColumns.has(getKey(c))}
                          onChange={() => toggleColumn(getKey(c))}
                          className="h-3.5 w-3.5 rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="truncate">{getTitle(c)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* CSV Export */}
            {enableExport && (
              <button
                type="button"
                onClick={() => exportToCSV(processedData, exportName)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-indigo-600 hover:text-indigo-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export</span>
              </button>
            )}

            {actions}
          </div>
        </div>

        {/* Filter Drawer */}
        {showFilterDrawer && allFilters.length > 4 && (
          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 sm:grid-cols-4">
            {allFilters.slice(4).map((filter) => (
              <div key={filter.key} className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {filter.label}
                </label>
                <select
                  value={selectedFilters[filter.key] || 'ALL'}
                  onChange={(e) => handleFilterChange(filter.key, e.target.value)}
                  className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-2.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
                >
                  <option value="ALL">All {filter.label}</option>
                  {filter.options.map((opt) => (
                    <option key={opt.value ?? opt} value={opt.value ?? opt}>
                      {opt.label ?? opt}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bulk action selection banner */}
      {selectedIds.size > 0 && hasBulkFn && (
        <div className="flex items-center justify-between rounded-2xl border border-indigo-200 bg-indigo-50/80 p-3 dark:border-indigo-900/40 dark:bg-indigo-950/40">
          <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
            {selectedIds.size} row(s) selected
          </span>
          <div className="flex gap-2">{bulkActions(Array.from(selectedIds), clearSelection)}</div>
        </div>
      )}

      {/* Table Main View */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 font-bold text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
                {showBulkCheckboxes && (
                  <th className="w-12 px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      onChange={(e) => handleSelectAll(e, paginatedData)}
                      checked={paginatedData.length > 0 && selectedIds.size === paginatedData.length}
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>
                )}
                {enableIndex && <th className="w-12 px-3 py-4 text-center font-bold">#</th>}
                {activeColumns.map((col) => (
                  <th
                    key={getKey(col)}
                    onClick={() => handleSort(col)}
                    className={cn(
                      'px-4 py-4 font-bold select-none',
                      col.sortable && 'cursor-pointer hover:bg-slate-100/50 dark:hover:bg-slate-800/40',
                      col.align === 'center' && 'text-center',
                      col.align === 'right' && 'text-right'
                    )}
                  >
                    <div
                      className={cn(
                        'inline-flex items-center gap-1.5',
                        col.align === 'center' && 'justify-center',
                        col.align === 'right' && 'justify-end'
                      )}
                    >
                      <span>{getTitle(col)}</span>
                      {col.sortable && sortConfig && sortConfig.key === getKey(col) && (
                        sortConfig.direction === 'ascending' ? (
                          <ChevronUp className="h-3.5 w-3.5 text-indigo-600" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-indigo-600" />
                        )
                      )}
                    </div>
                  </th>
                ))}
                {(onView || onEdit || onMore) && (
                  <th className="w-28 px-4 py-4 text-right font-bold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium text-slate-700 dark:text-slate-300">
              {busy ? (
                Array.from({ length: pageSize }).map((_, idx) => (
                  <tr key={idx} className="animate-pulse">
                    {showBulkCheckboxes && (
                      <td className="px-4 py-3.5 text-center">
                        <div className="mx-auto h-4 w-4 rounded bg-slate-100 dark:bg-slate-800" />
                      </td>
                    )}
                    {enableIndex && (
                      <td className="px-3 py-3.5 text-center">
                        <div className="mx-auto h-3 w-4 rounded bg-slate-100 dark:bg-slate-800" />
                      </td>
                    )}
                    {activeColumns.map((c) => (
                      <td key={getKey(c)} className="px-4 py-3.5">
                        <div className="h-4 w-2/3 rounded bg-slate-100 dark:bg-slate-800" />
                      </td>
                    ))}
                    {(onView || onEdit || onMore) && (
                      <td className="px-4 py-3.5">
                        <div className="ml-auto h-4 w-12 rounded bg-slate-100 dark:bg-slate-800" />
                      </td>
                    )}
                  </tr>
                ))
              ) : paginatedData.length === 0 ? (
                <tr>
                  <td
                    colSpan={
                      activeColumns.length +
                      (showBulkCheckboxes ? 1 : 0) +
                      (enableIndex ? 1 : 0) +
                      (onView || onEdit || onMore ? 1 : 0)
                    }
                    className="px-4 py-16 text-center text-xs font-semibold text-slate-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row, rIdx) => {
                  const rowId = row.id ?? `row-${rIdx}`;
                  const isSelected = selectedIds.has(rowId);
                  const serialNo = (currentPage - 1) * pageSize + rIdx + 1;

                  return (
                    <tr
                      key={rowId}
                      onClick={() => onRowClick && onRowClick(row)}
                      className={cn(
                        'transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/30',
                        onRowClick && 'cursor-pointer',
                        isSelected && 'bg-indigo-50/30 dark:bg-indigo-950/20'
                      )}
                    >
                      {showBulkCheckboxes && (
                        <td className="px-4 py-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleSelectRow(rowId)}
                            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
                      )}
                      {enableIndex && (
                        <td className="px-3 py-3.5 text-center font-semibold text-slate-400 dark:text-slate-500">
                          {serialNo}
                        </td>
                      )}
                      {activeColumns.map((col) => (
                        <td
                          key={getKey(col)}
                          className={cn(
                            'px-4 py-3.5 text-xs',
                            col.align === 'center' && 'text-center',
                            col.align === 'right' && 'text-right'
                          )}
                        >
                          {col.render ? col.render(row[getKey(col)], row, serialNo) : row[getKey(col)] ?? '—'}
                        </td>
                      ))}

                      {(onView || onEdit || onMore) && (
                        <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1">
                            {onView && (
                              <button
                                type="button"
                                onClick={() => onView(row)}
                                className="rounded-full p-1.5 text-blue-500 transition hover:bg-blue-50 dark:hover:bg-blue-950/50 cursor-pointer"
                                title="View Details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {onEdit && (
                              <button
                                type="button"
                                onClick={() => onEdit(row)}
                                className="rounded-full p-1.5 text-amber-500 transition hover:bg-amber-50 dark:hover:bg-amber-950/50 cursor-pointer"
                                title="Edit"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {onMore && (
                              <button
                                type="button"
                                onClick={() => onMore(row)}
                                className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                                title="More options"
                              >
                                <MoreVertical className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Bar */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800 sm:flex-row">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Showing{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {totalRecords > 0 ? (currentPage - 1) * pageSize + 1 : 0}
            </strong>{' '}
            to{' '}
            <strong className="text-slate-800 dark:text-slate-200">
              {Math.min(currentPage * pageSize, totalRecords)}
            </strong>{' '}
            of <strong className="text-slate-800 dark:text-slate-200">{totalRecords}</strong> entries
          </p>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 outline-none dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 cursor-pointer"
              >
                {[5, 8, 10, 20, 50].map((sz) => (
                  <option key={sz} value={sz}>
                    {sz} per page
                  </option>
                ))}
              </select>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 cursor-pointer disabled:cursor-not-allowed"
                title="First Page"
              >
                <ChevronsLeft className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 cursor-pointer disabled:cursor-not-allowed"
                title="Previous Page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>

              {paginationRange.map((page, idx) => {
                if (page === '...') {
                  return (
                    <span
                      key={`dots-${idx}`}
                      className="flex h-8 w-8 items-center justify-center text-xs font-bold text-slate-400"
                    >
                      ...
                    </span>
                  );
                }
                const isCurrent = page === currentPage;
                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition cursor-pointer',
                      isCurrent
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900'
                    )}
                  >
                    {page}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 cursor-pointer disabled:cursor-not-allowed"
                title="Next Page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 disabled:opacity-30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400 dark:hover:bg-slate-900 cursor-pointer disabled:cursor-not-allowed"
                title="Last Page"
              >
                <ChevronsRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating bulk action drawer */}
      {selectedIds.size > 0 && hasBulkArray && (
        <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-4 rounded-2xl border border-slate-800 bg-slate-900 px-5 py-3 text-white shadow-xl">
          <span className="text-xs font-bold text-indigo-400">{selectedIds.size} row(s) selected</span>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            {bulkActions.map((action, idx) => {
              const ActionIcon = action.icon;
              const handler = action.onClick || action.action;
              return (
                <button
                  key={idx}
                  onClick={() => {
                    handler && handler(Array.from(selectedIds));
                    clearSelection();
                  }}
                  className={cn(
                    'flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold text-white transition cursor-pointer',
                    action.variant === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-slate-800 hover:bg-slate-700'
                  )}
                >
                  {ActionIcon && <ActionIcon className="h-3.5 w-3.5" />}
                  <span>{action.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
