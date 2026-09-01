#!/bin/bash

# SpendGuard Setup Script
# Initializes database and seeds demo data

set -e

echo "🚀 SpendGuard Setup"
echo "=================="
echo ""

# Check Docker
echo "✓ Checking Docker..."
if ! command -v docker &> /dev/null; then
  echo "✗ Docker not found. Please install Docker first."
  exit 1
fi

if ! command -v docker compose &> /dev/null; then
  echo "✗ Docker Compose not found. Please install Docker Compose first."
  exit 1
fi

# Start Docker services
echo "✓ Starting Docker services..."
docker compose up -d

echo "⏳ Waiting for services to be ready..."
sleep 5

# Check PostgreSQL
echo "✓ Checking PostgreSQL..."
for i in {1..30}; do
  if docker exec spendguard-postgres pg_isready -U postgres &> /dev/null; then
    echo "✓ PostgreSQL is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "✗ PostgreSQL did not start in time"
    exit 1
  fi
  sleep 1
done

# Check Redis
echo "✓ Checking Redis..."
for i in {1..30}; do
  if docker exec spendguard-redis redis-cli ping &> /dev/null; then
    echo "✓ Redis is ready"
    break
  fi
  if [ $i -eq 30 ]; then
    echo "✗ Redis did not start in time"
    exit 1
  fi
  sleep 1
done

echo ""
echo "✓ All services are running!"
echo ""
echo "📝 Next steps:"
echo "   1. Install dependencies: npm install"
echo "   2. Run migrations: npx prisma migrate dev"
echo "   3. Seed demo data: npx ts-node scripts/seed-demo.ts"
echo "   4. Start dev server: npm run dev"
echo ""
echo "🔗 Services:"
echo "   PostgreSQL: postgresql://postgres:postgres@localhost:5432/spendguard"
echo "   Redis: redis://localhost:6379"
echo ""
