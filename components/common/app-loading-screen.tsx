export function AppLoadingScreen({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center gap-5 overflow-hidden bg-[#05070d]">
      <div className="uiverse-loader" aria-hidden="true" />
      {label ? (
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-white/46">
          {label}
        </div>
      ) : null}
    </div>
  );
}
