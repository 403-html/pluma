'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { DashboardData } from '@/lib/api/dashboard';
import type { en } from '@/i18n/en';

export type DashboardLabels = typeof en['dashboard'];

/** Character length of an ISO UTC date string (YYYY-MM-DD). */
const ISO_DATE_LENGTH = 10;

/** Offset into an ISO date string (YYYY-MM-DD) past the "YYYY-" prefix (5 chars), leaving MM-DD for axis labels. */
const ISO_DATE_LABEL_OFFSET = 5;

/** Pixel height of the chart container. */
const CHART_HEIGHT = 200;

/** Font size (px) for axis tick labels. */
const CHART_FONT_SIZE = 12;

/** Top-corner border radius of each bar (bottom stays square). */
const BAR_CORNER_RADIUS = 4;

interface StatCardProps {
  label: string;
  value: number;
}

function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <p className="text-sm text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-bold text-foreground tabular-nums">
        {value.toLocaleString()}
      </p>
    </div>
  );
}

interface DailyChangesChartProps {
  dailyChanges: Array<{ date: string; count: number }>;
  countLabel: string;
}

function DailyChangesChart({ dailyChanges, countLabel }: DailyChangesChartProps) {
  const data = dailyChanges.map((d) => ({
    date: d.date.length === ISO_DATE_LENGTH ? d.date.slice(ISO_DATE_LABEL_OFFSET) : d.date,
    count: d.count,
  }));

  return (
    <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="date" tick={{ fontSize: CHART_FONT_SIZE }} />
        <YAxis allowDecimals={false} tick={{ fontSize: CHART_FONT_SIZE }} />
        <Tooltip
          formatter={(value) => [value, countLabel]}
          contentStyle={{ fontSize: `${CHART_FONT_SIZE}px` }}
        />
        <Bar dataKey="count" name={countLabel} radius={[BAR_CORNER_RADIUS, BAR_CORNER_RADIUS, 0, 0]} fill="hsl(var(--primary))" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export interface DashboardViewProps {
  data: DashboardData;
  labels: DashboardLabels;
}

export default function DashboardView({ data, labels }: DashboardViewProps) {
  const stats: Array<{ label: string; value: number }> = [
    { label: labels.projects, value: data.projects },
    { label: labels.environments, value: data.environments },
    { label: labels.activeFlags, value: data.activeFlags },
    { label: labels.targetedFlags, value: data.targetedFlags },
    { label: labels.rollingOutFlags, value: data.rollingOutFlags },
    { label: labels.recentChanges, value: data.recentChanges },
  ];

  return (
    <div className="space-y-8">
      <section aria-label="Summary statistics">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {stats.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>
      </section>

      <section aria-labelledby="chart-heading">
        <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
          <h2
            id="chart-heading"
            className="text-sm font-semibold text-muted-foreground mb-4"
          >
            {labels.chartTitle}
          </h2>
          {data.dailyChanges.length > 0 ? (
            <DailyChangesChart
              dailyChanges={data.dailyChanges}
              countLabel={labels.chartCountLabel}
            />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">—</p>
          )}
        </div>
      </section>
    </div>
  );
}
