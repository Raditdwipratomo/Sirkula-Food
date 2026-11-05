import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { useAuth } from '@/features/auth/AuthContext';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { AdminDashboardPage } from '@/pages/AdminDashboardPage';
import { AdminAuditPage } from '@/pages/AdminAuditPage';
import { AdminUsersPage } from '@/pages/AdminUsersPage';
import { AiInsightsPage } from '@/pages/AiInsightsPage';
import { AnalitikPage } from '@/pages/AnalitikPage';
import { AuthPage } from '@/pages/AuthPage';
import { CatatPage } from '@/pages/CatatPage';
import { DashboardPage } from '@/pages/DashboardPage';
import { LandingPage } from '@/pages/LandingPage';
import { LimbahPage } from '@/pages/LimbahPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { ProfilPage } from '@/pages/ProfilPage';

export function RoleAwareHomePage() {
  const { user } = useAuth();
  if (user?.role === 'admin') {
    return <AdminDashboardPage />;
  }
  return <DashboardPage />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LandingPage />,
  },
  {
    path: '/auth',
    element: <AuthPage />,
  },
  {
    path: '/app',
    element: (
      <ProtectedRoute>
        <AppShell />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <RoleAwareHomePage /> },
      {
        path: 'admin',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'pengguna',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminUsersPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'audit',
        element: (
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminAuditPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'catat',
        element: (
          <ProtectedRoute allowedRoles={['staff']}>
            <CatatPage />
          </ProtectedRoute>
        ),
      },
      { path: 'ai-insights', element: <AiInsightsPage /> },
      {
        path: 'limbah',
        element: (
          <ProtectedRoute allowedRoles={['staff']}>
            <LimbahPage />
          </ProtectedRoute>
        ),
      },
      { path: 'analitik', element: <AnalitikPage /> },
      { path: 'profil', element: <ProfilPage /> },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]);
