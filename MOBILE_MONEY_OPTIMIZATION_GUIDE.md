# Mobile Money Optimization Guide
## Cameroon MTN & Orange Money Integration

### Quick Summary

This guide documents the complete Mobile Money optimization for Cameroon payments, focusing on MTN Mobile Money (primary), Orange Money (secondary), and Card (fallback). The system is optimized for:

- **Low bandwidth environments** (2G/3G detection)
- **Mobile Money-specific UX** (clear confirmation prompts, error messages in French)
- **Payment reliability** (idempotency, webhook verification, retry logic)
- **Real-time monitoring** (Mobile Money-specific logging and statistics)

---

## Architecture Overview

### Frontend Components

**`js/mobile-money.js`** (285 lines)
- Core utilities for Mobile Money operations
- Network detection (MTN: 67/68, Orange: 69)
- Phone validation and normalization
- Timeout calculation based on network conditions
- Error messaging (French translations)
- Bandwidth optimization flags

**`js/checkout.js`** (Updated)
- Integrates mobile-money.js functions
- Detects slow networks at initialization
- Logs all payment events via `logMobileMoneyEvent()`
- Shows network-specific confirmation prompts
- Dynamic timeouts: 2min (normal) / 3min (slow network)
- User-friendly error messages via `getMobileMoneyErrorMessage()`

**`js/lang.js`** (Updated)
- 20+ new French translations for Mobile Money
- Key terms:
  - `checkoutConfirmMTN`: "📱 Confirmez sur votre mobile MTN"
  - `checkoutConfirmOrange`: "📱 Confirmez sur Orange Money"
  - `checkoutConnectionSlow`: "Connexion lente détectée..."
  - `mtnMoneyInstruction`: "Entrez votre code PIN MTN..."
  - `orangeMoneyInstruction`: "Autorisez la transaction..."

### Backend Components

**`backend/mobile-money-logger.js`** (210 lines)
- Dedicated logging for Mobile Money events
- Log types:
  - `events` - Payment initiations
  - `confirmations` - Successful payments
  - `failures` - Failed payments
  - `timeouts` - Timeout occurrences
  - `network` - Network detection events
  - `validation` - Phone validation attempts
  - `retries` - Retry attempts
  - `network-conditions` - Slow/fast network detection
  - `webhooks` - Webhook receipts

**`backend/server.js`** (Updated)
- Imports and integrates mobile-money-logger
- New endpoints:
  - `GET /api/payments/mobile-money/stats` - Daily Mobile Money statistics
  - `GET /api/payments/mobile-money/issues` - Recent failures/timeouts

---

## Payment Flow

### 1. Checkout Initialization
```javascript
export function initCheckout() {
  // Detect slow network → add "slow-network" class
  const isSlowNetwork = detectSlowNetwork();
  
  // Default to MTN Mobile Money
  let selectedMethod = "mtn";
  logMobileMoneyEvent("checkout_started", { ... });
  
  // Show connection warning if slow
  // Setup form handlers...
}
```

**Flow:**
- Detect network conditions (2G/3G → slow)
- Log start event
- Display appropriate messaging
- Show phone field for Mobile Money

### 2. Phone Validation & Network Detection
```javascript
function handlePhoneDetection(method) {
  const normalized = normalizePhone(phoneInput.value);
  const detected = detectNetwork(normalized);
  
  // MTN (67/68) or Orange (69)
  // Log detection
  // Show mismatch warning if needed
}
```

**Phone Formats Accepted:**
- Local: `650123456` → `+237650123456`
- International: `+237650123456` → `+237650123456`
- Logs last 4 digits for privacy

**Network Detection:**
- MTN prefixes: 67, 68
- Orange prefix: 69
- Unknown → warning message

### 3. Payment Initiation
```javascript
// Validate amount for network
const amountCheck = validatePaymentAmount(selectedMethod, total);

// Show network-specific instruction
const instruction = getMobileMoneyInstruction(selectedMethod, phone);

// Send to backend
const paymentData = await initiatePayment({ ... });
```

