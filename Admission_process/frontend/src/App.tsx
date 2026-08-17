import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { Toaster as HotToaster } from 'react-hot-toast';
import { store, RootState } from './store';
import API from './services/api';
import { loginSuccess } from './store/authSlice';
import { forceLogout } from './utils/auth.utils';

// ─── Shared Layouts ───────────────────────────────────────────────────────────
import ProtectedLayout from './components/layout/ProtectedLayout';
import AdminLayout from './components/layout/AdminLayout';
import PrincipalLayout from './components/layout/PrincipalLayout';
import TopLoadingBar from './components/common/TopLoadingBar';
import PwaManager from './components/PwaManager';

// ─── Common Pages ─────────────────────────────────────────────────────────────
import LoginPage from './pages/common/LoginPage';
import LandingPage from './pages/common/LandingPage';
import { AdmissionTypeSelection } from './pages/common/AdmissionTypeSelection';
import { ProvisionalAcknowledgement } from './pages/common/ProvisionalAcknowledgement';
import ModuleUnavailablePage from './pages/common/ModuleUnavailablePage';
import PrivacyPolicyPage from './pages/common/PrivacyPolicyPage';
import TermsOfUsePage from './pages/common/TermsOfUsePage';

// ─── Admission Portal ─────────────────────────────────────────────────────────
import { AuthProvider as AdmissionAuthProvider } from './pages/admission/src/context/AuthContext';
import AdmissionLogin from './pages/admission/src/pages/Login';
import AdmissionRegister from './pages/admission/src/pages/Register';
import AdmissionAuthLayout from './pages/admission/src/layouts/AuthLayout';
import AdmissionDashboardLayout from './pages/admission/src/layouts/DashboardLayout';
import AdmissionStudentDashboard from './pages/admission/src/pages/student/StudentDashboard';
import AdmissionForm from './pages/admission/src/pages/student/AdmissionForm';
import { ProvisionalAdmissionForm } from './pages/admission/src/pages/student/ProvisionalAdmissionForm';
import AdmissionSupportPage from './pages/admission/src/pages/student/SupportPage';
import './pages/admission/src/index.css';

// ─── Admin Pages ──────────────────────────────────────────────────────────────
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdmissionQueuePage from './pages/admin/admissions/AdmissionQueuePage';
import AdmissionReviewPage from './pages/admin/admissions/AdmissionReviewPage';
import DocumentVerificationWorkspace from './pages/admin/admissions/DocumentVerificationWorkspace';
import { AdminProvisionalAdmissionsPage } from './pages/admin/admissions/AdminProvisionalAdmissionsPage';
import PrincipalManagementPage from './pages/admin/users/PrincipalManagementPage';
import StudentsDashboardPage from './pages/admin/admissions/StudentsDashboardPage';
import CancellationRequestsPage from './pages/admin/admissions/CancellationRequestsPage';
import { StudentViewPage } from './pages/admin/admissions/StudentViewPage';
import AdminUsnAllocationPage from './pages/admin/admissions/AdminUsnAllocationPage';
import { AdminStudentDocumentsPage } from './pages/admin/admissions/AdminStudentDocumentsPage';
import { BulkDocumentExportPage } from './pages/admin/admissions/BulkDocumentExportPage';
import { AdminPromotionPage } from './pages/admin/admissions/AdminPromotionPage';
import { StudentExportPage } from './pages/admin/admissions/StudentExportPage';

import AdminNotificationsPage from './pages/admin/communications/AdminNotificationsPage';
import AdminAnnouncementsPage from './pages/admin/communications/AdminAnnouncementsPage';
import AdminAnalyticsPage from './pages/admin/analytics/AdminAnalyticsPage';
import AdminProfilePage from './pages/admin/AdminProfilePage';
import CredentialManagementPage from './pages/admin/settings/CredentialManagementPage';
import AdminSystemSettingsPage from './pages/admin/settings/AdminSystemSettingsPage';
import AdminAuditLogsPage from './pages/admin/settings/AdminAuditLogsPage';

// ─── Principal Pages ──────────────────────────────────────────────────────────
import PrincipalDashboardPage from './pages/principal/PrincipalDashboardPage';
import CollegeAnalyticsPage from './pages/principal/CollegeAnalyticsPage';
import ReportGenerationPage from './pages/principal/ReportGenerationPage';
import PrincipalProfilePage from './pages/principal/PrincipalProfilePage';
import { PrincipalAdmissionQueuePage } from './pages/principal/PrincipalAdmissionQueuePage';
import { PrincipalAdmissionReviewPage } from './pages/principal/PrincipalAdmissionReviewPage';
import GlobalFooter from './components/common/GlobalFooter';

