import React, { Suspense, lazy, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Landing from './pages/Landing';
import Logo from './components/Logo';
import './styles.css';

// Heavy pages (AI model, map library) load only when they are opened, so the landing page stays fast.
const Scanner = lazy(() => import('./pages/Scanner'));
const AdminLogin = lazy(() => import('./pages/AdminLogin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminReports = lazy(() => import('./pages/AdminReports'));
const AdminMap = lazy(() => import('./pages/AdminMap'));

function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => { if (!hash) window.scrollTo(0, 0); }, [pathname, hash]);
  return null;
}

const Loading = () => <div className="boot"><Logo size={56} /></div>;

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ScrollToTop />
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/scan" element={<Scanner />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/reports" element={<AdminReports />} />
        <Route path="/admin/map" element={<AdminMap />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);
