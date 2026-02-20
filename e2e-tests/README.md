# E2E Tests for Docker Compose Setup

This directory contains end-to-end tests for validating the Pluma Docker Compose development and production setup.

## 📋 Available Tests

### 1. Smoke Tests (`docker-smoke-test.sh`)

**Purpose:** Fast static validation of Docker configurations without starting containers.

**What it tests:**
- Docker and Docker Compose installation
- File existence (Dockerfiles, compose files, .env.example)
- Docker Compose syntax validation
- Dockerfile linting with hadolint
- Multi-stage build structure
- Security configurations (non-root users, healthchecks)
- Port configurations
- Hot-reload setup (volume mounts, WATCHPACK_POLLING)
- Workspace package coverage
- pnpm version consistency

**Runtime:** ~30-60 seconds  
**Requirements:** Docker installed

**Usage:**
```bash
./e2e-tests/docker-smoke-test.sh
```

**Expected Output:**
```
🧪 Pluma Docker Compose Smoke Tests
======================================

📋 Pre-flight Checks
--------------------
Testing: Docker installed ... PASS
Testing: Docker Compose installed ... PASS
...

📊 Test Results
===============
✅ Tests Passed: 40
❌ Tests Failed: 0

🎉 All tests passed!
```

---

### 2. Integration Tests (`docker-integration-test.sh`)

**Purpose:** Validate actual container startup and service health.

**What it tests:**
- Service startup (postgres, api, app)
- Service health (PostgreSQL connection, API health endpoint, Next.js response)
- Port connectivity
- Container status
- Database initialization
- Inter-service communication

**Runtime:** ~3-5 minutes (includes Docker build)  
**Requirements:** Docker installed, ports 3000/4000/5432 available

**Usage:**
```bash
./e2e-tests/docker-integration-test.sh
```

**Expected Output:**
```
🐳 Pluma Docker Compose Integration Test
==========================================

📦 Step 1: Environment Setup
-----------------------------
✓ .env created

🚀 Step 2: Starting Services
-----------------------------
✓ Services started

⏳ Step 3: Waiting for Services to be Healthy
----------------------------------------------
Waiting for PostgreSQL to be ready .. ✓
Waiting for API to be ready .......... ✓
Waiting for Next.js to be ready ...... ✓

🧪 Step 4: Service Health Tests
--------------------------------
Testing: PostgreSQL is accepting connections ... PASS
Testing: API health endpoint responds ... PASS
Testing: Next.js app responds ... PASS

📊 Integration Test Results
============================
✅ Tests Passed: 9
❌ Tests Failed: 0

🎉 All integration tests passed!

Services are running and healthy:
  - Next.js UI: http://localhost:3000
  - API:        http://localhost:4000
  - PostgreSQL: localhost:5432
```

**Note:** This test will automatically clean up and stop containers when finished.

---

## 🔧 Test Configuration

### Environment Variables

Tests use the following defaults from `.env.example`:
- `POSTGRES_USER=pluma`
- `POSTGRES_PASSWORD=pluma`
- `POSTGRES_DB=pluma`
- `NEXT_PUBLIC_API_URL=http://localhost:4000`

### Ports Used

- **3000** - Next.js application
- **4000** - Fastify API
- **5432** - PostgreSQL database

Ensure these ports are available before running integration tests.

---

## 🚀 Running Tests in CI/CD

### GitHub Actions Example

```yaml
name: Docker Tests

on: [push, pull_request]

jobs:
  smoke-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run smoke tests
        run: ./e2e-tests/docker-smoke-test.sh

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run integration tests
        run: ./e2e-tests/docker-integration-test.sh
```

### Local Development

```bash
# Run smoke tests before committing
./e2e-tests/docker-smoke-test.sh

# Run integration tests to validate end-to-end
./e2e-tests/docker-integration-test.sh

# Or run both
./e2e-tests/docker-smoke-test.sh && \
./e2e-tests/docker-integration-test.sh
```

---

## 🐛 Troubleshooting

### Smoke Tests Fail

**Issue:** Docker or Docker Compose not found
```bash
Testing: Docker installed ... FAIL
```

**Solution:** Install Docker and Docker Compose
```bash
# macOS
brew install docker docker-compose

# Ubuntu/Debian
sudo apt-get install docker.io docker-compose-v2
```

---

**Issue:** Dockerfile lint fails
```bash
Testing: API Dockerfile lint (hadolint) ... FAIL
```

**Solution:** Check the Dockerfile for syntax errors. Note: DL3025 (CMD JSON notation) is expected and accepted.

---

### Integration Tests Fail

**Issue:** Port already in use
```bash
Error: Cannot start service app: Bind for 0.0.0.0:3000 failed: port is already allocated
```

**Solution:** Stop conflicting services
```bash
# Find process using port
lsof -i :3000
lsof -i :4000
lsof -i :5432

# Kill process or stop existing containers
docker compose down
```

---

**Issue:** Services won't start
```bash
Testing: PostgreSQL is accepting connections ... FAIL
```

**Solution:** Check Docker logs
```bash
docker compose logs postgres
docker compose logs api
docker compose logs app
```

---

**Issue:** API health check fails
```bash
Testing: API health endpoint responds ... FAIL
```

**Solution:** Check if API is running and database is accessible
```bash
# Check API logs
docker compose logs api

# Check if database is ready
docker compose exec postgres pg_isready -U pluma

# Verify DATABASE_URL in .env
cat .env | grep DATABASE_URL
```

---

## 📊 Test Coverage

### Validation Areas

| Area | Smoke Tests | Integration Tests |
|---|---|---|
| File existence | ✅ | - |
| Syntax validation | ✅ | - |
| Configuration parsing | ✅ | - |
| Security settings | ✅ | - |
| Service startup | - | ✅ |
| Health checks | - | ✅ |
| Port connectivity | - | ✅ |
| Database connection | - | ✅ |
| API endpoints | - | ✅ |

### Test Metrics

- **Smoke Tests:** ~40 test cases
- **Integration Tests:** ~10 test cases
- **Total Coverage:** 50+ validations
- **Expected Pass Rate:** 100%

---

## 📚 Related Documentation

- **Test Plan:** `../DOCKER_TEST_PLAN.md` - Comprehensive test strategy
- **Validation Report:** `../DOCKER_VALIDATION_REPORT.md` - Detailed findings
- **Quick Start:** `../DOCKER_QUICK_START.md` - Developer guide
- **Executive Summary:** `../DOCKER_VALIDATION_SUMMARY.md` - Results overview

---

## 🤝 Contributing

When adding new Docker configurations or features:

1. Update the smoke test script with new validation checks
2. Update the integration test if new services are added
3. Document new test cases in `DOCKER_TEST_PLAN.md`
4. Ensure all tests pass before submitting PR

---

## 📝 Notes

- Smoke tests are **fast** and can run anywhere Docker is installed
- Integration tests are **comprehensive** but require clean Docker environment
- Both tests are **idempotent** - safe to run multiple times
- Integration tests **auto-cleanup** - they stop containers when finished
- Tests use **color output** for better readability
- All tests follow **fail-fast** principle - stop on first critical error

---

**Last Updated:** 2024-02-20  
**Maintained by:** QA Engineering Team
