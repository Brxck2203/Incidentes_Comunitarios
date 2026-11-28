import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import ReportDetailPage from './pages/ReportDetailPage.jsx';
import PublicLookupPage from './pages/PublicLookupPage.jsx';
import UserAdminPage from './pages/UserAdminPage.jsx';
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
      <Route path="recepcion" element={<ReportsPage reception />} />
      <Route path="recepcion/:ticket" element={<ReportDetailPage />} />
      {/* TODO: proteger ruta según rol Administrador cuando se integre HU-34 */}
      <Route path="usuarios" element={<UserAdminPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes></BrowserRouter></ErrorBoundary>;
}
