import crypto from "crypto";

const CINETPAY_BASE = "https://api-checkout.cinetpay.com/v2/payment";

function mapPhoneForProvider(phone) {
  return String(phone || "").replace(/^\+/, "");
}

export async function createPaymentIntent({
  apiKey,
  siteId,
  notifyUrl,
  returnUrl,
  amount,
  currency,
  provider,
  phone,
  email,
  name,
  transactionId,
  description
}) {
  const channels = provider === "card" ? "CARD" : "MOBILE_MONEY";

  const body = {
    apikey: apiKey,
    site_id: siteId,
    transaction_id: transactionId,
    amount,
    currency,
    description,
    notify_url: notifyUrl,
    return_url: returnUrl,
    channels,
    customer_name: name || "Customer",
    customer_email: email,
    customer_phone_number: mapPhoneForProvider(phone)
  };

  const response = await fetch(`${CINETPAY_BASE}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.code !== "201") {
    return {
      ok: false,
      providerStatus: "failed",
      message: data.message || "Provider request failed"
    };
  }

  return {
    ok: true,
    reference: transactionId,
    providerStatus: "pending",
    checkoutUrl: data?.data?.payment_url || "",
    providerResponse: data
  };
}

export function verifyWebhookSignature(reqBody, signature, secret) {
  // If no secret configured, accept all webhooks (for testing only)
  if (!secret) {
    console.warn('[PAYMENT] No webhook secret configured - accepting all webhooks');
    return true;
  }
  
  if (!signature) {
    console.warn('[PAYMENT] Webhook signature missing');
    return false;
  }

  // CinetPay signs the raw JSON request body
  // Signature is HMAC-SHA256(secret, body) encoded as hex
  try {
    const expected = crypto
      .createHmac('sha256', secret)
      .update(String(reqBody || ''))
      .digest('hex');

    const result = crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expected, 'hex')
    );
    
    if (!result) {
      console.warn('[PAYMENT] Webhook signature mismatch - potential fraudulent request');
    }
    
    return result;
  } catch (err) {
    console.error('[PAYMENT] Webhook signature verification failed:', err.message);
    return false;
  }
}
