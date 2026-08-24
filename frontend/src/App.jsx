import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppStoreProvider } from './shared/store/useAppStore';
import { UniversalLogin } from './shared/components/UniversalLogin';

import { StudentAuthProvider } from './modules/student/context/StudentAuthContext';
import { ThemeProvider } from './modules/student/context/ThemeContext';
import { NotificationProvider } from './modules/student/context/NotificationContext';
import { StudentLayout } from './modules/student/components/layout/StudentLayout';
import { StudentLogin } from './modules/student/pages/StudentLogin';
import { StudentRoutes } from './modules/student/routes/StudentRoutes';

import { SuperAdminAuthProvider } from './modules/super-admin/context/SuperAdminAuthContext';
import { SuperAdminThemeProvider } from './modules/super-admin/context/SuperAdminThemeContext';
import { SuperAdminNotificationProvider } from './modules/super-admin/context/SuperAdminNotificationContext';
import { SuperAdminLayout } from './modules/super-admin/components/layout/SuperAdminLayout';
import SuperAdminLogin from './modules/super-admin/pages/SuperAdminLogin';
import { SuperAdminRoutes } from './modules/super-admin/routes/SuperAdminRoutes';

import { TeacherAuthProvider } from './modules/teacher/context/TeacherAuthContext';
import { TeacherThemeProvider } from './modules/teacher/context/TeacherThemeContext';
import { TeacherNotificationProvider } from './modules/teacher/context/TeacherNotificationContext';
import { ToastProvider } from './modules/teacher/components/ui/Toast';
import { TeacherLayout } from './modules/teacher/components/layout/TeacherLayout';
import { TeacherLogin } from './modules/teacher/pages/TeacherLogin';
import { TeacherRoutes } from './modules/teacher/routes/TeacherRoutes';

import { ParentAuthProvider } from './modules/parent/context/ParentAuthContext';
import { ParentThemeProvider } from './modules/parent/context/ParentThemeContext';
import { ParentNotificationProvider } from './modules/parent/context/ParentNotificationContext';
import { ToastProvider as ParentToastProvider } from './modules/parent/components/ui/Toast';
import { ParentLayout } from './modules/parent/components/layout/ParentLayout';
import { ParentLogin } from './modules/parent/pages/ParentLogin';
import { ParentRoutes } from './modules/parent/routes/ParentRoutes';

import { SchoolAdminAuthProvider } from './modules/school-admin/context/SchoolAdminAuthContext';
import { SchoolAdminThemeProvider } from './modules/school-admin/context/SchoolAdminThemeContext';
import { SchoolAdminNotificationProvider } from './modules/school-admin/context/SchoolAdminNotificationContext';
import { SchoolAdminLayout } from './modules/school-admin/components/layout/SchoolAdminLayout';
import { SchoolAdminLogin } from './modules/school-admin/pages/SchoolAdminLogin';
import SchoolAdminResetPassword from './modules/school-admin/pages/SchoolAdminResetPassword';
import { SchoolAdminRoutes } from './modules/school-admin/routes/SchoolAdminRoutes';

import { PrincipalAuthProvider } from './modules/principal/context/PrincipalAuthContext';
import { PrincipalThemeProvider } from './modules/principal/context/PrincipalThemeContext';
import { PrincipalNotificationProvider } from './modules/principal/context/PrincipalNotificationContext';
import { PrincipalLayout } from './modules/principal/components/layout/PrincipalLayout';
import { PrincipalLogin } from './modules/principal/pages/PrincipalLogin';
import { PrincipalRoutes } from './modules/principal/routes/PrincipalRoutes';

import { AccountantAuthProvider } from './modules/accountant/context/AccountantAuthContext';
import { AccountantThemeProvider } from './modules/accountant/context/AccountantThemeContext';
import { AccountantNotificationProvider } from './modules/accountant/context/AccountantNotificationContext';
import { AccountantLayout } from './modules/accountant/components/layout/AccountantLayout';
import { AccountantLogin } from './modules/accountant/pages/AccountantLogin';
import { AccountantRoutes } from './modules/accountant/routes/AccountantRoutes';

