# JENGU Payment Integration - Setup & Verification Guide

## Overview

This guide shows how to set up and verify the complete payment flow integration between JENGU frontend and JenguPay/CinetPay backend.

---

## Architecture

```
FRONTEND (checkout.html)
  ↓ POST /api/payments/initiate (with idempotency key)
BACKEND (server.js)
  ↓ Validate + Create Order
  ↓ POST to CinetPay API
  ↓ Return checkout URL + reference
FRONTEND
  ↓ Poll /api/payments/status (provider status)
  ↓ Verify /api/orders/{reference} (backend confirmation)
CinetPay (Provider)
  ↓ Customer completes payment
  ↓ Webhooks to /api/payments/webhooks/cinetpay
BACKEND
  ↓ Verify webhook signature (HMAC-SHA256)
  ↓ Update order status → "confirmed"
  ↓ Trigger product delivery
FRONTEND
  ↓ Show success + delivery info (ticket/download/order)
```

---

## Setup Steps

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Edit `.env` with your actual values:

```
PORT=8080
FRONTEND_ORIGIN=http://localhost:5500
PAYMENT_API_KEY=your_cinetpay_api_key
PAYMENT_SITE_ID=your_cinetpay_site_id
PAYMENT_WEBHOOK_SECRET=your_cinetpay_webhook_secret
PAYMENT_NOTIFY_URL=http://your-domain.com/api/payments/webhooks/cinetpay
```

### 3. Set Frontend API Endpoints

In your HTML, before loading checkout.js:

```html
<script>
  window.JENGU_PAYMENT_API = "https://your-jengupay-instance.com";
  window.JENGU_BACKEND_API = "http://localhost:8080"; // or your backend domain
</script>
```

### 4. Start Backend Server

```bash
npm run dev  # Development with watch mode
# or
npm start   # Production
```

Server will listen on `http://localhost:8080`

---

## Payment Flow Verification

### Test 1: Check Server Health

```bash
curl http://localhost:8080/api/payments/health

# Expected response:
# {"ok":true,"provider":"cinetpay"}
```

### Test 2: Initiate Payment

```bash
curl -X POST http://localhost:8080/api/payments/initiate \
  -H "Content-Type: application/json" \
  -H "Idempotency-Key: test-$(date +%s)" \
  -d '{
    "amount": 5000,
    "provider": "mtn",
    "email": "test@example.com",
    "name": "Test User",
    "phone": "+2376XXXXXXXX"
  }'

# Expected response:
# {
#   "success": true,
#   "reference": "JNG-1684500000000-ABC123XYZ",
#   "status": "pending",
#   "checkoutUrl": "https://checkout.cinetpay.com/..." 
# }
```

**NOTE:** Save the `reference` for next steps.

### Test 3: Check Order Status

```bash
curl http://localhost:8080/api/orders/JNG-1684500000000-ABC123XYZ

# Expected response (before webhook):
# {
#   "success": true,
#   "reference": "JNG-1684500000000-ABC123XYZ",
#   "status": "pending",
#   "amount": 5000,
#   ...
# }
```

### Test 4: Simulate Webhook (for development)

First, create a test webhook payload:

```bash
# Create payload
REFERENCE="JNG-1684500000000-ABC123XYZ"
SECRET="your_webhook_secret"
PAYLOAD='{"transaction_id":"'$REFERENCE'","status":"ACCEPTED"}'

# Calculate HMAC-SHA256 signature
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $2}')

# Send webhook
curl -X POST http://localhost:8080/api/payments/webhooks/cinetpay \
  -H "Content-Type: application/json" \
  -H "x-cinetpay-signature: $SIGNATURE" \
  -d "$PAYLOAD"

# Expected response:
# {"ok":true}
```

Check order status again:

```bash
curl http://localhost:8080/api/orders/JNG-1684500000000-ABC123XYZ

# Status should now be "confirmed"
```

### Test 5: Frontend Checkout (Manual)

1. Add items to cart in marketplace
2. Go to `/checkout.html`
3. Fill form (email, name, phone)
4. Select payment method (MTN/Orange/Card)
5. Click "Pay"
6. Frontend will:
   - POST to `/api/payments/initiate`
   - Poll `/api/payments/status`
   - Verify `/api/orders/{reference}`
   - Show success page on confirmation

---

## Logging & Debugging

### Log Files

Logs are stored in `backend/logs/` with timestamps:

