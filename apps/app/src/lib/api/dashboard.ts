export type DailyChange = { date: string; count: number };

export type DashboardData = {
  projects: number;
  environments: number;
  activeFlags: number;
  targetedFlags: number;
  rollingOutFlags: number;
  recentChanges: number;
  dailyChanges: DailyChange[];
};

export const EMPTY_DASHBOARD: DashboardData = {
  projects: 0,
  environments: 0,
  activeFlags: 0,
  targetedFlags: 0,
  rollingOutFlags: 0,
  recentChanges: 0,
  dailyChanges: [],
};

/**
 * Server-side only: fetches the dashboard summary from the API.
 * Requires a forwarded Cookie header (use cookies() from next/headers).
 */
export async function getDashboard(
  cookieHeader: string,
): Promise<{ ok: true; data: DashboardData } | { ok: false; message: string }> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return { ok: false, message: 'API URL not configured' };

  try {
    const response = await fetch(`${apiUrl}/api/v1/dashboard`, {
      method: 'GET',
      headers: { Cookie: cookieHeader },
      cache: 'no-store',
    });

    if (!response.ok) return { ok: false, message: 'Failed to load dashboard data' };

    const data = (await response.json()) as DashboardData;
    return { ok: true, data };
  } catch {
    return { ok: false, message: 'Unable to reach the server' };
  }
}