**Backend Processing:**
- Normalize phone to +237 format
- Log initiation: `logMobileMoneyInitiation(reference, method, amount, phone, email)`
- Create order record (persistent)
- Call CinetPay provider
- Log success or failure

### 4. Confirmation Waiting
```javascript
// Dynamic timeout based on network
const timeout = calculatePaymentTimeout(isSlowNetwork);
// Normal: 120s, Slow: 180s

// Show network-specific prompt
const confirm = network === "mtn"
  ? translate("checkoutConfirmMTN")
  : translate("checkoutConfirmOrange");

// Poll backend for confirmation
const verification = await verifyOrderConfirmation(reference, timeout);
```

**Key Points:**
- Frontend waits for webhook confirmation from backend
- Timeout prevents infinite waiting
- Shows clear user message per network
- Logs all status changes

### 5. Webhook Confirmation
```javascript
app.post("/api/payments/webhooks/cinetpay", async (req, res) => {
  // Verify HMAC-SHA256 signature
  // Get persistent order
  // Update status based on CinetPay response
  
  if (providerStatus === "ACCEPTED" || "SUCCESS") {
    logMobileMoneyConfirmation(reference, method, "confirmed", status);
    // Trigger product delivery
  } else if (REFUSED || FAILED) {
    logMobileMoneyFailure(reference, method, reason, "webhook_failure");
  }
});
```

**Safety Measures:**
- HMAC-SHA256 signature verification
- Idempotent order updates
- Persistent order storage
- Product delivery triggered on success

---

## Error Handling

### Phone Validation Errors
- **Invalid format** → "Le numéro n'est pas valide"
- **Wrong network** → "Le réseau détecté ne correspond pas"
- **Missing phone** → "Un numéro est requis"

### Payment Amount Errors
- **Too low** → "Le montant minimum est 100 XAF"
- **Too high** → "Le montant maximum est 500,000 XAF"

### Network Errors
- **Slow connection** → Shows "Connexion lente détectée..."
- **Gateway unavailable** → "Passerelle indisponible"

### Mobile Money-Specific
- **Timeout** → "La transaction a dépassé le délai imparti"
- **Webhook failure** → Technical reason + "Réessayez"
- **User cancellation** → "Vous avez annulé le paiement"

### Error Message Function
```javascript
export function getMobileMoneyErrorMessage(error, method) {
  // Converts technical errors to French user messages
  // Examples:
  // "timeout" → "La transaction a dépassé le délai imparti (2-3 minutes)."
  // "invalid_phone" → "Le numéro n'est pas valide"
  // "provider_error" → "Erreur du fournisseur. Réessayez."
}
```

---

## Monitoring & Analytics

### Backend Endpoints

**`GET /api/payments/mobile-money/stats`**
```json
{
  "date": "2025-01-15",
  "total_initiated": 25,
  "total_confirmed": 22,
  "total_failed": 2,
  "total_timeout": 1,
  "success_rate": 88.00,
  "by_method": {
    "mtn": {
      "initiated": 15,
      "confirmed": 14,
      "failed": 1,
      "timeout": 0
    },
    "orange": {
      "initiated": 10,
      "confirmed": 8,
      "failed": 1,
      "timeout": 1
    }
  }
}
```

**`GET /api/payments/mobile-money/issues`**
```json
{
  "failures": [
    "[2025-01-15T14:22:30.123Z] WARN: MOBILE_MONEY_FAILED | {...}",
    ...
  ],
  "timeouts": [...],
  "retries": [...]
}
```

### Log Files (Backend)
Located in `backend/logs/mobile-money/`:
- `events-{YYYY-MM-DD}.log` - Payment initiations
- `confirmations-{YYYY-MM-DD}.log` - Successful payments
- `failures-{YYYY-MM-DD}.log` - Failed payments
- `timeouts-{YYYY-MM-DD}.log` - Timeout events
- `network-{YYYY-MM-DD}.log` - Network detections
- `validation-{YYYY-MM-DD}.log` - Phone validation results
- `retries-{YYYY-MM-DD}.log` - Retry attempts
- `network-conditions-{YYYY-MM-DD}.log` - Slow/fast network detection
- `webhooks-{YYYY-MM-DD}.log` - Webhook events

