import type { DashboardData } from '@/lib/api/dashboard';
import type { en } from '@/i18n/en';

export type DashboardLabels = typeof en['dashboard'];

// ── Stat Card ─────────────────────────────────────────────────────────────────

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

// ── Bar Chart (inline SVG) ────────────────────────────────────────────────────

const VIEW_W = 700;
const VIEW_H = 130;
const BAR_SLOT = VIEW_W / 7; // ~100px per bar slot
const BAR_W = 60;
const MAX_BAR_H = 76;
const BASE_Y = 88; // y-coordinate of bar bottom
const LABEL_Y = VIEW_H - 10;
const MIN_BAR_H = 4; // minimum visible height for non-zero bars

interface BarChartProps {
  dailyChanges: Array<{ date: string; count: number }>;
  dayLabel: string;
  countLabel: string;
}

function BarChart({ dailyChanges, dayLabel, countLabel }: BarChartProps) {
  const maxCount = Math.max(...dailyChanges.map((d) => d.count), 1);

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      role="img"
      aria-label={`${countLabel} by ${dayLabel}`}
      className="w-full"
      style={{ maxHeight: '160px' }}
    >
      {dailyChanges.map((day, i) => {
        const barH = Math.max(
          Math.round((day.count / maxCount) * MAX_BAR_H),
          day.count > 0 ? MIN_BAR_H : 0,
        );
        const cx = i * BAR_SLOT + BAR_SLOT / 2;
        const barX = cx - BAR_W / 2;
        const barY = BASE_Y - barH;
        const dateLabel = day.date.length === 10 ? day.date.slice(5) : day.date; // MM-DD from YYYY-MM-DD

        return (
          <g key={day.date}>
            <rect
              x={barX}
              y={barY}
              width={BAR_W}
              height={barH}
              rx={4}
              className="fill-primary"
              opacity={0.7}
            />
            {day.count > 0 && (
              <text
                x={cx}
                y={barY - 5}
                textAnchor="middle"
                className="fill-foreground"
                style={{ fontSize: '10px' }}
              >
                {day.count}
              </text>
            )}
            <text
              x={cx}
              y={LABEL_Y}
              textAnchor="middle"
              className="fill-muted-foreground"
              style={{ fontSize: '10px' }}
            >
              {dateLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Dashboard View ────────────────────────────────────────────────────────────

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
            <BarChart
              dailyChanges={data.dailyChanges}
              dayLabel={labels.chartDayLabel}
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
