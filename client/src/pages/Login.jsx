import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 dark:bg-canvas-dark">
      <div className="w-full max-w-sm animate-fade-up rounded-2xl border border-line/80 bg-surface/90 p-6 shadow-elevated backdrop-blur-xl dark:border-line-dark/80 dark:bg-surface-dark/80">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-gradient font-display text-sm font-bold text-white shadow-glow">S</span>
          <span className="gradient-text font-display text-lg font-semibold">SystemFlow</span>
        </div>
        <h1 className="font-display text-xl font-semibold">Welcome back</h1>
        <p className="mt-1 text-sm text-ink/60 dark:text-ink-dark/60">Log in to manage your tasks.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Email</label>
            <input type="email" {...register('email', { required: 'Email is required' })} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="you@example.com" />
            {errors.email && <p className="mt-1 text-xs text-priority-high">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Password</label>
            <input type="password" {...register('password', { required: 'Password is required' })} className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark" placeholder="••••••••" />
            {errors.password && <p className="mt-1 text-xs text-priority-high">{errors.password.message}</p>}
          </div>

          {serverError && <p className="text-xs text-priority-high">{serverError}</p>}

          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-accent-gradient py-2.5 text-sm font-medium text-white shadow-glow transition-opacity hover:opacity-90 disabled:opacity-50 disabled:shadow-none">
            {isSubmitting ? 'Logging in…' : 'Log in'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink/60 dark:text-ink-dark/60">
          Don't have an account? <Link to="/register" className="font-medium text-accent">Register</Link>
        </p>

        <p className="mt-4 rounded-lg bg-canvas p-2.5 text-center text-xs text-ink/50 dark:bg-canvas-dark dark:text-ink-dark/50 font-mono">
          Demo: demo@systemflow.dev / Demo1234
        </p>
      </div>
    </div>
  );
}
