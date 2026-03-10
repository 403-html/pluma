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
import type { DashboardData, StaleRollout } from '@/lib/api/dashboard';
import type { en } from '@/i18n/en';
import {
  ISO_DATE_LENGTH,
  ISO_DATE_LABEL_OFFSET,
  CHART_HEIGHT,
  CHART_FONT_SIZE,
  BAR_CORNER_RADIUS,
} from '@/lib/constants';

export type DashboardLabels = typeof en['dashboard'];

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

interface StaleRolloutsWidgetProps {
  staleRollouts: StaleRollout[];
  labels: DashboardLabels;
}

function StaleRolloutsWidget({ staleRollouts, labels }: StaleRolloutsWidgetProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
      <h2
        id="stale-rollouts-heading"
        className="text-sm font-semibold text-muted-foreground mb-1"
      >
        {labels.staleRolloutsTitle}
      </h2>
      <p className="text-xs text-muted-foreground mb-4">{labels.staleRolloutsSubtitle}</p>
      {staleRollouts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          {labels.staleRolloutsEmpty}
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground font-medium uppercase tracking-wide border-b border-border">
              <th scope="col" className="text-left pb-2 pr-4">{labels.staleRolloutsColFlag}</th>
              <th scope="col" className="text-left pb-2 pr-4">{labels.staleRolloutsColEnvironment}</th>
              <th scope="col" className="text-left pb-2 pr-4">{labels.staleRolloutsColProject}</th>
              <th scope="col" className="text-left pb-2">{labels.staleRolloutsColRollout}</th>
            </tr>
          </thead>
          <tbody>
            {staleRollouts.map((item) => (
              <tr
                key={`${item.flagId}-${item.envId}`}
                className="border-b border-border last:border-0 hover:bg-muted/30"
              >
                <td className="py-2 pr-4">
                  <span className="block text-foreground">{item.flagName}</span>
                  <span className="text-xs text-muted-foreground">{item.flagKey}</span>
                </td>
                <td className="py-2 pr-4 text-foreground">{item.envName}</td>
                <td className="py-2 pr-4 text-foreground">{item.projectName}</td>
                <td className="py-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                    {item.rolloutPercentage}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
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

      <section aria-labelledby="stale-rollouts-heading">
        <StaleRolloutsWidget staleRollouts={data.staleRollouts} labels={labels} />
      </section>
    </div>
  );
}
