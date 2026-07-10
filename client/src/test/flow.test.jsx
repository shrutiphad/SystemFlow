import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { chatEnabled } from './chatEnabled';

// These tests render the REAL App component tree (App -> Router -> Auth/Theme
// providers -> real pages -> real components) and hit the REAL backend
// running on localhost:5000 against real Postgres. No mocked axios, no
// mocked components. This is as close to "a user clicking through the app"
// as is possible without an actual browser.

const uniqueEmail = () => `vitest.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;

beforeEach(() => {
  localStorage.clear();
});

describe('Register -> Dashboard -> Tasks full flow', () => {
  it('registers a new user and lands on the dashboard', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/register');
    render(<App />);

    expect(await screen.findByText('Create your account')).toBeInTheDocument();

    const email = uniqueEmail();
    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Vitest User');
    await user.type(screen.getByPlaceholderText('you@example.com'), email);
    await user.type(screen.getByPlaceholderText('At least 8 characters, 1 number'), 'Password1');
    await user.type(screen.getByPlaceholderText('Re-enter password'), 'Password1');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    // Real assertion: did we actually land on the dashboard, with real data
    // fetched from the real /dashboard/summary endpoint?
    expect(await screen.findByText(/welcome back/i)).toBeInTheDocument();
    expect(await screen.findByText('TOTAL TASKS')).toBeInTheDocument();
    expect(localStorage.getItem('token')).toBeTruthy();
  }, 15000);

  it('rejects registration when passwords do not match (client-side validation)', async () => {
    const user = userEvent.setup();
    window.history.pushState({}, '', '/register');
    render(<App />);

    await screen.findByText('Create your account');
    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Mismatch User');
    await user.type(screen.getByPlaceholderText('you@example.com'), uniqueEmail());
    await user.type(screen.getByPlaceholderText('At least 8 characters, 1 number'), 'Password1');
    await user.type(screen.getByPlaceholderText('Re-enter password'), 'Password2');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    // Confirms we did NOT navigate away - still on the register form
    expect(screen.getByText('Create your account')).toBeInTheDocument();
  });

  it('full task lifecycle: create, see it in the list, edit it, filter, delete it', async () => {
    const user = userEvent.setup();

    // Register a fresh user for isolation, then land on dashboard
    window.history.pushState({}, '', '/register');
    render(<App />);
    await screen.findByText('Create your account');
    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Task Flow User');
    await user.type(screen.getByPlaceholderText('you@example.com'), uniqueEmail());
    await user.type(screen.getByPlaceholderText('At least 8 characters, 1 number'), 'Password1');
    await user.type(screen.getByPlaceholderText('Re-enter password'), 'Password1');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await screen.findByText(/welcome back/i);

    // Navigate to Tasks via the real Navbar link
    await user.click(screen.getByRole('link', { name: /tasks/i }));
    expect(await screen.findByText('Create your first task')).toBeInTheDocument();

    // Create a task through the real modal
    await user.click(screen.getByRole('button', { name: /create your first task/i }));
    await screen.findByRole('heading', { name: 'New task' });
    await user.type(screen.getByPlaceholderText('e.g. Ship the onboarding flow'), 'Vitest smoke task');
    await user.click(screen.getByRole('button', { name: /^create task$/i }));

    // Real assertion: the task now appears in the real list, fetched from the real API
    const taskTitle = await screen.findByText('Vitest smoke task');
    const taskCard = taskTitle.closest('div[class*="rounded"]');
    expect(within(taskCard).getByText('To Do')).toBeInTheDocument();

    // Edit it: change status to Done
    await user.click(screen.getByRole('button', { name: /edit vitest smoke task/i }));
    await screen.findByRole('heading', { name: 'Edit task' });
    await user.selectOptions(screen.getByLabelText('Status'), 'done');
    await user.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(within(taskCard).getByText('Done')).toBeInTheDocument();
    });

    // Filter by "To Do" - the just-completed task should disappear from the list
    await user.selectOptions(screen.getByLabelText(/filter by status/i), 'todo');
    await waitFor(() => {
      expect(screen.queryByText('Vitest smoke task')).not.toBeInTheDocument();
    });

    // Reset filter, then delete with the real confirm dialog
    await user.selectOptions(screen.getByLabelText(/filter by status/i), '');
    await screen.findByText('Vitest smoke task');

    await user.click(screen.getByRole('button', { name: /delete vitest smoke task/i }));
    await screen.findByText('Delete this task?');
    await user.click(screen.getByRole('button', { name: /^delete$/i }));

    await waitFor(() => {
      expect(screen.queryByText('Vitest smoke task')).not.toBeInTheDocument();
    });
  }, 20000);
});

// These exercise the real Groq-backed assistant. They only run when the backend
// reports chat is configured (GROQ_API_KEY set); in CI without a key they skip
// rather than fail on a "not configured" response.
describe('Chat sidebar - real tool-calling loop against real task data', () => {
  it.skipIf(!chatEnabled)('answers a question about a real task by calling the real backend tool', async () => {
    const user = userEvent.setup();

    // Register, then create a real task the question will be about
    window.history.pushState({}, '', '/register');
    render(<App />);
    await screen.findByText('Create your account');
    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Chat Flow User');
    await user.type(screen.getByPlaceholderText('you@example.com'), uniqueEmail());
    await user.type(screen.getByPlaceholderText('At least 8 characters, 1 number'), 'Password1');
    await user.type(screen.getByPlaceholderText('Re-enter password'), 'Password1');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await screen.findByText(/welcome back/i);

    await user.click(screen.getByRole('link', { name: /tasks/i }));
    await screen.findByText('Create your first task');
    await user.click(screen.getByRole('button', { name: /create your first task/i }));
    await screen.findByRole('heading', { name: 'New task' });
    await user.type(screen.getByPlaceholderText('e.g. Ship the onboarding flow'), 'GPMorgan QA test');
    await user.click(screen.getByRole('button', { name: /^create task$/i }));
    await screen.findByText('GPMorgan QA test');

    // The assistant is a persistent docked column, open by default once logged in.
    await screen.findByRole('heading', { name: 'Assistant' });

    // Ask about the real task by name
    const input = screen.getByPlaceholderText('Ask about tasks, jobs, email…');
    await user.type(input, 'Is the GPMorgan QA test completed?');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    // Real assertion: the reply came from the real tool result, not a canned string -
    // it names the actual task title that was just created via the real API.
    await waitFor(
      () => {
        expect(screen.getByText(/GPMorgan QA test/i, { selector: 'div' })).toBeInTheDocument();
      },
      { timeout: 8000 }
    );
  }, 15000);

  it.skipIf(!chatEnabled)('does not leak another user\'s task into the chat answer', async () => {
    const user = userEvent.setup();

    // Fresh user, no tasks created - asking about GPMorgan should find nothing,
    // even though a different test/user created a task with that name above.
    window.history.pushState({}, '', '/register');
    render(<App />);
    await screen.findByText('Create your account');
    await user.type(screen.getByPlaceholderText('Jane Doe'), 'Isolation Check User');
    await user.type(screen.getByPlaceholderText('you@example.com'), uniqueEmail());
    await user.type(screen.getByPlaceholderText('At least 8 characters, 1 number'), 'Password1');
    await user.type(screen.getByPlaceholderText('Re-enter password'), 'Password1');
    await user.click(screen.getByRole('button', { name: /create account/i }));
    await screen.findByText(/welcome back/i);

    await screen.findByRole('heading', { name: 'Assistant' });
    await user.type(screen.getByPlaceholderText('Ask about tasks, jobs, email…'), 'Is the GPMorgan QA test completed?');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    // The security property: user B never sees user A's "GPMorgan" task. A pass
    // is any reply that reports nothing found OR the tool-loop fallback - both
    // mean nothing leaked. It must NOT affirm the task exists/completed.
    await waitFor(
      () => {
        expect(
          screen.getByText(
            /no (matching |relevant )?(tasks?|records?|results?)|couldn'?t find|do(?:n'?t| not) have any|nothing (found|matching)|no results|not found|wasn'?t able to work/i
          )
        ).toBeInTheDocument();
      },
      { timeout: 12000 }
    );
  }, 20000);
});