### Frontend Logging (Session)
Mobile Money events logged to `sessionStorage` via `logMobileMoneyEvent()`:
```javascript
// Each event includes:
{
  type: "checkout_started",
  timestamp: ISO_8601,
  method: "mtn" | "orange",
  slowNetwork: boolean,
  data: {...}
}
```

---

## Testing Guide

### 1. Test MTN Mobile Money
**Preconditions:**
- Use Cameroon MTN phone: `+237 67 or 68 followed by 8 digits`
- Ensure slow network detected correctly

**Steps:**
1. Add product to cart
2. Go to checkout
3. Select MTN Mobile Money
4. Enter phone: `+237650123456` or `650123456`
5. Should show: "MTN Mobile Money (recommandé)"
6. Should show: "Confirmez sur votre mobile MTN"
7. Submit payment
8. Should poll backend for confirmation (~120 seconds)

**Verification:**
- Check `backend/logs/mobile-money/events-{date}.log` for initiation
- Monitor console for `logMobileMoneyEvent` output
- Verify successful webhook confirmation

### 2. Test Orange Money
**Preconditions:**
- Use Orange phone: `+237 69 followed by 8 digits`

**Steps:**
1. Add product to cart
2. Go to checkout
3. Select Orange Money
4. Enter phone: `+237690123456` or `690123456`
5. Should show: "Orange Money Network"
6. Should show: "Confirmez sur Orange Money"
7. Submit payment

**Verification:**
- Network detection works correctly
- Logs show Orange network in events file

### 3. Test Slow Network Optimization
**Preconditions:**
- Chrome DevTools: Network → Throttling → "Slow 3G"

**Steps:**
1. Enable slow network in DevTools
2. Start checkout
3. Submit MTN payment
4. Observe:
   - "slow-network" class added to body
   - Timeout extended to 180 seconds
   - Message shows "Temps estimé: 2-3 minutes"

**Verification:**
- Check logs for `network_condition` entries
- Verify timeout calculation in frontend

### 4. Test Error Handling
**Invalid Phone Numbers:**
- Empty → "Un numéro est requis"
- Letters → "Le numéro n'est pas valide"
- Wrong prefix → Network mismatch warning

**Invalid Amounts:**
- 0 XAF → "Montant invalide"
- 50 XAF → "Montant minimum: 100 XAF"
- 600,000 XAF → "Montant maximum: 500,000 XAF"

**Timeout Test:**
- Simulate webhook delay >180 seconds
- Should trigger timeout error
- Check `timeouts-{date}.log` for timeout entry

### 5. Verification Checklist
- [ ] MTN phone validation works
- [ ] Orange phone validation works
- [ ] Network detection accurate (67/68 = MTN, 69 = Orange)
- [ ] Slow network detection triggers correctly
- [ ] Timeout calculated properly (120s normal, 180s slow)
- [ ] User sees network-specific confirmation message
- [ ] Webhook confirmation received and logged
- [ ] Order persisted in backend
- [ ] Product delivered after confirmation
- [ ] All events logged to appropriate log files
- [ ] Stats endpoint shows correct metrics
- [ ] Issues endpoint shows recent problems
- [ ] French error messages display correctly

---

## Configuration

### Environment Variables (`.env`)
```bash
# Payment Provider
PAYMENT_API_KEY=your_cinetpay_key
PAYMENT_SITE_ID=your_site_id
PAYMENT_WEBHOOK_SECRET=your_webhook_secret

# Delivery
TICKET_SERVICE_URL=your_ticket_service
DOWNLOAD_SERVICE_URL=your_download_service
MERCH_SERVICE_URL=your_merch_service

# Frontend
FRONTEND_ORIGIN=https://your-frontend.com
PAYMENT_PROVIDER=cinetpay
```

