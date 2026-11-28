import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import RouteAccessGuard from './components/RouteAccessGuard.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import ReportDetailPage from './pages/ReportDetailPage.jsx';
import PublicLookupPage from './pages/PublicLookupPage.jsx';
import AccessPortalPage from './pages/AccessPortalPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import './App.css';

export default function App() {
  return <ErrorBoundary><BrowserRouter><Routes>
    <Route element={<MainLayout />}>
      <Route index element={<HomePage />} />
      <Route path="consulta" element={<PublicLookupPage />} />
      <Route path="consulta/:ticket" element={<PublicLookupPage />} />
      <Route path="reportes" element={<ReportsPage />} />
      <Route path="reportes/:ticket" element={<ReportDetailPage />} />
      <Route path="acceso" element={<AccessPortalPage />} />
      <Route path="recepcion" element={<RouteAccessGuard><ReportsPage reception /></RouteAccessGuard>} />
      <Route path="recepcion/:ticket" element={<RouteAccessGuard><ReportDetailPage /></RouteAccessGuard>} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes></BrowserRouter></ErrorBoundary>;
}
