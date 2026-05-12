# JENGU Payment Integration Audit Report

## Executive Summary
**Status:** ⚠️ CRITICAL ISSUES FOUND - Payment flow is partially broken.

Several security, data persistence, and product delivery issues prevent reliable payment processing.

---

## Issues Found

### 🔴 CRITICAL

#### 1. **Insecure Webhook Verification**
- **Location:** `backend/providers/cinetpay.js`
- **Problem:** Webhook signatures are verified by simple string comparison, not cryptographic HMAC
- **Impact:** Webhook injection attacks possible; fraudulent payment confirmations could be accepted
- **Fix Required:** Implement HMAC-SHA256 signature verification

#### 2. **No Order Persistence**
- **Location:** `backend/server.js`, `js/checkout.js`
- **Problem:** Orders exist only in browser sessionStorage/backend memory
  - Backend stores payments in `new Map()` (lost on restart)
  - No database or persistent store
  - Orders not queried after payment confirmation
- **Impact:** 
  - Cannot track completed orders
  - Cannot debug failed payments
  - Lost orders if server crashes
  - No audit trail
- **Fix Required:** Add minimal order persistence (file-based or database)

#### 3. **Product Delivery is Fake**
- **Location:** `js/checkout-success.js`
- **Problem:**
  - Ticket QR codes are hardcoded random patterns, not actual ticket data
  - "Downloads" return fake text files, not actual products
  - No email confirmations sent
  - No integration with product delivery systems
- **Impact:** Customers pay but receive nothing
- **Fix Required:** Implement real delivery triggers

#### 4. **Race Condition in Payment Confirmation**
- **Location:** `js/checkout.js`, `backend/server.js`
- **Problem:**
  - Frontend redirects to success page before webhook confirmation received
  - `completeCheckout()` saves purchase immediately after payment API response
  - If webhook arrives late, payment record is lost
  - Duplicate payment protection missing
- **Impact:** 
  - Customers may be charged multiple times
  - Successful payments not recorded
  - Webhook events processed without order context
- **Fix Required:** 
  - Add idempotency keys
  - Move `completeCheckout()` to webhook handler
  - Wait for webhook confirmation before success page

---

### 🟡 HIGH PRIORITY

#### 5. **No Logging System**
- **Location:** Backend entirely
- **Problem:** No request/response logging, no error logging, no audit trail
- **Impact:** Cannot debug payment failures; cannot investigate fraud
- **Fix Required:** Add Winston logger or similar

#### 6. **Hardcoded Payment API URL**
- **Location:** `js/checkout.js` line 5
- **Problem:** 
  ```js
  const PAYMENT_API = window.JENGU_PAYMENT_API || "https://jengupay.vercel.app";
  ```
  - `window.JENGU_PAYMENT_API` is never set
  - Hardcoded to public Vercel URL; should be configurable by environment
  - No SSL certificate pinning
- **Impact:** Payment requests sent to hardcoded endpoint; MitM vulnerability
- **Fix Required:** Set correct API endpoint; use environment configuration

#### 7. **Insufficient Error Handling**
- **Location:** `backend/server.js` webhook handler
- **Problem:**
  - No retry logic for failed API calls
  - Fixed timeout of 3 minutes (180s poll loops)
  - No exponential backoff
  - Provider errors not properly distinguished
- **Impact:** Transient failures cause permanent payment failures
- **Fix Required:** Add retry logic with exponential backoff

#### 8. **Frontend Session Not Validated**
- **Location:** `js/checkout.js`
- **Problem:**
  - No validation that user actually made the payment
  - `persistCheckout()` saves to sessionStorage based on form input only
  - No cross-check with backend payment record
- **Impact:** User could fake payment by manually calling functions
- **Fix Required:** Validate reference against backend before success

---

### 🟢 MEDIUM PRIORITY

#### 9. **Phone Number Normalization Inconsistency**
- **Location:** `backend/server.js` vs `js/checkout.js`
- **Problem:** Different normalization logic in frontend and backend
- **Impact:** Phone validation may fail; normalization mismatch
- **Fix Required:** Consolidate to single utility function

