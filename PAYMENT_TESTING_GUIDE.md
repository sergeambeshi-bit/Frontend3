# JENGU Payment Integration - Testing Guide

## Unit Tests

### Test: Webhook Signature Verification

```javascript
import { verifyWebhookSignature } from "./providers/cinetpay.js";
import crypto from "crypto";

const secret = "test-secret-123";
const body = '{"transaction_id":"JNG-123","status":"ACCEPTED"}';

// Calculate valid signature
const validSig = crypto
  .createHmac('sha256', secret)
  .update(body)
  .digest('hex');

// Test valid signature
console.assert(
  verifyWebhookSignature(body, validSig, secret) === true,
  "Should verify valid signature"
);

// Test invalid signature
console.assert(
  verifyWebhookSignature(body, "wrong_signature", secret) === false,
  "Should reject invalid signature"
);

// Test missing signature
console.assert(
  verifyWebhookSignature(body, "", secret) === false,
  "Should reject missing signature"
);
```

### Test: Order Persistence

```javascript
import { createOrder, getOrder, updateOrderStatus } from "./orders.js";

// Create order
const order = createOrder("JNG-TEST-001", {
  amount: 5000,
  method: "mtn",
  email: "test@example.com",
  name: "Test",
  phone: "+2376XXXXXXXX"
});

console.assert(order.status === "pending", "Order should start as pending");

// Update status
updateOrderStatus("JNG-TEST-001", "confirmed");
const updated = getOrder("JNG-TEST-001");

console.assert(updated.status === "confirmed", "Order status should update");
console.assert(updated.paymentConfirmedAt !== null, "Should set confirmation time");
```

---

## Integration Tests

### Test 1: Complete Payment Flow

**Duration:** ~2 minutes

**Steps:**
1. Create order via `/api/payments/initiate`
2. Verify order created via `/api/orders/{reference}`
3. Simulate webhook with valid signature
4. Verify order status updated to "confirmed"

**Script:**
```bash
#!/bin/bash

API="http://localhost:8080"
EMAIL="test-$(date +%s)@example.com"
SECRET="test-secret-123"

# 1. Initiate payment
echo "1️⃣ Initiating payment..."
RESPONSE=$(curl -s -X POST "$API/api/payments/initiate" \
  -H "Content-Type: application/json" \
  -d "{\"amount\": 5000, \"provider\": \"mtn\", \"email\": \"$EMAIL\", \"phone\": \"+2376XXXXXXXX\"}")

REFERENCE=$(echo $RESPONSE | grep -o '"reference":"[^"]*' | cut -d'"' -f4)
echo "Reference: $REFERENCE"

# 2. Check initial order status
echo "2️⃣ Checking initial order status..."
curl -s "$API/api/orders/$REFERENCE" | jq '.status'

# 3. Simulate webhook
echo "3️⃣ Simulating webhook..."
PAYLOAD="{\"transaction_id\":\"$REFERENCE\",\"status\":\"ACCEPTED\"}"
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

curl -s -X POST "$API/api/payments/webhooks/cinetpay" \
  -H "Content-Type: application/json" \
  -H "x-cinetpay-signature: $SIGNATURE" \
  -d "$PAYLOAD"

# 4. Verify status updated
echo "4️⃣ Verifying payment confirmed..."
sleep 1
curl -s "$API/api/orders/$REFERENCE" | jq '.status'

echo "✅ Test complete!"
```

### Test 2: Duplicate Prevention (Idempotency)

**Purpose:** Verify same request with same idempotency key returns same result

```bash
KEY="test-idempotency-key-123"

# First request
RESPONSE1=$(curl -s -X POST http://localhost:8080/api/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -d '{"amount": 5000, "provider": "mtn", "email": "test@example.com", "phone": "+2376XXXXXXXX"}')

REF1=$(echo $RESPONSE1 | grep -o '"reference":"[^"]*' | cut -d'"' -f4)

# Second request (same key)
RESPONSE2=$(curl -s -X POST http://localhost:8080/api/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: $KEY" \
  -d '{"amount": 5000, "provider": "mtn", "email": "test@example.com", "phone": "+2376XXXXXXXX"}')

REF2=$(echo $RESPONSE2 | grep -o '"reference":"[^"]*' | cut -d'"' -f4)

# Should be identical
if [ "$REF1" = "$REF2" ]; then
  echo "✅ Idempotency working: Same reference returned"
else
  echo "❌ Idempotency test failed: Different references"
fi
```

### Test 3: Invalid Signatures Rejected

**Purpose:** Verify webhook rejects bad signatures

```bash
REFERENCE="JNG-TEST-INVALID"
PAYLOAD="{\"transaction_id\":\"$REFERENCE\",\"status\":\"ACCEPTED\"}"

# Send with wrong signature
curl -s -X POST http://localhost:8080/api/payments/webhooks/cinetpay \
  -H "Content-Type: application/json" \
  -H "x-cinetpay-signature: wrong_signature_12345" \
  -d "$PAYLOAD"

# Should return 401 Unauthorized
# If you get 202, webhook verification is not working!
```

### Test 4: Phone Number Normalization

**Purpose:** Verify phone normalization works consistently

```bash
TESTS=(
  "6XXXXXXXX"       # Local format
  "+2376XXXXXXXX"   # International format
  "2376XXXXXXXX"    # Without +
  "67890123456"     # Invalid (11 digits)
)

for PHONE in "${TESTS[@]}"; do
  curl -s -X POST http://localhost:8080/api/payments/initiate \
    -H "Content-Type: application/json" \
    -d "{\"amount\": 5000, \"provider\": \"mtn\", \"email\": \"test@email.com\", \"phone\": \"$PHONE\"}" \
    | jq '.success'
done
```

