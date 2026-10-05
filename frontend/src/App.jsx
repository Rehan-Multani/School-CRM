import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppStoreProvider } from './shared/store/useAppStore';

import { LandingLayout } from './modules/landing/components/LandingLayout';
import { LandingPage } from './modules/landing/pages/LandingPage';
import { AboutPage } from './modules/landing/pages/AboutPage';
import { ContactPage } from './modules/landing/pages/ContactPage';
import { PrivacyPolicyPage } from './modules/landing/pages/PrivacyPolicyPage';
import { TermsPage } from './modules/landing/pages/TermsPage';
import { NotFoundPage } from './modules/landing/pages/NotFoundPage';
import { PortalPickerPage } from './modules/landing/pages/PortalPickerPage';

import { StudentAuthProvider } from './modules/student/context/StudentAuthContext';
import { ThemeProvider } from './modules/student/context/ThemeContext';
import { NotificationProvider } from './modules/student/context/NotificationContext';
import { StudentLayout } from './modules/student/components/layout/StudentLayout';
import { StudentLogin } from './modules/student/pages/StudentLogin';

import { TeacherAuthProvider } from './modules/teacher/context/TeacherAuthContext';
import { TeacherThemeProvider } from './modules/teacher/context/TeacherThemeContext';
import { TeacherNotificationProvider } from './modules/teacher/context/TeacherNotificationContext';
import { ToastProvider } from './modules/teacher/components/ui/Toast';
import { TeacherLayout } from './modules/teacher/components/layout/TeacherLayout';
import { TeacherLogin } from './modules/teacher/pages/TeacherLogin';

import { ParentAuthProvider } from './modules/parent/context/ParentAuthContext';
import { ParentThemeProvider } from './modules/parent/context/ParentThemeContext';
import { ParentNotificationProvider } from './modules/parent/context/ParentNotificationContext';
import { ToastProvider as ParentToastProvider } from './modules/parent/components/ui/Toast';
import { ParentLayout } from './modules/parent/components/layout/ParentLayout';
import { ParentLogin } from './modules/parent/pages/ParentLogin';

import { SchoolAdminAuthProvider } from './modules/school-admin/context/SchoolAdminAuthContext';
import { SchoolAdminThemeProvider } from './modules/school-admin/context/SchoolAdminThemeContext';
import { SchoolAdminNotificationProvider } from './modules/school-admin/context/SchoolAdminNotificationContext';
import { SchoolAdminLayout } from './modules/school-admin/components/layout/SchoolAdminLayout';
import { SubscriptionBlockedOverlay } from './shared/ui/SubscriptionBlockedOverlay';
import { SchoolAdminLogin } from './modules/school-admin/pages/SchoolAdminLogin';
import { SchoolAdminLoginAs } from './modules/school-admin/pages/SchoolAdminLoginAs';
import SchoolAdminResetPassword from './modules/school-admin/pages/SchoolAdminResetPassword';

import { PrincipalAuthProvider } from './modules/principal/context/PrincipalAuthContext';
import { PrincipalThemeProvider } from './modules/principal/context/PrincipalThemeContext';
import { PrincipalNotificationProvider } from './modules/principal/context/PrincipalNotificationContext';
import { PrincipalLayout } from './modules/principal/components/layout/PrincipalLayout';
import { PrincipalLogin } from './modules/principal/pages/PrincipalLogin';

import { AccountantAuthProvider } from './modules/accountant/context/AccountantAuthContext';
import { AccountantThemeProvider } from './modules/accountant/context/AccountantThemeContext';
import { AccountantNotificationProvider } from './modules/accountant/context/AccountantNotificationContext';
import { AccountantLayout } from './modules/accountant/components/layout/AccountantLayout';
import { AccountantLogin } from './modules/accountant/pages/AccountantLogin';

import { HRAuthProvider } from './modules/HR/context/HRAuthContext';
import { HRThemeProvider } from './modules/HR/context/HRThemeContext';
import { HRNotificationProvider } from './modules/HR/context/HRNotificationContext';
import { HRLayout } from './modules/HR/components/layout/HRLayout';
import { HRLogin } from './modules/HR/pages/HRLogin';

import { LibrarianAuthProvider } from './modules/librarian/context/LibrarianAuthContext';
import { LibrarianThemeProvider } from './modules/librarian/context/LibrarianThemeContext';
import { LibrarianNotificationProvider } from './modules/librarian/context/LibrarianNotificationContext';
import { ToastProvider as LibrarianToastProvider } from './modules/librarian/components/ui/Toast';
import { LibrarianLayout } from './modules/librarian/components/layout/LibrarianLayout';
import { LibrarianLogin } from './modules/librarian/pages/LibrarianLogin';

