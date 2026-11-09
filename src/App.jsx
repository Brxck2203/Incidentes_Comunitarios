import { BrowserRouter, Route, Routes } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import MainLayout from './layouts/MainLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import ReportDetailPage from './pages/ReportDetailPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import './App.css';

export default function App() {
  return <ErrorBoundary><BrowserRouter><Routes>
    <Route element={<MainLayout />}>
      <Route index element={<HomePage />} />
      <Route path="reportes" element={<ReportsPage />} />
      <Route path="reportes/:ticket" element={<ReportDetailPage />} />
      <Route path="recepcion" element={<ReportsPage reception />} />
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes></BrowserRouter></ErrorBoundary>;
}
