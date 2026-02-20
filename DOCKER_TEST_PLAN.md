# Docker Compose Test Plan

**Project:** Pluma Monorepo  
**Component:** Docker Development & Production Setup  
**Created:** 2024-02-20  
**Owner:** QA Engineering

---

## 1. Test Objectives

Validate that the new Docker Compose setup for Pluma provides:
1. ✅ Working development environment with hot-reload
2. ✅ Production-ready containerized deployment
3. ✅ Proper security configurations
4. ✅ Correct port assignments
5. ✅ Workspace package compatibility
6. ✅ All existing tests continue to pass

---

## 2. Test Strategy

### 2.1 Risk-Based Approach

**Critical Risks:**
- Services fail to start
- Port conflicts preventing development
- Hot-reload not working (poor DX)
- Security misconfigurations in production
- Database connection failures

**Testing Priorities:**
1. **High:** Service startup and health
2. **High:** Security configurations
3. **Medium:** Hot-reload functionality
4. **Medium:** Port configurations
5. **Low:** Documentation accuracy

### 2.2 Test Levels

1. **Static Analysis** - Dockerfile linting, config validation
2. **Configuration Tests** - Docker Compose syntax, env var handling
3. **Integration Tests** - Service startup, health checks, connectivity
4. **Regression Tests** - Existing test suite passes
5. **Security Tests** - User permissions, secret handling

---

## 3. Test Scope

### 3.1 In Scope

- ✅ Docker Compose development setup (docker-compose.yml)
- ✅ Docker Compose production setup (docker-compose.prod.yml)
- ✅ API Dockerfile (apps/api/Dockerfile)
- ✅ Next.js Dockerfile (apps/app/Dockerfile)
- ✅ .dockerignore file
- ✅ .env.example template
- ✅ Port configurations
- ✅ Volume mounts for hot-reload
- ✅ Security configurations
- ✅ Workspace package handling
- ✅ Existing test suite

### 3.2 Out of Scope

- ❌ Production orchestration (Kubernetes, Docker Swarm)
- ❌ CI/CD pipeline integration (tested separately)
- ❌ Performance benchmarking
- ❌ Load testing
- ❌ Multi-architecture builds (ARM64)
- ❌ Docker image registry integration

---

## 4. Test Cases

### 4.1 Docker Compose Syntax Validation

| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| DC-001 | Parse docker-compose.yml | Valid YAML, no syntax errors | ✅ PASS |
| DC-002 | Parse docker-compose.prod.yml | Valid YAML, no syntax errors | ✅ PASS |
| DC-003 | Validate service definitions | All services properly defined | ✅ PASS |
| DC-004 | Validate network configuration | Network exists and properly configured | ✅ PASS |
| DC-005 | Validate volume configuration | Volumes properly defined | ✅ PASS |
| DC-006 | Dev env vars have defaults | Services start without .env | ✅ PASS |
| DC-007 | Prod requires env vars | Fails without POSTGRES_PASSWORD | ✅ PASS |
| DC-008 | Health check configured | PostgreSQL health check present | ✅ PASS |

### 4.2 Dockerfile Validation

| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| DF-001 | API Dockerfile syntax | Valid Dockerfile, no errors | ✅ PASS |
| DF-002 | App Dockerfile syntax | Valid Dockerfile, no errors | ✅ PASS |
| DF-003 | Hadolint API Dockerfile | No critical issues | ✅ PASS* |
| DF-004 | Hadolint App Dockerfile | No critical issues | ✅ PASS |
| DF-005 | API multi-stage build | 5 stages: base, deps, dev, builder, runner | ✅ PASS |
| DF-006 | App multi-stage build | 5 stages: base, deps, dev, builder, runner | ✅ PASS |
| DF-007 | pnpm version matches | API uses pnpm@10.29.3 | ✅ PASS |
| DF-008 | pnpm version matches | App uses pnpm@10.29.3 | ✅ PASS |

*Minor advisory DL3025 - shell form CMD intentional for migration chain

### 4.3 Port Configuration

| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| PC-001 | API .env.example port | PORT=4000 | ✅ PASS |
| PC-002 | API Dockerfile dev port | ENV PORT=4000 | ✅ PASS |
| PC-003 | API Dockerfile prod port | ENV PORT=4000 | ✅ PASS |
| PC-004 | Dev compose API port | Exposes 4000:4000 | ✅ PASS |
| PC-005 | Prod compose API port | Exposes 4000:4000 | ✅ PASS |
| PC-006 | Dev compose App port | Exposes 3000:3000 | ✅ PASS |
| PC-007 | Prod compose App port | Exposes 3000:3000 | ✅ PASS |
| PC-008 | No port conflicts | API≠3000, App=3000 | ✅ PASS |

### 4.4 Hot-reload Configuration

| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| HR-001 | API src mounted | ./apps/api/src:/app/apps/api/src | ✅ PASS |
| HR-002 | Packages mounted | ./packages:/app/packages | ✅ PASS |
| HR-003 | API node_modules protected | Anonymous volume /app/node_modules | ✅ PASS |
| HR-004 | API service node_modules protected | Anonymous volume /app/apps/api/node_modules | ✅ PASS |
| HR-005 | App src mounted | ./apps/app/src:/app/apps/app/src | ✅ PASS |
| HR-006 | App public mounted | ./apps/app/public:/app/apps/app/public | ✅ PASS |
| HR-007 | Next config mounted | ./apps/app/next.config.ts mounted | ✅ PASS |
| HR-008 | App node_modules protected | Anonymous volume /app/node_modules | ✅ PASS |
| HR-009 | App service node_modules protected | Anonymous volume /app/apps/app/node_modules | ✅ PASS |
| HR-010 | .next protected | Anonymous volume /app/apps/app/.next | ✅ PASS |
| HR-011 | WATCHPACK_POLLING set | WATCHPACK_POLLING=true | ✅ PASS |
| HR-012 | API uses dev target | target: dev | ✅ PASS |
| HR-013 | App uses dev target | target: dev | ✅ PASS |

### 4.5 Security Configuration

| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| SE-001 | Prod requires POSTGRES_USER | Error without env var | ✅ PASS |
| SE-002 | Prod requires POSTGRES_PASSWORD | Error without env var | ✅ PASS |
| SE-003 | Prod requires NEXT_PUBLIC_API_URL | Error without build arg | ✅ PASS |
| SE-004 | API non-root user | USER apiuser (UID 1001) | ✅ PASS |
| SE-005 | App non-root user | USER nextjs (UID 1001) | ✅ PASS |
| SE-006 | API file ownership | chown apiuser:nodejs /app | ✅ PASS |
| SE-007 | No hardcoded secrets API | No passwords in Dockerfile | ✅ PASS |
| SE-008 | No hardcoded secrets App | No passwords in Dockerfile | ✅ PASS |
| SE-009 | .dockerignore excludes .env | .env not in build context | ✅ PASS |
| SE-010 | .dockerignore excludes .git | .git not in build context | ✅ PASS |
| SE-011 | API healthcheck present | HEALTHCHECK directive exists | ✅ PASS |
| SE-012 | Prod uses frozen lockfile | --frozen-lockfile flag | ✅ PASS |

### 4.6 Workspace Package Coverage

| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| WP-001 | API copies root package.json | COPY package.json | ✅ PASS |
| WP-002 | API copies workspace yaml | COPY pnpm-workspace.yaml | ✅ PASS |
| WP-003 | API copies lockfile | COPY pnpm-lock.yaml | ✅ PASS |
| WP-004 | API copies apps/api package | COPY apps/api/package.json | ✅ PASS |
| WP-005 | API copies apps/app package | COPY apps/app/package.json | ✅ PASS |
| WP-006 | API copies packages/db | COPY packages/db/package.json | ✅ PASS |
| WP-007 | API copies packages/sdk | COPY packages/sdk/package.json | ✅ PASS |
| WP-008 | API copies packages/types | COPY packages/types/package.json | ✅ PASS |
| WP-009 | App copies all packages | All workspace packages copied | ✅ PASS |
| WP-010 | Next.js standalone output | output: 'standalone' | ✅ PASS |
| WP-011 | Standalone files copied | .next/standalone copied | ✅ PASS |
| WP-012 | Static files copied | .next/static copied | ✅ PASS |
| WP-013 | Public files copied | public directory copied | ✅ PASS |

### 4.7 Regression Tests