// Each portal's pages load on demand, so opening one portal does not download the others.
const StudentRoutes = lazy(() => import('./modules/student/routes/StudentRoutes').then((m) => ({ default: m.StudentRoutes })));
const TeacherRoutes = lazy(() => import('./modules/teacher/routes/TeacherRoutes').then((m) => ({ default: m.TeacherRoutes })));
const ParentRoutes = lazy(() => import('./modules/parent/routes/ParentRoutes').then((m) => ({ default: m.ParentRoutes })));
const SchoolAdminRoutes = lazy(() => import('./modules/school-admin/routes/SchoolAdminRoutes').then((m) => ({ default: m.SchoolAdminRoutes })));
const PrincipalRoutes = lazy(() => import('./modules/principal/routes/PrincipalRoutes').then((m) => ({ default: m.PrincipalRoutes })));
const AccountantRoutes = lazy(() => import('./modules/accountant/routes/AccountantRoutes').then((m) => ({ default: m.AccountantRoutes })));
const HRRoutes = lazy(() => import('./modules/HR/routes/HRRoutes').then((m) => ({ default: m.HRRoutes })));
const LibrarianRoutes = lazy(() => import('./modules/librarian/routes/LibrarianRoutes').then((m) => ({ default: m.LibrarianRoutes })));

// Shown in the content area while a page's code is being downloaded.
const PageLoader = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-indigo-500" />
  </div>
);


function App() {
  return (
    <AppStoreProvider>
      <BrowserRouter>
        <SubscriptionBlockedOverlay />
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
                                                                       <Routes>
                                                                         {/* Public marketing site */}
                                                                         <Route element={<LandingLayout />}>
                                                                           <Route path="/" element={<LandingPage />} />
                                                                           <Route path="/about" element={<AboutPage />} />
                                                                           <Route path="/contact" element={<ContactPage />} />
                                                                           <Route path="/privacy" element={<PrivacyPolicyPage />} />
                                                                           <Route path="/terms" element={<TermsPage />} />
                                                                           <Route path="*" element={<NotFoundPage />} />
                                                                         </Route>

                                                                         {/* Portal picker (staff sign in) */}
                                                                         <Route path="/login" element={<PortalPickerPage />} />

                                                                         {/* Student Routes */}
                                                                         <Route path="/student/login" element={<StudentLogin />} />
                                                                         <Route path="/student/*" element={<StudentLayout />}>
                                                                           <Route path="*" element={<Suspense fallback={<PageLoader />}><StudentRoutes /></Suspense>} />
                                                                         </Route>

                                                                         {/* Teacher Routes */}
                                                                         <Route path="/teacher/login" element={<TeacherLogin />} />
                                                                         <Route path="/teacher/*" element={<TeacherLayout />}>
                                                                           <Route path="*" element={<Suspense fallback={<PageLoader />}><TeacherRoutes /></Suspense>} />
                                                                         </Route>

                                                                         {/* Parent Routes */}
                                                                         <Route path="/parent/login" element={<ParentLogin />} />
                                                                         <Route path="/parent/*" element={<ParentLayout />}>
                                                                           <Route path="*" element={<Suspense fallback={<PageLoader />}><ParentRoutes /></Suspense>} />
                                                                         </Route>

                                                                         {/* School Admin Routes */}
                                                                         <Route path="/school-admin/login" element={<SchoolAdminLogin />} />
                                                                         <Route path="/school-admin/reset-password" element={<SchoolAdminResetPassword />} />
              <Route path="/school-admin/login-as" element={<SchoolAdminLoginAs />} />
                                                                         <Route path="/school-admin/*" element={<SchoolAdminLayout />}>
                                                                           <Route path="*" element={<Suspense fallback={<PageLoader />}><SchoolAdminRoutes /></Suspense>} />
                                                                         </Route>

                                                                         {/* Principal Routes */}
                                                                         <Route path="/principal/login" element={<PrincipalLogin />} />
                                                                         <Route path="/principal/*" element={<PrincipalLayout />}>
                                                                           <Route path="*" element={<Suspense fallback={<PageLoader />}><PrincipalRoutes /></Suspense>} />
                                                                         </Route>

                                                                         {/* Accountant Routes */}
                                                                         <Route path="/accountant/login" element={<AccountantLogin />} />
                                                                         <Route path="/accountant/*" element={<AccountantLayout />}>
                                                                           <Route path="*" element={<Suspense fallback={<PageLoader />}><AccountantRoutes /></Suspense>} />
                                                                         </Route>

                                                                         {/* HR Routes */}
                                                                         <Route path="/hr/login" element={<HRLogin />} />
                                                                         <Route path="/hr/*" element={<HRLayout />}>
                                                                           <Route path="*" element={<Suspense fallback={<PageLoader />}><HRRoutes /></Suspense>} />
                                                                         </Route>

                                                                         {/* Librarian Routes */}
                                                                         <Route path="/librarian/login" element={<LibrarianLogin />} />
                                                                         <Route path="/librarian/*" element={<LibrarianLayout />}>
                                                                           <Route path="*" element={<Suspense fallback={<PageLoader />}><LibrarianRoutes /></Suspense>} />
                                                                         </Route>

                                                                       </Routes>
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
