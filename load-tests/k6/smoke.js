/**
 * Pluma — k6 smoke test
 *
 * Purpose : Verify the system functions correctly under minimal load
 *           (1 virtual user, 60 s).
 *
 * Run:
 *   k6 run load-tests/k6/smoke.js
 *   # or via Docker (no k6 install needed):
 *   docker run --rm -i --network host grafana/k6 run - < load-tests/k6/smoke.js
 *
 * Required env var:
 *   API_URL  — base URL of the Pluma API (default: http://localhost:2137)
 *   SDK_TOKEN — a valid SDK bearer token
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '60s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:2137';
const SDK_TOKEN = __ENV.SDK_TOKEN || '';

export default function () {
  // Health check
  const health = http.get(`${BASE_URL}/health`);
  check(health, {
    'health: status 200': (r) => r.status === 200,
    'health: body ok': (r) => r.json('status') === 'ok',
  });

  // SDK snapshot (the primary hot-path — requires a valid token)
  if (SDK_TOKEN) {
    const snap = http.get(`${BASE_URL}/sdk/v1/snapshot`, {
      headers: { Authorization: `Bearer ${SDK_TOKEN}` },
    });
    check(snap, {
      'snapshot: status 200 or 304': (r) => r.status === 200 || r.status === 304,
    });
  }

  sleep(1);
}