import { HRAuthProvider } from './modules/HR/context/HRAuthContext';
import { HRThemeProvider } from './modules/HR/context/HRThemeContext';
import { HRNotificationProvider } from './modules/HR/context/HRNotificationContext';
import { HRLayout } from './modules/HR/components/layout/HRLayout';
import { HRLogin } from './modules/HR/pages/HRLogin';
import { HRRoutes } from './modules/HR/routes/HRRoutes';

import { LibrarianAuthProvider } from './modules/librarian/context/LibrarianAuthContext';
import { LibrarianThemeProvider } from './modules/librarian/context/LibrarianThemeContext';
import { LibrarianNotificationProvider } from './modules/librarian/context/LibrarianNotificationContext';
import { ToastProvider as LibrarianToastProvider } from './modules/librarian/components/ui/Toast';
import { LibrarianLayout } from './modules/librarian/components/layout/LibrarianLayout';
import { LibrarianLogin } from './modules/librarian/pages/LibrarianLogin';
import { LibrarianRoutes } from './modules/librarian/routes/LibrarianRoutes';

import { TransportAuthProvider } from './modules/transport/context/TransportAuthContext';
import { TransportThemeProvider } from './modules/transport/context/TransportThemeContext';
import { TransportNotificationProvider } from './modules/transport/context/TransportNotificationContext';
import { ToastProvider as TransportToastProvider } from './modules/transport/components/ui/Toast';
import { TransportLogin } from './modules/transport/pages/TransportLogin';
import { TransportRoutes } from './modules/transport/routes/TransportRoutes';

