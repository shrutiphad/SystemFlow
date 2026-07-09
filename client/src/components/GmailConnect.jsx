import { useEffect } from 'react';
import { Mail, Check } from 'lucide-react';
import { useGmailStore } from '../store/gmailStore';

// Small connection control for the sidebar. Connection state is shown as a
// pill; clicking connects (redirects to Google) or disconnects. The actual
// email querying happens in the chat assistant, not here - this only manages
// the connection itself, which needs a full-page OAuth redirect a chat bubble
// can't cleanly do.
export default function GmailConnect() {
  const { connected, emailAddress, loadStatus, connect, disconnect } = useGmailStore();

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  if (connected) {
    return (
      <div className="rounded-lg border border-line px-3 py-2 dark:border-line-dark">
        <div className="flex items-center gap-1.5 text-xs font-medium text-status-done">
          <Check size={13} /> Gmail connected
        </div>
        {emailAddress && (
          <div className="mt-0.5 truncate font-mono text-[11px] text-ink/50 dark:text-ink-dark/50">
            {emailAddress}
          </div>
        )}
        <button
          onClick={disconnect}
          className="mt-1 text-[11px] text-ink/50 underline hover:text-priority-high dark:text-ink-dark/50"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={connect}
      className="flex w-full items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm font-medium text-ink/70 hover:bg-canvas dark:border-line-dark dark:text-ink-dark/70 dark:hover:bg-canvas-dark"
    >
      <Mail size={15} /> Connect Gmail
    </button>
  );
}
