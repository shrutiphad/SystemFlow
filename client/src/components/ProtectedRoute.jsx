import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center font-mono text-sm text-ink/50 dark:text-ink-dark/50">
        Checking session…
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  return children;
}
