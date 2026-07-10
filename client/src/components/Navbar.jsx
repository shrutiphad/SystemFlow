import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutGrid, ListChecks, Briefcase, Moon, Sun, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import GmailConnect from './GmailConnect';

const linkClass = ({ isActive }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all ${
    isActive
      ? 'bg-accent-soft text-accent shadow-sm ring-1 ring-accent/15 dark:bg-accent/15 dark:text-accent-dark dark:ring-accent/25'
      : 'text-ink/70 hover:bg-surface2 hover:text-ink dark:text-ink-dark/70 dark:hover:bg-surface2-dark dark:hover:text-ink-dark'
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="flex h-screen w-56 flex-col justify-between border-r border-line/80 bg-surface/80 px-3 py-5 backdrop-blur-xl dark:border-line-dark/80 dark:bg-surface-dark/70">
      <div>
        <div className="mb-8 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-gradient font-display text-sm font-bold text-white shadow-glow">S</span>
          <span className="gradient-text font-display text-base font-semibold">SystemFlow</span>
        </div>
        <nav className="flex flex-col gap-1">
          <NavLink to="/dashboard" className={linkClass}>
            <LayoutGrid size={16} /> Dashboard
          </NavLink>
          <NavLink to="/tasks" className={linkClass}>
            <ListChecks size={16} /> Tasks
          </NavLink>
          <NavLink to="/jobs" className={linkClass}>
            <Briefcase size={16} /> Job hunt
          </NavLink>
        </nav>
      </div>

      <div className="flex flex-col gap-1 border-t border-line dark:border-line-dark pt-3">
        <div className="px-2 pb-2 text-xs text-ink/50 dark:text-ink-dark/50 font-mono truncate">{user?.email}</div>
        <div className="mb-1 px-1">
          <GmailConnect />
        </div>
        <button onClick={toggleTheme} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink/70 hover:bg-canvas dark:text-ink-dark/70 dark:hover:bg-canvas-dark">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          {theme === 'dark' ? 'Light mode' : 'Dark mode'}
        </button>
        <button onClick={handleLogout} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-ink/70 hover:bg-canvas dark:text-ink-dark/70 dark:hover:bg-canvas-dark">
          <LogOut size={16} /> Log out
        </button>
      </div>
    </aside>
  );
}
