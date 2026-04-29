import type { DesktopMoment } from "@/components/desktop/types";

declare global {
  interface Window {
    nexusDesktop?: {
      isElectron: true;
      showMoment: (moment: DesktopMoment & { sound_enabled?: boolean }) => void;
      onOverlayMoment: (
        callback: (moment: DesktopMoment & { sound_enabled?: boolean }) => void,
      ) => (() => void) | undefined;
    };
    webkitAudioContext?: typeof AudioContext;
  }
}

export {};
