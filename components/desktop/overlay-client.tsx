"use client";

import { useEffect, useRef, useState } from "react";
import { MomentCard } from "@/components/desktop/moment-card";
import type { DesktopMoment } from "@/components/desktop/types";

interface OverlayMoment extends DesktopMoment {
  sound_enabled?: boolean;
}

export function OverlayClient() {
  const [moment, setMoment] = useState<OverlayMoment | null>(null);
  const hideTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.setAttribute("data-desktop-overlay", "true");
    return () => document.body.removeAttribute("data-desktop-overlay");
  }, []);

  useEffect(() => {
    return window.nexusDesktop?.onOverlayMoment((nextMoment) => {
      if (hideTimerRef.current) {
        window.clearTimeout(hideTimerRef.current);
      }

      setMoment(nextMoment as OverlayMoment);
      if ((nextMoment as OverlayMoment).sound_enabled !== false) {
        playMomentSound((nextMoment as OverlayMoment).sound);
      }

      hideTimerRef.current = window.setTimeout(() => setMoment(null), 7_000);
    });
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-transparent p-4">
      {moment ? (
        <MomentCard
          moment={moment}
          compact
          className="w-[440px] animate-[desktop-overlay-in_420ms_cubic-bezier(0.16,1,0.3,1)] border-white/16"
        />
      ) : null}
    </main>
  );
}

function playMomentSound(sound: DesktopMoment["sound"]) {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
  if (!AudioContextClass) return;

  const context = new AudioContextClass();
  const now = context.currentTime;
  const sequence =
    sound === "carry"
      ? [440, 660, 880]
      : sound === "inted"
        ? [190, 150, 110]
        : [320, 420];

  sequence.forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = sound === "inted" ? "sawtooth" : "triangle";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now + index * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.18, now + index * 0.12 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.12 + 0.16);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + index * 0.12);
    oscillator.stop(now + index * 0.12 + 0.18);
  });

  window.setTimeout(() => void context.close(), 800);
}