#### 10. **Missing Idempotency**
- **Location:** `backend/server.js` `/api/payments/initiate`
- **Problem:** Same payment initiated twice = two transactions
- **Impact:** Duplicate charges if user clicks "Pay" multiple times
- **Fix Required:** Add idempotency key support

#### 11. **Memory Leak in Backend**
- **Location:** `backend/server.js` line 16: `const payments = new Map()`
- **Problem:** Old payment records never cleaned up
- **Impact:** Memory grows unbounded; server crashes eventually
- **Fix Required:** Add cleanup of records older than 24 hours

---

## Payment Flow Issues

### Current (Broken) Flow:
```
1. Frontend: Form submission
2. Frontend: POST /api/payments/initiate
3. Backend: Create payment record (Map)
4. Backend: Call CinetPay API
5. Frontend: Poll /api/payments/status (every 3s for 90s)
6. Frontend: Save purchase to localStorage (BEFORE webhook!)
7. Frontend: Redirect to success page
8. [ASYNC] Webhook arrives: Update payment.status
9. Problem: Purchase already saved; webhook ignored
```

### Required Fix:
```
1. Frontend: Form submission
2. Frontend: POST /api/payments/initiate (with idempotency key)
3. Backend: Create persistent order record (status="pending")
4. Backend: Call CinetPay API
5. Backend: Return reference + checkoutUrl
6. Frontend: Poll /api/payments/status (with timeout)
7. Frontend: Wait for webhook OR webhook timeout
8. Backend webhook: Verify signature + process
9. Backend webhook: Update order status + trigger delivery
10. Frontend: Check order status from backend
11. Frontend: Show success only if confirmed
```

---

## Configuration Issues

### Missing Environment Variables
```
PAYMENT_API_KEY              → Not shown in .env.example
PAYMENT_SITE_ID              → Not shown in .env.example
PAYMENT_NOTIFY_URL           → Configured but may be wrong for local dev
PAYMENT_RETURN_URL           → Not defined
PAYMENT_WEBHOOK_SECRET       → Not set; webhook verification broken
FRONTEND_ORIGIN              → Hardcoded to "*" (security issue)
```

---

## Recommendations

### Phase 1: Critical (Must Fix)
- [ ] Implement HMAC-SHA256 webhook verification
- [ ] Add order persistence (JSON file or SQLite)
- [ ] Fix race condition: move `completeCheckout()` to backend
- [ ] Add logging middleware + logger
- [ ] Implement real product delivery triggers

### Phase 2: High Priority (Should Fix)
- [ ] Add idempotency key support
- [ ] Add retry logic with exponential backoff
- [ ] Move PAYMENT_API to environment configuration
- [ ] Consolidate phone normalization
- [ ] Block duplicate concurrent requests

### Phase 3: Medium Priority (Nice to Have)
- [ ] Add memory cleanup to payment records
- [ ] Add email confirmation system
- [ ] Add order status dashboard for customers
- [ ] Add fraud detection rules
- [ ] Add webhook delivery retries

---

## Testing Checklist

- [ ] Complete payment flow (initiate → webhook → delivery)
- [ ] Duplicate payment prevention (click Pay twice)
- [ ] Webhook signature verification (valid vs invalid)
- [ ] Customer email confirmation
- [ ] Product delivery (music, ticket, merch each type)
- [ ] Error recovery (timeout, network failure)
- [ ] Server restart (orders persisted)
- [ ] Concurrent payments (multiple customers)

---

## Files to Fix

1. `backend/providers/cinetpay.js` - Webhook verification
2. `backend/server.js` - Logging, order persistence, idempotency
3. `js/checkout.js` - Remove premature completeCheckout()
4. `js/checkout-success.js` - Real delivery system
5. Create `backend/orders.js` - Order persistence layer
6. Create `backend/logger.js` - Logging middleware
