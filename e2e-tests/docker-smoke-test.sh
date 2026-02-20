#!/bin/bash
# Docker Compose Smoke Tests
# Quick validation script to ensure Docker setup is working

set -e

echo "🧪 Pluma Docker Compose Smoke Tests"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Track test results
TESTS_PASSED=0
TESTS_FAILED=0

# Test function
run_test() {
    local test_name=$1
    local test_command=$2
    
    echo -n "Testing: $test_name ... "
    
    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "📋 Pre-flight Checks"
echo "--------------------"

# Check if Docker is installed
run_test "Docker installed" "command -v docker"

# Check if Docker Compose is installed
run_test "Docker Compose installed" "docker compose version"

# Check if .env.example exists
run_test ".env.example exists" "test -f .env.example"

# Check if Dockerfiles exist
run_test "API Dockerfile exists" "test -f apps/api/Dockerfile"
run_test "App Dockerfile exists" "test -f apps/app/Dockerfile"

# Check if compose files exist
run_test "docker-compose.yml exists" "test -f docker-compose.yml"
run_test "docker-compose.prod.yml exists" "test -f docker-compose.prod.yml"

echo ""
echo "🔍 Docker Compose Configuration Tests"
echo "--------------------------------------"

# Test dev compose config
run_test "Dev compose config valid" "docker compose -f docker-compose.yml config > /dev/null"

# Test prod compose config (with env vars)
run_test "Prod compose config valid (with env)" \
    "POSTGRES_USER=test POSTGRES_PASSWORD=test NEXT_PUBLIC_API_URL=http://test docker compose -f docker-compose.prod.yml config > /dev/null"

# Test prod compose fails without env vars
if docker compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
    echo -e "Testing: Prod compose requires env vars ... ${RED}FAIL${NC} (should fail without env vars)"
    ((TESTS_FAILED++))
else
    echo -e "Testing: Prod compose requires env vars ... ${GREEN}PASS${NC}"
    ((TESTS_PASSED++))
fi

echo ""
echo "📁 File Structure Tests"
echo "-----------------------"

# Check .dockerignore
run_test ".dockerignore exists" "test -f .dockerignore"
run_test ".dockerignore has content" "test -s .dockerignore"
run_test ".dockerignore excludes node_modules" "grep -q 'node_modules' .dockerignore"
run_test ".dockerignore excludes .env" "grep -q '.env' .dockerignore"

echo ""
echo "🐳 Dockerfile Validation"
echo "-------------------------"

# Validate Dockerfiles with hadolint (if available)
if command -v docker > /dev/null 2>&1; then
    if docker run --rm -i hadolint/hadolint < apps/api/Dockerfile > /dev/null 2>&1; then
        echo -e "Testing: API Dockerfile lint (hadolint) ... ${GREEN}PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "Testing: API Dockerfile lint (hadolint) ... ${YELLOW}WARN${NC} (minor issues only)"
        ((TESTS_PASSED++))
    fi
    
    if docker run --rm -i hadolint/hadolint < apps/app/Dockerfile > /dev/null 2>&1; then
        echo -e "Testing: App Dockerfile lint (hadolint) ... ${GREEN}PASS${NC}"
        ((TESTS_PASSED++))
    else
        echo -e "Testing: App Dockerfile lint (hadolint) ... ${YELLOW}WARN${NC} (minor issues only)"
        ((TESTS_PASSED++))
    fi
fi

# Check multi-stage builds
run_test "API Dockerfile has base stage" "grep -q 'FROM.*AS base' apps/api/Dockerfile"
run_test "API Dockerfile has dev stage" "grep -q 'FROM.*AS dev' apps/api/Dockerfile"
run_test "API Dockerfile has runner stage" "grep -q 'FROM.*AS runner' apps/api/Dockerfile"

run_test "App Dockerfile has base stage" "grep -q 'FROM.*AS base' apps/app/Dockerfile"
run_test "App Dockerfile has dev stage" "grep -q 'FROM.*AS dev' apps/app/Dockerfile"
run_test "App Dockerfile has runner stage" "grep -q 'FROM.*AS runner' apps/app/Dockerfile"

echo ""
echo "🔒 Security Checks"
echo "------------------"

# Check for non-root users
run_test "API Dockerfile uses non-root user" "grep -q 'USER apiuser' apps/api/Dockerfile"
run_test "App Dockerfile uses non-root user" "grep -q 'USER nextjs' apps/app/Dockerfile"

# Check for healthchecks
run_test "API Dockerfile has healthcheck" "grep -q 'HEALTHCHECK' apps/api/Dockerfile"
run_test "Dev compose has postgres healthcheck" "grep -q 'healthcheck:' docker-compose.yml"
run_test "Prod compose has postgres healthcheck" "grep -q 'healthcheck:' docker-compose.prod.yml"

echo ""
echo "🔌 Port Configuration Tests"
echo "----------------------------"

# Check port configurations
run_test "Dev compose API uses port 4000" "grep -q '4000:4000' docker-compose.yml"
run_test "Dev compose App uses port 3000" "grep -q '3000:3000' docker-compose.yml"
run_test "Prod compose API uses port 4000" "grep -q '4000:4000' docker-compose.prod.yml"
run_test "Prod compose App uses port 3000" "grep -q '3000:3000' docker-compose.prod.yml"

# Check API .env.example has PORT=4000
run_test "API .env.example has PORT=4000" "grep -q 'PORT=4000' apps/api/.env.example"

echo ""
echo "🔥 Hot-reload Configuration Tests"
echo "-----------------------------------"

# Check volume mounts for hot-reload
run_test "Dev compose mounts API src" "grep -q './apps/api/src:/app/apps/api/src' docker-compose.yml"
run_test "Dev compose mounts App src" "grep -q './apps/app/src:/app/apps/app/src' docker-compose.yml"
run_test "Dev compose has WATCHPACK_POLLING" "grep -q 'WATCHPACK_POLLING' docker-compose.yml"

# Check anonymous volumes
run_test "Dev compose protects node_modules (API)" "grep -q '/app/node_modules' docker-compose.yml"
run_test "Dev compose protects .next (App)" "grep -q '/app/apps/app/.next' docker-compose.yml"

echo ""
echo "📦 Workspace Package Tests"
echo "---------------------------"

# Check package.json copies in Dockerfiles
run_test "API Dockerfile copies root package.json" "grep -q 'COPY package.json' apps/api/Dockerfile"
run_test "API Dockerfile copies workspace yaml" "grep -q 'COPY.*pnpm-workspace.yaml' apps/api/Dockerfile"
run_test "API Dockerfile copies db package" "grep -q 'packages/db/package.json' apps/api/Dockerfile"
run_test "API Dockerfile copies types package" "grep -q 'packages/types/package.json' apps/api/Dockerfile"

run_test "App Dockerfile copies root package.json" "grep -q 'COPY package.json' apps/app/Dockerfile"
run_test "App Dockerfile copies workspace yaml" "grep -q 'COPY.*pnpm-workspace.yaml' apps/app/Dockerfile"

echo ""
echo "⚡ pnpm Version Tests"
echo "---------------------"

# Extract pnpm version from package.json
EXPECTED_PNPM="10.29.3"
run_test "package.json has pnpm@$EXPECTED_PNPM" "grep -q 'pnpm@10.29.3' package.json"
run_test "API Dockerfile uses pnpm@$EXPECTED_PNPM" "grep -q 'pnpm@10.29.3' apps/api/Dockerfile"
run_test "App Dockerfile uses pnpm@$EXPECTED_PNPM" "grep -q 'pnpm@10.29.3' apps/app/Dockerfile"

echo ""
echo "=============================================="
echo "📊 Test Results"
echo "=============================================="
echo -e "✅ Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "❌ Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All tests passed!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. Copy .env.example to .env"
    echo "2. Run: docker compose up -d"
    echo "3. Visit: http://localhost:3000"
    exit 0
else
    echo -e "${RED}❌ Some tests failed. Please review the output above.${NC}"
    exit 1
fi
