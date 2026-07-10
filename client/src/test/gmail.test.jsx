import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { chatEnabled } from './chatEnabled';

// Renders the real App against the real backend. The live Google OAuth
// handshake and real inbox fetch CANNOT run here (no egress to Google, and no
// real OAuth app), so what's verified end-to-end is: the Connect Gmail control
// renders in its disconnected state for a fresh user, the backend reports
// connected:false, and the chat assistant gracefully handles an email question
// when Gmail isn't connected (the not-connected tool path). The actual consent
// redirect + token exchange is verified separately server-side and must be
// smoke-tested by hand once the Google Cloud app exists.

const uniqueEmail = () => `gmailui.${Date.now()}.${Math.random().toString(36).slice(2)}@example.com`;

beforeEach(() => {
  localStorage.clear();
});

async function registerAndLand(user) {
  window.history.pushState({}, '', '/register');
  render(<App />);
  await screen.findByText('Create your account');
  await user.type(screen.getByPlaceholderText('Jane Doe'), 'Gmail UI User');
  await user.type(screen.getByPlaceholderText('you@example.com'), uniqueEmail());
  await user.type(screen.getByPlaceholderText('At least 8 characters, 1 number'), 'Password1');
  await user.type(screen.getByPlaceholderText('Re-enter password'), 'Password1');
  await user.click(screen.getByRole('button', { name: /create account/i }));
  await screen.findByText(/welcome back/i);
}

describe('Gmail connector UI + not-connected chat path', () => {
  it('shows the Connect Gmail control in disconnected state for a fresh user', async () => {
    const user = userEvent.setup();
    await registerAndLand(user);

    // The sidebar control reflects the real backend status (connected:false)
    expect(await screen.findByRole('button', { name: /connect gmail/i })).toBeInTheDocument();
  }, 15000);

  it.skipIf(!chatEnabled)('the chat assistant reports Gmail is not connected when asked about email', async () => {
    const user = userEvent.setup();
    await registerAndLand(user);

    await screen.findByRole('heading', { name: 'Assistant' });
    await user.type(screen.getByPlaceholderText('Ask about tasks, jobs, email…'), 'Which companies did I email yesterday?');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    await waitFor(
      () => {
        expect(
          screen.getByText(
            /gmail (is )?(not|isn'?t) connected|not connected to gmail|connect (your )?gmail|haven'?t connected/i
          )
        ).toBeInTheDocument();
      },
      { timeout: 8000 }
    );
  }, 15000);
});