- `payments-YYYY-MM-DD.log` - Payment requests/responses
- `webhooks-YYYY-MM-DD.log` - Webhook events
- `orders-YYYY-MM-DD.log` - Order state changes
- `errors-YYYY-MM-DD.log` - Error details
- `requests-YYYY-MM-DD.log` - HTTP request/response summary

### View Logs

```bash
# Watch payment logs in real-time
tail -f backend/logs/payments-*.log

# View order transitions
tail -f backend/logs/orders-*.log

# Check for errors
grep ERROR backend/logs/errors-*.log
```

### Common Issues

#### Issue: "Order not found"

**Cause:** Order wasn't created before webhook arrived

**Fix:** Check that `/api/payments/initiate` response includes `reference`. If webhook fires before order creation, it will log warning and still accept (202).

#### Issue: "Invalid webhook signature"

**Cause:** Signature verification failed

**Checklist:**
- Is `PAYMENT_WEBHOOK_SECRET` set correctly in `.env`?
- Does it match the secret in CinetPay dashboard?
- Is body JSON serialized exactly the same way CinetPay sends it?

#### Issue: "Gateway timeout"

**Cause:** Payment API unreachable

**Checklist:**
- Is `PAYMENT_API` endpoint correct?
- Is it publicly accessible?
- Check CinetPay API status

#### Issue: "Webhook never received"

**Cause:** Webhook URL not publicly accessible

**Checklist:**
- Is `PAYMENT_NOTIFY_URL` pointing to public domain with HTTPS?
- Are firewall rules allowing inbound traffic?
- Test manually: `curl http://your-domain.com/api/payments/webhooks/cinetpay` should reach your server

---

## Data Model

### Order Record (`backend/data/orders/{reference}.json`)

```json
{
  "reference": "JNG-1684500000000-ABC123XYZ",
  "status": "confirmed",
  "amount": 5000,
  "method": "mtn",
  "email": "test@example.com",
  "name": "Test User",
  "phone": "+2376XXXXXXXX",
  "itemIds": ["track-123", "album-456"],
  "createdAt": "2024-05-20T10:30:00.000Z",
  "updatedAt": "2024-05-20T10:31:45.000Z",
  "paymentConfirmedAt": "2024-05-20T10:31:45.000Z",
  "deliveredAt": "2024-05-20T10:31:50.000Z",
  "webhookData": {
    "transaction_id": "JNG-1684500000000-ABC123XYZ",
    "status": "ACCEPTED",
    "amount": 5000,
    "date": "2024-05-20T10:31:45.000Z"
  }
}
```

### Order Statuses

- `pending` - Order created, awaiting payment
- `confirmed` - Payment confirmed by provider
- `failed` - Payment failed
- `delivered` - Product delivered to customer

---

## Security Checklist

- [ ] `PAYMENT_WEBHOOK_SECRET` is set and matches CinetPay dashboard
- [ ] Webhook signature verification uses HMAC-SHA256
- [ ] `FRONTEND_ORIGIN` restricts CORS to your domain (not "*")
- [ ] `PAYMENT_NOTIFY_URL` uses HTTPS in production
- [ ] Idempotency keys prevent duplicate charges
- [ ] Order reference is cryptographically random
- [ ] No sensitive data logged (API keys, secrets)
- [ ] Orders persisted to file/database (not just memory)

---

## Production Deployment

### Pre-Deployment Checklist

- [ ] Webhook secret configured in CinetPay dashboard
- [ ] Backend running on HTTPS
- [ ] FRONTEND_ORIGIN set to actual domain
- [ ] PAYMENT_NOTIFY_URL points to production domain
- [ ] Email confirmations configured (optional but recommended)
- [ ] Logs being collected/monitored
- [ ] Backup of order data setup
- [ ] Error alerting configured

### Environment Variables

**Development:**
```
FRONTEND_ORIGIN=http://localhost:5500
PAYMENT_NOTIFY_URL=http://localhost:8080/api/payments/webhooks/cinetpay
```

**Production:**
```
FRONTEND_ORIGIN=https://app.jengumusic.com
PAYMENT_NOTIFY_URL=https://api.jengumusic.com/api/payments/webhooks/cinetpay
```

---

## Support

For issues:

1. Check logs in `backend/logs/`
2. Verify webhook signature with manual test (curl command above)
3. Ensure all environment variables are set
4. Check CinetPay API status
5. Verify firewall/DNS configuration

See `PAYMENT_AUDIT_REPORT.md` for detailed architecture notes.
