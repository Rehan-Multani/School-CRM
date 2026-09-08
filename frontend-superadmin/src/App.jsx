import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { SuperAdminAuthProvider } from './modules/super-admin/context/SuperAdminAuthContext';
import { SuperAdminThemeProvider } from './modules/super-admin/context/SuperAdminThemeContext';
import { SuperAdminNotificationProvider } from './modules/super-admin/context/SuperAdminNotificationContext';
import { SuperAdminLayout } from './modules/super-admin/components/layout/SuperAdminLayout';
import SuperAdminLogin from './modules/super-admin/pages/SuperAdminLogin';
import { SuperAdminRoutes } from './modules/super-admin/routes/SuperAdminRoutes';

function App() {
  return (
    <BrowserRouter>
      <SuperAdminAuthProvider>
        <SuperAdminThemeProvider>
          <SuperAdminNotificationProvider>
            <Routes>
              <Route path="/super-admin/login" element={<SuperAdminLogin />} />
              <Route path="/super-admin/*" element={<SuperAdminLayout />}>
                <Route path="*" element={<SuperAdminRoutes />} />
              </Route>
              <Route path="*" element={<Navigate to="/super-admin/login" replace />} />
            </Routes>
          </SuperAdminNotificationProvider>
        </SuperAdminThemeProvider>
      </SuperAdminAuthProvider>
    </BrowserRouter>
  );
}

export default App;
