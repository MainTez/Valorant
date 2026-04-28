import Image from "next/image";

export function HeroHeader() {
  return (
    <header data-hero className="mx-auto flex w-full max-w-6xl flex-col items-center text-center">
      <div
        data-hero-item
        className="mb-4 inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-[0.7rem] font-medium uppercase tracking-[0.34em] text-white/56 backdrop-blur-xl"
      >
        <span className="h-2 w-2 rounded-full bg-[#f3bf4c] shadow-[0_0_10px_rgba(243,191,76,0.9)]" />
        Private Team Access
      </div>

      <h1
        data-hero-item
        className="w-full max-w-6xl text-[clamp(3.3rem,9vw,7.75rem)] font-extrabold uppercase leading-[0.86] tracking-[0.08em]"
      >
        <Image
          src="/rankterminal-emblem.png"
          alt="RankTerminal"
          width={720}
          height={720}
          priority
          className="mx-auto mb-4 h-auto w-[min(46vw,22rem)] max-w-[72vw]"
        />
        <span className="text-metal">Rank</span>
        <span className="text-gold-metal">Terminal</span>
      </h1>

      <p
        data-hero-item
        className="mt-5 max-w-3xl text-center text-[1rem] font-medium leading-relaxed text-white/50 sm:text-[1.12rem]"
      >
        <span data-tag-word>&ldquo;Discipline is what remains when the pressure hits.&rdquo;</span>
      </p>

      <div
        data-hero-item
        className="mt-8 flex w-full max-w-4xl items-center justify-center gap-4 text-center"
      >
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#f3bf4c]/70 to-[#f3bf4c]/12" />
        <span className="flex items-center gap-4 text-[0.95rem] font-semibold uppercase tracking-[0.28em] text-[#f3bf4c] sm:text-[1.05rem]">
          <span className="h-3 w-3 rotate-45 border border-[#f3bf4c]/75 bg-[#1d1506] shadow-[0_0_12px_rgba(243,191,76,0.4)]" />
          Choose Your Team
          <span className="h-3 w-3 rotate-45 border border-[#f3bf4c]/75 bg-[#1d1506] shadow-[0_0_12px_rgba(243,191,76,0.4)]" />
        </span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#f3bf4c]/70 to-[#f3bf4c]/12" />
      </div>
    </header>
  );
}
