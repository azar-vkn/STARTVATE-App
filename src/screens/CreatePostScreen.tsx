import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/appStore';
import { POST_TYPE_META, POST_TYPES } from '@/lib/format';
import type { PostType } from '@/types';

const MAX = 500;

export function CreatePostScreen() {
  const navigate = useNavigate();
  const addPost = useApp((s) => s.addPost);
  const [type, setType] = useState<PostType>('idea');
  const [body, setBody] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const tags = tagInput
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#/, '').trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 5);

  const canPost = body.trim().length >= 3 && !submitting;

  const submit = async () => {
    if (!canPost) return;
    setSubmitting(true);
    await addPost({ type, body, tags });
    navigate('/feed');
  };

  return (
    <div className="mx-auto flex min-h-screen max-w-lg flex-col">
      <header className="safe-top flex items-center justify-between border-b border-hair/[0.05] px-4 pb-3">
        <button onClick={() => navigate(-1)} className="text-sm font-semibold text-ink-muted">
          Cancel
        </button>
        <span className="text-sm font-bold text-ink">New post</span>
        <button
          onClick={submit}
          disabled={!canPost}
          className="grad-primary rounded-full px-5 py-2 text-sm font-bold text-white disabled:opacity-30"
        >
          Post
        </button>
      </header>

      <div className="flex-1 space-y-5 px-4 pt-5">
        <div>
          <p className="label">Post type</p>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {POST_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`chip whitespace-nowrap ${type === t ? 'chip-active' : ''}`}
              >
                {POST_TYPE_META[t].icon} {POST_TYPE_META[t].label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="label mb-0">What do you want to share?</p>
            <span className="text-[11px] text-ink-faint">
              {body.length}/{MAX}
            </span>
          </div>
          <textarea
            className="input min-h-[160px] resize-none leading-relaxed"
            value={body}
            maxLength={MAX}
            onChange={(e) => setBody(e.target.value)}
            placeholder={placeholderFor(type)}
            autoFocus
          />
        </div>

        <div>
          <p className="label">Tags (optional)</p>
          <input
            className="input"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="ai, agriculture, co-founder"
          />
          {tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tags.map((t) => (
                <span key={t} className="text-xs font-semibold text-primary">
                  #{t}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function placeholderFor(type: PostType): string {
  const map: Partial<Record<PostType, string>> = {
    idea: 'Describe the idea you keep coming back to…',
    launch: 'What did you just launch? Share the link and what it does.',
    'looking-for-cofounder': 'Who are you looking for, and what are you building?',
    hiring: 'What role are you hiring for? Stack, location, equity…',
    progress: 'Share a milestone or update on your journey.',
    question: 'Ask the ecosystem a question…',
    feedback: 'What would you like feedback on?',
    opportunity: 'Share a hackathon, grant, or opportunity others should know about.',
    showcase: 'Show what you built.',
  };
  return map[type] ?? 'Share something useful with the ecosystem…';
}
