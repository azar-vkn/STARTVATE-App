import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/store/appStore';
import { askAI, ASK_AI_SUGGESTIONS } from '@/services/aiService';
import { SparkMark } from '@/components/Brand';
import type { ChatMessage } from '@/types';

export function AskAIScreen() {
  const chat = useApp((s) => s.chat);
  const pushChat = useApp((s) => s.pushChat);
  const resetChat = useApp((s) => s.resetChat);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [chat, thinking]);

  const send = async (text: string) => {
    const content = text.trim();
    if (!content || thinking) return;
    setInput('');
    await pushChat({
      id: `u-${Date.now()}`,
      role: 'user',
      content,
      createdAt: Date.now(),
    });
    setThinking(true);
    const reply = await askAI(content, chat);
    await pushChat({
      id: `a-${Date.now()}`,
      role: 'assistant',
      content: reply,
      createdAt: Date.now(),
    });
    setThinking(false);
  };

  return (
    <div className="mx-auto flex h-[100dvh] max-w-lg flex-col">
      <header className="safe-top flex items-center justify-between border-b border-hair/[0.05] px-4 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/12">
            <SparkMark size={21} />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">Ask AI</p>
            <p className="text-[11px] text-ink-faint">Deeper guidance for your journey</p>
          </div>
        </div>
        {chat.length > 0 && (
          <button
            onClick={resetChat}
            className="icon-btn"
            aria-label="Clear conversation"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="m9 9 6 6M15 9l-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </header>

      <div className="no-scrollbar flex-1 space-y-3.5 overflow-y-auto px-4 py-5">
        {chat.length === 0 && (
          <div className="pt-6 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/12">
              <SparkMark size={32} />
            </div>
            <h2 className="text-lg font-extrabold text-ink">How can I help you build?</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-ink-muted">
              Ask about co-founders, validating your idea, funding, or your next steps.
            </p>
            <div className="mt-6 space-y-2.5">
              {ASK_AI_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="card w-full px-4 py-3.5 text-left text-[13px] font-medium text-ink active:scale-[0.99]"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {chat.map((m) => (
          <Bubble key={m.id} message={m} />
        ))}

        {thinking && (
          <div className="flex items-center gap-2">
            <SparkMark size={18} />
            <span className="flex gap-1">
              <Dot /> <Dot delay={0.15} /> <Dot delay={0.3} />
            </span>
          </div>
        )}
      </div>

      <div className="safe-bottom border-t border-hair/[0.05] px-3 pt-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-end gap-2"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            rows={1}
            placeholder="Ask anything about building…"
            className="input max-h-32 flex-1 resize-none rounded-full py-3"
          />
          <button
            type="submit"
            disabled={!input.trim() || thinking}
            className="grad-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white disabled:opacity-30 active:scale-95"
            aria-label="Send"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 12l16-8-6 16-3-6-7-2z" fill="white" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] whitespace-pre-wrap px-4 py-3 text-[14px] leading-relaxed ${
          isUser
            ? 'grad-primary rounded-3xl rounded-br-lg text-white'
            : 'rounded-3xl rounded-bl-lg border border-hair/[0.06] bg-surface text-ink dark:bg-elevated'
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="inline-block h-2 w-2 animate-pulse-soft rounded-full bg-primary"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}
