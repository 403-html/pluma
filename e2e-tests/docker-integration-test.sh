#!/bin/bash
# Docker Compose Integration Test
# Tests actual container startup and service health

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
COMPOSE_FILE="docker-compose.yml"
TIMEOUT=120
TESTS_PASSED=0
TESTS_FAILED=0

echo -e "${BLUE}🐳 Pluma Docker Compose Integration Test${NC}"
echo "=========================================="
echo ""

# Cleanup function
cleanup() {
    echo ""
    echo "🧹 Cleaning up..."
    docker compose -f $COMPOSE_FILE down -v > /dev/null 2>&1 || true
}

# Set trap for cleanup on exit
trap cleanup EXIT

# Test function
test_service() {
    local service=$1
    local test_name=$2
    local test_command=$3
    
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

echo "📦 Step 1: Environment Setup"
echo "-----------------------------"

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓${NC} .env created"
else
    echo -e "${GREEN}✓${NC} .env already exists"
fi

echo ""
echo "🚀 Step 2: Starting Services"
echo "-----------------------------"
echo "This may take a few minutes on first run (pulling images, building)..."
echo ""

# Start services in detached mode
if docker compose -f $COMPOSE_FILE up -d --build; then
    echo -e "${GREEN}✓${NC} Services started"
else
    echo -e "${RED}✗${NC} Failed to start services"
    exit 1
fi

echo ""
echo "⏳ Step 3: Waiting for Services to be Healthy"
echo "----------------------------------------------"

# Wait for PostgreSQL
echo -n "Waiting for PostgreSQL to be ready "
for i in {1..30}; do
    if docker compose -f $COMPOSE_FILE exec -T postgres pg_isready -U pluma > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 2
    if [ $i -eq 30 ]; then
        echo -e " ${RED}✗ Timeout${NC}"
        echo "PostgreSQL logs:"
        docker compose -f $COMPOSE_FILE logs postgres | tail -20
        exit 1
    fi
done

# Wait for API
echo -n "Waiting for API to be ready "
for i in {1..60}; do
    if curl -s http://localhost:4000/health > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 2
    if [ $i -eq 60 ]; then
        echo -e " ${RED}✗ Timeout${NC}"
        echo "API logs:"
        docker compose -f $COMPOSE_FILE logs api | tail -20
        exit 1
    fi
done

# Wait for Next.js
echo -n "Waiting for Next.js to be ready "
for i in {1..60}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 2
    if [ $i -eq 60 ]; then
        echo -e " ${RED}✗ Timeout${NC}"
        echo "Next.js logs:"
        docker compose -f $COMPOSE_FILE logs app | tail -20
        exit 1
    fi
done

echo ""
echo "🧪 Step 4: Service Health Tests"
echo "--------------------------------"

# Test PostgreSQL
test_service "postgres" "PostgreSQL is accepting connections" \
    "docker compose -f $COMPOSE_FILE exec -T postgres pg_isready -U pluma"

test_service "postgres" "PostgreSQL database exists" \
    "docker compose -f $COMPOSE_FILE exec -T postgres psql -U pluma -d pluma -c 'SELECT 1'"

# Test API
test_service "api" "API health endpoint responds" \
    "curl -sf http://localhost:4000/health"

test_service "api" "API is running on port 4000" \
    "nc -z localhost 4000"

# Test Next.js
test_service "app" "Next.js app responds" \
    "curl -sf http://localhost:3000"

test_service "app" "Next.js is running on port 3000" \
    "nc -z localhost 3000"

echo ""
echo "🔍 Step 5: Container Status Tests"
echo "----------------------------------"

# Check if containers are running
test_service "postgres" "PostgreSQL container is running" \
    "docker compose -f $COMPOSE_FILE ps postgres | grep -q 'Up'"

test_service "api" "API container is running" \
    "docker compose -f $COMPOSE_FILE ps api | grep -q 'Up'"

test_service "app" "Next.js container is running" \
    "docker compose -f $COMPOSE_FILE ps app | grep -q 'Up'"

echo ""
echo "📊 Step 6: Service Information"
echo "-------------------------------"

echo "Running containers:"
docker compose -f $COMPOSE_FILE ps

echo ""
echo "Port mappings:"
echo "  - PostgreSQL: 5432"
echo "  - API:        4000"
echo "  - Next.js:    3000"

echo ""
echo "=============================================="
echo "📊 Integration Test Results"
echo "=============================================="
echo -e "✅ Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "❌ Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}🎉 All integration tests passed!${NC}"
    echo ""
    echo "Services are running and healthy:"
    echo "  - Next.js UI: http://localhost:3000"
    echo "  - API:        http://localhost:4000"
    echo "  - PostgreSQL: localhost:5432"
    echo ""
    echo "Run 'docker compose logs -f' to view logs"
    echo "Run 'docker compose down' to stop services"
    exit 0
else
    echo -e "${RED}❌ Some integration tests failed.${NC}"
    echo ""
    echo "View logs with:"
    echo "  docker compose logs postgres"
    echo "  docker compose logs api"
    echo "  docker compose logs app"
    exit 1
fi
