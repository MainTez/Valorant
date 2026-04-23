const SPLINE_COMMUNITY_FILE =
  "https://community.spline.design/file/09a1967a-051f-4493-b214-9a87e7e53aec";

export function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[999] isolate overflow-hidden bg-[#05070d]">
      <iframe
        src={SPLINE_COMMUNITY_FILE}
        title="Loading scene"
        className="absolute inset-0 h-full w-full border-0"
        loading="eager"
        allow="autoplay; fullscreen"
      />
      <div className="absolute inset-0 bg-[rgba(5,7,13,0.06)]" />
    </div>
  );
}
