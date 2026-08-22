import { useState } from 'react';
import { Brand, SparkMark } from '@/components/Brand';
import { useApp } from '@/store/appStore';

const SLIDES = [
  {
    icon: '🔍',
    title: 'One search. The whole ecosystem.',
    body: 'Founders, competitors, mentors, investors, hackathons, grants and communities — organized around your idea instead of scattered across the internet.',
  },
  {
    icon: '✨',
    title: 'AI that works behind the scenes',
    body: 'Not another chatbot. STARTVATE reads your context and tells you who to talk to, what opportunities fit, and what to do next.',
  },
  {
    icon: '🤝',
    title: 'Built for builders',
    body: 'Create a Builder Profile, share progress on the Feed, and find the co-founder, mentor or team that turns your idea into a company.',
  },
];

export function OnboardingScreen() {
  const complete = useApp((s) => s.completeOnboarding);
  const [i, setI] = useState(0);
  const last = i === SLIDES.length - 1;
  const slide = SLIDES[i];

  return (
    <div className="mx-auto flex h-[100dvh] max-w-lg flex-col px-6">
      <div className="safe-top flex items-center justify-between pb-2">
        <Brand size="sm" />
        <button onClick={complete} className="text-sm font-semibold text-ink-faint">
          Skip
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <div
          key={i}
          className="animate-fade-up flex h-24 w-24 items-center justify-center rounded-3xl bg-primary/12 text-5xl"
        >
          {slide.icon}
        </div>
        <h1 key={`t${i}`} className="animate-fade-up mt-8 text-2xl font-extrabold leading-tight text-ink">
          {slide.title}
        </h1>
        <p key={`b${i}`} className="animate-fade-up mt-3 max-w-sm text-[15px] leading-relaxed text-ink-muted">
          {slide.body}
        </p>
      </div>

      <div className="safe-bottom pb-4">
        <div className="mb-6 flex justify-center gap-2">
          {SLIDES.map((_, idx) => (
            <span
              key={idx}
              className={`h-2 rounded-full transition-all ${
                idx === i ? 'w-7 bg-primary' : 'w-2 bg-hair/[0.15]'
              }`}
            />
          ))}
        </div>
        <button
          className="btn-primary w-full"
          onClick={() => (last ? complete() : setI((v) => v + 1))}
        >
          {last ? (
            <>
              <SparkMark size={18} /> Start discovering
            </>
          ) : (
            'Continue'
          )}
        </button>
      </div>
    </div>
  );
}
