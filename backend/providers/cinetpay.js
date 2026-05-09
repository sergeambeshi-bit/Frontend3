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
  if (!secret) return true;
  if (!signature) return false;
  return signature === secret;
}