---

## Frontend Tests

### Test 1: Checkout Form Validation

```javascript
// Open Developer Console on /checkout.html

// Test 1: Email validation
window.checkout = {};
document.getElementById("checkoutEmail").value = "invalid";
document.getElementById("checkoutForm").dispatchEvent(new Event("submit"));
// Should show error "Valid email is required"

// Test 2: Phone validation for Mobile Money
document.getElementById("checkoutEmail").value = "test@example.com";
document.querySelector('[data-method="mtn"]').click();
document.getElementById("checkoutPhone").value = "";
document.getElementById("checkoutForm").dispatchEvent(new Event("submit"));
// Should show error "Valid Mobile Money phone is required"

// Test 3: Network detection
document.getElementById("checkoutPhone").value = "677123456";
// Should detect MTN network
```

### Test 2: Idempotency Key in Frontend

```javascript
// Check checkout.js
const PAYMENT_API = "http://localhost:8080";

// Should include idempotency key header
const idempotencyKey = `jengu-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
fetch(`${PAYMENT_API}/api/payments/initiate`, {
  headers: {
    "Idempotency-Key": idempotencyKey // ← This must be present
  }
});
```

### Test 3: Payment Confirmation Polling

```javascript
// Verify frontend waits for backend confirmation
// Check browser Network tab:
// 1. POST /api/payments/initiate
// 2. GET /api/payments/status (polling)
// 3. GET /api/orders/{reference} (verification)
// 4. Only then redirect to success page

// Frontend should NOT complete checkout until:
// - Backend order status = "confirmed"
// - NOT just provider status = "pending"
```

---

## Testing Checklist

### Pre-Production

- [ ] Webhook signature verification works (test with invalid signature)
- [ ] Order persists to filesystem (restart server, order still exists)
- [ ] Idempotency prevents duplicate charges
- [ ] Phone normalization consistent between frontend and backend
- [ ] Payment logs generated in `backend/logs/`
- [ ] Checkout form validates all fields
- [ ] Payment timeout handled gracefully
- [ ] Network errors retry appropriately
- [ ] CORS working (frontend can call backend)

### Production

- [ ] Webhook secret matches CinetPay configuration
- [ ] HTTPS enabled for all APIs
- [ ] Logs being monitored/collected
- [ ] Backup process for order data running
- [ ] Email confirmations working
- [ ] Customer payment receipt generated
- [ ] Support team can access order logs
- [ ] Monitoring alerts configured

---

## Troubleshooting

### Issue: Webhook not being called

**Check:**
1. Is `PAYMENT_NOTIFY_URL` publicly accessible?
   ```bash
   curl https://your-domain.com/api/payments/webhooks/cinetpay
   # Should reach your backend
   ```

2. Is firewall allowing inbound traffic?
3. Does CinetPay have correct webhook URL configured?
4. Are logs showing webhook receipt?
   ```bash
   tail -f backend/logs/webhooks-*.log
   ```

### Issue: Order status never updates to "confirmed"

**Check:**
1. Is webhook being received? (check logs)
2. Is signature verification working?
   ```bash
   grep "Webhook signature" backend/logs/webhooks-*.log
   ```
3. Is webhook secret configured correctly?
4. Is order being created?
   ```bash
   curl http://localhost:8080/api/orders/{reference}
   ```

### Issue: Duplicate orders in database

**Check:**
1. Is idempotency key being used?
2. Is same key being sent on retries?
3. Check payment logs:
   ```bash
   grep "Duplicate request" backend/logs/payments-*.log
   ```

---

## Performance Testing

### Load Test (Simple)

```bash
#!/bin/bash
# Test 100 concurrent payment initiations

for i in {1..100}; do
  curl -s -X POST http://localhost:8080/api/payments/initiate \
    -H "Content-Type: application/json" \
    -d "{\"amount\": 5000, \"provider\": \"mtn\", \"email\": \"load-test-$i@example.com\", \"phone\": \"+2376$i\"}" &
done

wait
echo "Load test complete"
```

### Memory Test

Monitor memory while running above load test:

```bash
watch -n 1 'ps aux | grep node'
# or
node --max-old-space-size=512 server.js # Limit memory to 512MB
```

If memory grows unbounded, old payment records aren't being cleaned up.

---

## Monitoring in Production

### Key Metrics

```bash
# Count payment requests by method
grep "PAYMENT_REQUEST" backend/logs/payments-*.log | grep -o '"method":"[^"]*' | sort | uniq -c

# Count successful payments
grep "PAYMENT_SUCCESS" backend/logs/payments-*.log | wc -l

# Count failed payments
grep "PAYMENT_FAILURE" backend/logs/payments-*.log | wc -l

# Find slow requests
grep "duration_ms" backend/logs/requests-*.log | awk -F'duration_ms' '{print $2}' | sort -n | tail -20

# Check error rate
grep ERROR backend/logs/errors-*.log | wc -l
```

### Create Dashboard

```bash
# Create a simple monitoring command
alias jengu-status='echo "=== Payment Status ===" && \
  echo "Total requests:" $(grep "PAYMENT_REQUEST" backend/logs/payments-$(date +%Y-%m-%d).log | wc -l) && \
  echo "Successful:" $(grep "PAYMENT_SUCCESS" backend/logs/payments-$(date +%Y-%m-%d).log | wc -l) && \
  echo "Failed:" $(grep "PAYMENT_FAILURE" backend/logs/payments-$(date +%Y-%m-%d).log | wc -l) && \
  echo "Errors:" $(grep ERROR backend/logs/errors-$(date +%Y-%m-%d).log | wc -l)'
```
