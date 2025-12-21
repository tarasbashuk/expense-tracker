#!/bin/bash

# Test script for cron jobs
# Usage: ./test-cron.sh [monthly|yearly]
# Or: CRON_SECRET=your_secret ./test-cron.sh monthly

# Get CRON_SECRET from .env or .env.local or environment variable
if [ -z "$CRON_SECRET" ]; then
  if [ -f .env ]; then
    # Read .env and export variables
    set -a
    source .env
    set +a
  elif [ -f .env.local ]; then
    # Fallback to .env.local if .env doesn't exist
    set -a
    source .env.local
    set +a
  fi
fi

if [ -z "$CRON_SECRET" ]; then
  echo "Error: CRON_SECRET is not set."
  echo ""
  echo "Please do one of the following:"
  echo "  1. Create .env file with CRON_SECRET=your_secret"
  echo "  2. Export it: export CRON_SECRET=your_secret"
  echo "  3. Pass it inline: CRON_SECRET=your_secret ./test-cron.sh monthly"
  exit 1
fi

BASE_URL="${BASE_URL:-http://localhost:3000}"
ENDPOINT=$1

# Check if server is running
if ! curl -s --head --fail "${BASE_URL}" > /dev/null 2>&1; then
  echo "Error: Cannot connect to ${BASE_URL}"
  echo ""
  echo "Please make sure your Next.js server is running:"
  echo "  npm run dev"
  echo ""
  echo "Or if testing against production, set BASE_URL:"
  echo "  BASE_URL=https://your-domain.vercel.app ./test-cron.sh monthly"
  exit 1
fi

case $ENDPOINT in
  monthly)
    echo "Testing monthly report..."
    curl -X GET "${BASE_URL}/api/cron/monthly-report" \
      -H "Authorization: Bearer ${CRON_SECRET}" \
      -H "Content-Type: application/json" | jq .
    ;;
  monthly-with-yearly)
    echo "Testing monthly report with forced yearly report..."
    curl -X GET "${BASE_URL}/api/cron/monthly-report?forceYearly=true" \
      -H "Authorization: Bearer ${CRON_SECRET}" \
      -H "Content-Type: application/json" | jq .
    ;;
  yearly)
    echo "Testing yearly report..."
    curl -X GET "${BASE_URL}/api/cron/yearly-report" \
      -H "Authorization: Bearer ${CRON_SECRET}" \
      -H "Content-Type: application/json" | jq .
    ;;
  *)
    echo "Usage: $0 [monthly|monthly-with-yearly|yearly]"
    echo ""
    echo "Examples:"
    echo "  $0 monthly              - Test monthly report only"
    echo "  $0 monthly-with-yearly - Test monthly report with forced yearly report"
    echo "  $0 yearly               - Test yearly report only"
    exit 1
    ;;
esac

