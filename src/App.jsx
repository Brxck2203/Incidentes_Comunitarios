import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import ReportDetailPage from './pages/ReportDetailPage.jsx';
import PublicLookupPage from './pages/PublicLookupPage.jsx';
import StatisticsPage from './pages/StatisticsPage.jsx';
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
      {/* TODO: reemplazar por el módulo completo de estadísticas cuando se integre HU-27 */}
      <Route path="estadisticas" element={<StatisticsPage />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes></BrowserRouter></ErrorBoundary>;
}
