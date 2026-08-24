import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Dashboard } from '../pages/Dashboard';
import { BookList } from '../pages/books/BookList';
import { AddBook } from '../pages/books/AddBook';
import { BookDetail } from '../pages/books/BookDetail';
import { Categories } from '../pages/books/Categories';
import { Authors } from '../pages/books/Authors';
import { Publishers } from '../pages/books/Publishers';
import { BookCopies } from '../pages/books/BookCopies';
import { BookIssue } from '../pages/issue/BookIssue';
import { BookReturn } from '../pages/return/BookReturn';
import { IssuedBooks } from '../pages/issue/IssuedBooks';
import { OverdueBooks } from '../pages/issue/OverdueBooks';
import { MemberManagement } from '../pages/members/MemberManagement';
import { BookReservation } from '../pages/reservation/BookReservation';
import { FineManagement } from '../pages/fines/FineManagement';
import { TransactionHistory } from '../pages/audit/TransactionHistory';
import { Reports } from '../pages/reports/Reports';
import { Notifications } from '../pages/notifications/Notifications';
import { Settings } from '../pages/settings/Settings';

export const LibrarianRoutes = () => {
  return (
    <Routes>
      {/* 1. Dashboard */}
      <Route path="dashboard" element={<Dashboard />} />

      {/* 2. Books */}
      <Route path="books" element={<BookList />} />
      <Route path="books/add" element={<AddBook />} />
      <Route path="books/categories" element={<Categories />} />
      <Route path="books/authors" element={<Authors />} />
      <Route path="books/publishers" element={<Publishers />} />
      <Route path="books/copies" element={<BookCopies />} />
      <Route path="books/:id" element={<BookDetail />} />

      {/* Backward compat aliases */}
      <Route path="categories" element={<Categories />} />
      <Route path="inventory" element={<BookCopies />} />

      {/* 3. Issue & Return */}
      <Route path="issue" element={<BookIssue />} />
      <Route path="return" element={<BookReturn />} />
      <Route path="issued" element={<IssuedBooks />} />
      <Route path="overdue" element={<OverdueBooks />} />

      {/* 4. Library Members */}
      <Route path="members" element={<MemberManagement />} />
      <Route path="members/students" element={<MemberManagement />} />
      <Route path="members/staff" element={<MemberManagement />} />
      <Route path="members/all" element={<MemberManagement />} />

      {/* 5. Reservations */}
      <Route path="reservations" element={<BookReservation />} />
      <Route path="reservations/pending" element={<BookReservation />} />
      <Route path="reservation" element={<BookReservation />} />

      {/* 6. Fines */}
      <Route path="fines" element={<FineManagement />} />
      <Route path="fines/pending" element={<FineManagement />} />
      <Route path="fines/collected" element={<FineManagement />} />

      {/* 7. Transactions */}
      <Route path="transactions" element={<TransactionHistory />} />
      <Route path="transactions/issues" element={<TransactionHistory />} />
      <Route path="transactions/returns" element={<TransactionHistory />} />
      <Route path="audit" element={<TransactionHistory />} />

      {/* 8. Reports */}
      <Route path="reports" element={<Reports />} />

      {/* 9. Notifications */}
      <Route path="notifications" element={<Notifications />} />

      {/* 10. Settings */}
      <Route path="settings" element={<Settings />} />
      <Route path="settings/profile" element={<Settings />} />
      <Route path="settings/rules" element={<Settings />} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="dashboard" replace />} />
    </Routes>
  );
};
