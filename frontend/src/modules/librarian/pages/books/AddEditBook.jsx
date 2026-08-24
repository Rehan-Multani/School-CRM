import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/ui/Toast';
import { librarianApi } from '../../../../shared/api/client';

const inputClass = 'h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 dark:border-slate-800 dark:bg-slate-950 dark:text-white transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed';
const labelClass = 'mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400';

const FALLBACK_CATEGORIES = [
  'Science', 'Mathematics', 'Literature', 'History', 'Technology',
  'Fiction', 'Biography', 'Self-Help', 'Textbook', 'General',
];

export const AddEditBook = ({ book, onSuccess, onCancel, isLoading }) => {
  const toast = useToast();
  const [categoryOptions, setCategoryOptions] = useState(FALLBACK_CATEGORIES);

  const [formData, setFormData] = useState({
    title: book?.title || '',
    publisher: book?.publisher || '',
    author: book?.author || '',
    publicationYear: book?.publicationYear || new Date().getFullYear(),
    edition: book?.edition || '',
    language: book?.language || 'English',
    category: book?.category || '',
    subject: book?.subject || '',
    price: book?.price ?? 0,
    totalCopies: book?.totalCopies || 1,
    description: book?.description || '',
  });

  useEffect(() => {
    let cancelled = false;
    librarianApi.categories().then((res) => {
      if (cancelled) return;
      if (res?.success && Array.isArray(res.data)) {
        const activeNames = res.data.filter((c) => c.status === 'ACTIVE').map((c) => c.name);
        // Keep the book's current category selectable even if it was since deactivated
        if (book?.category && !activeNames.some((n) => n.toUpperCase() === book.category.toUpperCase())) {
          activeNames.push(book.category);
        }
        if (activeNames.length > 0) {
          setCategoryOptions(activeNames);
          setFormData((prev) => {
            const currentVal = prev.category || book?.category;
            const matched = activeNames.find((n) => n.toUpperCase() === (currentVal || '').toUpperCase());
            return { ...prev, category: matched || activeNames[0] };
          });
          return;
        }
      }

      // Fallback if no active categories or API fails
      setFormData((prev) => {
        if (prev.category) return prev;
        return { ...prev, category: book?.category || FALLBACK_CATEGORIES[0] || 'Fiction' };
      });
    }).catch(() => {
      if (cancelled) return;
      setFormData((prev) => {
        if (prev.category) return prev;
        return { ...prev, category: book?.category || FALLBACK_CATEGORIES[0] || 'Fiction' };
      });
    });
    return () => { cancelled = true; };
  }, [book?.category]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'price' || name === 'totalCopies' || name === 'publicationYear'
        ? Number(value)
        : value,
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.author.trim() || !formData.publisher.trim() || !formData.category.trim()) {
      toast.error('Please fill in all required fields marked with *');
      return;
    }
    if (formData.price <= 0) {
      toast.error('Please enter a valid Book Cost.');
      return;
    }
    if (!book && formData.totalCopies <= 0) {
      toast.error('Please enter a valid quantity of copies.');
      return;
    }

    onSuccess(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className={labelClass}>Book Title *</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className={inputClass}
            placeholder="e.g. A Brief History of Time"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Publisher *</label>
          <input
            type="text"
            name="publisher"
            value={formData.publisher}
            onChange={handleChange}
            className={inputClass}
            placeholder="e.g. Bantam Books"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Author Name *</label>
          <input
            type="text"
            name="author"
            value={formData.author}
            onChange={handleChange}
            className={inputClass}
            placeholder="e.g. Stephen Hawking"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Publication Year</label>
          <input
            type="number"
            name="publicationYear"
            value={formData.publicationYear}
            onChange={handleChange}
            placeholder="e.g. 2024"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Edition</label>
          <input
            type="text"
            name="edition"
            value={formData.edition}
            onChange={handleChange}
            className={inputClass}
            placeholder="e.g. 10th Anniversary / 3rd Edition"
          />
        </div>

        <div>
          <label className={labelClass}>Language</label>
          <input
            type="text"
            name="language"
            value={formData.language}
            onChange={handleChange}
            placeholder="e.g. English, Hindi"
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Category *</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className={inputClass}
            required
          >
            {categoryOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Subject</label>
          <input
            type="text"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className={inputClass}
            placeholder="e.g. Physics"
          />
        </div>

        <div>
          <label className={labelClass}>Book Cost (INR) *</label>
          <input
            type="number"
            name="price"
            value={formData.price}
            onChange={handleChange}
            placeholder="e.g. 450"
            className={inputClass}
            min="0"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Quantity Copies {!book && '*'}</label>
          <input
            type="number"
            name="totalCopies"
            value={formData.totalCopies}
            onChange={handleChange}
            placeholder="e.g. 1"
            className={inputClass}
            min="1"
            disabled={Boolean(book)}
            required={!book}
          />
          {book && (
            <p className="mt-1 text-3xs text-slate-400">Manage individual copies from the Book Copies page.</p>
          )}
        </div>

        <div className="col-span-2">
          <label className={labelClass}>Description</label>
          <textarea
            rows={3}
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter book summary, key topics covered, syllabus notes, or condition details..."
            className={`${inputClass} h-auto py-2.5`}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 hover:bg-slate-50 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="rounded-xl bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-xs font-bold text-white transition-all duration-150 shadow-xs disabled:opacity-60"
        >
          {isLoading ? 'Saving...' : book ? 'Update Book' : 'Save Book'}
        </button>
      </div>
    </form>
  );
};

export default AddEditBook;
