import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, ChevronRight } from 'lucide-react';
import { useChatStore } from '../store/chatStore';
import { useAuth } from '../context/AuthContext';

// The assistant as a persistent right-hand COLUMN (not a floating overlay that
// covers the board, which was the old behaviour). It's the third region of the
// AppLayout shell. Collapsible to a slim rail so the middle content can reclaim
// the width when the user doesn't need chat.
export default function ChatDock() {
  const { user } = useAuth();
  const { messages, isSending, error, send } = useChatStore();
  const [input, setInput] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (typeof scrollRef.current?.scrollTo === 'function') {
      scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isSending]);

  // Never renders for a logged-out visitor - there's no data to ask about and
  // the endpoint requires auth anyway.
  if (!user) return null;

  const submit = (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isSending) return;
    setInput('');
    send(text);
  };

  if (collapsed) {
    return (
      <div className="flex h-screen w-12 shrink-0 flex-col items-center border-l border-line bg-surface py-4 dark:border-line-dark dark:bg-surface-dark">
        <button
          onClick={() => setCollapsed(false)}
          aria-label="Open assistant"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-gradient text-white shadow-glow hover:opacity-90"
        >
          <MessageCircle size={18} />
        </button>
      </div>
    );
  }

  return (
    <aside className="flex h-screen w-80 shrink-0 flex-col border-l border-line/80 bg-surface/80 backdrop-blur-xl dark:border-line-dark/80 dark:bg-surface-dark/70">
      <div className="flex items-center justify-between border-b border-line/80 px-4 py-3 dark:border-line-dark/80">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-gradient text-white shadow-glow">
            <MessageCircle size={15} />
          </span>
          <div>
            <h2 className="font-display text-sm font-semibold">Assistant</h2>
            <p className="text-xs text-ink/50 dark:text-ink-dark/50">Tasks, jobs, network &amp; email</p>
          </div>
        </div>
        <button
          onClick={() => setCollapsed(true)}
          aria-label="Collapse assistant"
          className="rounded-md p-1 text-ink/50 hover:bg-canvas hover:text-ink dark:text-ink-dark/50 dark:hover:bg-canvas-dark"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 && (
          <div className="text-xs text-ink/50 dark:text-ink-dark/50">
            <p>Ask about your tasks, applications, network, or email. Try:</p>
            
          </div>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm shadow-sm ${
              m.role === 'user'
                ? 'ml-auto rounded-br-md bg-accent-gradient text-white shadow-glow'
                : 'rounded-bl-md bg-surface2 text-ink dark:bg-surface2-dark dark:text-ink-dark'
            }`}
          >
            {m.content}
          </div>
        ))}
        {isSending && (
          <div className="max-w-[85%] rounded-lg bg-canvas px-3 py-2 text-sm text-ink/50 dark:bg-canvas-dark dark:text-ink-dark/50">
            Thinking…
          </div>
        )}
        {error && <p className="text-xs text-priority-high">{error}</p>}
      </div>

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-line p-3 dark:border-line-dark">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about tasks, jobs, email…"
          type="text"
          name="assistant-message"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          data-lpignore="true"
          data-1p-ignore
          data-form-type="other"
          className="flex-1 rounded-lg border border-line bg-transparent px-3 py-2 text-sm dark:border-line-dark"
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          aria-label="Send"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-gradient text-white shadow-glow transition-opacity hover:opacity-90 disabled:opacity-50 disabled:shadow-none"
        >
          <Send size={15} />
        </button>
      </form>
    </aside>
  );
}
