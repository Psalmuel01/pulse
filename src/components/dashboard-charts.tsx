"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

type DataPoint = {
  date: string;
  revenue: number;
  subscribers: number;
};

export function DashboardCharts({ data }: { data: DataPoint[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="mb-4 text-lg font-semibold">Revenue & Subscriber Trend</h3>
      <div className="h-72 w-full">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="revenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0f766e" stopOpacity={0.7} />
                <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="subs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0284c7" stopOpacity={0.6} />
                <stop offset="95%" stopColor="#0284c7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.25)" />
            <XAxis dataKey="date" fontSize={12} />
            <YAxis yAxisId="left" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" fontSize={12} />
            <Tooltip />
            <Area
              type="monotone"
              dataKey="revenue"
              yAxisId="left"
              stroke="#0f766e"
              fill="url(#revenue)"
            />
            <Area
              type="monotone"
              dataKey="subscribers"
              yAxisId="right"
              stroke="#0284c7"
              fill="url(#subs)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
