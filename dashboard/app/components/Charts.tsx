"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtTokens } from "@/lib/format";

const AXIS = "#6b6b73";
const GRID = "rgba(255,255,255,0.06)";

const tooltipStyle = {
  background: "#17171b",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 10,
  fontSize: 12,
  color: "#e8e8ea",
};

export function TrendChart({
  data,
}: {
  data: { day: string; tokens: number }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="tok" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3ecf8e" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#3ecf8e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="day"
          stroke={AXIS}
          fontSize={11}
          tickFormatter={(d: string) => d.slice(5)}
          tickLine={false}
          axisLine={{ stroke: GRID }}
        />
        <YAxis
          stroke={AXIS}
          fontSize={11}
          tickFormatter={(v: number) => fmtTokens(v)}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => [fmtTokens(Number(v)), "tokens"] as [string, string]}
        />
        <Area
          type="monotone"
          dataKey="tokens"
          stroke="#3ecf8e"
          strokeWidth={2}
          fill="url(#tok)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ProjectBars({
  data,
}: {
  data: { project: string; tokens: number }[];
}) {
  const palette = [
    "#3ecf8e",
    "#5aa9e8",
    "#e8c15a",
    "#c77dff",
    "#f4ab34",
    "#7dd3c0",
    "#f2555a",
    "#9aa0aa",
  ];
  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 34)}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 0, right: 12, left: 0, bottom: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="project"
          stroke={AXIS}
          fontSize={11}
          width={110}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
          contentStyle={tooltipStyle}
          formatter={(v) => [fmtTokens(Number(v)), "tokens"] as [string, string]}
        />
        <Bar dataKey="tokens" radius={[0, 6, 6, 0]} barSize={18}>
          {data.map((_, i) => (
            <Cell key={i} fill={palette[i % palette.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
