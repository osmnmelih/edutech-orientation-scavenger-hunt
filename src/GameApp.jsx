import { lazy, Suspense, useEffect } from 'react';
import { useLocation, useNavigate } from '@tanstack/react-router';

const Home = lazy(() => import('./pages/Home.jsx'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const SessionMonitor = lazy(() => import('./pages/SessionMonitor.jsx'));
const StudentView = lazy(() => import('./pages/StudentView.jsx'));
const Presentation = lazy(() => import('./pages/Presentation.jsx'));

function LoadingFallback() {
  return (
    <div className="min-h-screen bg-[#06060f] flex flex-col items-center justify-center relative overflow-hidden">
      <div className="scanlines" />
      <div className="text-center relative z-10 space-y-4">
        <div className="relative w-16 h-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-2 border-t-[#00e5ff] border-r-transparent border-b-transparent border-l-transparent animate-spin" style={{ animationDuration: '0.6s', boxShadow: '0 0 15px rgba(0, 229, 255, 0.4)' }} />
          <div className="absolute inset-2 rounded-full border border-t-transparent border-r-transparent border-b-[#ff2d78] border-l-transparent animate-spin" style={{ animationDuration: '1.2s', animationDirection: 'reverse' }} />
        </div>
        <div className="font-orbitron text-xs tracking-[0.2em] text-[#00e5ff] animate-pulse">
          INITIALIZING CONNECTION...
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const pathname = useLocation({ select: (location) => location.pathname });
  const navigate = useNavigate();
  let Page = Home;

  if (pathname === '/admin' || pathname === '/teacher') Page = AdminDashboard;
  else if (pathname.startsWith('/admin/session/') || pathname.startsWith('/teacher/session/')) Page = SessionMonitor;
  else if (pathname === '/student') Page = StudentView;
  else if (pathname === '/presentation') Page = Presentation;

  useEffect(() => {
    if (!['/', '/admin', '/teacher', '/student', '/presentation'].includes(pathname) && !pathname.startsWith('/admin/session/') && !pathname.startsWith('/teacher/session/')) {
      navigate({ to: '/', replace: true });
    }
  }, [navigate, pathname]);

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Page />
    </Suspense>
  );
}
