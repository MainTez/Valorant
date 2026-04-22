import { cn } from "@/lib/utils";

export function MolgariansCrest({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 360"
      aria-hidden="true"
      className={cn("h-full w-full drop-shadow-[0_0_26px_rgba(243,191,76,0.3)]", className)}
    >
      <defs>
        <linearGradient id="molgariansShield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff6d7" />
          <stop offset="26%" stopColor="#f7ca57" />
          <stop offset="60%" stopColor="#c98b1c" />
          <stop offset="100%" stopColor="#684205" />
        </linearGradient>
        <linearGradient id="molgariansGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fffaf0" />
          <stop offset="28%" stopColor="#ffd968" />
          <stop offset="72%" stopColor="#e4a42b" />
          <stop offset="100%" stopColor="#6e4708" />
        </linearGradient>
        <linearGradient id="molgariansMane" x1="0.15" y1="0.12" x2="0.92" y2="0.82">
          <stop offset="0%" stopColor="#fffef9" />
          <stop offset="36%" stopColor="#fff0b3" />
          <stop offset="100%" stopColor="#d4921d" />
        </linearGradient>
        <filter id="molgariansGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="7" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <path
        d="M160 18 270 58v92c0 83-46 145-110 189C96 295 50 233 50 150V58z"
        fill="none"
        stroke="url(#molgariansShield)"
        strokeWidth="13"
        filter="url(#molgariansGlow)"
      />
      <path
        d="M160 36 254 69v79c0 70-39 122-94 163-55-41-94-93-94-163V69z"
        fill="rgba(6,7,10,0.95)"
        stroke="rgba(255,215,111,0.18)"
        strokeWidth="2"
      />

      <path
        d="m87 151 26-44 14 20 18-60 26 29 15-39 26 24-17 8 33 24-17 3 19 26-22-4 13 20-29-4-3 28-24-16-11 36-31-26-6 32-23-28-24 14 12-35-24 11 18-35-33 7 24-46z"
        fill="url(#molgariansMane)"
        opacity="0.98"
      />

      <path
        d="M119 120c28-31 60-44 96-38 28 9 44 31 44 60 0 54-35 96-109 129-6-16-14-29-27-40-12-11-25-19-39-24 13-25 23-54 35-87z"
        fill="#050608"
        stroke="url(#molgariansGold)"
        strokeWidth="8"
        strokeLinejoin="round"
      />
      <path
        d="m135 137 24-34 1 24 24-25 2 18 28-6-18 17 19 10-28 4-7 22-17-11-5 24-17-19-23 10 12-23-15-8 19-3z"
        fill="url(#molgariansGold)"
      />
      <path
        d="M181 168c18-10 33-14 46-11 9 2 14 8 15 16-12 3-26 12-42 28l-43 44c-4-11-11-22-23-33 12-5 23-12 33-23l14-16z"
        fill="#090b10"
      />
      <path
        d="M202 157c10-8 21-10 32-5-5 12-14 18-27 18l-9-1z"
        fill="#f9c84f"
        filter="url(#molgariansGlow)"
      />
      <path
        d="M115 262c17-5 32-5 47-1l-9 17-24 6z"
        fill="url(#molgariansGold)"
      />
      <path
        d="M86 281c29-5 58-5 88 0"
        fill="none"
        stroke="rgba(255,214,120,0.24)"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function SurfNBullsCrest({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 320"
      aria-hidden="true"
      className={cn("h-full w-full drop-shadow-[0_0_26px_rgba(51,184,255,0.28)]", className)}
    >
      <defs>
        <linearGradient id="surfRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8fe3ff" />
          <stop offset="35%" stopColor="#33b8ff" />
          <stop offset="100%" stopColor="#11457a" />
        </linearGradient>
        <linearGradient id="surfSunset" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffd26b" />
          <stop offset="48%" stopColor="#ff7c66" />
          <stop offset="100%" stopColor="#7b53ff" />
        </linearGradient>
        <linearGradient id="surfBoard" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e8fbff" />
          <stop offset="48%" stopColor="#8adfff" />
          <stop offset="100%" stopColor="#105789" />
        </linearGradient>
      </defs>

      <circle cx="160" cy="160" r="126" fill="#07111b" stroke="url(#surfRing)" strokeWidth="10" />
      <circle cx="160" cy="160" r="112" fill="#050a11" stroke="rgba(111,214,255,0.18)" strokeWidth="2" />

      <g clipPath="url(#surfClip)">
        <circle cx="158" cy="138" r="72" fill="url(#surfSunset)" />
        <path
          d="M80 167c26-18 56-26 90-26 46 0 85 15 120 43v44H72z"
          fill="#07121d"
        />
        <path
          d="M73 207c33 0 62 8 86 22 16 10 31 14 43 14 30 0 54-12 79-37 11 5 20 10 29 16v44H60z"
          fill="#072236"
        />
        <path
          d="M59 222c20-21 38-31 54-31 16 0 35 12 58 37 14 16 29 24 44 24 20 0 48-14 83-44v72H59z"
          fill="#1aa8f5"
        />
        <path
          d="M60 242c22-14 41-21 57-21 18 0 34 10 48 29 11 14 22 21 33 21 16 0 39-13 70-40 12-10 23-17 35-21v35H60z"
          fill="#dcfbff"
          opacity="0.85"
        />
      </g>

      <defs>
        <clipPath id="surfClip">
          <circle cx="160" cy="160" r="112" />
        </clipPath>
      </defs>

      <path
        d="M136 108c13-11 31-15 52-13 34 2 61 19 80 51-6-2-12-3-18-3-4 0-8 0-12 1 8 8 14 18 18 30-9-4-17-6-24-6-7 0-14 1-20 3 8 7 13 18 15 34-6-5-13-8-21-9l-4 27-18-16-13 22-8-23-25 7 10-26c-18-6-30-18-38-38 10-17 19-31 26-41z"
        fill="#0a1523"
        stroke="#dce6ee"
        strokeWidth="7"
        strokeLinejoin="round"
      />
      <path
        d="M138 124c10-7 22-10 36-8 12 2 22 7 31 15l-20 13 20 1c-10 13-24 21-43 24l-18 18-10-20-25-8c7-15 16-27 29-35z"
        fill="#111c2a"
      />
      <path
        d="M128 92c-15 3-28 12-40 27 4-14 12-26 23-35 7-7 14-11 23-13z"
        fill="#0f2439"
      />
      <path
        d="M110 93c-12 0-22 5-31 15 2-11 8-20 19-26 8-5 17-7 27-7z"
        fill="#0f2439"
      />
      <path
        d="M113 209c58-4 105 6 141 31-51-2-95 9-134 31 8-26 6-47-7-62z"
        fill="url(#surfBoard)"
        stroke="#dff7ff"
        strokeWidth="5"
        strokeLinejoin="round"
      />
    </svg>
  );
}
