import { createBrowserRouter, Navigate } from 'react-router-dom';

import { useAuthStore } from '@/stores/authStore';
import Dashboard from './routes/Dashboard';
import Login from './routes/Login';
import Projects from './routes/Projects';
import ProjectDetail from './routes/ProjectDetail';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);

  if (!initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-secondary-50">
        <div className="animate-pulse text-secondary-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// Home route - redirects to last active project or projects list
function HomeRedirect() {
  const lastActiveProjectId = useAuthStore((s) => s.lastActiveProjectId);

  // If there's a last active project, go directly to it
  if (lastActiveProjectId) {
    return <Navigate to={`/projects/${lastActiveProjectId}`} replace />;
  }

  // Otherwise show projects list (acts as project picker)
  return <Navigate to="/projects" replace />;
}

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <HomeRedirect />
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <ProtectedRoute>
        <Dashboard />
      </ProtectedRoute>
    ),
  },
  {
    path: '/projects',
    element: (
      <ProtectedRoute>
        <Projects />
      </ProtectedRoute>
    ),
  },
  {
    path: '/projects/:projectId',
    element: (
      <ProtectedRoute>
        <ProjectDetail />
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);
