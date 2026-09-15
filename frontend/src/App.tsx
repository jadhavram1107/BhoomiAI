import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { GISMapPage } from './pages/GISMapPage';
import { UploadPage } from './pages/UploadPage';
import { ProcessingPage } from './pages/ProcessingPage';
import { RecordDetailView } from './pages/RecordDetailView';
import { DocumentsPage } from './pages/DocumentsPage';
import { LandRecordsPage } from './pages/LandRecordsPage';
import { VerificationQueuePage } from './pages/VerificationQueuePage';
import { ValidationIssuesPage } from './pages/ValidationIssuesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { AuditTrailPage } from './pages/AuditTrailPage';
import { SettingsPage } from './pages/SettingsPage';

const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => <>{children}</>;

const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user && location.pathname !== '/login') {
    return <Navigate to="/login" replace />;
  }

  if (location.pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', system-ui, sans-serif", color: '#0f172a' }}>
      <Header />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main style={{ flex: 1, overflowY: 'auto', backgroundColor: 'rgba(248, 250, 252, 0.6)' }}>
          <ErrorBoundary>
            {children}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppLayout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/map" element={<GISMapPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/processing/:id" element={<ProcessingPage />} />
          <Route path="/documents/:id" element={<RecordDetailView />} />
          <Route path="/land-records" element={<LandRecordsPage />} />
          <Route path="/verification" element={<VerificationQueuePage />} />
          <Route path="/validation" element={<ValidationIssuesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/audit-trail" element={<AuditTrailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </AuthProvider>
  );
};

export default App;
