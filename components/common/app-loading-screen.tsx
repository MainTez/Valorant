export function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center overflow-hidden bg-[#05070d]">
      <div className="uiverse-loader" aria-hidden="true" />
    </div>
  );
}
