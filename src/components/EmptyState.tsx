import type { ReactNode } from 'react';

interface Props {
  icon: string;
  title: string;
  subtitle: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, subtitle, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center px-8 py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-3xl">
        {icon}
      </div>
      <h3 className="text-base font-bold text-ink">{title}</h3>
      <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-ink-muted">{subtitle}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