// ─── Fallback Pages ───────────────────────────────────────────────────────────
const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center p-6 text-center text-white">
    <div className="my-auto flex flex-col items-center justify-center">
      <h1 className="text-4xl font-extrabold text-rose-500">403 — Access Denied</h1>
      <p className="text-slate-400 mt-2 text-sm">You do not have permission to view this resource.</p>
      <a href="/login" className="mt-6 text-indigo-400 hover:underline text-sm font-semibold">Back to Login</a>
    </div>
    <GlobalFooter isDark className="mt-auto z-10 bg-transparent border-transparent" />
  </div>
);

const NotFoundPage: React.FC = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col justify-between items-center p-6 text-center text-white">
    <div className="my-auto flex flex-col items-center justify-center">
      <h1 className="text-4xl font-extrabold text-indigo-500">404 — Not Found</h1>
      <p className="text-slate-400 mt-2 text-sm">The page you are looking for does not exist.</p>
      <a href="/login" className="mt-6 text-indigo-400 hover:underline text-sm font-semibold">Back to Login</a>
    </div>
    <GlobalFooter isDark className="mt-auto z-10 bg-transparent border-transparent" />
  </div>
);

// ─── Role-based root redirect ─────────────────────────────────────────────────
const RoleBasedRedirect: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const role = user?.role;

  if (role === 'STUDENT') {
    return <Navigate to="/admission/dashboard" replace />;
  }
  if (role === 'ADMIN' || role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;
  if (role === 'PRINCIPAL') return <Navigate to="/principal/dashboard" replace />;

  return <Navigate to="/module-unavailable" replace />;
};

// ─── Session bootstrap ────────────────────────────────────────────────────────
const AuthBootstrap: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const res = await API.get('/auth/status');
          if (res.data.success) {
            dispatch(loginSuccess({ user: res.data.data.user, token }));
          } else {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            const isAdmissionRoute = window.location.pathname.startsWith('/admission');
            const targetLogin = isAdmissionRoute ? '/admission/login' : '/login';
            if (window.location.pathname !== targetLogin) forceLogout(true);
          }
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          const isAdmissionRoute = window.location.pathname.startsWith('/admission');
          const targetLogin = isAdmissionRoute ? '/admission/login' : '/login';
          if (window.location.pathname !== targetLogin) forceLogout(true);
        }
      }
      setBootstrapped(true);
    };
    bootstrap();
  }, [dispatch]);

  if (!bootstrapped) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 dark:bg-neutral-900">
        <div className="size-14 rounded-full border-4 border-indigo-100 border-t-indigo-600 animate-spin" />
        <p className="text-slate-500 dark:text-neutral-400 font-bold tracking-tight text-xs uppercase">Verifying session…</p>
      </div>
    );
  }
  return <>{children}</>;
};