### Mobile Money Limits (Configured in `js/mobile-money.js`)
```javascript
export const MOBILE_NETWORKS = {
  mtn: {
    priority: 1,
    prefixes: ["67", "68"],
    minAmount: 100,
    maxAmount: 500000,
    timeout: { normal: 2, slow: 3 },
    supportedFeatures: ["USSD", "APP"]
  },
  orange: {
    priority: 2,
    prefixes: ["69"],
    minAmount: 100,
    maxAmount: 500000,
    timeout: { normal: 2, slow: 3 },
    supportedFeatures: ["USSD", "APP"]
  }
};
```

---

## Troubleshooting

### Issue: Payments timing out frequently
**Cause:** Slow network detection not triggering
**Solution:**
1. Check `network-conditions-{date}.log` for detection status
2. Verify `navigator.connection` API availability in browser
3. Test with DevTools slow network throttling
4. Check timeout calculation in `calculatePaymentTimeout()`

### Issue: Phone validation failing
**Cause:** Phone format error or normalization issue
**Solution:**
1. Check `validation-{date}.log` for error details
2. Verify phone format: must be +2376XXXXXXXX or 6XXXXXXXX
3. Ensure digits only (no spaces, hyphens)
4. Test with different phone numbers

### Issue: Webhook not confirming
**Cause:** Signature verification failing
**Solution:**
1. Verify `PAYMENT_WEBHOOK_SECRET` matches CinetPay
2. Check webhook signature verification in `cinetpay.js`
3. Ensure custom header `x-cinetpay-signature` is received
4. Review webhook logs in `webhooks-{date}.log`

### Issue: No logs generated
**Cause:** Log directory not created or permissions issue
**Solution:**
1. Ensure `backend/logs/mobile-money/` directory is writable
2. Check file system permissions
3. Verify Node.js process has write access
4. Create directory manually if needed: `mkdir -p backend/logs/mobile-money`

---

## Performance Metrics

### Expected Performance (Cameroon MTN)
- **Fast Network (4G):**
  - Payment initiation: <2 seconds
  - User confirmation: 30-60 seconds
  - Webhook confirmation: <5 seconds
  - Total: ~1-2 minutes

- **Slow Network (2G/3G):**
  - Payment initiation: 5-10 seconds
  - User confirmation: 60-120 seconds
  - Webhook confirmation: 5-15 seconds
  - Total: ~2-3 minutes

### Expected Success Rates
- **MTN Mobile Money:** >95% (primary network)
- **Orange Money:** >90% (secondary network)
- **Overall:** >93% success rate

### Monitoring KPIs
1. **Success Rate** = Total Confirmed / Total Initiated
2. **Timeout Rate** = Total Timeouts / Total Initiated
3. **Network Distribution** = MTN vs Orange mix
4. **Average Response Time** = (Confirmation Time - Initiation Time)

---

## Deployment Checklist

- [ ] `js/mobile-money.js` deployed
- [ ] `js/checkout.js` updated with mobile-money.js imports
- [ ] `js/lang.js` includes all French translations
- [ ] `backend/mobile-money-logger.js` deployed
- [ ] `backend/server.js` updated with logging and new endpoints
- [ ] `backend/.env` configured with CinetPay credentials
- [ ] `backend/logs/mobile-money/` directory created and writable
- [ ] Webhook URL registered with CinetPay
- [ ] Webhook secret configured in `.env`
- [ ] Test payment initiated and confirmed
- [ ] Stats endpoint returns valid data
- [ ] Issues endpoint working
- [ ] All error messages in French displaying correctly

---

## Support & Maintenance

### Daily Monitoring
1. Check `/api/payments/mobile-money/stats` for daily metrics
2. Review `/api/payments/mobile-money/issues` for problems
3. Verify success rate >90%
4. Monitor timeout frequency

### Weekly Review
1. Analyze trends in log files
2. Check network distribution (MTN vs Orange)
3. Review error patterns
4. Update if needed based on CinetPay changes

### Escalation Path
- Log files: `backend/logs/mobile-money/`
- Stats API: GET `/api/payments/mobile-money/stats`
- Issues API: GET `/api/payments/mobile-money/issues`
- Console output: Backend logs to `console.log` (see output in deployment logs)