| ID | Test Case | Expected Result | Status |
|---|---|---|---|
| RT-001 | SDK tests pass | 54 tests pass | ✅ PASS |
| RT-002 | API tests pass | 89 tests pass | ✅ PASS |
| RT-003 | Total tests pass | 143 tests pass, 0 fail | ✅ PASS |
| RT-004 | Build succeeds | All packages build | ✅ PASS |
| RT-005 | Prisma generates | Client generates successfully | ✅ PASS |

---

## 5. Test Execution

### 5.1 Automated Tests

**Smoke Tests** (`e2e-tests/docker-smoke-test.sh`)
- Static configuration validation
- File existence checks
- Syntax validation
- Configuration parsing
- ~40 test cases
- Runtime: ~30 seconds

**Integration Tests** (`e2e-tests/docker-integration-test.sh`)
- Service startup
- Health checks
- Port connectivity
- Container status
- ~10 test cases
- Runtime: ~3-5 minutes (includes build)

**Unit Tests** (`pnpm test`)
- Existing test suite
- SDK and API tests
- 143 test cases
- Runtime: ~3 seconds

### 5.2 Manual Tests

1. **Hot-reload Validation**
   - Start dev environment
   - Edit API source file
   - Verify auto-reload
   - Edit Next.js source file
   - Verify auto-rebuild

2. **Production Build**
   - Set production env vars
   - Build production images
   - Start production services
   - Verify services healthy

3. **Documentation Accuracy**
   - Follow DOCKER_QUICK_START.md
   - Verify all commands work
   - Check URLs accessible

---

## 6. Test Results Summary

### 6.1 Overall Results

| Category | Total | Passed | Failed | Pass Rate |
|---|---|---|---|---|
| Compose Syntax | 8 | 8 | 0 | 100% |
| Dockerfile | 8 | 8 | 0 | 100% |
| Port Config | 8 | 8 | 0 | 100% |
| Hot-reload | 13 | 13 | 0 | 100% |
| Security | 12 | 12 | 0 | 100% |
| Workspace | 13 | 13 | 0 | 100% |
| Regression | 5 | 5 | 0 | 100% |
| **TOTAL** | **67** | **67** | **0** | **100%** |

### 6.2 Issues Found

**Critical:** 0  
**Major:** 0  
**Minor:** 1 (Advisory only - DL3025 shell form CMD)

### 6.3 Recommendations

✅ **Approved for Release**

Optional future enhancements:
1. Multi-architecture builds (ARM64)
2. BuildKit cache optimizations
3. Docker Compose profiles
4. Next.js healthcheck directive
5. Separate migration init container pattern

---

## 7. Test Environment

**OS:** Linux (Ubuntu)  
**Docker:** 20.10+  
**Docker Compose:** 2.0+  
**Node:** 22 (Alpine)  
**pnpm:** 10.29.3  
**PostgreSQL:** 16 Alpine

---

## 8. Test Data

**Development:**
- POSTGRES_USER=pluma
- POSTGRES_PASSWORD=pluma
- POSTGRES_DB=pluma
- NEXT_PUBLIC_API_URL=http://localhost:4000

**Production:**
- Requires secure credentials (not checked in)
- DATABASE_URL with production credentials
- NEXT_PUBLIC_API_URL with production domain

---

## 9. Defect Management

No defects found during validation.

Minor advisory DL3025 documented and accepted as intentional design.

---

## 10. Sign-off

| Role | Name | Date | Status |
|---|---|---|---|
| QA Engineer | QA Team | 2024-02-20 | ✅ Approved |
| Test Execution | Automated | 2024-02-20 | ✅ Pass |
| Security Review | Automated | 2024-02-20 | ✅ Pass |

---

## 11. Appendix

### 11.1 Running Tests

```bash
# Smoke tests (fast)
./e2e-tests/docker-smoke-test.sh

# Integration tests (requires Docker)
./e2e-tests/docker-integration-test.sh

# Unit tests
DATABASE_URL="postgresql://pluma:pluma@localhost:5432/pluma" pnpm test
```

### 11.2 References

- Validation Report: `DOCKER_VALIDATION_REPORT.md`
- Quick Start: `DOCKER_QUICK_START.md`
- Main README: `README.md`
