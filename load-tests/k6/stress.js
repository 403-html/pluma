/**
 * Pluma — k6 stress test
 *
 * Purpose : Discover the system's breaking point by ramping virtual users
 *           well beyond expected peak traffic.
 *
 * Run:
 *   k6 run load-tests/k6/stress.js
 *   # or via Docker:
 *   docker run --rm -i --network host grafana/k6 run - < load-tests/k6/stress.js
 *
 * Required env var:
 *   API_URL   — base URL of the Pluma API (default: http://localhost:2137)
 *   SDK_TOKEN — a valid SDK bearer token
 */

import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m',  target: 100  },   // ramp to 100 VUs
    { duration: '5m',  target: 100  },   // sustain
    { duration: '2m',  target: 300  },   // push to 300 VUs
    { duration: '5m',  target: 300  },   // sustain
    { duration: '2m',  target: 0    },   // ramp down
  ],
  thresholds: {
    http_req_failed: ['rate<0.05'],      // <5 % errors under stress
    http_req_duration: ['p(95)<2000'],   // 95th percentile < 2 s under stress
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

  sleep(0.5);
}