// ─── Root App ─────────────────────────────────────────────────────────────────
export const App: React.FC = () => (
  <Provider store={store}>
    <TopLoadingBar />
    <PwaManager />
    <ToastContainer
      position="top-right"
      autoClose={3000}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="colored"
    />
    <HotToaster position="top-right" />
    <BrowserRouter>
      <AuthBootstrap>
        <Routes>
          {/* ── Public ── */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
          <Route path="/terms-of-use" element={<TermsOfUsePage />} />
          <Route path="/support" element={<AdmissionSupportPage />} />
          <Route path="/admission/type" element={<AdmissionTypeSelection />} />
          <Route path="/admission/acknowledgement/:id" element={<ProvisionalAcknowledgement />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route path="/module-unavailable" element={<ModuleUnavailablePage />} />

          {/* ── Admission Portal — Public auth pages ── */}
          <Route
            element={
              <AdmissionAuthProvider>
                <AdmissionAuthLayout />
              </AdmissionAuthProvider>
            }
          >
            <Route path="/admission/login" element={<AdmissionLogin />} />
            <Route path="/admission/register" element={<AdmissionRegister />} />
          </Route>

          {/* ── Protected (authenticated roles) ── */}
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard-redirect" element={<RoleBasedRedirect />} />

            {/* ── Admission Student Portal ── */}
            <Route
              path="admission"
              element={
                <AdmissionAuthProvider>
                  <AdmissionDashboardLayout />
                </AdmissionAuthProvider>
              }
            >
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdmissionStudentDashboard />} />
              <Route path="application" element={<AdmissionForm />} />
              <Route path="provisional" element={<ProvisionalAdmissionForm />} />
              <Route path="support" element={<AdmissionSupportPage />} />
            </Route>
            <Route path="support" element={<Navigate to="/admission/support" replace />} />

            {/* ── Admin Portal ── */}
            <Route path="admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="profile" element={<AdminProfilePage />} />

              {/* Admission queue & review */}
              <Route path="admissions/queue"       element={<AdmissionQueuePage defaultStatus="QUEUE" />} />
              <Route path="admissions/resubmitted" element={<AdmissionQueuePage defaultStatus="RESUBMITTED" />} />
              <Route path="admissions/rejected"    element={<AdmissionQueuePage defaultStatus="REJECTED" />} />
              <Route path="admissions/verified"    element={<AdmissionQueuePage defaultStatus="APPROVED" />} />
              <Route path="admissions/corrections" element={<AdmissionQueuePage defaultStatus="CORRECTION_REQUIRED" />} />

              <Route path="admissions/enrolled"    element={<AdmissionQueuePage defaultStatus="ENROLLED" />} />
              <Route path="admissions/approved"    element={<AdmissionQueuePage defaultStatus="ENROLLED" />} />
              <Route path="admissions/cancellations" element={<CancellationRequestsPage />} />
              <Route path="admissions/usn"         element={<AdminUsnAllocationPage />} />
              <Route path="admissions/history"     element={<AdmissionQueuePage defaultStatus="ALL" />} />
              <Route path="admissions/review/:id"  element={<AdmissionReviewPage />} />
              <Route path="admissions/workspace/:id" element={<DocumentVerificationWorkspace />} />
              <Route path="admissions/provisional" element={<AdminProvisionalAdmissionsPage />} />
              <Route path="admissions/provisional/:id" element={<AdminProvisionalAdmissionsPage />} />
              <Route path="admissions/promotion" element={<AdminPromotionPage />} />
              <Route path="documents/:applicationId" element={<AdminStudentDocumentsPage />} />
              <Route path="documents/bulk" element={<BulkDocumentExportPage />} />

              <Route path="students"         element={<StudentsDashboardPage />} />
              <Route path="student-export"   element={<StudentExportPage />} />
              <Route path="students/view/:id" element={<StudentViewPage />} />
              <Route path="users/principals" element={<PrincipalManagementPage />} />
              <Route path="credentials"      element={<CredentialManagementPage />} />

              {/* Communications */}
              <Route path="notifications"  element={<AdminNotificationsPage />} />
              <Route path="announcements"  element={<AdminAnnouncementsPage />} />
              <Route path="reports"        element={<ReportGenerationPage />} />

              {/* Settings */}
              <Route path="settings/system" element={<AdminSystemSettingsPage />} />
              <Route path="settings/logs"   element={<AdminAuditLogsPage />} />
            </Route>

            {/* ── Principal Portal ── */}
            <Route path="principal" element={<PrincipalLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard"              element={<PrincipalDashboardPage />} />
              <Route path="admissions"             element={<PrincipalAdmissionQueuePage defaultStatus="APPROVED" />} />
              <Route path="admissions/pending"     element={<PrincipalAdmissionQueuePage defaultStatus="APPROVED" />} />
              <Route path="admissions/approved"    element={<PrincipalAdmissionQueuePage defaultStatus="ENROLLED" />} />
              <Route path="admissions/rejected"    element={<PrincipalAdmissionQueuePage defaultStatus="REJECTED" />} />
              <Route path="admissions/history"     element={<PrincipalAdmissionQueuePage defaultStatus="ALL" />} />
              <Route path="admissions/review/:id"  element={<PrincipalAdmissionReviewPage />} />
              <Route path="students"               element={<StudentsDashboardPage readOnly={true} />} />
              <Route path="student-export"         element={<StudentExportPage readOnly={true} />} />
              <Route path="students/view/:id"      element={<StudentViewPage />} />
              <Route path="analytics"              element={<CollegeAnalyticsPage />} />
              <Route path="reports"                element={<ReportGenerationPage />} />
              <Route path="profile"                element={<PrincipalProfilePage />} />
            </Route>
          </Route>

          {/* ── 404 ── */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </AuthBootstrap>
    </BrowserRouter>
  </Provider>
);

export default App;
