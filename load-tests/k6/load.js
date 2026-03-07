/**
 * Pluma — k6 average-load test
 *
 * Purpose : Simulate typical production traffic with a gradual ramp-up
 *           to 50 virtual users, sustained for 5 minutes, then ramp-down.
 *
 * Run:
 *   k6 run load-tests/k6/load.js
 *   # or via Docker:
 *   docker run --rm -i --network host grafana/k6 run - < load-tests/k6/load.js
 *
 * Required env var:
 *   API_URL   — base URL of the Pluma API (default: http://localhost:2137)
 *   SDK_TOKEN — a valid SDK bearer token
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },   // ramp up to 50 VUs
    { duration: '5m', target: 50 },   // hold at 50 VUs
    { duration: '1m', target: 0 },    // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],      // <1 % errors
    http_req_duration: ['p(95)<500'],    // 95th percentile < 500 ms
  },
};

const BASE_URL = __ENV.API_URL || 'http://localhost:2137';
const SDK_TOKEN = __ENV.SDK_TOKEN || '';

export default function () {
  const health = http.get(`${BASE_URL}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  if (SDK_TOKEN) {
    const snap = http.get(`${BASE_URL}/sdk/v1/snapshot`, {
      headers: { Authorization: `Bearer ${SDK_TOKEN}` },
    });
    check(snap, {
      'snapshot 200/304': (r) => r.status === 200 || r.status === 304,
    });
  }

  sleep(1);
}
