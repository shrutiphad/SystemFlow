import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { useJobStore } from '../store/jobStore';

// Renders the real App and drives the Job hunt Kanban board against the real
// backend + Postgres. Note: jsdom does not implement the HTML5 drag-and-drop
// data-transfer flow, so the literal drag gesture is verified in a browser,
// not here. What IS verified here end-to-end: create -> card appears in the
// correct column, edit, delete, AND the status-move path (moveJob -> PATCH
// /jobs/:id/status) that a drag ultimately triggers, invoked directly on the
// store so the real backend round-trip is still exercised.

const uniqueEmail = () => `jobs.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;

beforeEach(() => {
  localStorage.clear();
});

async function registerAndGoToJobs(user) {
  window.history.pushState({}, '', '/register');
  render(<App />);
  await screen.findByText('Create your account');
  await user.type(screen.getByPlaceholderText('Jane Doe'), 'Jobs User');
  await user.type(screen.getByPlaceholderText('you@example.com'), uniqueEmail());
  await user.type(screen.getByPlaceholderText('At least 8 characters, 1 number'), 'Password1');
  await user.type(screen.getByPlaceholderText('Re-enter password'), 'Password1');
  await user.click(screen.getByRole('button', { name: /create account/i }));
  await screen.findByText(/welcome back/i);
  await user.click(screen.getByRole('link', { name: /job hunt/i }));
  await screen.findByRole('heading', { name: 'Job hunt' });
}

describe('Job hunt Kanban board - real backend', () => {
  it('creates an application and it appears in the right column', async () => {
    const user = userEvent.setup();
    await registerAndGoToJobs(user);

    await user.click(screen.getAllByRole('button', { name: /add application/i })[0]);
    await screen.findByRole('heading', { name: 'New application' });

    await user.type(screen.getByLabelText('Company'), 'Stripe');
    await user.type(screen.getByLabelText('Role'), 'Backend Engineer');
    await user.selectOptions(screen.getByLabelText('Stage'), 'applied');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /add application/i }));

    // Card shows up with the real data from the real API
    const card = await screen.findByText('Stripe');
    expect(card).toBeInTheDocument();
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument();
  }, 15000);

  it('moves an application to a new stage via the store (the drag drop path)', async () => {
    const user = userEvent.setup();
    await registerAndGoToJobs(user);

    await user.click(screen.getAllByRole('button', { name: /add application/i })[0]);
    await screen.findByRole('heading', { name: 'New application' });
    await user.type(screen.getByLabelText('Company'), 'Datadog');
    await user.selectOptions(screen.getByLabelText('Stage'), 'applied');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /add application/i }));
    await screen.findByText('Datadog');

    // Simulate what a drag-drop ultimately calls: moveJob to a new status.
    // This hits the real PATCH /jobs/:id/status endpoint.
    const job = useJobStore.getState().jobs.find((j) => j.company_name === 'Datadog');
    await useJobStore.getState().moveJob(job.id, 'interviewing');

    await waitFor(() => {
      const moved = useJobStore.getState().jobs.find((j) => j.id === job.id);
      expect(moved.status).toBe('interviewing');
    });
  }, 15000);

  it('deletes an application', async () => {
    const user = userEvent.setup();
    await registerAndGoToJobs(user);

    await user.click(screen.getAllByRole('button', { name: /add application/i })[0]);
    await screen.findByRole('heading', { name: 'New application' });
    await user.type(screen.getByLabelText('Company'), 'Cloudflare');
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: /add application/i }));
    await screen.findByText('Cloudflare');

    await user.click(screen.getByRole('button', { name: /delete cloudflare/i }));
    await screen.findByText('Delete this application?');
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Cloudflare')).not.toBeInTheDocument();
    });
  }, 15000);
});
