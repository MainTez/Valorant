"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { NormalizedMatch } from "@/types/domain";

export function FormChart({ matches }: { matches: NormalizedMatch[] }) {
  const data = [...matches]
    .reverse()
    .map((m, i) => ({
      i: i + 1,
      acs: m.acs,
      kd: m.deaths === 0 ? m.kills : Number((m.kills / Math.max(1, m.deaths)).toFixed(2)),
      date: new Date(m.startedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    }));

  return (
    <div className="surface p-5 h-[320px] flex flex-col">
      <div className="flex items-center justify-between">
        <span className="eyebrow">Form — ACS</span>
        <span className="text-xs text-[color:var(--color-muted)]">Last {data.length} games</span>
      </div>
      <div className="flex-1 mt-3">
        <ResponsiveContainer>
          <AreaChart data={data}>
            <defs>
              <linearGradient id="acs-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.35} />
                <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="date"
              stroke="rgba(255,255,255,0.3)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.3)"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: "#0b1220",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#9ca4b5" }}
            />
            <Area
              type="monotone"
              dataKey="acs"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="url(#acs-grad)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
