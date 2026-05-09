# JENGU Payments Backend (Cameroon-first)

This backend provides a Mobile Money optimized payment API for checkout.

## Supported methods

- `mtn` (MTN MoMo)
- `orange` (Orange Money)
- `card`

## API endpoints

- `GET /api/payments/health`
- `POST /api/payments/initiate`
- `GET /api/payments/status/:reference`
- `POST /api/payments/webhooks/cinetpay`

## Flow

1. Frontend sends `POST /api/payments/initiate` with `amount`, `provider`, `email`, and `phone` for Mobile Money.
2. API creates transaction reference and calls provider.
3. Frontend polls `GET /api/payments/status/:reference` while showing waiting state.
4. Provider webhook updates transaction status to `confirmed` or `failed`.

## Security notes

- Validate all input server-side.
- Verify webhook signature using a provider secret.
- Never trust client payment status.
- Move payment records from in-memory map to a database for production.

## Local run

1. Copy `.env.example` to `.env` and fill provider credentials.
2. Install dependencies:

```bash
cd backend
npm install
npm run dev
```

3. Point frontend payment base URL to `http://localhost:8080`.

## Provider integrations

Current adapter: CinetPay.

You can add additional adapters (Flutterwave/Paystack) under `backend/providers` and route by `PAYMENT_PROVIDER`.
