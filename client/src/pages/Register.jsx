import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm();

  const password = watch('password');

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await registerUser(values.name, values.email, values.password);
      navigate('/dashboard');
    } catch (err) {
      setServerError(err.response?.data?.message || 'Registration failed');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4 dark:bg-canvas-dark">
      <div className="w-full max-w-sm rounded-xl border border-line bg-surface p-6 dark:border-line-dark dark:bg-surface-dark">
        <div className="mb-6 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-accent font-display text-sm font-bold text-white">S</span>
          <span className="font-display text-lg font-semibold">SystemFlow</span>
        </div>
        <h1 className="font-display text-xl font-semibold">Create your account</h1>
        <p className="mt-1 text-sm text-ink/60 dark:text-ink-dark/60">Start managing your tasks in seconds.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Name</label>
            <input
              {...register('name', { required: 'Name is required', minLength: { value: 2, message: 'Name is too short' } })}
              className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark"
              placeholder="Jane Doe"
            />
            {errors.name && <p className="mt-1 text-xs text-priority-high">{errors.name.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Email</label>
            <input
              type="email"
              {...register('email', {
                required: 'Email is required',
                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email' },
              })}
              className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark"
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-xs text-priority-high">{errors.email.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Password</label>
            <input
              type="password"
              {...register('password', {
                required: 'Password is required',
                minLength: { value: 8, message: 'At least 8 characters' },
                pattern: { value: /\d/, message: 'Must include at least one number' },
              })}
              className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark"
              placeholder="At least 8 characters, 1 number"
            />
            {errors.password && <p className="mt-1 text-xs text-priority-high">{errors.password.message}</p>}
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-ink/70 dark:text-ink-dark/70">Confirm password</label>
            <input
              type="password"
              {...register('confirmPassword', {
                required: 'Please confirm your password',
                validate: (value) => value === password || 'Passwords do not match',
              })}
              className="w-full rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark"
              placeholder="Re-enter password"
            />
            {errors.confirmPassword && <p className="mt-1 text-xs text-priority-high">{errors.confirmPassword.message}</p>}
          </div>

          {serverError && <p className="text-xs text-priority-high">{serverError}</p>}

          <button type="submit" disabled={isSubmitting} className="w-full rounded-lg bg-accent py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50">
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink/60 dark:text-ink-dark/60">
          Already have an account? <Link to="/login" className="font-medium text-accent">Log in</Link>
        </p>
      </div>
    </div>
  );
}
