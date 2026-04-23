const SPLINE_COMMUNITY_FILE =
  "https://community.spline.design/file/09a1967a-051f-4493-b214-9a87e7e53aec";

export function AppLoadingScreen() {
  return (
    <div className="relative isolate flex min-h-[100dvh] w-full items-center justify-center overflow-hidden bg-[#05070d]">
      <iframe
        src={SPLINE_COMMUNITY_FILE}
        title="Loading scene"
        className="absolute inset-0 h-full w-full scale-[1.08] border-0 opacity-70"
        loading="eager"
        allow="autoplay; fullscreen"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(243,191,76,0.16),transparent_26%),linear-gradient(180deg,rgba(5,7,13,0.2)_0%,rgba(5,7,13,0.84)_72%,rgba(5,7,13,0.98)_100%)]" />
      <div className="relative z-10 flex flex-col items-center gap-5 px-6 text-center">
        <div className="text-[0.8rem] font-semibold uppercase tracking-[0.34em] text-[#f3bf4c]/82">
          Loading Hub
        </div>
        <div className="max-w-[28rem] font-display text-[clamp(2.5rem,5vw,4.5rem)] leading-[0.9] tracking-[0.04em] text-white">
          Preparing the next round.
        </div>
        <div className="h-[3px] w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-[loader-sweep_1.35s_ease-in-out_infinite] rounded-full bg-[linear-gradient(90deg,#8b6418_0%,#f3bf4c_50%,#ffe29d_100%)]" />
        </div>
      </div>
    </div>
  );
}