function App() {
  return (
    <AppStoreProvider>
      <BrowserRouter>
        <ThemeProvider>
          <StudentAuthProvider>
            <NotificationProvider>
              <TeacherThemeProvider>
                <TeacherAuthProvider>
                  <TeacherNotificationProvider>
                    <ToastProvider>
                      <ParentThemeProvider>
                        <ParentAuthProvider>
                          <ParentNotificationProvider>
                            <ParentToastProvider>
                              <SchoolAdminThemeProvider>
                                <SchoolAdminAuthProvider>
                                  <SchoolAdminNotificationProvider>
                                    <PrincipalThemeProvider>
                                      <PrincipalAuthProvider>
                                        <PrincipalNotificationProvider>
                                          <AccountantThemeProvider>
                                            <AccountantAuthProvider>
                                              <AccountantNotificationProvider>
                                                <HRThemeProvider>
                                                  <HRAuthProvider>
                                                    <HRNotificationProvider>
                                                       <LibrarianThemeProvider>
                                                         <LibrarianAuthProvider>
                                                           <LibrarianNotificationProvider>
                                                             <LibrarianToastProvider>
                                                               <TransportThemeProvider>
                                                                 <TransportAuthProvider>
                                                                   <TransportNotificationProvider>
                                                                     <TransportToastProvider>
                                                                       <Routes>
                                                                         {/* Universal Single Sign-On */}
                                                                         <Route path="/login" element={<UniversalLogin />} />

                                                                         {/* Student Routes */}
                                                                         <Route path="/student/login" element={<StudentLogin />} />
                                                                         <Route path="/student/*" element={<StudentLayout />}>
                                                                           <Route path="*" element={<StudentRoutes />} />
                                                                         </Route>

                                                                         {/* Teacher Routes */}
                                                                         <Route path="/teacher/login" element={<TeacherLogin />} />
                                                                         <Route path="/teacher/*" element={<TeacherLayout />}>
                                                                           <Route path="*" element={<TeacherRoutes />} />
                                                                         </Route>

                                                                         {/* Parent Routes */}
                                                                         <Route path="/parent/login" element={<ParentLogin />} />
                                                                         <Route path="/parent/*" element={<ParentLayout />}>
                                                                           <Route path="*" element={<ParentRoutes />} />
                                                                         </Route>

                                                                         {/* School Admin Routes */}
                                                                         <Route path="/school-admin/login" element={<SchoolAdminLogin />} />
                                                                         <Route path="/school-admin/reset-password" element={<SchoolAdminResetPassword />} />
                                                                         <Route path="/school-admin/*" element={<SchoolAdminLayout />}>
                                                                           <Route path="*" element={<SchoolAdminRoutes />} />
                                                                         </Route>

                                                                         {/* Principal Routes */}
                                                                         <Route path="/principal/login" element={<PrincipalLogin />} />
                                                                         <Route path="/principal/*" element={<PrincipalLayout />}>
                                                                           <Route path="*" element={<PrincipalRoutes />} />
                                                                         </Route>

                                                                         {/* Accountant Routes */}
                                                                         <Route path="/accountant/login" element={<AccountantLogin />} />
                                                                         <Route path="/accountant/*" element={<AccountantLayout />}>
                                                                           <Route path="*" element={<AccountantRoutes />} />
                                                                         </Route>

                                                                         {/* HR Routes */}
                                                                         <Route path="/hr/login" element={<HRLogin />} />
                                                                         <Route path="/hr/*" element={<HRLayout />}>
                                                                           <Route path="*" element={<HRRoutes />} />
                                                                         </Route>

                                                                         {/* Librarian Routes */}
                                                                         <Route path="/librarian/login" element={<LibrarianLogin />} />
                                                                         <Route path="/librarian/*" element={<LibrarianLayout />}>
                                                                           <Route path="*" element={<LibrarianRoutes />} />
                                                                         </Route>

                                                                         {/* Transport Routes */}
                                                                         <Route path="/transport/login" element={<TransportLogin />} />
                                                                         <Route path="/transport/*" element={<TransportRoutes />} />

                                                                         {/* Super Admin Routes */}
                                                                         <Route path="/super-admin/login" element={
                                                                           <SuperAdminAuthProvider>
                                                                             <SuperAdminNotificationProvider>
                                                                               <SuperAdminLogin />
                                                                             </SuperAdminNotificationProvider>
                                                                           </SuperAdminAuthProvider>
                                                                         } />
                                                                         <Route path="/super-admin/*" element={
                                                                           <SuperAdminAuthProvider>
                                                                             <SuperAdminThemeProvider>
                                                                               <SuperAdminNotificationProvider>
                                                                                 <SuperAdminLayout />
                                                                               </SuperAdminNotificationProvider>
                                                                             </SuperAdminThemeProvider>
                                                                           </SuperAdminAuthProvider>
                                                                         }>
                                                                           <Route path="*" element={<SuperAdminRoutes />} />
                                                                         </Route>

                                                                         {/* Default Route -> Universal Login */}
                                                                         <Route path="/" element={<UniversalLogin />} />
                                                                         <Route path="*" element={<Navigate to="/login" replace />} />
                                                                       </Routes>
                                                                     </TransportToastProvider>
                                                                   </TransportNotificationProvider>
                                                                 </TransportAuthProvider>
                                                               </TransportThemeProvider>
                                                             </LibrarianToastProvider>
                                                           </LibrarianNotificationProvider>
                                                         </LibrarianAuthProvider>
                                                       </LibrarianThemeProvider>
                                                     </HRNotificationProvider>
                                                   </HRAuthProvider>
                                                 </HRThemeProvider>
                                               </AccountantNotificationProvider>
                                             </AccountantAuthProvider>
                                           </AccountantThemeProvider>
                                         </PrincipalNotificationProvider>
                                       </PrincipalAuthProvider>
                                     </PrincipalThemeProvider>
                                          </SchoolAdminNotificationProvider>
                                        </SchoolAdminAuthProvider>
                                      </SchoolAdminThemeProvider>
                                    </ParentToastProvider>
                                  </ParentNotificationProvider>
                                </ParentAuthProvider>
                              </ParentThemeProvider>
                            </ToastProvider>
                          </TeacherNotificationProvider>
                        </TeacherAuthProvider>
                      </TeacherThemeProvider>
                    </NotificationProvider>
                  </StudentAuthProvider>
                </ThemeProvider>
      </BrowserRouter>
    </AppStoreProvider>
  );
}

export default App;
