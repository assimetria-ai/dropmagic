#!/bin/bash

# Privacy Policy Generator API Test Script
# Usage: ./test.sh [BASE_URL]
# Example: ./test.sh http://localhost:3000

set -e

BASE_URL="${1:-http://localhost:3000}"
echo "Testing Privacy Policy Generator API at $BASE_URL"
echo "================================================"
echo ""

# Test authentication and CSRF protection
echo "1. Getting CSRF token..."
CSRF_RESPONSE=$(curl -s "$BASE_URL/api/csrf-token")
CSRF_TOKEN=$(echo "$CSRF_RESPONSE" | grep -o '"csrfToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$CSRF_TOKEN" ]; then
  echo "❌ Failed to get CSRF token"
  exit 1
fi
echo "✅ CSRF Token obtained: ${CSRF_TOKEN:0:20}..."
echo ""

# Login (replace with your test credentials)
echo "2. Logging in..."
echo "   NOTE: Update test credentials in this script for your environment"
echo "   Using: test@example.com"
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "test-password"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to authenticate"
  echo "Response: $LOGIN_RESPONSE"
  echo ""
  echo "💡 TIP: Create a test user first or update credentials in this script"
  exit 1
fi
echo "✅ Authenticated successfully"
echo ""

# Generate privacy policy
echo "3. Generating privacy policy..."
POLICY_RESPONSE=$(curl -s -X POST "$BASE_URL/api/privacy-policy/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-CSRF-Token: $CSRF_TOKEN" \
  -d '{
    "productName": "TestApp",
    "companyName": "Test Company Inc.",
    "website": "https://testapp.com",
    "contactEmail": "privacy@testapp.com",
    "dataTypes": [
      {
        "name": "Email Address",
        "description": "User email for authentication",
        "purpose": "Account management and communication",
        "retention": "Until account deletion"
      },
      {
        "name": "Usage Analytics",
        "description": "How you use the service",
        "purpose": "Product improvement and analytics"
      }
    ],
    "thirdParties": [
      {
        "name": "Stripe",
        "purpose": "Payment processing",
        "website": "https://stripe.com",
        "privacyPolicy": "https://stripe.com/privacy"
      }
    ],
    "effectiveDate": "2024-03-01"
  }')

# Check if response contains expected fields
if echo "$POLICY_RESPONSE" | grep -q "privacyPolicy"; then
  echo "✅ Privacy policy generated successfully!"
  echo ""
  echo "Response metadata:"
  echo "$POLICY_RESPONSE" | grep -o '"metadata":{[^}]*}' | sed 's/,/\n/g'
  echo ""
  echo "Generated policy preview (first 500 chars):"
  echo "---"
  POLICY_TEXT=$(echo "$POLICY_RESPONSE" | grep -o '"privacyPolicy":"[^"]*' | cut -d'"' -f4)
  echo "$POLICY_TEXT" | head -c 500
  echo "..."
  echo "---"
  echo ""
  echo "✅ All tests passed!"
else
  echo "❌ Failed to generate privacy policy"
  echo "Response: $POLICY_RESPONSE"
  exit 1
fi

echo ""
echo "================================================"
echo "Test completed successfully! 🎉"
