import React, { useState } from 'react';
import { useLibrary } from '../hooks/useStudentHooks';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { 
  Library, 
  Search, 
  BookOpen, 
  Calendar, 
  AlertCircle, 
  RotateCcw 
} from 'lucide-react';

export const StudentLibrary = () => {
  const { library, renewBook } = useLibrary();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCatalog = library.searchCatalog.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    book.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleRenew = (title) => {
    renewBook(title);
    alert(`Renewal request submitted for "${title}"`);
  };

  return (
    <div className="space-y-6">
      {/* Search Catalog */}
      <Card className="p-4">
        <div className="relative">
          <Search className="absolute left-3 top-3.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search school library catalog by title or author..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-slate-50 dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-xs"
          />
        </div>

        {searchQuery && (
          <div className="mt-4 space-y-2 border-t border-border pt-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Search Results</h4>
            {filteredCatalog.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No matching books found in the library database.</p>
            ) : (
              filteredCatalog.map((book, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50/50 dark:bg-slate-900/50 border border-border text-xs">
                  <div>
                    <span className="font-bold text-foreground block">{book.title}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">by {book.author}</span>
                  </div>
                  <Badge variant={book.available ? 'success' : 'danger'}>
                    {book.available ? 'Available' : 'Issued Out'}
                  </Badge>
                </div>
              ))
            )}
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Issued Books */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Currently Issued Books</h3>
          {library.booksIssued.length === 0 ? (
            <EmptyState 
              title="No Books Issued" 
              description="You don't have any books checked out from the school library right now."
              icon={Library}
            />
          ) : (
            library.booksIssued.map((book, i) => (
              <Card key={i} className="p-5 border border-border">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary shrink-0 h-11 w-11 flex items-center justify-center">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground leading-tight">{book.title}</h4>
                      <span className="text-[10px] text-slate-400 block mt-0.5">by {book.author}</span>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500 mt-3 font-semibold">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Issued: {book.issueDate}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Return: {book.returnDate}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    {book.fine > 0 ? (
                      <Badge variant="danger" className="flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        <span>₹{book.fine} Overdue Fine</span>
                      </Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}

                    <button
                      onClick={() => handleRenew(book.title)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-border hover:border-primary/20 hover:bg-primary/5 rounded-lg text-[10px] font-bold transition-all active:scale-95 duration-100 select-none"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Renew</span>
                    </button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Return History */}
        <Card className="lg:col-span-1">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 pb-2 border-b border-border">
            Library Return History
          </h3>
          <div className="space-y-4">
            {library.history.map((row, i) => (
              <div key={i} className="text-xs border-b border-border pb-3 last:border-0 last:pb-0">
                <span className="font-bold text-foreground block truncate">{row.title}</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">by {row.author}</span>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[9px] text-slate-400">Returned: {row.returnDate}</span>
                  <Badge variant="secondary">Returned</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>

      </div>
    </div>
  );
};
