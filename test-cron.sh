#!/bin/bash

# Test script for cron jobs
# Usage: ./test-cron.sh [monthly|yearly]

# Get CRON_SECRET from .env.local or set it manually
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
fi

if [ -z "$CRON_SECRET" ]; then
  echo "Error: CRON_SECRET is not set. Please set it in .env.local or export it."
  exit 1
fi

BASE_URL="${BASE_URL:-http://localhost:3000}"
ENDPOINT=$1

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

