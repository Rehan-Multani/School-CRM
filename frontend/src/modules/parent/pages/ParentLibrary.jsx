import React, { useState, useEffect } from 'react';
import { useParentAuth } from '../context/ParentAuthContext';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { FilterBar } from '../components/ui/FilterBar';
import { useToast } from '../components/ui/Toast';
import { MOCK_CHILDREN_LIBRARY } from '../data/mockData';
import { Library, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

export const ParentLibrary = () => {
  const toast = useToast();
  const { selectedChildId } = useParentAuth();
  const [tab, setTab] = useState('issued');
  const [library, setLibrary] = useState(null);

  useEffect(() => {
    setLibrary(MOCK_CHILDREN_LIBRARY[selectedChildId] || null);
  }, [selectedChildId]);

  const handleRenewRequest = (bookTitle) => {
    toast.success(`Renewal request submitted for "${bookTitle}"`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-black text-foreground">Library Hub</h2>
        <p className="text-xs text-slate-500 mt-0.5">Track books issued, return dates, outstanding library fines, and renew checkouts</p>
      </div>

      <FilterBar
        filters={[
          { value: 'issued', label: 'Issued Books' },
          { value: 'history', label: 'Returned Logs' },
        ]}
        active={tab}
        onChange={setTab}
      />

      {/* Issued Books Tab */}
      {tab === 'issued' && library && (
        <div className="space-y-4">
          {library.booksIssued.map((book, idx) => {
            const isOverdue = book.status === 'Overdue';
            return (
              <Card key={idx} className={`border ${isOverdue ? 'border-rose-200 dark:border-rose-950 bg-rose-500/5' : 'border-border'}`}>
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-2xl shrink-0 ${isOverdue ? 'bg-rose-500/10 text-rose-500' : 'bg-primary/10 text-primary'}`}>
                    <Library className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                      <h4 className="text-xs font-bold text-foreground truncate max-w-[200px]">{book.title}</h4>
                      <Badge variant={isOverdue ? 'danger' : 'primary'}>{book.status}</Badge>
                    </div>
                    <p className="text-[10px] text-slate-400">Author: {book.author}</p>
                    <div className="flex items-center gap-4 mt-3 text-[10px] text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Return By: <span className={isOverdue ? 'text-rose-500 font-bold' : ''}>{book.returnDate}</span>
                      </span>
                      {book.fine > 0 && (
                        <span className="flex items-center gap-1 text-rose-500 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5" /> Fine: ₹{book.fine}
                        </span>
                      )}
                    </div>
                  </div>
                  {book.status !== 'Overdue' && (
                    <button
                      onClick={() => handleRenewRequest(book.title)}
                      className="px-3.5 py-2 bg-primary/10 text-primary rounded-xl text-[10px] font-bold hover:bg-primary hover:text-white transition-all select-none shrink-0"
                    >
                      Renew
                    </button>
                  )}
                </div>
              </Card>
            );
          })}

          {library.booksIssued.length === 0 && (
            <Card className="py-12 text-center text-xs text-slate-450">
              No active library checkouts found.
            </Card>
          )}
        </div>
      )}

      {/* Returned Log History */}
      {tab === 'history' && library && (
        <div className="space-y-3">
          {library.history.map((book, idx) => (
            <Card key={idx} className="flex items-center justify-between p-4 border border-border">
              <div>
                <h4 className="text-xs font-bold text-foreground">{book.title}</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Author: {book.author}</p>
                <p className="text-[9px] text-slate-500 mt-1.5">Issued: {book.issueDate} • Returned: {book.returnDate}</p>
              </div>
              <Badge variant="success">{book.status}</Badge>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
