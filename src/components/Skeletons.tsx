/** Skeleton placeholders shown while discovery results load. */
export function ResultsSkeleton() {
  return (
    <div className="space-y-8 px-4 pt-4">
      <div className="card p-5">
        <div className="skeleton mb-3 h-4 w-32" />
        <div className="skeleton mb-2 h-3 w-full" />
        <div className="skeleton mb-2 h-3 w-11/12" />
        <div className="skeleton h-3 w-4/5" />
      </div>
      {[0, 1].map((s) => (
        <div key={s}>
          <div className="skeleton mb-3 h-4 w-40" />
          <div className="flex gap-3 overflow-hidden">
            {[0, 1].map((c) => (
              <div key={c} className="card w-[268px] shrink-0 p-4">
                <div className="skeleton mb-3 h-11 w-11 rounded-full" />
                <div className="skeleton mb-2 h-3.5 w-28" />
                <div className="skeleton mb-3 h-2.5 w-36" />
                <div className="skeleton h-2.5 w-full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
