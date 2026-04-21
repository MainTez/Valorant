export function ConfidenceMeter({ value }: { value: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="mt-2">
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div
          className="h-full bg-[color:var(--accent)] shadow-[0_0_6px_var(--accent-soft)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
